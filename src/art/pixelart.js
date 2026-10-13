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
    /** a definition's frames as canvases (cached on the definition) */
    canvases(def) {
      if (def._canvases) return def._canvases;
      const pal = (def.palette || []).map(hex), w = def.w | 0, h = def.h | 0;
      def._canvases = (def.frames || []).map((f) => {
        const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h);
        const g = c.getContext('2d'), img = g.createImageData(c.width, c.height), D = img.data;
        (f.rows || []).forEach((row, y) => { if (y >= h) return; for (let x = 0; x < Math.min(w, row.length); x++) { const i = ALPHABET.indexOf(row[x]); if (i < 0 || !pal[i]) continue; const o = (y * w + x) * 4; D[o] = pal[i][0]; D[o + 1] = pal[i][1]; D[o + 2] = pal[i][2]; D[o + 3] = pal[i][3]; } });
        g.putImageData(img, 0, 0); return c;
      });
      return def._canvases;
    },
    /** put every sprite and dragon frame into HB.sprites.overrides (map symbols go through mapPack()) */
    apply() {
      const ov = HB.sprites.overrides;
      for (const def of PA.entries.values()) {
        const fr = PA.canvases(def); if (!fr.length) continue;
        const a = def.anchor || [Math.floor(def.w / 2), def.h], base = { x: 0, y: 0, w: def.w, h: def.h, ax: a[0], ay: a[1] };
        if (def.kind === 'sprite') ov.set(def.id, Object.assign({ image: fr[0] }, base));
        else if (def.kind === 'dragon' || def.kind === 'anim') {
          fr.forEach((c, k) => ov.set(`${def.id}.${k}`, Object.assign({ image: c, bodyLength: def.bodyLength }, base)));
          HB.sprites.overrideMeta.set(def.id, { frames: fr.length, fps: def.fps });
        }
      }
      HB.sprites.cache.clear();
    },
    /** the map symbols as a map art pack ('pixel'): nearest-neighbour, one logical px per pixel times def.scale */
    mapPack() {
      const assets = {};
      for (const def of PA.entries.values()) {
        if (def.kind !== 'map') continue;
        const s = def.scale || 1, a = def.anchor || [def.w / 2, def.h];
        assets[def.id] = { variants: PA.canvases(def).map((c, i) => ({ id: 'v' + (i + 1), src: c.toDataURL('image/png'), sourceSize: [def.w, def.h], logicalSize: [def.w * s, def.h * s], anchorPx: [a[0], a[1]], sampling: 'pixel', allowFlipX: !!def.flip })) };
      }
      return { schemaVersion: 1, name: 'pixel', assets };
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
