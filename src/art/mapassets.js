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
    wash: { kind: [138, 150, 58], cruel: [122, 56, 32], reach: [128, 104, 70] },
    edge: { kind: 'rgba(96,110,30,0.55)', cruel: 'rgba(110,36,20,0.55)', reach: 'rgba(90,70,40,0.35)' },
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
      MA.entries.clear(); MA.pack = null; MA.packName = name; MA.style = merge(DEFAULT_STYLE, {}); MA.bump();
      if (name === 'none') return Promise.resolve(false);
      if (!/^[\w-]+$/.test(name)) { MA.warn(`bad pack name "${name}"`); return Promise.resolve(false); }
      MA._pending = name;
      return new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = `assets/map/packs/${name}/pack.js`;
        s.onload = () => resolve(!!MA.pack);
        s.onerror = async () => {
          if (/^https?:/.test(location.protocol)) {
            try { const r = await fetch(`assets/map/packs/${name}/pack.json`, { cache: 'no-cache' }); if (r.ok) { MA.definePack(await r.json(), name); resolve(true); return; } } catch (e) { /* fall through */ }
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
      const base = `assets/map/packs/${name}/`;
      const list = Array.isArray(pack && pack.assets) ? pack.assets.map(a => [a && a.id, a]) : Object.entries((pack && pack.assets) || {});
      for (const [id, def] of list) {
        if (!id || typeof id !== 'string') { MA.warn(`pack "${name}": an asset has no id`); continue; }
        if (MA.entries.has(id)) { MA.warn(`duplicate id ${id}: the first one is used`); continue; }
        const fam = HB.mapSpecFamily ? HB.mapSpecFamily(id) : null;
        if (!fam) { MA.warn(`unknown id ${id} (not in src/data/mapspec.js); ignored`); continue; }
        const variants = ((def && def.variants) || []).map((v, i) => MA.variant(id, fam, v, i, base)).filter(Boolean);
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
        sampling: v.sampling === 'pixel' ? 'pixel' : 'smooth', labelOffset: num(v.labelOffset, 2) ? v.labelOffset : null, attach: v.attach || null, family: spec, ready: false, failed: false, img: null, maskCanvas: null, tintImg: null, tintCache: new Map() };
      MA.loadImage(out, src, (img) => {
        const nw = img.naturalWidth, nh = img.naturalHeight;
        if (rect ? (rect[0] + rect[2] > nw || rect[1] + rect[3] > nh) : (nw !== size[0] || nh !== size[1])) { out.failed = true; MA.warn(`${where}: ${src} is ${nw}×${nh}, which does not match ${rect ? 'the rect ' + rect.join(',') : 'sourceSize ' + size.join('×')}; refused`); MA.bump(); return; }
        out.img = img; out.ready = true; MA.bump();
      }, () => { out.failed = true; MA.warn(`${where}: could not load ${src}`); MA.bump(); });
      if (typeof v.occlusionMask === 'string') MA.loadImage(out, /^(assets\/|data:)/.test(v.occlusionMask) ? v.occlusionMask : base + v.occlusionMask, (m) => { out.maskCanvas = MA.colourise(m, out.rect, PAPER, 1); MA.bump(); }, () => MA.warn(`${where}: could not load occlusionMask`));
      if (typeof v.tintMask === 'string') MA.loadImage(out, /^(assets\/|data:)/.test(v.tintMask) ? v.tintMask : base + v.tintMask, (m) => { out.tintImg = m; MA.bump(); }, () => MA.warn(`${where}: could not load tintMask`));
      return out;
    },
    loadImage(owner, src, ok, fail) { const img = new Image(); MA.loading++; img.onload = () => { MA.loading--; ok(img); }; img.onerror = () => { MA.loading--; fail(); }; img.src = src; },
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
      const flip = v.allowFlipX && (HB.hash32('flip:' + o.key) & 1);
      ctx.save();
      ctx.imageSmoothingEnabled = v.sampling !== 'pixel';
      if (flip) { ctx.translate(2 * x, 0); ctx.scale(-1, 1); }
      if (v.maskCanvas) ctx.drawImage(v.maskCanvas, dx, dy, dw, dh);
      ctx.drawImage(v.img, v.rect[0], v.rect[1], v.sw, v.sh, dx, dy, dw, dh);
      if (v.tintImg && o.tint) { let t = v.tintCache.get(o.tint); if (!t) { t = MA.colourise(v.tintImg, v.rect, o.tint, 0.9); v.tintCache.set(o.tint, t); } ctx.drawImage(t, dx, dy, dw, dh); }
      ctx.restore();
      return { id: r.id, v, sx, sy, dx, dy, dw, dh, flip };
    },
    draw(ctx, ids, x, y, param, o = {}) { const r = MA.resolve(ids, o.key); return r ? MA.drawResolved(ctx, r, x, y, param, o) : null; },
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
      return { pack: MA.packName, ids: MA.entries.size, drawing, images, decodedBytes: bytes, loading: MA.loading, warnings: MA.warnings.slice() };
    },
  };
})();
