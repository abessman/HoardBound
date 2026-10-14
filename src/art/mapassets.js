/* Map art packs: external PNG artwork for the parchment map, by semantic id (see src/data/mapspec.js), with the
 * procedural drawing as the fallback for anything missing, broken or still loading.
 *
 * A pack lives in assets/map/packs/<name>/: pack.json (the manifest) and pack.js (the same JSON wrapped in
 * HB.mapAssets.definePack(...), so it also loads from file://). Choose it in Settings → Map art, or with
 * ?mappack=<name> (?mappack=none forces procedural art). Rules for artists: assets/map/README.md.
 *
 * Drawing: origin = anchor point − anchorPx × scale, where scale = logicalSize / sourceSize × k and k is the
 * drawing's size parameter divided by the family's ref (MAP_SPEC). Aspect ratio is kept unless allowStretch.
 * Images are decoded once; HB.mapAssets.revision changes when an image becomes ready or the pack changes, and the
 * map redraws chunks built with an older revision (a few per frame, showing the old ones meanwhile). */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  const PAPER = '#f0e3c3';
  // roads, rivers, coasts and territory washes stay procedural (they must join up); a pack may restyle them
  const DEFAULT_STYLE = {
    road: { color: '#2b1a0e', width: 1.2, laneWidth: 0.8, dash: [3, 3], alpha: 0.9, laneAlpha: 0.6 },
    river: { color: 'rgba(48,78,118,0.78)', baseWidth: 0.8, perWidth: 0.6 },
    coast: { color: '#2b1a0e', width: 1.5 },
    water: { color: [105, 140, 170], alpha: 0.07, alphaPerDepth: 0.03 },
    // watercolour territory: each path's two colours (the wash's hue mask mixes them; docs/map-art/WASH.md)
    wash: { benevolent: [[110, 140, 58], [196, 160, 58]], tyrannical: [[176, 48, 16], [44, 36, 32]], neutral: [[128, 104, 70], [96, 74, 48]] },
  };
  const merge = (a, b) => { const o = Array.isArray(a) ? a.slice() : Object.assign({}, a); for (const k in b || {}) o[k] = (a && typeof a[k] === 'object' && !Array.isArray(a[k]) && b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) ? merge(a[k], b[k]) : b[k]; return o; };

  const MA = HB.mapAssets = {
    revision: 0, packName: 'none', pack: null, entries: new Map(), warnings: [], loading: 0,
    style: merge(DEFAULT_STYLE, {}), DEFAULT_STYLE,
    bump() { MA.revision++; MA._placeCache = null; },
    warn(msg) { MA.warnings.push(msg); if (MA.warnings.length > 200) MA.warnings.shift(); console.warn('[map art] ' + msg); },
    /** choose a pack ('none' = procedural). Resolves true once its manifest is read (images keep loading after) */
    use(name) {
      name = name || 'none';
      const request = MA._request = (MA._request || 0) + 1;
      MA._pending = name; // also cancel a pending pack when the original art is selected
      MA.entries.clear(); MA.hasCuts = false; MA.pack = null; MA.packStyle = null; MA.packName = name; MA.style = merge(DEFAULT_STYLE, {}); MA.bump();
      if (name === 'none') return Promise.resolve(false);
      if (!/^[\w-]+$/.test(name)) { MA.warn(`bad pack name "${name}"`); return Promise.resolve(false); }
      MA._pending = name;
      // 'pixel': the map symbols drawn in the pixel editor (assets/pixelart/), no pack folder
      if (name === 'pixel' && HB.pixelArt) return HB.pixelArt.load().then(() => { if (request !== MA._request) return false; MA.definePack(HB.pixelArt.mapPack(), 'pixel'); return !!MA.pack; });
      return new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = `assets/map/packs/${name}/pack.js`;
        s.onload = () => resolve(request === MA._request && !!MA.pack);
        s.onerror = async () => {
          if (request !== MA._request) { resolve(false); return; }
          if (/^https?:/.test(location.protocol)) {
            try { const r = await fetch(`assets/map/packs/${name}/pack.json`, { cache: 'no-cache' }); if (r.ok) { const pack = await r.json(); if (request !== MA._request) { resolve(false); return; } MA.definePack(pack, name); resolve(true); return; } } catch (e) { /* fall through */ }
          }
          MA.warn(`pack "${name}" not found (looked for assets/map/packs/${name}/pack.js${/^https?:/.test(location.protocol) ? ' and pack.json' : ''}); using procedural art`);
          resolve(false);
        };
        document.head.appendChild(s);
      });
    },
    /** read a manifest: { schemaVersion: 1, name, style?, assets: { id: { variants: [...] } } } (assets may also be an array of { id, variants }) */
    definePack(pack, nameHint) {
      const name = (pack && pack.name) || nameHint || MA._pending || 'unnamed';
      if (MA._pending && name !== MA._pending) { MA.warn(`pack.js defines "${name}" but "${MA._pending}" was asked for; ignored`); return false; }
      if (!pack || pack.schemaVersion !== 1) MA.warn(`pack "${name}": schemaVersion should be 1 (got ${pack && pack.schemaVersion}); reading it anyway`);
      MA.pack = { name, schemaVersion: pack && pack.schemaVersion };
      if (pack && pack.style) MA.style = merge(DEFAULT_STYLE, pack.style);
      MA.packStyle = (pack && pack.style) || null; // 0.10 packs may set wash.kind / cruel / reach (one colour each)
      const base = `assets/map/packs/${name}/`;
      const list = Array.isArray(pack && pack.assets) ? pack.assets.map(a => [a && a.id, a]) : Object.entries((pack && pack.assets) || {});
      for (const [id, def] of list) {
        if (!id || typeof id !== 'string') { MA.warn(`pack "${name}": an asset has no id`); continue; }
        if (MA.entries.has(id)) { MA.warn(`duplicate id ${id}: the first one is used`); continue; }
        // '<id>@good' / '<id>@evil': a symbol's version for a kind or a cruel land (the editor's pixel pack); draw() looks there first
        const fam = HB.mapSpecFamily ? HB.mapSpecFamily(/@(good|evil)$/.test(id) ? id.replace(/@(good|evil)$/, '') : id) : null;
        if (!fam) { MA.warn(`unknown id ${id} (not in src/data/mapspec.js); ignored`); continue; }
        const variants = ((def && def.variants) || []).map((v, i) => fam.spec.layer === 'wash' ? MA.washVariant(id, fam, v, i, base) : MA.variant(id, fam, v, i, base)).filter(Boolean);
        if (!variants.length) { MA.warn(`${id}: no usable variants; procedural art is used`); continue; }
        MA.entries.set(id, { id, family: fam.id, spec: fam.spec, variants });
      }
      MA.bump();
      return true;
    },
    /** validate one variant and start loading its image(s); returns null (with a warning) if it cannot work */
    variant(id, fam, v, i, base) {
      const where = `${id} variant ${v && v.id !== undefined ? v.id : i}`;
      const num = (a, n) => Array.isArray(a) && a.length === n && a.every(x => typeof x === 'number' && isFinite(x));
      if (!v || typeof v.src !== 'string') { MA.warn(`${where}: missing "src"`); return null; }
      const rect = v.rect || null;
      if (rect && !num(rect, 4)) { MA.warn(`${where}: "rect" must be [x, y, width, height]`); return null; }
      const size = rect ? [rect[2], rect[3]] : v.sourceSize;
      if (!num(size, 2) || size[0] <= 0 || size[1] <= 0) { MA.warn(`${where}: "sourceSize" must be [width, height] in pixels`); return null; }
      if (!num(v.logicalSize, 2) || v.logicalSize[0] <= 0 || v.logicalSize[1] <= 0) { MA.warn(`${where}: "logicalSize" must be [width, height] > 0`); return null; }
      if (!num(v.anchorPx, 2) || v.anchorPx[0] < 0 || v.anchorPx[1] < 0 || v.anchorPx[0] > size[0] || v.anchorPx[1] > size[1]) { MA.warn(`${where}: "anchorPx" must be [x, y] inside the ${size[0]}×${size[1]} frame`); return null; }
      if (v.contentBoundsPx && (!num(v.contentBoundsPx, 4) || v.contentBoundsPx[0] < 0 || v.contentBoundsPx[1] < 0 || v.contentBoundsPx[0] + v.contentBoundsPx[2] > size[0] || v.contentBoundsPx[1] + v.contentBoundsPx[3] > size[1])) MA.warn(`${where}: "contentBoundsPx" lies outside the frame; ignored`);
      const aspectA = v.logicalSize[0] / v.logicalSize[1], aspectS = size[0] / size[1];
      const uniform = !v.allowStretch && Math.abs(aspectA / aspectS - 1) > 0.03;
      if (uniform) MA.warn(`${where}: logicalSize ${v.logicalSize.join('×')} does not match the frame's aspect ${size.join('×')}; drawn at the width's scale (set allowStretch to stretch)`);
      // terrain is drawn into cached chunks with a 2-cell margin: refuse art that would reach past it at either level of detail
      const spec = fam.spec;
      if (spec.layer === 'terrain') {
        const t = HB.mapTerrainReach(spec, v.logicalSize, size, v.anchorPx, uniform);
        if (!t.ok) { MA.warn(`${where}: reaches ${t.cells.toFixed(2)} cells from its anchor at its largest size (${t.px.toFixed(1)} px at zoom 1; terrain may reach ${t.limit} cells); refused, procedural art is used`); return null; }
      }
      const src = /^(assets\/|https?:|data:)/.test(v.src) ? v.src : base + v.src;
      const out = { id, where, src, rect: rect || [0, 0, size[0], size[1]], sw: size[0], sh: size[1], logicalSize: v.logicalSize.slice(), anchor: v.anchorPx.slice(), uniform, allowStretch: !!v.allowStretch, allowFlipX: !!v.allowFlipX,
        treatment: v.treatment || null, decor: v.decor || null,
        sampling: v.sampling === 'pixel' ? 'pixel' : 'smooth', labelOffset: num(v.labelOffset, 2) ? v.labelOffset : null, attach: v.attach || null, family: spec, ready: false, failed: false, img: null, maskCanvas: null, tintImg: null, tintCache: new Map() };
      MA.loadImage(out, src, (img) => {
        const nw = img.naturalWidth, nh = img.naturalHeight;
        if (rect ? (rect[0] + rect[2] > nw || rect[1] + rect[3] > nh) : (nw !== size[0] || nh !== size[1])) { out.failed = true; MA.warn(`${where}: ${src} is ${nw}×${nh}, which does not match ${rect ? 'the rect ' + rect.join(',') : 'sourceSize ' + size.join('×')}; refused`); MA.bump(); return; }
        out.img = img; out.ready = true; MA.bump();
      }, () => { out.failed = true; MA.warn(`${where}: could not load ${src}`); MA.bump(); });
      if (typeof v.occlusionMask === 'string') MA.loadImage(out, /^(assets\/|data:)/.test(v.occlusionMask) ? v.occlusionMask : base + v.occlusionMask, (m) => { out.maskCanvas = MA.colourise(m, out.rect, PAPER, 1); MA.bump(); }, () => MA.warn(`${where}: could not load occlusionMask`));
      // a wash cut-out (the editor's layers set to less wash): the map takes that much territory wash off this symbol
      if (typeof v.washCut === 'string') { MA.hasCuts = true; MA.loadImage(out, v.washCut, (img) => { if (img.naturalWidth === out.sw && img.naturalHeight === out.sh) { out.cutImg = img; MA.bump(); } }, () => {}); }
      if (typeof v.tintMask === 'string') MA.loadImage(out, /^(assets\/|data:)/.test(v.tintMask) ? v.tintMask : base + v.tintMask, (m) => { out.tintImg = m; MA.bump(); }, () => MA.warn(`${where}: could not load tintMask`));
      // lights (the editor's light layers): spots in the frame's pixels, and the glowing pixels, shown at dusk and night
      if (Array.isArray(v.lights)) {
        out.lights = v.lights.filter(l => l && isFinite(l.x) && isFinite(l.y) && l.kind >= 1).map(l => ({ kind: l.kind | 0, x: +l.x, y: +l.y, r: +l.r > 0 ? +l.r : 4, glow: l.glow === undefined ? 1 : +l.glow }));
        if (typeof v.glowSrc === 'string') MA.loadImage(out, /^(assets\/|https?:|data:)/.test(v.glowSrc) ? v.glowSrc : base + v.glowSrc, (img) => { if (img.naturalWidth === out.sw && img.naturalHeight === out.sh) out.glowImg = img; }, () => {});
      }
      return out;
    },
    /** a watercolour variant (map.wash.*): tileable world-anchored masks, or a bloom order mask */
    washVariant(id, fam, v, i, base) {
      const where = `${id} variant ${v && v.id !== undefined ? v.id : i}`, num = (a, n) => Array.isArray(a) && a.length === n && a.every(x => typeof x === 'number' && isFinite(x) && x > 0);
      const path = (f) => /^(assets\/|https?:|data:)/.test(f) ? f : base + f;
      if (fam.spec.kind === 'bloom') {
        if (!v || typeof v.src !== 'string' || !num(v.sourceSize, 2)) { MA.warn(`${where}: a bloom mask needs "src" and "sourceSize"`); return null; }
        if (v.sourceSize[0] !== v.sourceSize[1]) { MA.warn(`${where}: a bloom mask must be square; refused`); return null; }
        const out = { id, where, bloom: true, n: v.sourceSize[0], span: v.span > 0 ? v.span : 2.5, allowFlipX: !!v.allowFlipX, ready: false, failed: false, img: null, data: null };
        MA.loadImage(out, path(v.src), (img) => { if (img.naturalWidth !== out.n || img.naturalHeight !== out.n) { out.failed = true; MA.warn(`${where}: ${v.src} is ${img.naturalWidth}×${img.naturalHeight}, not ${out.n}×${out.n}; refused`); } else { out.img = img; out.ready = true; } MA.bump(); }, () => { out.failed = true; MA.warn(`${where}: could not load ${v.src}`); MA.bump(); });
        return out;
      }
      if (!v || typeof v.coverage !== 'string') { MA.warn(`${where}: a wash needs "coverage"`); return null; }
      if (!num(v.size, 2) || v.size[0] !== v.size[1] || (v.size[0] & (v.size[0] - 1))) { MA.warn(`${where}: "size" must be square and a power of two (256, 512, 1024); refused`); return null; }
      const out = { id, where, wash: true, n: v.size[0], cellsPerTile: v.cellsPerTile > 0 ? v.cellsPerTile : 8, imgs: {}, pending: 0, ready: false, failed: false, data: null };
      for (const key of ['coverage', 'pooling', 'hue']) {
        if (typeof v[key] !== 'string') continue;
        out.pending++;
        MA.loadImage(out, path(v[key]), (img) => {
          if (img.naturalWidth !== out.n || img.naturalHeight !== out.n) { MA.warn(`${where}: ${key} is ${img.naturalWidth}×${img.naturalHeight}, not ${out.n}×${out.n}; refused`); out.failed = true; }
          else out.imgs[key] = img;
          if (--out.pending === 0 && !out.failed && out.imgs.coverage) out.ready = true; MA.bump();
        }, () => { MA.warn(`${where}: could not load ${key}`); if (key === 'coverage') out.failed = true; if (--out.pending === 0 && !out.failed && out.imgs.coverage) out.ready = true; MA.bump(); });
      }
      return out;
    },
    /** greyscale/alpha channels of an image as typed arrays (decoded once per image) */
    pixels(img, w, h) {
      if (img._px && img._px.w === w && img._px.h === h) return img._px;
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, w, h); const d = g.getImageData(0, 0, w, h).data, lum = new Uint8Array(w * h), alpha = new Uint8Array(w * h); let opaque = true;
      for (let i = 0; i < w * h; i++) { lum[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3; alpha[i] = d[i * 4 + 3]; if (alpha[i] < 255) opaque = false; }
      return (img._px = { w, h, lum, alpha, opaque });
    },
    /** the textures of a path's wash (benevolent | tyrannical | neutral), or null: { n, cellsPerTile, cov, pool, hue } */
    washData(path) {
      const e = MA.entries.get('map.wash.' + path); if (!e) return null;
      const v = e.variants.find(x => x.ready); if (!v) return null;
      if (!v.data) { const px = (k) => v.imgs[k] ? MA.pixels(v.imgs[k], v.n, v.n).lum : null; v.data = { n: v.n, cellsPerTile: v.cellsPerTile, cov: px('coverage'), pool: px('pooling'), hue: px('hue') }; }
      return v.data;
    },
    /** a bloom order mask for a source, or null: { n, span, flip, ord (luminance), alpha } */
    bloomData(key) {
      const e = MA.entries.get('map.wash.bloom'); if (!e) return null;
      const ok = e.variants.filter(x => x.ready); if (!ok.length) return null;
      const v = ok[HB.hash32('bloom:' + key) % ok.length], px = MA.pixels(v.img, v.n, v.n);
      return { n: v.n, span: v.span, flip: v.allowFlipX && (HB.hash32('bflip:' + key) & 1), ord: px.lum, alpha: px.alpha };
    },
    /** a halved copy of a variant's frame, about 1–2× the size it is drawn at (built once, then cached) */
    mip(v, shrink) {
      if (!v.mips) { v.mips = []; let cur = null, w = v.sw, h = v.sh; for (let k = 0; k < 6 && w > 8; k++) { w = Math.ceil(w / 2); h = Math.ceil(h / 2); const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = true; if (cur) g.drawImage(cur, 0, 0, w, h); else g.drawImage(v.img, v.rect[0], v.rect[1], v.sw, v.sh, 0, 0, w, h); v.mips.push(c); cur = c; } }
      let lvl = 0, s = shrink; while (s > 2 && lvl < v.mips.length) { s /= 2; lvl++; }
      return lvl ? v.mips[lvl - 1] : v.img;
    },
    loadImage(owner, src, ok, fail) {
      // States and home stages may share a PNG: decode it once, while retaining per-variant readiness.
      if (!MA._images) MA._images = new Map();
      let promise = MA._images.get(src);
      if (!promise) {
        promise = new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });
        MA._images.set(src, promise);
      }
      MA.loading++;
      promise.then(img => { MA.loading--; ok(img); }, () => { MA.loading--; MA._images.delete(src); fail(); });
    },
    /** an image's alpha filled with one colour (occlusion fill in paper colour, or a faction tint) */
    colourise(img, rect, colour, alpha) {
      const c = document.createElement('canvas'); c.width = rect[2]; c.height = rect[3];
      const g = c.getContext('2d'); g.drawImage(img, rect[0], rect[1], rect[2], rect[3], 0, 0, rect[2], rect[3]);
      g.globalCompositeOperation = 'source-in'; g.globalAlpha = alpha; g.fillStyle = colour; g.fillRect(0, 0, c.width, c.height);
      return c;
    },
    /** first id in the list with art. Variant: chosen by the key over all declared variants (stable as images load);
     *  a failed variant hands over to the next working one; one still loading means "not yet" (procedural for now) */
    resolve(ids, key) {
      if (!MA.entries.size) return null;
      for (const id of ids) {
        const e = MA.entries.get(id); if (!e) continue;
        const n = e.variants.length, start = HB.hash32(String(key === undefined ? '' : key)) % n;
        for (let j = 0; j < n; j++) { const v = e.variants[(start + j) % n]; if (v.failed) continue; if (!v.ready) return null; return { id, v }; }
      }
      return null;
    },
    /** draw resolved art at an anchor point; param is the drawing's size parameter (see MAP_SPEC). Returns placement or null */
    drawResolved(ctx, r, x, y, param, o = {}) {
      const v = r.v, fam = v.family, k = param / fam.ref;
      const sx = v.logicalSize[0] / v.sw * k;
      let sy = v.uniform ? sx : v.logicalSize[1] / v.sh * k;
      if (v.allowStretch && o.paramY !== undefined && fam.refY) sy = v.logicalSize[1] / v.sh * (o.paramY / fam.refY);
      const dx = x - v.anchor[0] * sx, dy = y - v.anchor[1] * sy, dw = v.sw * sx, dh = v.sh * sy;
      const flip = o.flipX !== undefined ? !!o.flipX : v.allowFlipX && (HB.hash32('flip:' + o.key) & 1);
      ctx.save();
      ctx.imageSmoothingEnabled = v.sampling !== 'pixel';
      if (flip) { ctx.translate(2 * x, 0); ctx.scale(-1, 1); }
      if (v.maskCanvas) ctx.drawImage(v.maskCanvas, dx, dy, dw, dh);
      // drawn far smaller than its source (big art in a map chunk): through halved copies, so fine lines do not shimmer
      const tf = ctx.getTransform ? ctx.getTransform() : null, shrink = v.sw / Math.abs(dw * (tf ? Math.hypot(tf.a, tf.b) : 1));
      if (HB.mapInk && (v.treatment || o.inkTint)) {
        const img = HB.mapInk.treat(v, o.inkTint);
        ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
      }
      else if (shrink > 2.5 && v.sampling !== 'pixel') { const m = MA.mip(v, shrink); ctx.drawImage(m, 0, 0, m.width, m.height, dx, dy, dw, dh); }
      else ctx.drawImage(v.img, v.rect[0], v.rect[1], v.sw, v.sh, dx, dy, dw, dh);
      // the map chunk's wash cut-out layer (mapview): where this symbol keeps the territory wash off itself
      if (v.cutImg && ctx.washCut && ctx.getTransform) { const cc = ctx.washCut; cc.setTransform(ctx.getTransform()); cc.imageSmoothingEnabled = false; cc.drawImage(v.cutImg, 0, 0, v.sw, v.sh, dx, dy, dw, dh); }
      if (v.tintImg && o.tint) { let t = v.tintCache.get(o.tint); if (!t) { t = MA.colourise(v.tintImg, v.rect, o.tint, 0.9); v.tintCache.set(o.tint, t); } ctx.drawImage(t, dx, dy, dw, dh); }
      if (HB.mapInk && v.decor) HB.mapInk.decorate(ctx, v.decor, x, y, param, o);
      // lights: while the map collects them (MA.lights, dusk and night), each spot and the glowing pixels in device pixels
      if (v.lights && MA.lights && ctx.getTransform) {
        const T = ctx.getTransform(), k = Math.hypot(T.a, T.b);
        for (const l of v.lights) { const lx = dx + l.x * sx, ly = dy + l.y * sy; MA.lights.push({ x: T.a * lx + T.c * ly + T.e, y: T.b * lx + T.d * ly + T.f, r: l.r * Math.abs(sx) * k, kind: l.kind, glow: l.glow, alpha: ctx.globalAlpha, seed: lx * 7.1 + ly * 3.3 + HB.hash32(String(o.key)) % 997 }); }
        if (v.glowImg) MA.lights.push({ img: v.glowImg, m: [T.a, T.b, T.c, T.d, T.e, T.f], dx, dy, dw, dh, alpha: ctx.globalAlpha });
      }
      ctx.restore();
      return { id: r.id, v, sx, sy, dx, dy, dw, dh, flip };
    },
    draw(ctx, ids, x, y, param, o = {}) { const r = (o.tone && MA.resolve(ids.map(i => i + '@' + o.tone), o.key)) || MA.resolve(ids, o.key); return r ? MA.drawResolved(ctx, r, x, y, param, o) : HB.mapInk && HB.mapInk.draw(ctx, ids, x, y, param, o); },
    // ---------- places: the id chain for a location, most specific first
    placeIds(L) {
      const sub = L.type === 'camp' ? L.camp : L.type === 'stronghold' ? L.lieutenant : L.type === 'city' && L.tier >= 4 ? 'great' : null;
      const st = L.type === 'ruin' ? null : L.state === 'burned' ? 'burned' : (L.state === 'abandoned' || L.state === 'ruin') ? 'ruin' : null;
      const ids = [], b = 'map.place.' + L.type;
      if (sub) { if (st) ids.push(`${b}.${sub}.${st}`); ids.push(`${b}.${sub}`); }
      if (st) ids.push(`${b}.${st}`);
      ids.push(b);
      return { ids, state: st };
    },
    /** label offset (logical px) of a place's art, if its art defines one */
    labelOffset(L) {
      if (!MA.entries.size) return null;
      const r = MA.resolve(MA.placeIds(L).ids, 'loc' + L.id);
      return r && r.v.labelOffset ? r.v.labelOffset : null;
    },
    /** what is loaded, for the debug overlay and the handoff docs */
    report() {
      let bytes = 0, images = 0; const seen = new Set();
      for (const e of MA.entries.values()) for (const v of e.variants) if (v.img && !seen.has(v.img.src)) { seen.add(v.img.src); images++; bytes += v.img.naturalWidth * v.img.naturalHeight * 4; }
      const drawing = [...MA.entries.values()].filter(e => e.variants.some(v => v.ready)).map(e => e.id);
      for (const e of MA.entries.values()) for (const v of e.variants) { if (v.imgs) for (const k in v.imgs) if (!seen.has(v.imgs[k].src)) { seen.add(v.imgs[k].src); images++; bytes += v.n * v.n * 4; } if (v.bloom && v.img && !seen.has(v.img.src)) { seen.add(v.img.src); images++; bytes += v.n * v.n * 4; } }
      return { pack: MA.packName, ids: MA.entries.size, drawing, images, decodedBytes: bytes, loading: MA.loading, warnings: MA.warnings.slice() };
    },
  };
})();
