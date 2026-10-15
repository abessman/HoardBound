/* Pixel art made with the editor (editor/index.html), stored in assets/pixelart/ as small readable files:
 *   index.js    HB.pixelArt.index([...file names])            (written by the editor)
 *   <id>.js     HB.pixelArt.add({ id, kind, w, h, anchor, palette, frames: [{ rows: [...] }] })
 * A row is one character per pixel: '.' is transparent, otherwise ALPHABET[i] is palette[i].
 * A drawing with layers stores layers: [{ name, hidden?, opacity?, wash?, frames: [{ rows }] }] (bottom first) instead
 * of frames; the game stacks the visible ones (hidden layers stay out) with real transparency: a layer's opacity
 * (0–100) and its colours' own (#rrggbbaa). wash (0–100, default 100) is how much of the map's territory watercolour
 * lands on that layer's pixels; less leaves them clearer (map symbols only). A shading layer ({ shade: { light, dark,
 * hatch } }) holds marks, not colours ('1' lit, '2' shadow, '3' deep shadow, painted for a light from the left): it
 * lights the layers under it (toward a warm light, toward ink; hatched lines when hatch), and a mirrored or relit
 * drawing swaps lit and shadow so the light stays on its side. A light layer ({ light: { glow, size } }) holds light
 * marks ('1' fire, '2' window or candle, '3' lantern, '4' magic, '5' embers, '6' smoke: PA.LIGHTS; a mark is kind +
 * 8 × intensity step, PA.LEVELS): it does not change the picture by day; at night the game glows the marked pixels and
 * casts a pool of light around each patch (map symbols: the map's time of day, Settings); smoke rises from its patches
 * day and night; a layer's light.when (['day', 'dusk', 'night']) says when its marks show instead. PA.lightsOf(def, frame)
 * gives the patches and the glowing pixels.
 * Kinds: 'sprite' replaces the HB.sprites id (raid people, animals, props; several frames play at the drawing's fps);
 *        'dragon' is dragon.<tier>.<pose>: frame k replaces dragon.<tier>.<pose>.<k> (every breed and alignment); the game
 *        plays all its frames at its fps (HB.dragonArt.frameAt), so the animation is as long as you draw it;
 *        'anim' is any other registered picture (HB.art, e.g. lair.dragon.<tier>.perch, lair.room.forge): frame k
 *        replaces its frame k, and the drawing's frame count and fps are used;
 *        'map' is a map symbol id: each frame is a variant, drawn through the 'pixel' map art pack (Settings → Map art).
 * Separate drawings of one id: '<id>#2', '<id>#3' … are more variants of a map symbol (the map picks one per spot), and
 * '<id>@good' / '<id>@evil' (also '<id>#2@evil') are its own good and evil versions, used in a kind or a cruel setting
 * instead of the automatic tint. Each is its own file ('#' and '@' become '~' in the file name).
 * Directions: the plain drawing faces east (right); '<id>>n', '>ne', '>se', '>s', '>sw', '>w', '>nw' are drawings of the
 * same sprite facing other ways, each with its own frames (its own animation). The base drawing's dirs (2, 4 or 8) says
 * how many the sprite uses; a missing one mirrors the other side ('w' from 'e', 'nw' from 'ne') or takes the nearest
 * drawn direction (PA.pickDir). The map's dragon and travellers turn this way as they move.
 * Loaded at boot with script tags, so it also works from file://. With Settings → Your drawings → Local test (or
 * ?localart=1) the drawings saved locally in the editor (this browser, not yet on GitHub) are applied on top; with
 * ?drafts=1 the editor's unsaved drafts (its "preview in game" buttons). Guide: docs/pixel-editor.md. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;
  const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const DRAFTS = 'hb.pixelart.drafts', LOCAL = 'hb.pixelart.local';

  // the editor saved locally (or, in a preview, a draft changed) in another tab: show it here straight away
  let relight = 0;
  window.addEventListener('storage', (e) => {
    const q = new URLSearchParams(location.search);
    if (!PA.loaded || !((e.key === LOCAL && (PA.source === 'local' || q.has('localart'))) || (e.key === DRAFTS && q.has('drafts')))) return;
    clearTimeout(relight); relight = setTimeout(() => PA.useSource(PA.source), 250);
  });

  const PA = HB.pixelArt = {
    ALPHABET, DRAFTS, LOCAL, files: [], entries: new Map(), loaded: null, base: 'assets/pixelart/',
    source: 'github', // where drawings come from: 'github' (the files) or 'local' (this browser's local saves on top)
    fileEntries: null, // the drawings as the files have them (to switch source without reloading)
    /** the editor's saved palettes (assets/pixelart/palettes.js, loaded by the editor only): [{ name, colors: ['#rrggbb'] }] */
    palettes(list) { PA.savedPalettes = Array.isArray(list) ? list : []; },
    index(list) { PA.files = Array.isArray(list) ? list.filter(f => typeof f === 'string' && /^[\w.~-]+\.js$/.test(f)) : []; },
    add(def) { if (def && typeof def.id === 'string') { if (Array.isArray(def.layers) && !def.frames) def.frames = PA.flatten(def); PA.entries.set(def.id, def); } },
    /** a layered drawing's visible layers merged into frames (the topmost pixel wins) */
    flatten(def) {
      const layers = def.layers.filter(l => l && !l.hidden && !l.shade && !l.light && Array.isArray(l.frames)), n = Math.max(0, ...def.layers.map(l => (l && l.frames ? l.frames.length : 0))), w = def.w | 0, h = def.h | 0;
      return Array.from({ length: Math.max(1, n) }, (_, k) => ({ rows: Array.from({ length: h }, (_, y) => {
        let row = '';
        for (let x = 0; x < w; x++) { let ch = '.'; for (let i = layers.length - 1; i >= 0; i--) { const f = layers[i].frames[k], c = f && f.rows && f.rows[y] ? f.rows[y][x] : '.'; if (c && c !== '.') { ch = c; break; } } row += ch; }
        return row;
      }) }));
    },
    /** stack layers ({ at(i): palette index or -1, op: 0–1, wash: 0–1 }, bottom first) into RGBA pixels with real
     *  transparency, and the wash cut-out (how much of the territory wash to take off each pixel; null when none) */
    composite(w, h, layers, pal) {
      const n = w * h, rgba = new Uint8ClampedArray(n * 4), cut = new Uint8ClampedArray(n); let any = false;
      for (let i = 0; i < n; i++) {
        let A = 0, R = 0, G = 0, B = 0, K = 0;
        for (const L of layers) {
          const v = L.at(i); if (v < 0 || L.light) continue;
          if (L.shade) { // light the colours below (premultiplied): lit toward a warm light, shadow toward ink
            if (A <= 0 || v < 1 || v > 3) continue; const m = L.swap && v < 3 ? 3 - v : v, S = L.shade;
            let t, c;
            if (m === 1) { t = (S.light === undefined ? 35 : S.light) / 100; c = LIGHT; }
            else { const dk = (S.dark === undefined ? 35 : S.dark) / 100; t = m === 3 ? Math.min(1, dk * 1.7) : dk; c = INK;
              if (S.hatch) { const x = i % w, y = (i / w) | 0; t = (m === 3 ? (x + y) % 2 === 0 : (x + y) % 3 === 0) ? Math.min(1, t * 2.2) : t * 0.25; } }
            R = R * (1 - t) + c[0] * A * t; G = G * (1 - t) + c[1] * A * t; B = B * (1 - t) + c[2] * A * t; continue;
          }
          const c = pal[v]; if (!c) continue;
          const a = c[3] / 255 * L.op; if (a <= 0) continue; const ia = 1 - a;
          R = c[0] * a + R * ia; G = c[1] * a + G * ia; B = c[2] * a + B * ia; K = (1 - L.wash) * a + K * ia; A = a + A * ia;
        }
        if (A > 0) { const o = i * 4; rgba[o] = R / A; rgba[o + 1] = G / A; rgba[o + 2] = B / A; rgba[o + 3] = A * 255; }
        if (K > 0.004) { cut[i] = K * 255; any = true; }
      }
      return { rgba, cut: any ? cut : null };
    },
    /** a layer's shading settings ({ light, dark, hatch }), or null for a colour layer */
    shadeOf(l) { return l && l.shade ? Object.assign({ light: 35, dark: 35, hatch: false }, typeof l.shade === 'object' ? l.shade : {}) : null; },
    hasShade(def) { return Array.isArray(def.layers) && def.layers.some(l => l && !l.hidden && l.shade); },
    // ---- lights: marks for where light comes from (a camp's fire, a castle's windows, a traveller's lantern). r is the
    // pool's reach in the drawing's pixels (times the layer's size, a little more for a bigger patch); flicker and pulse
    // make it move. Index = the mark ('1'…'5').
    LIGHTS: [null,
      { name: 'Fire', color: '#ff8a2c', r: 7, flicker: 1 },
      { name: 'Window', color: '#ffcf6a', r: 4.5, flicker: 0.12 },
      { name: 'Lantern', color: '#ffe39a', r: 3.5, flicker: 0.35 },
      { name: 'Magic', color: '#86d3ff', r: 6, pulse: 1 },
      { name: 'Embers', color: '#e0522e', r: 3, flicker: 0.6 },
      { name: 'Smoke', color: '#6a5a4a', r: 4, smoke: 1 }],
    /** times of day as bits: when a light layer's marks show (light.when: ['day', 'dusk', 'night']) */
    WHEN: { day: 1, dusk: 2, night: 4 },
    /** the times a layer's marks of a kind show (bits): the layer's own Day / Dusk / Night ticks, else by kind: lights at
     *  dusk and night, smoke all the time */
    whenOf(set, kind) { const w = set && set.when; if (Array.isArray(w)) return w.reduce((m, k) => m | (PA.WHEN[k] || 0), 0); return PA.LIGHTS[kind] && PA.LIGHTS[kind].smoke ? 7 : 6; },
    /** the time-of-day bit for how dark the map is (0 day … 1 night): day 1, dusk 2, night 4 */
    timeBit(night) { return night < 0.2 ? 1 : night < 0.8 ? 2 : 4; },
    /** a light mark's intensity (bright, or for smoke thick) by its step (mark >> 3); step 0 is the plain mark, 100% */
    LEVELS: [1, 0.25, 0.5, 0.75, 1.5, 2, 3],
    /** a light mark: its kind (mark & 7, PA.LIGHTS) and intensity step (mark >> 3, PA.LEVELS), or null when it is none */
    lightMark(v) { const k = v & 7, s = v >> 3; return v >= 1 && k >= 1 && k < PA.LIGHTS.length && s < PA.LEVELS.length ? { kind: k, step: s, level: PA.LEVELS[s] } : null; },
    /** a column of smoke rising from (x, y) on g, in g's pixels: r the patch's reach, dens its thickness, a its opacity;
     *  t the time (s), seed to keep spots out of step. Many small, irregular soft puffs in a stream: thin and dark at the
     *  source, swelling, lightening and thinning as they rise, curling and leaning with the wind */
    drawSmoke(g, x, y, r, dens, a, seed, t) {
      const R = Math.max(1.5, r), d = Math.min(3, Math.max(0.25, dens || 1)), n = Math.round(18 + 8 * d), life = 4.8, H = R * 7.5, spr = PA.smokeSprites(), ga = g.globalAlpha;
      const fr = (v) => v - Math.floor(v), hs = (i, k) => fr(Math.sin(seed * 12.9898 + i * 78.233 + k * 37.719) * 43758.5453); // steady per-puff randomness
      for (let i = 0; i < n; i++) {
        const ph = fr(t / life + (i + hs(i, 1) * 0.6) / n + hs(0, 9)); // age 0 (just out) … 1 (gone)
        const rise = (1 - Math.pow(1 - ph, 1.35)) * H, y1 = y - rise; // quick out of the fire, slower higher up
        const lean = ph * ph * R * 2.6; // the wind takes it as it rises
        const curl = Math.sin(t * 0.8 + rise / R * 0.55 + seed) * R * 0.45 * ph + Math.sin(t * 1.9 + i * 2.1 + seed * 0.3) * R * 0.18 * ph;
        const x1 = x + lean + curl + (hs(i, 2) - 0.5) * R * 0.5 * Math.sqrt(ph);
        const size = R * (0.36 + 1.45 * ph) * (0.75 + 0.5 * hs(i, 3));
        const al = Math.min(1, (0.16 + 0.09 * d) * Math.min(1, ph / 0.06) * Math.pow(1 - ph, 1.35) * (0.65 + 0.7 * hs(i, 4)) * a); if (al < 0.01) continue;
        const sp = spr[ph < 0.22 ? 0 : ph < 0.55 ? 1 : 2][Math.floor(hs(i, 5) * spr[0].length)], ang = hs(i, 6) * 6.283 + t * (hs(i, 7) - 0.5) * 0.6;
        g.save(); g.globalAlpha = ga * al; g.translate(x1, y1); g.rotate(ang); g.drawImage(sp, -size, -size, size * 2, size * 2); g.restore();
      }
    },
    /** soft, lumpy smoke puffs (a few overlapping blobs each), in three tones from the fire's dark to a pale grey-brown;
     *  made once: [tone][shape] canvases */
    smokeSprites() {
      if (PA._smoke) return PA._smoke;
      let q = 917; const rnd = () => ((q = (q * 16807) % 2147483647) / 2147483647), S = 64, tones = ['#4b3e32', '#6e6152', '#9c8f7d'];
      const shapes = Array.from({ length: 5 }, () => Array.from({ length: 4 + Math.floor(rnd() * 3) }, (_, k) => ({ x: (rnd() - 0.5) * (k ? 0.5 : 0.15), y: (rnd() - 0.5) * (k ? 0.45 : 0.15), r: 0.22 + rnd() * 0.2 })));
      return (PA._smoke = tones.map(tone => { const c0 = hex(tone); return shapes.map(blobs => {
        const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
        for (const b of blobs) { const bx = S / 2 + b.x * S, by = S / 2 + b.y * S, br = b.r * S, gr = g.createRadialGradient(bx, by, 0, bx, by, br);
          gr.addColorStop(0, `rgba(${c0[0]},${c0[1]},${c0[2]},0.55)`); gr.addColorStop(0.55, `rgba(${c0[0]},${c0[1]},${c0[2]},0.28)`); gr.addColorStop(1, `rgba(${c0[0]},${c0[1]},${c0[2]},0)`);
          g.fillStyle = gr; g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill(); }
        return c; }); }));
    },
    /** a layer's light settings ({ glow, size }, percent), or null for a layer that is not a light layer */
    lightOf(l) { return l && l.light ? Object.assign({ glow: 100, size: 100 }, typeof l.light === 'object' ? l.light : {}) : null; },
    hasLights(def) { return !!def && Array.isArray(def.layers) && def.layers.some(l => l && !l.hidden && l.light); },
    /** light patches from marks (at(i): a light mark, or anything else for none): one spot per connected patch of one
     *  mark (kind and intensity), at its middle, { kind, x, y, n (pixels), r (reach in pixels), glow (0–3: the layer's
     *  glow × the mark's intensity; for smoke its thickness) } */
    lightSpots(w, h, at, set) {
      const seen = new Uint8Array(w * h), out = [], st = [], size = (set && set.size !== undefined ? +set.size : 100) / 100, glow = (set && set.glow !== undefined ? +set.glow : 100) / 100;
      for (let i = 0; i < w * h; i++) {
        const k = at(i), m = PA.lightMark(k); if (!m || seen[i]) continue;
        let sx = 0, sy = 0, n = 0; st.length = 0; st.push(i); seen[i] = 1;
        while (st.length) {
          const j = st.pop(), x = j % w, y = (j / w) | 0; sx += x + 0.5; sy += y + 0.5; n++;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const q = yy * w + xx; if (!seen[q] && at(q) === k) { seen[q] = 1; st.push(q); } }
        }
        out.push({ kind: m.kind, x: sx / n, y: sy / n, n, r: PA.LIGHTS[m.kind].r * size * (1 + Math.sqrt(n) * 0.18), glow: glow * m.level, when: PA.whenOf(set, m.kind) });
      }
      return out;
    },
    /** frame k's lights: { spots, glow (a canvas of the marked pixels in their light's colour) }, or null; cached */
    lightsOf(def, k) {
      if (!PA.hasLights(def)) return null;
      const cache = def._lights || (def._lights = []); if (cache[k] !== undefined) return cache[k];
      const w = def.w | 0, h = def.h | 0, groups = new Map(); let spots = []; // glowing pixels by when they show (bits)
      for (const l of def.layers) {
        if (!l || l.hidden || !l.light) continue;
        const set = PA.lightOf(l), when = PA.whenOf(set, 1), kinds = new Int8Array(w * h), rows = (l.frames && l.frames[k] && l.frames[k].rows) || [];
        let gr = groups.get(when); if (!gr) groups.set(when, gr = { all: new Int8Array(w * h), lvl: new Uint8Array(w * h), any: false });
        rows.forEach((row, y) => { if (y >= h) return; for (let x = 0; x < Math.min(w, row.length); x++) { const v = ALPHABET.indexOf(row[x]), m = PA.lightMark(v); if (m) { kinds[y * w + x] = v; if (!PA.LIGHTS[m.kind].smoke) { gr.all[y * w + x] = m.kind; gr.lvl[y * w + x] = m.step; gr.any = true; } } } });
        spots = spots.concat(PA.lightSpots(w, h, (i) => kinds[i], set));
      }
      if (!spots.length) return (cache[k] = null);
      const glows = [];
      for (const [when, gr] of groups) {
        if (!gr.any) continue;
        const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); const g = c.getContext('2d'), img = g.createImageData(c.width, c.height);
        for (let i = 0; i < w * h; i++) if (gr.all[i] > 0) { const col = hex(PA.LIGHTS[gr.all[i]].color), o = i * 4; img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = Math.round(255 * Math.min(1, 0.35 + 0.65 * PA.LEVELS[gr.lvl[i]])); } // dimmer marks glow less
        g.putImageData(img, 0, 0); glows.push({ when, canvas: c });
      }
      return (cache[k] = { spots, glows });
    },
    layerOpacity(l) { return (l && l.opacity !== undefined ? Math.min(100, Math.max(0, +l.opacity || 0)) : 100) / 100; },
    layerWash(l) { return (l && l.wash !== undefined ? Math.min(100, Math.max(0, +l.wash || 0)) : 100) / 100; },
    /** '<base>#<n>><dir>@<tone>' → { base, n (1 when none), dir ('' when none: east), tone ('' when none) } */
    parseId(id) { const m = /^(.*?)(?:#(\d+))?(?:>(ne|nw|se|sw|n|s|e|w))?(?:@(good|evil))?$/.exec(String(id)); return { base: m[1], n: m[2] ? +m[2] : 1, dir: m[3] && m[3] !== 'e' ? m[3] : '', tone: m[4] || '' }; },
    idOf(base, n, tone, dir) { return base + (n > 1 ? '#' + n : '') + (dir && dir !== 'e' ? '>' + dir : '') + (tone ? '@' + tone : ''); },
    // ---- directions: clockwise from east on the screen (south is down, toward you)
    DIRS: ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'],
    MIRROR: { e: 'w', w: 'e', ne: 'nw', nw: 'ne', se: 'sw', sw: 'se' },
    /** the direction of a movement on the screen (dx right, dy down) */
    dirOf(dx, dy) { return PA.DIRS[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8]; },
    /** how many directions a sprite uses: its setting, else what is drawn (has(dir); 'e' is the plain drawing) */
    dirMode(set, has) { if (set === 2 || set === 4 || set === 8) return set; return ['ne', 'nw', 'se', 'sw'].some(d => has(d)) ? 8 : ['n', 's'].some(d => has(d)) ? 4 : 2; },
    /** which drawing shows a sprite facing dir: { dir, flip }. With fewer directions, the nearest one it has (2: east or
     *  west by the movement, facing ±1 for straight up or down); a missing drawing mirrors the other side, else the
     *  nearest drawn direction; nothing drawn: east, flipped when facing left */
    pickDir(dir, has, mode, facing = 1) {
      let want = PA.DIRS.includes(dir) ? dir : 'e';
      if (mode === 4 && want.length === 2) want = want[1];
      if (mode !== 8 && mode !== 4) want = want === 'n' || want === 's' ? (facing < 0 ? 'w' : 'e') : want.includes('w') ? 'w' : 'e';
      if (has(want)) return { dir: want, flip: false };
      const m = PA.MIRROR[want]; if (m && has(m)) return { dir: m, flip: true };
      const side = facing < 0 ? 'w' : 'e', i = PA.DIRS.indexOf(want);
      const order = want === 'n' || want === 's' ? [want + side, want + PA.MIRROR[side], side, PA.MIRROR[side]] : [];
      for (let k = 1; k <= 4; k++) order.push(PA.DIRS[(i + k) % 8], PA.DIRS[(i - k + 8) % 8]);
      for (const d of order) { if (has(d)) return { dir: d, flip: false }; const md = PA.MIRROR[d]; if (md && has(md)) return { dir: md, flip: true }; }
      return { dir: 'e', flip: facing < 0 };
    },
    /** the file a sprite id is stored in ('|' and other odd characters become '~') */
    fileOf(id) { return id.replace(/[^\w.-]/g, '~') + '.js'; },
    script(src) { return new Promise((ok) => { const s = document.createElement('script'); s.src = src; s.onload = () => ok(true); s.onerror = () => ok(false); document.head.appendChild(s); }); },
    /** load the index and every sprite file once; resolves when the art is applied (missing files are skipped) */
    load(base) {
      if (PA.loaded) return PA.loaded;
      if (base) PA.base = base;
      if (HB.settings && HB.settings.artSource === 'local') PA.source = 'local';
      PA.loaded = (async () => {
        if (await PA.script(PA.base + 'index.js')) await Promise.all(PA.files.map(f => PA.script(PA.base + f)));
        PA.fileEntries = new Map(PA.entries);
        PA.overlay();
        PA.apply();
        return true;
      })();
      return PA.loaded;
    },
    /** on top of the files: this browser's local saves (Local test, or ?localart=1), then with ?drafts=1 the drafts */
    overlay() {
      const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
      if (PA.source === 'local' || (q && q.has('localart'))) PA.applyStored(LOCAL);
      if (q && q.has('drafts')) PA.applyStored(DRAFTS);
    },
    applyStored(key) {
      try { const d = JSON.parse(localStorage.getItem(key) || '{}'); for (const id in d) { if (d[id] === null) PA.entries.delete(id); else PA.add(d[id]); } } catch (e) { /* none kept */ }
    },
    applyDrafts() { PA.applyStored(DRAFTS); },
    /** how many drawings are saved locally in this browser (not yet on GitHub) */
    localCount() { try { return Object.keys(JSON.parse(localStorage.getItem(LOCAL) || '{}')).length; } catch (e) { return 0; } },
    /** switch where drawings come from ('github' | 'local') straight away: the files again, the local saves on top */
    useSource(src) {
      PA.source = src === 'local' ? 'local' : 'github';
      if (!PA.loaded) return Promise.resolve(false);
      return PA.loaded.then(() => {
        PA.entries = new Map(PA.fileEntries); PA.overlay(); PA.apply();
        if (HB.mapAssets && HB.mapAssets.packName === 'pixel') HB.mapAssets.use('pixel');
        return true;
      });
    },
    /** a definition's frames as canvases (cached on the definition); tone 'good' or 'evil' shifts the colours. A layered
     *  drawing is stacked with real transparency (PA.composite), which also gives its wash cut-outs (PA.cuts). */
    canvases(def, tone, swap) {
      // swap: lit and shadow exchanged (the drawing seen with the light from the right: a mirrored copy of a shaded drawing)
      if (swap && !PA.hasShade(def)) swap = false;
      const ck = (tone || '') + (swap ? ':swap' : ''), cache = ck ? (def._toned = def._toned || {}) : null;
      if (ck ? cache[ck] : def._canvases) return ck ? cache[ck] : def._canvases;
      const pal = PA.shownPalette(def, tone).map(hex), w = def.w | 0, h = def.h | 0;
      const vis = Array.isArray(def.layers) ? def.layers.filter(l => l && !l.hidden && !l.light && Array.isArray(l.frames)) : null;
      if (vis && vis.length) {
        const cuts = [];
        const list = (def.frames || []).map((_, k) => {
          const layers = vis.map((l) => {
            const idx = new Int16Array(w * h).fill(-1), rows = (l.frames[k] && l.frames[k].rows) || [];
            rows.forEach((row, y) => { if (y >= h) return; for (let x = 0; x < Math.min(w, row.length); x++) idx[y * w + x] = ALPHABET.indexOf(row[x]); });
            return { at: (i) => idx[i], op: PA.layerOpacity(l), wash: PA.layerWash(l), shade: PA.shadeOf(l), swap: !!swap };
          });
          const r = PA.composite(w, h, layers, pal), c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h);
          const g = c.getContext('2d'), img = g.createImageData(c.width, c.height); img.data.set(r.rgba); g.putImageData(img, 0, 0);
          if (!ck) { let m = null; if (r.cut) { m = document.createElement('canvas'); m.width = c.width; m.height = c.height; const mg = m.getContext('2d'), mi = mg.createImageData(c.width, c.height); for (let i = 0; i < r.cut.length; i++) mi.data[i * 4 + 3] = r.cut[i]; mg.putImageData(mi, 0, 0); } cuts.push(m); }
          return c;
        });
        if (ck) cache[ck] = list; else { def._canvases = list; def._cuts = cuts.some(Boolean) ? cuts : null; }
        return list;
      }
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
    /** the wash cut-outs of a layered drawing's frames (canvases whose alpha is how much territory wash to take off), or null */
    cuts(def) { PA.canvases(def); return def._cuts || null; },
    tonedPalette(def, which) { const t = PA.tone(def, which); return (def.palette || []).map(c => PA.shiftHex(c, t)); },
    /** the map's sepia inks, dark to light (by lightness): a colourful drawing can lean toward them (def.sepia) */
    SEPIA: [[0, '#1c1009'], [0.22, '#2b1a0e'], [0.5, '#7a5534'], [0.76, '#b89e68'], [1, '#f1e4c2']],
    /** how far a drawing leans to sepia (0–1) in a tone ('' normal, 'good', 'evil'): def.sepia { normal, good, evil } in
     *  percent; a drawn good or evil version uses its own tone's value */
    sepiaOf(def, tone) { const v = PA.adjustOf(def, 'sepia', tone); return v > 0 ? Math.min(1, v / 100) : 0; },
    /** how much lighter (up to +1) or darker (down to -1) a drawing is shown in a tone: def.bright { normal, good, evil } %,
     *  applied after the lean to sepia (which can darken), like the sepia per version */
    brightOf(def, tone) { const v = PA.adjustOf(def, 'bright', tone); return Math.max(-1, Math.min(1, v / 100)) || 0; },
    /** a per-version adjustment (def[key] { normal, good, evil }, percent) for a tone; a drawn version uses its own tone's */
    adjustOf(def, key, tone) { const s = def && def[key]; if (!s || typeof s !== 'object') return 0; return +s[tone || PA.parseId(def.id || '').tone || 'normal'] || 0; },
    /** a colour leaned toward the sepia ink of the same lightness by a (0–1), keeping its opacity */
    sepiaHex(h, a) {
      const c = hex(h); if (!c || !(a > 0)) return h;
      const L = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255, S = PA.SEPIA; let i = 1; while (i < S.length - 1 && L > S[i][0]) i++;
      const p = hex(S[i - 1][1]), q = hex(S[i][1]), t = Math.min(1, Math.max(0, (L - S[i - 1][0]) / (S[i][0] - S[i - 1][0])));
      const out = [0, 1, 2].map(j => Math.round(c[j] * (1 - a) + (p[j] + (q[j] - p[j]) * t) * a));
      return '#' + out.map(v => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0')).join('') + (c[3] < 255 ? c[3].toString(16).padStart(2, '0') : '');
    },
    /** a colour lighter (b up to 1) or darker (down to -1) as a photo's brightness does it: its perceived lightness
     *  (OKLab) curved up or down, the darks and lights keeping their order, its hue kept and most of its colour */
    brightHex(h, b) {
      const c = hex(h); if (!c || !b) return h;
      const lin = (u) => { u /= 255; return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4); }, gam = (u) => 255 * (u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(Math.max(0, u), 1 / 2.4) - 0.055);
      const r = lin(c[0]), g = lin(c[1]), bl = lin(c[2]);
      const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * bl), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * bl), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * bl);
      const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
      const L2 = Math.pow(Math.max(0, L), b > 0 ? 1 / (1 + 1.6 * b) : 1 + 1.2 * -b), k = L > 0.001 ? Math.min(2.2, Math.pow(L2 / L, 0.85)) : 1; // colour follows the lightness, mostly
      const l2 = Math.pow(L2 + 0.3963377774 * A * k + 0.2158037573 * B * k, 3), m2 = Math.pow(L2 - 0.1055613458 * A * k - 0.0638541728 * B * k, 3), s2 = Math.pow(L2 - 0.0894841775 * A * k - 1.291485548 * B * k, 3);
      const out = [4.0767416621 * l2 - 3.3077115913 * m2 + 0.2309699292 * s2, -1.2684380046 * l2 + 2.6097574011 * m2 - 0.3413193965 * s2, -0.0041960863 * l2 - 0.7034186147 * m2 + 1.707614701 * s2].map(gam);
      return '#' + out.map(v => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0')).join('') + (c[3] < 255 ? c[3].toString(16).padStart(2, '0') : '');
    },
    /** the palette as the game shows a drawing in a tone: the good or evil shift, the lean to sepia, then brightness */
    shownPalette(def, tone) {
      let pal = tone ? PA.tonedPalette(def, tone) : (def.palette || []); const a = PA.sepiaOf(def, tone), b = PA.brightOf(def, tone);
      if (a > 0) pal = pal.map(c => PA.sepiaHex(c, a));
      if (b) pal = pal.map(c => PA.brightHex(c, b)); // lighter or darker, the same colours
      return pal;
    },
    /** put every sprite and dragon frame into HB.sprites.overrides (map symbols go through mapPack()) */
    apply() {
      const ov = HB.sprites.overrides, meta = HB.sprites.overrideMeta, defs = [...PA.entries.values()];
      // what the last apply put in goes first (a switch between GitHub and local drawings), then this one is recorded
      for (const k of PA._ov || []) ov.delete(k); for (const k of PA._meta || []) meta.delete(k);
      const ovKeys = PA._ov = new Set(), metaKeys = PA._meta = new Set();
      const put = (k, v) => { ov.set(k, v); ovKeys.add(k); }, setMeta = (k, v) => { meta.set(k, v); metaKeys.add(k); };
      // the normal drawings (with their automatic good and evil tints), then drawn good and evil versions over the tints
      for (const def of defs) {
        const p = PA.parseId(def.id); if (p.tone || p.n > 1) continue;
        const fr = PA.canvases(def); if (!fr.length) continue;
        const a = def.anchor || [Math.floor(def.w / 2), def.h], base = { x: 0, y: 0, w: def.w, h: def.h, ax: a[0], ay: a[1] };
        // a raid sprite: its first frame by its id; every frame as <id>.<k>, which the raid plays when there are several
        if (def.kind === 'sprite') { put(def.id, Object.assign({ image: fr[0] }, base)); fr.forEach((c, k) => put(`${def.id}.${k}`, Object.assign({ image: c }, base))); setMeta(def.id, { frames: fr.length, fps: def.fps, dirs: def.dirs }); }
        else if (def.kind === 'dragon' || def.kind === 'anim') {
          fr.forEach((c, k) => put(`${def.id}.${k}`, Object.assign({ image: c, bodyLength: def.bodyLength }, base)));
          for (const tn of ['good', 'evil']) PA.canvases(def, tn).forEach((c, k) => put(`${def.id}.${k}.${tn}`, Object.assign({ image: c, bodyLength: def.bodyLength }, base)));
          setMeta(def.id, { frames: fr.length, fps: def.fps, dirs: def.dirs });
        }
      }
      for (const def of defs) {
        const p = PA.parseId(def.id); if (!p.tone || p.n > 1 || (def.kind !== 'dragon' && def.kind !== 'anim')) continue;
        const fr = PA.canvases(def); if (!fr.length) continue;
        const a = def.anchor || [Math.floor(def.w / 2), def.h], base = { x: 0, y: 0, w: def.w, h: def.h, ax: a[0], ay: a[1] };
        const at = PA.idOf(p.base, 1, '', p.dir); // a direction's good or evil version stays with its direction
        fr.forEach((c, k) => put(`${at}.${k}.${p.tone}`, Object.assign({ image: c, bodyLength: def.bodyLength || (PA.entries.get(p.base) || {}).bodyLength }, base)));
        setMeta(`${at}@${p.tone}`, { frames: fr.length, fps: def.fps });
      }
      HB.sprites.cache.clear();
    },
    /** the map symbols as a map art pack ('pixel'): nearest-neighbour, one logical px per pixel times def.scale.
     *  Each frame is a variant cut to what is drawn in it (stretched to hold the anchor), so variants drawn at
     *  different sizes on one canvas keep their own sizes on the map; empty frames are skipped. A state the world
     *  draws smaller or larger (a small or large mountain: MAP_SPEC drawnK) is sized so it shows at about its drawn size. */
    mapPack() {
      // every drawing of a symbol, by its base id: the variants (#n, and each frame of an older many-frame file), and
      // their good and evil versions ('<id>@good' / '<id>@evil' assets: the drawn version where there is one, else
      // that variant's automatic tint, so a land keeps its variety; HB.mapAssets.draw looks there first in such a land)
      const groups = new Map();
      for (const def of PA.entries.values()) {
        if (def.kind !== 'map') continue; const p = PA.parseId(def.id), key = PA.idOf(p.base, 1, '', p.dir);
        let g = groups.get(key); if (!g) groups.set(key, g = { normal: [], good: new Map(), evil: new Map() });
        if (!p.dir && p.n === 1 && !p.tone && def.dirs) g.dirs = def.dirs;
        if (p.tone) g[p.tone].set(p.n, def); else g.normal.push([p.n, def]);
      }
      const assets = {};
      for (const [base, g] of groups) {
        g.normal.sort((a, b) => a[0] - b[0]);
        const out = { '': [], good: [], evil: [] };
        for (const [n, def] of g.normal) PA.canvases(def).forEach((c, i) => {
          const lit = def.mirror && PA.hasShade(def); // mirrored copies relit (lit and shadow swapped), not flipped as drawn
          for (const mir of lit ? [false, true] : [false]) {
            const sfx = mir ? 'm' : '', v = PA.mapVariant(def, i, mir ? PA.canvases(def, '', true)[i] : c, `v${n}.${i + 1}${sfx}`, mir); if (!v) return; out[''].push(v);
            for (const tn of ['good', 'evil']) {
              const td = g[tn].get(n), tv = td ? PA.mapVariant(td, Math.min(i, td.frames.length - 1), mir ? PA.canvases(td, '', true)[Math.min(i, td.frames.length - 1)] : null, `v${n}.${i + 1}${sfx}@${tn}`, mir) : PA.mapVariant(def, i, PA.canvases(def, tn, mir)[i], `v${n}.${i + 1}${sfx}@${tn}`, mir);
              if (tv) out[tn].push(tv);
            }
          }
        });
        // a good or evil drawing whose variant has no normal drawing still counts
        for (const tn of ['good', 'evil']) for (const [n, td] of g[tn]) if (!g.normal.some(([m]) => m === n)) PA.canvases(td).forEach((c, i) => { const v = PA.mapVariant(td, i, c, `v${n}.${i + 1}@${tn}`); if (v) out[tn].push(v); });
        if (out[''].length) assets[base] = Object.assign({ variants: out[''] }, g.dirs ? { dirs: g.dirs } : {});
        for (const tn of ['good', 'evil']) if (out[tn].length) assets[base + '@' + tn] = { variants: out[tn] };
      }
      return { schemaVersion: 1, name: 'pixel', assets };
    },
    /** one map variant from frame i of a drawing: the picture (canvas, or the frame itself) cut to the drawn box,
     *  stretched to hold the anchor; sized by the drawing's scale (and MAP_SPEC drawnK); with its wash cut-out */
    mapVariant(def, i, canvas, id, mirrored) {
      const c0 = canvas || PA.canvases(def)[i], b0 = PA.frameBox(def, i); if (!b0 || !c0) return null;
      const s = (def.scale || 1) / (HB.mapDrawnK ? HB.mapDrawnK(PA.parseId(def.id).base) : 1), a0 = def.anchor || [def.w / 2, def.h];
      // mirrored: the picture flipped left to right, with its box and anchor
      const flipC = (src) => { const k = document.createElement('canvas'); k.width = src.width; k.height = src.height; const kg = k.getContext('2d'); kg.translate(src.width, 0); kg.scale(-1, 1); kg.drawImage(src, 0, 0); return k; };
      const c = mirrored ? flipC(c0) : c0, b = mirrored ? { x: def.w - b0.x - b0.w, y: b0.y, w: b0.w, h: b0.h } : b0, a = mirrored ? [def.w - a0[0], a0[1]] : a0;
      const x0 = Math.min(b.x, a[0]), y0 = Math.min(b.y, a[1]), w = Math.max(1, Math.max(b.x + b.w, a[0]) - x0), h = Math.max(1, Math.max(b.y + b.h, a[1]) - y0);
      const cut = (src) => { const k = document.createElement('canvas'); k.width = w; k.height = h; k.getContext('2d').drawImage(src, -x0, -y0); return k.toDataURL('image/png'); };
      // mirrored only when the drawing allows it; a shaded one comes pre-mirrored and relit instead
      const v = { id, src: cut(c), sourceSize: [w, h], logicalSize: [w * s, h * s], anchorPx: [a[0] - x0, a[1] - y0], sampling: 'pixel', allowFlipX: !!def.mirror && !PA.hasShade(def) };
      const wc = PA.cuts(def); if (wc && wc[i]) v.washCut = cut(mirrored ? flipC(wc[i]) : wc[i]); // less territory wash on this symbol (its layers' wash setting)
      // its lights (the light layer's patches, in the cut picture's pixels, mirrored with it) and the glowing pixels
      const lt = PA.lightsOf(def, i);
      if (lt) { v.lights = lt.spots.map(p => ({ kind: p.kind, x: +((mirrored ? def.w - p.x : p.x) - x0).toFixed(2), y: +(p.y - y0).toFixed(2), r: +p.r.toFixed(2), glow: p.glow, when: p.when })); v.glows = lt.glows.map(g => ({ when: g.when, src: cut(mirrored ? flipC(g.canvas) : g.canvas) })); }
      return v;
    },
    /** the box around frame k's drawn pixels { x, y, w, h }, or null when it is empty */
    frameBox(def, k) {
      const rows = (def.frames[k] && def.frames[k].rows) || []; let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
      rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== '.') { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } });
      return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    },
  };
  const LIGHT = [255, 244, 214], INK = [43, 26, 14]; // what shading marks lean toward: a warm light, the map's ink
  /** '#rgb', '#rrggbb' or '#rrggbbaa' → [r, g, b, a] */
  function hex(s) {
    s = String(s || '').replace('#', ''); if (s.length === 3) s = s.split('').map(c => c + c).join('');
    const n = parseInt(s.slice(0, 6), 16); if (!(n >= 0)) return null;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, s.length >= 8 ? parseInt(s.slice(6, 8), 16) : 255];
  }
  PA.hex = hex;
})();
