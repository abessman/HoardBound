/* Pixel art made with the editor (editor/index.html), stored in assets/pixelart/ as small readable files:
 *   index.js    HB.pixelArt.index([...file names])            (written by the editor)
 *   <id>.js     HB.pixelArt.add({ id, kind, w, h, anchor, palette, frames: [{ rows: [...] }] })
 * A row is one character per pixel: '.' is transparent, otherwise ALPHABET[i] is palette[i].
 * A drawing with layers stores layers: [{ name, hidden?, frames: [{ rows }] }] (bottom first) instead of frames; the
 * game flattens the visible ones (a pixel comes from the topmost layer that has one; hidden layers stay out).
 * Kinds: 'sprite' replaces the HB.sprites id (raid people, animals, props; the first frame is used);
 *        'dragon' is dragon.<tier>.<pose>: frame k replaces dragon.<tier>.<pose>.<k> (every breed and alignment);
 *        'anim' is any other registered picture (HB.art, e.g. lair.dragon.<tier>.perch, lair.room.forge): frame k
 *        replaces its frame k, and the drawing's frame count and fps are used;
 *        'map' is a map symbol id: each frame is a variant, drawn through the 'pixel' map art pack (Settings → Map art).
 * Loaded at boot with script tags, so it also works from file://. With ?drafts=1 the editor's unsaved drafts in this
 * browser are applied on top (the editor's "preview in game" buttons use it). Guide: docs/pixel-editor.md. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;
  const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const DRAFTS = 'hb.pixelart.drafts';

  const PA = HB.pixelArt = {
    ALPHABET, DRAFTS, files: [], entries: new Map(), loaded: null, base: 'assets/pixelart/',
    /** the editor's saved palettes (assets/pixelart/palettes.js, loaded by the editor only): [{ name, colors: ['#rrggbb'] }] */
    palettes(list) { PA.savedPalettes = Array.isArray(list) ? list : []; },
    index(list) { PA.files = Array.isArray(list) ? list.filter(f => typeof f === 'string' && /^[\w.~-]+\.js$/.test(f)) : []; },
    add(def) { if (def && typeof def.id === 'string') { if (Array.isArray(def.layers) && !def.frames) def.frames = PA.flatten(def); PA.entries.set(def.id, def); } },
    /** a layered drawing's visible layers merged into frames (the topmost pixel wins) */
    flatten(def) {
      const layers = def.layers.filter(l => l && !l.hidden && Array.isArray(l.frames)), n = Math.max(0, ...def.layers.map(l => (l && l.frames ? l.frames.length : 0))), w = def.w | 0, h = def.h | 0;
      return Array.from({ length: Math.max(1, n) }, (_, k) => ({ rows: Array.from({ length: h }, (_, y) => {
        let row = '';
        for (let x = 0; x < w; x++) { let ch = '.'; for (let i = layers.length - 1; i >= 0; i--) { const f = layers[i].frames[k], c = f && f.rows && f.rows[y] ? f.rows[y][x] : '.'; if (c && c !== '.') { ch = c; break; } } row += ch; }
        return row;
      }) }));
    },
    /** the file a sprite id is stored in ('|' and other odd characters become '~') */
    fileOf(id) { return id.replace(/[^\w.-]/g, '~') + '.js'; },
    script(src) { return new Promise((ok) => { const s = document.createElement('script'); s.src = src; s.onload = () => ok(true); s.onerror = () => ok(false); document.head.appendChild(s); }); },
    /** load the index and every sprite file once; resolves when the art is applied (missing files are skipped) */
    load(base) {
      if (PA.loaded) return PA.loaded;
      if (base) PA.base = base;
      PA.loaded = (async () => {
        if (await PA.script(PA.base + 'index.js')) await Promise.all(PA.files.map(f => PA.script(PA.base + f)));
        if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('drafts')) PA.applyDrafts();
        PA.apply();
        return true;
      })();
      return PA.loaded;
    },
    applyDrafts() {
      try { const d = JSON.parse(localStorage.getItem(DRAFTS) || '{}'); for (const id in d) { if (d[id] === null) PA.entries.delete(id); else PA.add(d[id]); } } catch (e) { /* no drafts */ }
    },
    /** a definition's frames as canvases (cached on the definition); tone 'good' or 'evil' shifts the colours */
    canvases(def, tone) {
      const cache = tone ? (def._toned = def._toned || {}) : null;
      if (tone ? cache[tone] : def._canvases) return tone ? cache[tone] : def._canvases;
      const pal = (tone ? PA.tonedPalette(def, tone) : def.palette || []).map(hex), w = def.w | 0, h = def.h | 0;
      const list = (def.frames || []).map((f) => {
        const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h);
        const g = c.getContext('2d'), img = g.createImageData(c.width, c.height), D = img.data;
        (f.rows || []).forEach((row, y) => { if (y >= h) return; for (let x = 0; x < Math.min(w, row.length); x++) { const i = ALPHABET.indexOf(row[x]); if (i < 0 || !pal[i]) continue; const o = (y * w + x) * 4; D[o] = pal[i][0]; D[o + 1] = pal[i][1]; D[o + 2] = pal[i][2]; D[o + 3] = pal[i][3]; } });
        g.putImageData(img, 0, 0); return c;
      });
      if (tone) cache[tone] = list; else def._canvases = list;
      return list;
    },
    // ---- good and evil tones: drawn art shown in a kind or cruel setting (the dragon by its deeds, the lair by its
    // dragon, map symbols in a protector's or tyrant's land) gets a colour shift, automatic unless the drawing sets
    // its own (def.tones = { good: {...}, evil: {...} }, adjusted in the editor)
    TONES: { good: { hue: 6, sat: 15, light: 8, tint: '#e2c75c', mix: 12 }, evil: { hue: -12, sat: -40, light: -18, tint: '#4a1c1c', mix: 20 } },
    tone(def, which) { return Object.assign({}, PA.TONES[which], def && def.tones && def.tones[which]); },
    /** a colour shifted by a tone's hue (degrees), saturation and lightness (percent) and mixed toward its tint */
    shiftHex(h, t) {
      const c = hex(h); if (!c) return h;
      let [r, g, b] = [c[0] / 255, c[1] / 255, c[2] / 255];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let H = 0, S = 0, L = (mx + mn) / 2;
      if (mx !== mn) { const d = mx - mn; S = L > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); H = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; H *= 60; }
      H = (H + (t.hue || 0) + 720) % 360; S = Math.min(1, Math.max(0, S * (1 + (t.sat || 0) / 100)));
      const lt = (t.light || 0) / 100; L = Math.min(1, Math.max(0, lt >= 0 ? L + (1 - L) * lt : L * (1 + lt)));
      const q = L < 0.5 ? L * (1 + S) : L + S - L * S, p = 2 * L - q, f = (u) => { u = (u + 1) % 1; return u < 1 / 6 ? p + (q - p) * 6 * u : u < 0.5 ? q : u < 2 / 3 ? p + (q - p) * (2 / 3 - u) * 6 : p; };
      const tc = hex(t.tint) || [0, 0, 0], m = Math.min(1, Math.max(0, (t.mix || 0) / 100));
      const out = [f(H / 360 + 1 / 3), f(H / 360), f(H / 360 - 1 / 3)].map((v, i) => Math.round((v * 255) * (1 - m) + tc[i] * m));
      return '#' + out.map(v => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0')).join('') + (c[3] < 255 ? c[3].toString(16).padStart(2, '0') : '');
    },
    tonedPalette(def, which) { const t = PA.tone(def, which); return (def.palette || []).map(c => PA.shiftHex(c, t)); },
    /** put every sprite and dragon frame into HB.sprites.overrides (map symbols go through mapPack()) */
    apply() {
      const ov = HB.sprites.overrides;
      for (const def of PA.entries.values()) {
        const fr = PA.canvases(def); if (!fr.length) continue;
        const a = def.anchor || [Math.floor(def.w / 2), def.h], base = { x: 0, y: 0, w: def.w, h: def.h, ax: a[0], ay: a[1] };
        if (def.kind === 'sprite') ov.set(def.id, Object.assign({ image: fr[0] }, base));
        else if (def.kind === 'dragon' || def.kind === 'anim') {
          fr.forEach((c, k) => ov.set(`${def.id}.${k}`, Object.assign({ image: c, bodyLength: def.bodyLength }, base)));
          for (const tn of ['good', 'evil']) PA.canvases(def, tn).forEach((c, k) => ov.set(`${def.id}.${k}.${tn}`, Object.assign({ image: c, bodyLength: def.bodyLength }, base)));
          HB.sprites.overrideMeta.set(def.id, { frames: fr.length, fps: def.fps });
        }
      }
      HB.sprites.cache.clear();
    },
    /** the map symbols as a map art pack ('pixel'): nearest-neighbour, one logical px per pixel times def.scale.
     *  Each frame is a variant cut to what is drawn in it (stretched to hold the anchor), so variants drawn at
     *  different sizes on one canvas keep their own sizes on the map; empty frames are skipped. A state the world
     *  draws smaller or larger (a small or large mountain: MAP_SPEC drawnK) is sized so it shows at about its drawn size. */
    mapPack() {
      const assets = {};
      for (const def of PA.entries.values()) {
        if (def.kind !== 'map') continue;
        const s = (def.scale || 1) / (HB.mapDrawnK ? HB.mapDrawnK(def.id) : 1), a = def.anchor || [def.w / 2, def.h], variants = [];
        const toned = { good: PA.canvases(def, 'good'), evil: PA.canvases(def, 'evil') };
        PA.canvases(def).forEach((c, i) => {
          const b = PA.frameBox(def, i); if (!b) return;
          const x0 = Math.min(b.x, a[0]), y0 = Math.min(b.y, a[1]), w = Math.max(1, Math.max(b.x + b.w, a[0]) - x0), h = Math.max(1, Math.max(b.y + b.h, a[1]) - y0);
          const cut = (src) => { const k = document.createElement('canvas'); k.width = w; k.height = h; k.getContext('2d').drawImage(src, -x0, -y0); return k.toDataURL('image/png'); };
          variants.push({ id: 'v' + (i + 1), src: cut(c), tones: { good: cut(toned.good[i]), evil: cut(toned.evil[i]) }, sourceSize: [w, h], logicalSize: [w * s, h * s], anchorPx: [a[0] - x0, a[1] - y0], sampling: 'pixel', allowFlipX: !!def.flip });
        });
        if (variants.length) assets[def.id] = { variants };
      }
      return { schemaVersion: 1, name: 'pixel', assets };
    },
    /** the box around frame k's drawn pixels { x, y, w, h }, or null when it is empty */
    frameBox(def, k) {
      const rows = (def.frames[k] && def.frames[k].rows) || []; let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
      rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== '.') { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } });
      return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    },
  };
  /** '#rgb', '#rrggbb' or '#rrggbbaa' → [r, g, b, a] */
  function hex(s) {
    s = String(s || '').replace('#', ''); if (s.length === 3) s = s.split('').map(c => c + c).join('');
    const n = parseInt(s.slice(0, 6), 16); if (!(n >= 0)) return null;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, s.length >= 8 ? parseInt(s.slice(6, 8), 16) : 255];
  }
  PA.hex = hex;
})();
