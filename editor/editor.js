/* HoardBound pixel editor (editor/index.html): draw the game's pixel art frame by frame and save it to the GitHub repo.
 * Art lives in assets/pixelart/ (one readable file per sprite, see src/art/pixelart.js); the game loads it at boot.
 * Kinds: raid sprites (HB.sprites ids), the dragon (dragon.<tier>.<pose>, frame by frame), map symbols (map spec
 * ids; frames are variants, shown through the 'pixel' map art pack). Guide: docs/pixel-editor.md. */
(function () {
  'use strict';
  const HB = globalThis.HB, PA = HB.pixelArt, AL = PA.ALPHABET, CLEAR = 255;
  const $ = (id) => document.getElementById(id);
  const GH_KEY = 'hb.editor.github';
  const DEFAULT_REPO = 'abessman/HoardBound';

  // =====================================================================================================
  // What can be drawn
  // =====================================================================================================
  // Everything registered in HB.art (src/art/pixel.js: sprites, dragon poses, the lair's pictures) plus the map symbols.
  // New art registered in the game shows up here by itself.
  const MAP_GROUP = { terrain: 'Map · terrain', landmark: 'Map · landmarks', place: 'Map · places', entity: 'Map · moving pieces', seal: 'Map · marks', seal2: 'Map · marks', threat: 'Map · marks', rumor: 'Map · marks', fog: 'Map · fog', ui: 'Map · other' };
  const GROUP_ORDER = ['Dragon · Hatchling', 'Dragon · Young', 'Dragon · Adult', 'Dragon · Ancient', 'Lair · dragon', 'Lair · places', 'People', 'Animals', 'Treasure', 'Props', 'Map · mountains', 'Map · landmarks', 'Map · terrain', 'Map · places', 'Map · moving pieces', 'Map · marks', 'Map · fog', 'Map · other'];
  // the mountain kinds by name, in this order, with where the map uses each (the world picks the kind; frames are variants)
  const MAP_NAMES = {
    'map.terrain.mountain': ['Map · mountains', 'Mountain', 'Most mountain cells, one or two a cell. Every mountain kind below uses this drawing until it has its own.'],
    'map.terrain.mountain.small': ['Map · mountains', 'Small mountain', 'Two or three a cell, usually round the large mountains and at the edges of a range. Shown at about the size you draw it, so draw it a good step smaller than the mountain. Until drawn: the mountain, shrunk.'],
    'map.terrain.mountain.peak': ['Map · mountains', 'Large mountain (high peaks)', 'One big mountain on each high-peak cell, small mountains round it. Shown at about the size you draw it. Until drawn: the snowy mountain, enlarged.'],
    'map.terrain.mountain.snow': ['Map · mountains', 'Mountain, snowy', 'Mountains where it is cold. Until drawn: the mountain.'],
    'map.terrain.mountain.small.snow': ['Map · mountains', 'Small mountain, snowy', 'Small mountains where it is cold. Until drawn: the small mountain.'],
    'map.terrain.mountain.jagged': ['Map · mountains', 'Mountain under a tyrant', 'Mountains near a cruel ruler: ash-dark teeth.'],
    'map.terrain.mountain.jagged.deep': ['Map · mountains', 'Mountain under a tyrant, deep', 'Deep in a cruel ruler’s land.'],
    'map.landmark.peak': ['Map · landmarks', 'Legendary peak', 'One per region, on its highest mountain: about 3 cells across, drawn over the range with small mountains round it (big pieces like this have no terrain size limit). Until drawn: three of your mountains with a gold pennant.'],
  };
  const NAME_ORDER = Object.keys(MAP_NAMES);
  // the tyrant's mountains and trees are the evil versions of the mountain and the broadleaf tree now (Version: Evil)
  const FOLDED = ['map.terrain.mountain.jagged', 'map.terrain.mountain.jagged.deep', 'map.terrain.tree.burned', 'map.terrain.tree.bare'];
  // separate drawings of one sprite: '<id>#n' more variants (map symbols), '<id>@good' / '<id>@evil' its own versions
  const pid = (id) => PA.parseId(id), idOf = (b, n, t) => PA.idOf(b, n, t);
  const baseOf = (item) => item.baseItem || item;
  /** the editor entry for a variant n and version tone of a catalog item */
  function itemFor(base, n, tone) {
    const id = idOf(base.id, n, tone); if (id === base.id) return base;
    return Object.assign({}, base, { id, label: base.label + (n > 1 ? ` · variant ${n}` : '') + (tone ? ` · ${tone}` : ''), baseItem: base, n, tone });
  }
  let catalog = [];
  function buildCatalog() {
    catalog = [];
    for (const e of HB.art.list()) catalog.push({ id: e.id, kind: e.kind, group: e.group, label: e.label, frames: e.frames, fps: e.fps, entry: e });
    if (globalThis.MAPART_EXPORT) for (const rec of MAPART_EXPORT.R) { if (FOLDED.includes(rec.id) && !docs.has(rec.id)) continue; const n = MAP_NAMES[rec.id]; catalog.push({ id: rec.id, kind: 'map', group: n ? n[0] : MAP_GROUP[rec.screen] || 'Map · other', label: n ? n[1] : rec.id.replace(/^map\./, ''), mapNote: n ? n[2] : '', frames: 1, fps: 1, rec }); }
    // art for ids the game no longer registers (renamed or removed): still listed so it can be deleted or kept
    for (const id of docs.keys()) if (!catalog.some(c => c.id === id) && !((pid(id).n > 1 || pid(id).tone) && catalog.some(c => c.id === pid(id).base))) { const d = docs.get(id); catalog.push({ id, kind: d.kind, group: 'Other', label: id, frames: d.frames.length, fps: d.fps || 2 }); }
    const groups = GROUP_ORDER.slice(); for (const c of catalog) if (!groups.includes(c.group) && c.group !== 'Other') groups.push(c.group);
    groups.push('Other');
    const rank = (c, i) => NAME_ORDER.includes(c.id) ? NAME_ORDER.indexOf(c.id) - 1e4 : i;
    catalog = catalog.map((c, i) => [c, rank(c, i)]).sort((a, b) => groups.indexOf(a[0].group) - groups.indexOf(b[0].group) || a[1] - b[1]).map(p => p[0]);
  }
  const noteFor = (item, doc) => item.entry && item.entry.note ? item.entry.note
    : item.kind === 'dragon' ? `The game shows frames 1–${item.frames} of this pose (${item.fps} fps). One drawing serves every breed and alignment. Put the anchor (⊕) on the body centre: the dragon is placed there.`
      : item.kind === 'sprite' ? 'A raid sprite: drawn standing on its anchor (⊕, bottom centre) at 4× in the 320×180 scene. The game uses the first frame.'
        : item.kind === 'map' ? `${item.mapNote ? item.mapNote + ' ' : ''}A map symbol: add variants with + New variant (each its own drawing at its own size); the map picks one at random for each spot and keeps it. Drawn pixel-sharp; one pixel = ${doc ? doc.scale : 1} map pixels at zoom 1. The anchor (⊕) sits on the symbol's spot. Choose “Pixel art (editor)” in Settings → Map art to see these in the game.`
          : 'No longer used by the game (its id is not registered).';

  // =====================================================================================================
  // Documents: one per sprite id. frames are Uint8Arrays of palette indices (255 = transparent)
  // =====================================================================================================
  const docs = new Map(), saved = new Map(), deleted = new Set();
  const S = { item: null, doc: null, frame: 0, tool: 'pencil', prevTool: 'pencil', color: 0, zoom: 8, ox: 0, oy: 0, sel: null, float: null, clip: null, frameClip: null, playing: false, playT: 0, sample: false, brush: 1, mirror: false, onion: true, ref: false, grid: true, paper: false, addSel: false, tone: '', refs: [], ghosts: [] };
  try { S.paper = localStorage.getItem('hb.editor.paper') === '1'; } catch (e) { /* private mode */ }
  const hexOf = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  const rgbOf = (hex) => { const v = PA.hex(hex); return v ? [v[0], v[1], v[2]] : [0, 0, 0]; };
  const rgbaOf = (hex) => PA.hex(hex) || [0, 0, 0, 255];
  const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/;
  /** a swatch's CSS background: a see-through colour over a small checker */
  const swatchBg = (hex) => hex && hex.length > 7 ? `linear-gradient(${hex}, ${hex}), repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 8px 8px` : hex;
  // A document has layers (bottom first), each with the same frames: [{ name, hidden, frames: [Uint8Array] }].
  // doc.frames is the active layer's frames (the drawing tools work on it); useLayer keeps the two in step.
  const blank = (d) => new Uint8Array(d.w * d.h).fill(CLEAR);
  function decodeFrames(list, w, h) { return (list && list.length ? list : [{ rows: [] }]).map((f) => { const a = new Uint8Array(w * h).fill(CLEAR); ((f && f.rows) || []).forEach((row, y) => { if (y >= h) return; for (let x = 0; x < Math.min(w, row.length); x++) { const i = AL.indexOf(row[x]); if (i >= 0) a[y * w + x] = i; } }); return a; }); }
  function useLayer(d, i) { d.layer = HB.clamp(i, 0, d.layers.length - 1); d.frames = d.layers[d.layer].frames; }
  function fromDef(def) {
    const w = def.w | 0, h = def.h | 0;
    const pct = (v) => (v === undefined ? undefined : Math.max(0, Math.min(100, Math.round(+v) || 0)));
    const layers = Array.isArray(def.layers) && def.layers.length ? def.layers.map((l, i) => ({ name: String(l.name || `Layer ${i + 1}`), hidden: !!l.hidden, opacity: pct(l.opacity), wash: pct(l.wash), frames: decodeFrames(l.frames, w, h) })) : [{ name: 'Layer 1', hidden: false, frames: decodeFrames(def.frames, w, h) }];
    const n = Math.max(...layers.map(l => l.frames.length)); for (const l of layers) while (l.frames.length < n) l.frames.push(new Uint8Array(w * h).fill(CLEAR));
    const doc = { id: def.id, kind: def.kind || 'sprite', w, h, anchor: (def.anchor || [w >> 1, h]).slice(), palette: (def.palette || []).slice(), layers, fps: def.fps || 2, scale: def.scale || 1, flip: !!def.flip, bodyLength: def.bodyLength || null, tones: def.tones && typeof def.tones === 'object' ? JSON.parse(JSON.stringify(def.tones)) : null, undo: [], redo: [] };
    useLayer(doc, layers.length - 1); return doc;
  }
  /** the picture the game shows for frame k: visible layers merged, the topmost pixel wins (active: a stand-in for the active layer's frame) */
  function flat(d, k, active) {
    const out = new Uint8Array(d.w * d.h).fill(CLEAR);
    d.layers.forEach((l, i) => { if (l.hidden) return; const f = i === d.layer && active ? active : l.frames[k]; if (!f) return; for (let j = 0; j < out.length; j++) if (f[j] !== CLEAR) out[j] = f[j]; });
    return out;
  }
  function toDef(doc) {
    const def = { id: doc.id, kind: doc.kind, w: doc.w, h: doc.h, anchor: doc.anchor.slice(), fps: doc.fps };
    if (doc.kind === 'map') { def.scale = doc.scale; if (doc.flip) def.flip = true; }
    if (doc.kind === 'dragon' && doc.bodyLength) def.bodyLength = doc.bodyLength;
    // keep only colours in use, in order
    const used = new Set(); for (const l of doc.layers) for (const f of l.frames) for (const v of f) if (v !== CLEAR) used.add(v);
    const keep = [...used].sort((a, b) => a - b), remap = new Map(keep.map((v, i) => [v, i]));
    def.palette = keep.map(i => doc.palette[i]);
    if (doc.tones && Object.keys(doc.tones).length) def.tones = JSON.parse(JSON.stringify(doc.tones)); // good and evil tones, when adjusted
    const enc = (frames) => frames.map(f => ({ rows: Array.from({ length: doc.h }, (_, y) => { let s = ''; for (let x = 0; x < doc.w; x++) { const v = f[y * doc.w + x]; s += v === CLEAR ? '.' : AL[remap.get(v)]; } return s; }) }));
    // one plain layer: frames, as before; named, hidden or several layers: layers (the game merges the visible ones)
    const L = doc.layers;
    if (L.length === 1 && !L[0].hidden && L[0].name === 'Layer 1' && lyOp(L[0]) === 100 && lyWash(L[0]) === 100) def.frames = enc(L[0].frames);
    else def.layers = L.map(l => Object.assign({ name: l.name }, l.hidden ? { hidden: true } : {}, lyOp(l) !== 100 ? { opacity: lyOp(l) } : {}, lyWash(l) !== 100 ? { wash: lyWash(l) } : {}, { frames: enc(l.frames) }));
    return def;
  }
  /** the file for one sprite: JSON with one field per line and each frame's rows as a grid (easy to read and diff) */
  const framesText = (v, ind) => `[\n${v.map(f => `${ind} { "rows": [\n${f.rows.map(r => ind + '  ' + JSON.stringify(r)).join(',\n')}\n${ind} ] }`).join(',\n')}\n${ind}]`;
  const fileText = (def) => {
    const fields = Object.entries(def).map(([k, v]) => k === 'frames' ? ` "frames": ${framesText(v, ' ')}`
      : k === 'layers' ? ` "layers": [\n${v.map(l => `  { "name": ${JSON.stringify(l.name)},${l.hidden ? ' "hidden": true,' : ''}${l.opacity !== undefined ? ` "opacity": ${l.opacity},` : ''}${l.wash !== undefined ? ` "wash": ${l.wash},` : ''} "frames": ${framesText(l.frames, '   ')} }`).join(',\n')}\n ]`
        : ` ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
    return `/* HoardBound pixel art: ${def.id}. Made with the pixel editor (editor/index.html); safe to edit by hand: '.' is clear, other characters index the palette. */\nHB.pixelArt && HB.pixelArt.add({\n${fields.join(',\n')}\n});\n`;
  };
  const indexText = (files) => `/* Pixel art made with the editor (editor/index.html): the list of sprite files in this folder. Written by the editor. */\nHB.pixelArt && HB.pixelArt.index(${JSON.stringify(files, null, 1)});\n`;
  /** the JSON inside a file's HB.pixelArt.add(...) / .index(...) / .palettes(...) call (the header comment may hold brackets too) */
  const parseCall = (text) => { const m = /HB\.pixelArt\.(?:add|index|palettes)\(/.exec(text); if (!m) throw new Error('not an editor file'); return JSON.parse(text.slice(m.index + m[0].length, text.lastIndexOf(')'))); };
  /** nothing the game would show (no pixel on a visible layer): such a drawing is never saved as art */
  const isEmpty = (doc) => doc.layers.every(l => l.hidden || l.frames.every(f => f.every(v => v === CLEAR)));
  /** unsaved: differs from the saved file (remembered per edit, so big sprites are not re-serialised all the time) */
  const isDirty = (doc) => {
    if (doc.fresh) return false;
    const sv = saved.get(doc.id), k = doc._dk;
    if (k && k.rev === doc._rev && k.sv === sv) return k.v;
    const v = fileText(toDef(doc)) !== sv; doc._dk = { rev: doc._rev, sv, v }; return v;
  };
  const dirtyIds = () => [...docs.values()].filter(isDirty).map(d => d.id);
  /** the palette index for a colour, adding it if new; with tol, an existing colour that close is reused (imports) */
  function color(doc, hex, tol = 0) {
    hex = hex.toLowerCase(); if (hex.length === 9 && hex.endsWith('ff')) hex = hex.slice(0, 7);
    const i = doc.palette.indexOf(hex); if (i >= 0) return i;
    const [r, g, b, a] = rgbaOf(hex); let best = 0, bd = Infinity;
    doc.palette.forEach((p, k) => { const q = rgbaOf(p), d = (q[0] - r) ** 2 + (q[1] - g) ** 2 + (q[2] - b) ** 2 + (q[3] - a) ** 2; if (d < bd) { bd = d; best = k; } });
    if (bd <= tol * tol) return best;
    if (doc.palette.length < AL.length) { doc.palette.push(hex); return doc.palette.length - 1; }
    return best; // full (62 colours): the nearest existing one
  }
  /** a canvas's pixels as palette indices of doc (alpha below half is clear; near colours merged) */
  function quantize(doc, c, w, h) {
    const out = new Uint8Array(w * h).fill(CLEAR), cw = Math.min(c.width, w), ch = Math.min(c.height, h);
    if (cw <= 0 || ch <= 0) return out;
    const d = c.getContext('2d').getImageData(0, 0, cw, ch).data;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const o = (y * cw + x) * 4; if (d[o + 3] < 128) continue; out[y * w + x] = color(doc, hexOf(d[o], d[o + 1], d[o + 2]), 22); }
    return out;
  }
  /** the game's own drawing of an item, to trace or start from: canvases (one per frame, at the doc's pixel size),
   *  ghosts (the same, sharp enough to show behind the grid) and a suggested size and anchor */
  function gameArt(item, doc) {
    if (item.entry && item.entry.gen) {
      // the game's own frames (a red, middle-of-the-road dragon where the art depends on the dragon)
      const e = item.entry, cs = Array.from({ length: e.frames }, (_, k) => e.gen(k, { breed: 'red', alignment: 0, mutations: [], scars: 0 })), c = cs[0];
      const anchor = item.kind === 'sprite' ? [c.width >> 1, c.height] : isFinite(c.anchorX) && isFinite(c.anchorY) ? [Math.round(c.anchorX), Math.round(c.anchorY)] : [0, 0];
      return { canvases: cs, ghosts: cs, w: c.width, h: c.height, anchor, bodyLength: c.bodyLength || null };
    }
    if (item.kind === 'map' && item.rec) {
      // the hand-drawn symbol at its usual size (measured once), drawn at the doc's pixel size (1/scale) and 8× that for the ghost
      const s = doc ? doc.scale : 1, M = 240, c0 = document.createElement('canvas'); c0.width = c0.height = M;
      const g0 = c0.getContext('2d'); g0.translate(M / 2, M * 0.62); HB.mapart.proc.setup(g0); item.rec.draw(g0, 0, 0, 1, new HB.RNG(7919));
      const d = g0.getImageData(0, 0, M, M).data; let x0 = M, y0 = M, x1 = -1, y1 = -1;
      for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) if (d[(y * M + x) * 4 + 3] > 20) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if (x1 < 0) { x0 = M / 2 - 8; x1 = M / 2 + 8; y0 = M * 0.62 - 16; y1 = M * 0.62; }
      const pad = 2, w = doc ? doc.w : Math.ceil((x1 - x0 + 1) / s) + pad * 2, h = doc ? doc.h : Math.ceil((y1 - y0 + 1) / s) + pad * 2;
      const anchor = doc ? doc.anchor : [Math.round((M / 2 - x0) / s) + pad, Math.round((M * 0.62 - y0) / s) + pad];
      const at = (k) => { const c = document.createElement('canvas'); c.width = w * k; c.height = h * k; const g = c.getContext('2d'); g.scale(k, k); g.translate(anchor[0], anchor[1]); g.scale(1 / s, 1 / s); HB.mapart.proc.setup(g); item.rec.draw(g, 0, 0, 1, new HB.RNG(7919)); return c; };
      return { canvases: [at(1)], ghosts: [at(8)], w, h, anchor };
    }
    return null;
  }
  /** a new sprite: the game's size and anchor, blank frames, the game's drawing shown faintly behind (From game art copies it) */
  function newDoc(item) {
    const doc = { id: item.id, kind: item.kind, w: 16, h: 16, anchor: [8, 16], palette: [item.kind === 'map' ? '#2b1a0e' : '#2a1c22'], layers: [], fps: item.fps, scale: 1, flip: item.kind === 'map' && item.id.startsWith('map.terrain'), bodyLength: null, undo: [], redo: [], fresh: true };
    const art = gameArt(item, null);
    if (art) { doc.w = art.w; doc.h = art.h; doc.anchor = art.anchor.slice(); doc.bodyLength = art.bodyLength || null; }
    doc.layers = [{ name: 'Layer 1', hidden: false, frames: Array.from({ length: Math.max(1, item.frames) }, () => blank(doc)) }];
    useLayer(doc, 0); return doc;
  }

  // =====================================================================================================
  // Editing primitives (with undo)
  // =====================================================================================================
  const D = () => S.doc, F = () => S.doc.frames[S.frame];
  const copyLayers = (L) => L.map(l => ({ name: l.name, hidden: l.hidden, opacity: l.opacity, wash: l.wash, frames: l.frames.map(f => f.slice()) }));
  const lyOp = (l) => (l.opacity === undefined ? 100 : l.opacity), lyWash = (l) => (l.wash === undefined ? 100 : l.wash);
  function snapshot() { const d = D(); return { layers: copyLayers(d.layers), layer: d.layer, w: d.w, h: d.h, anchor: d.anchor.slice(), frame: S.frame, palette: d.palette.slice(), fps: d.fps, scale: d.scale, tones: d.tones ? JSON.stringify(d.tones) : null }; }
  function restore(s) { const d = D(); d.layers = copyLayers(s.layers); d.w = s.w; d.h = s.h; d.anchor = s.anchor.slice(); useLayer(d, s.layer); S.frame = Math.min(s.frame, d.frames.length - 1); d.palette = s.palette.slice(); d.fps = s.fps; d.scale = s.scale; d.tones = s.tones ? JSON.parse(s.tones) : null; d._rev = (d._rev || 0) + 1; renderTone(); }
  /** how many steps back a sprite keeps: 120, fewer for very big canvases (never under 20) */
  const undoCap = (d) => Math.max(20, Math.min(120, Math.floor(24e6 / Math.max(1, d.w * d.h * d.frames.length * d.layers.length))));
  /** change every layer's frames (frame structure, size, shifting), keeping doc.frames on the active layer */
  function eachLayer(d, fn) { for (const l of d.layers) l.frames = fn(l.frames, l); useLayer(d, d.layer); }
  function pushUndo() { const d = D(); d.undo.push(snapshot()); while (d.undo.length > undoCap(d)) d.undo.shift(); d.redoKept = d.redo; d.redo = []; d.fresh = false; }
  /** take back the step just pushed (the first finger of a two- or three-finger tap), keeping what could be redone */
  function dropLastStep() { const d = D(); restore(d.undo.pop()); if (d.redoKept) d.redo = d.redoKept; d.redoKept = null; }
  function undo() { const d = D(); dropFloat(); if (!d.undo.length) { toast('Nothing to undo'); return; } d.redo.push(snapshot()); restore(d.undo.pop()); renderColors(); changed(true); }
  function redo() { const d = D(); if (!d.redo.length) { toast('Nothing to redo'); return; } d.undo.push(snapshot()); restore(d.redo.pop()); renderColors(); changed(true); }
  function renderUndo() { const d = D(), u = d ? d.undo.length : 0, r = d ? d.redo.length : 0; $('btn-undo').textContent = `↶ Undo${u ? ` (${u})` : ''}`; $('btn-redo').textContent = `↷ Redo${r ? ` (${r})` : ''}`; $('btn-undo').disabled = !u; $('btn-redo').disabled = !r; }
  function setPx(f, x, y, v) { const d = D(); if (x < 0 || y < 0 || x >= d.w || y >= d.h) return; f[y * d.w + x] = v; if (S.mirror) { const mx = d.w - 1 - x; f[y * d.w + mx] = v; } }
  /** the brush covers b×b pixels centred on the one under the pointer (for even sizes, it reaches right and down) */
  const brushOff = (b) => Math.floor((b - 1) / 2);
  function dab(x, y, v) { const f = F(), b = S.brush, o = brushOff(b); for (let j = 0; j < b; j++) for (let i = 0; i < b; i++) setPx(f, x - o + i, y - o + j, v); }
  function linePts(x0, y0, x1, y1) { const pts = [], dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; for (;;) { pts.push([x0, y0]); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } return pts; }
  function shapePts(tool, a, b) {
    if (tool === 'line') return linePts(a[0], a[1], b[0], b[1]);
    const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]), pts = [];
    if (tool === 'rect' || tool === 'rectf') { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (tool === 'rectf' || x === x0 || x === x1 || y === y0 || y === y1) pts.push([x, y]); return pts; }
    const cx = (x0 + x1 + 1) / 2, cy = (y0 + y1 + 1) / 2, rx = (x1 - x0 + 1) / 2, ry = (y1 - y0 + 1) / 2, ins = (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1.0001;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (ins(x, y) && (tool === 'ellipsef' || !ins(x - 1, y) || !ins(x + 1, y) || !ins(x, y - 1) || !ins(x, y + 1))) pts.push([x, y]);
    return pts;
  }
  function flood(x, y, v) {
    const d = D(), f = F(); if (x < 0 || y < 0 || x >= d.w || y >= d.h) return;
    const from = f[y * d.w + x]; if (from === v) return;
    const st = [[x, y]];
    while (st.length) { const [px, py] = st.pop(); if (px < 0 || py < 0 || px >= d.w || py >= d.h || f[py * d.w + px] !== from) continue; f[py * d.w + px] = v; st.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]); }
  }
  // selection and floating pixels (a paste, or a selection lifted to move). A selection is a box, with a mask when it
  // is not the whole box (pixels added with Ctrl, Cmd, Shift or the Add button, as in a spreadsheet)
  const selHas = (r, x, y) => !!r && x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h && (!r.mask || r.mask[(y - r.y) * r.w + x - r.x] === 1);
  function unionSel(a, b) {
    if (!a) return b;
    const x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y), w = Math.max(a.x + a.w, b.x + b.w) - x0, h = Math.max(a.y + a.h, b.y + b.h) - y0, m = new Uint8Array(w * h);
    for (const r of [a, b]) for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (!r.mask || r.mask[y * r.w + x]) m[(r.y + y - y0) * w + r.x + x - x0] = 1;
    return { x: x0, y: y0, w, h, mask: m };
  }
  function region(f, r) { const d = D(), out = new Uint8Array(r.w * r.h).fill(CLEAR); for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const X = r.x + x, Y = r.y + y; if (X >= 0 && Y >= 0 && X < d.w && Y < d.h && (!r.mask || r.mask[y * r.w + x])) out[y * r.w + x] = f[Y * d.w + X]; } return out; }
  function clearRegion(f, r) { const d = D(); for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (x >= 0 && y >= 0 && x < d.w && y < d.h && selHas(r, x, y)) f[y * d.w + x] = CLEAR; }
  function lift() { if (S.float || !S.sel) return; pushUndo(); S.float = Object.assign({}, S.sel, { data: region(F(), S.sel) }); clearRegion(F(), S.sel); }
  function commitFloat() { const fl = S.float; if (!fl) return; const d = D(), f = F(); for (let y = 0; y < fl.h; y++) for (let x = 0; x < fl.w; x++) { const v = fl.data[y * fl.w + x], X = fl.x + x, Y = fl.y + y; if (v !== CLEAR && X >= 0 && Y >= 0 && X < d.w && Y < d.h) f[Y * d.w + X] = v; } S.sel = { x: fl.x, y: fl.y, w: fl.w, h: fl.h, mask: fl.mask || null }; S.float = null; changed(); }
  /** select every drawn pixel of this frame on the layer you draw on */
  function selectDrawn() { const d = D(); if (!d) return; commitFloat(); const f = F(), m = new Uint8Array(d.w * d.h); let n = 0; for (let i = 0; i < f.length; i++) if (f[i] !== CLEAR) { m[i] = 1; n++; } if (!n) { toast('Nothing drawn on this layer in this frame'); return; } S.sel = { x: 0, y: 0, w: d.w, h: d.h, mask: m }; setTool('select'); syncAlpha(); draw(); }
  function dropFloat() { if (S.float) { S.float = null; } }
  function copy(cut) {
    const src = S.float || (S.sel && Object.assign({}, S.sel, { data: region(F(), S.sel) }));
    if (!src) { toast('Select a box first (⬚), or use Copy frame'); return; }
    S.clip = { w: src.w, h: src.h, data: src.data.slice(), colors: D().palette.slice() };
    if (cut) { if (S.float) S.float = null; else { pushUndo(); clearRegion(F(), S.sel); } changed(); }
    toast(cut ? 'Cut' : 'Copied');
  }
  function remapClip(c) { const d = D(), map = new Map(); return c.data.map(v => { if (v === CLEAR) return CLEAR; if (!map.has(v)) map.set(v, color(d, c.colors[v])); return map.get(v); }); }
  function paste() {
    if (!S.clip) { toast('Nothing copied yet'); return; }
    commitFloat(); pushUndo();
    const d = D(), c = S.clip, x = S.sel ? S.sel.x : Math.max(0, Math.floor((d.w - c.w) / 2)), y = S.sel ? S.sel.y : Math.max(0, Math.floor((d.h - c.h) / 2));
    S.float = { x, y, w: c.w, h: c.h, data: Uint8Array.from(remapClip(c)) }; S.sel = null; setTool('move'); changed(); toast('Pasted: drag it into place, then tap outside or press Enter');
  }
  function deleteSel() { if (S.float) { S.float = null; changed(); return; } if (!S.sel) return; pushUndo(); clearRegion(F(), S.sel); changed(); }
  function flip(vertical) {
    const d = D();
    const fl = (data, w, h) => { const o = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[y * w + x] = vertical ? data[(h - 1 - y) * w + x] : data[y * w + (w - 1 - x)]; return o; };
    if (S.float) { S.float.data = fl(S.float.data, S.float.w, S.float.h); if (S.float.mask) S.float.mask = fl(S.float.mask, S.float.w, S.float.h); changed(); return; }
    pushUndo();
    if (S.sel) { const sl = S.sel, r = region(F(), sl), f2 = fl(r, sl.w, sl.h), m2 = sl.mask ? fl(sl.mask, sl.w, sl.h) : null; clearRegion(F(), sl); for (let y = 0; y < sl.h; y++) for (let x = 0; x < sl.w; x++) { const X = sl.x + x, Y = sl.y + y; if (X >= 0 && Y >= 0 && X < d.w && Y < d.h && (!m2 || m2[y * sl.w + x])) F()[Y * d.w + X] = f2[y * sl.w + x]; } sl.mask = m2; }
    else d.frames[S.frame] = fl(F(), d.w, d.h);
    changed();
  }
  function resize(w, h) {
    const d = D(); w = Math.max(1, Math.min(512, w | 0)); h = Math.max(1, Math.min(512, h | 0)); if (w === d.w && h === d.h) return;
    pushUndo(); commitFloat();
    eachLayer(d, fr => fr.map(f => { const o = new Uint8Array(w * h).fill(CLEAR); for (let y = 0; y < Math.min(h, d.h); y++) for (let x = 0; x < Math.min(w, d.w); x++) o[y * w + x] = f[y * d.w + x]; return o; }));
    d.w = w; d.h = h; d.anchor = d.kind === 'sprite' ? [w >> 1, h] : [Math.min(d.anchor[0], w), Math.min(d.anchor[1], h)]; S.sel = null; fit(); changed(true);
  }
  /** the drawn area: the box around every pixel of every frame and layer (or of frame k as the game shows it); null if empty */
  function drawnBox(d, k) {
    let x0 = d.w, y0 = d.h, x1 = -1, y1 = -1;
    const scan = (f) => { for (let y = 0; y < d.h; y++) { const row = y * d.w; for (let x = 0; x < d.w; x++) if (f[row + x] !== CLEAR) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } } };
    if (k === undefined) { for (const l of d.layers) for (const f of l.frames) scan(f); } else scan(flat(d, k));
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  /** cut the canvas to a box (every frame and layer); the anchor stays on the same spot of the drawing */
  function cropTo(r) {
    const d = D(); if (!d || !r || r.w < 1 || r.h < 1) return; commitFloat(); pushUndo();
    eachLayer(d, fr => fr.map(f => { const o = new Uint8Array(r.w * r.h).fill(CLEAR); for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const X = r.x + x, Y = r.y + y; if (X >= 0 && Y >= 0 && X < d.w && Y < d.h) o[y * r.w + x] = f[Y * d.w + X]; } return o; }));
    d.w = r.w; d.h = r.h; d.anchor = d.kind === 'sprite' ? [r.w >> 1, r.h] : [HB.clamp(d.anchor[0] - r.x, 0, r.w), HB.clamp(d.anchor[1] - r.y, 0, r.h)];
    S.sel = null; fit(); changed(true);
  }
  /** the anchor at the drawing's foot (bottom centre) or centre, over every frame */
  function anchorAt(where) {
    const d = D(); if (!d) return; if (d.kind === 'sprite') { toast('Raid sprites always stand on their bottom edge, centred'); return; }
    const b = drawnBox(d); if (!b) { toast('Draw something first'); return; }
    pushUndo(); d.anchor = [Math.round(b.x + b.w / 2), where === 'foot' ? b.y + b.h : Math.round(b.y + b.h / 2)]; changed();
  }
  function shiftAll(dx, dy) {
    const d = D(); pushUndo(); commitFloat();
    eachLayer(d, fr => fr.map(f => { const o = new Uint8Array(d.w * d.h).fill(CLEAR); for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) { const X = x - dx, Y = y - dy; if (X >= 0 && Y >= 0 && X < d.w && Y < d.h) o[y * d.w + x] = f[Y * d.w + X]; } return o; }));
    changed(true);
  }

  // =====================================================================================================
  // Drawing the editor
  // =====================================================================================================
  const cv = $('canvas'), ctx = cv.getContext('2d'), stage = $('stage');
  function frameCanvas(doc, f, alpha = 1) {
    const c = document.createElement('canvas'); c.width = doc.w; c.height = doc.h; const g = c.getContext('2d'), img = g.createImageData(doc.w, doc.h), Dd = img.data, pal = doc.palette.map(rgbaOf);
    for (let i = 0; i < f.length; i++) { const v = f[i]; if (v === CLEAR || !pal[v]) continue; const o = i * 4; Dd[o] = pal[v][0]; Dd[o + 1] = pal[v][1]; Dd[o + 2] = pal[v][2]; Dd[o + 3] = pal[v][3] * alpha; }
    g.putImageData(img, 0, 0); return c;
  }
  /** frame k with the visible layers stacked (PA.composite), and its wash cut-out (null when every layer takes full wash) */
  function composeFrame(d, k, palette) {
    const layers = d.layers.filter(l => !l.hidden).map(l => { const f = l.frames[k]; return { at: (i) => (f[i] === CLEAR ? -1 : f[i]), op: lyOp(l) / 100, wash: lyWash(l) / 100 }; });
    const r = PA.composite(d.w, d.h, layers, palette.map(rgbaOf));
    const c = document.createElement('canvas'); c.width = d.w; c.height = d.h; const g = c.getContext('2d'), img = g.createImageData(d.w, d.h); img.data.set(r.rgba); g.putImageData(img, 0, 0);
    let cut = null; if (r.cut) { cut = document.createElement('canvas'); cut.width = d.w; cut.height = d.h; const cg = cut.getContext('2d'), ci = cg.createImageData(d.w, d.h); for (let i = 0; i < r.cut.length; i++) ci.data[i * 4 + 3] = r.cut[i]; cg.putImageData(ci, 0, 0); }
    return { canvas: c, cut };
  }
  let washC = null; const washBuf = (w, h) => { if (!washC) washC = document.createElement('canvas'); if (washC.width !== w || washC.height !== h) { washC.width = Math.max(1, w); washC.height = Math.max(1, h); } return washC; };
  function fit() {
    const d = D(); if (!d) return; const r = stage.getBoundingClientRect();
    S.zoom = Math.max(2, Math.floor(Math.min((r.width - 40) / d.w, (r.height - 40) / d.h)));
    S.ox = Math.round((r.width - d.w * S.zoom) / 2); S.oy = Math.round((r.height - d.h * S.zoom) / 2);
  }
  function zoomAt(mx, my, f) { const z0 = S.zoom, z1 = Math.max(1, Math.min(64, Math.round(z0 * f) || 1)); if (z1 === z0) return; S.ox = mx - (mx - S.ox) * z1 / z0; S.oy = my - (my - S.oy) * z1 / z0; S.zoom = z1; draw(); }
  function draw() {
    const d = D(), dpr = window.devicePixelRatio || 1, r = stage.getBoundingClientRect();
    if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, r.width, r.height); ctx.imageSmoothingEnabled = false;
    if (!d) return;
    const z = S.zoom, X = S.ox, Y = S.oy, W = d.w * z, H = d.h * z;
    // the map's parchment under the drawing (as the game shows it on the map), or a transparency checker
    ctx.save(); ctx.beginPath(); ctx.rect(X, Y, W, H); ctx.clip();
    const pp = S.paper && paperPattern();
    if (pp) { const k = z / paperTexel(d); pp.setTransform(new DOMMatrix([k, 0, 0, k, X, Y])); ctx.fillStyle = pp; ctx.fillRect(X, Y, W, H); }
    else { const cs = Math.max(4, z); for (let y = 0; y < d.h * z; y += cs) for (let x = 0; x < d.w * z; x += cs) { ctx.fillStyle = ((x / cs + y / cs) & 1) ? '#efe6d2' : '#fbf6ea'; ctx.fillRect(X + x, Y + y, cs, cs); } }
    // your picture, the game's drawing behind (to trace), the previous frame (onion skin), the frame, floating pixels
    const ri = curRef(); if (ri && !ri.front) drawRef(ri, X, Y, z);
    if (S.ref && S.ghosts.length) { ctx.globalAlpha = 0.32; ctx.imageSmoothingEnabled = d.kind === 'map'; ctx.drawImage(S.ghosts[Math.min(S.frame, S.ghosts.length - 1)], X, Y, W, H); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1; }
    if (S.onion && S.frame > 0) { ctx.globalAlpha = 0.25; ctx.drawImage(frameCanvas(d, flat(d, S.frame - 1)), X, Y, W, H); ctx.globalAlpha = 1; }
    // the visible layers stacked as the game stacks them (real transparency: colours' own and each layer's opacity); the
    // active layer drawn faintly if it is hidden, so drawing on it is never invisible
    // (Show Good or Evil: in the colours the game gives it in a kind or a cruel setting; you still draw the normal colours)
    const shown = S.tone ? { w: d.w, h: d.h, palette: PA.tonedPalette(d, S.tone) } : d, comp = composeFrame(d, S.frame, shown.palette);
    ctx.drawImage(comp.canvas, X, Y, W, H);
    if (d.layers[d.layer].hidden) { ctx.globalAlpha = 0.35; ctx.drawImage(frameCanvas(shown, F()), X, Y, W, H); ctx.globalAlpha = 1; }
    // with parchment under and Good or Evil shown: the territory wash as on the map, on the ground and, by each layer's
    // wash setting, on the drawing
    if (pp && S.tone) {
      const wc = S.tone === 'good' ? [110, 140, 58, 0.3] : [176, 48, 16, 0.36]; // HB.mapWash's kind and cruel colours, a typical strength
      const B = washBuf(Math.round(W), Math.round(H)), bg = B.getContext('2d'); bg.globalCompositeOperation = 'source-over'; bg.clearRect(0, 0, B.width, B.height);
      bg.fillStyle = `rgba(${wc[0]},${wc[1]},${wc[2]},${wc[3]})`; bg.fillRect(0, 0, B.width, B.height);
      if (comp.cut) { bg.globalCompositeOperation = 'destination-out'; bg.imageSmoothingEnabled = false; bg.drawImage(comp.cut, 0, 0, B.width, B.height); }
      ctx.drawImage(B, X, Y, W, H);
    }
    if (S.shape) { const pts = shapePts(S.tool, S.shape.a, S.shape.b), col = S.color === CLEAR ? 'rgba(255,255,255,0.8)' : d.palette[S.color]; ctx.fillStyle = col; for (const [x, y] of pts) ctx.fillRect(X + x * z, Y + y * z, z, z); }
    if (S.float) { const fl = S.float; ctx.drawImage(frameCanvas({ w: fl.w, h: fl.h, palette: shown.palette }, fl.data), X + fl.x * z, Y + fl.y * z, fl.w * z, fl.h * z); }
    if (ri && ri.front) drawRef(ri, X, Y, z);
    if (CV.open && CV.canvas && $('cv-show').checked) { ctx.drawImage(CV.canvas, X, Y, W, H); if (ri && CV.key !== convKey(d, ri, cvOpts())) scheduleConvert(); }
    ctx.restore();
    // grid
    if (S.grid && z >= 6) { ctx.strokeStyle = 'rgba(60,40,20,0.12)'; ctx.lineWidth = 1; ctx.beginPath(); for (let x = 0; x <= d.w; x++) { ctx.moveTo(X + x * z + 0.5, Y); ctx.lineTo(X + x * z + 0.5, Y + H); } for (let y = 0; y <= d.h; y++) { ctx.moveTo(X, Y + y * z + 0.5); ctx.lineTo(X + W, Y + y * z + 0.5); } ctx.stroke(); }
    ctx.strokeStyle = 'rgba(60,40,20,0.5)'; ctx.strokeRect(X - 0.5, Y - 0.5, W + 1, H + 1);
    // selection marquee
    const s = S.float || S.sel;
    if (s) {
      ctx.save(); ctx.setLineDash([4, 3]); ctx.lineDashOffset = -(performance.now() / 60) % 7; ctx.strokeStyle = '#1d4f91'; ctx.lineWidth = 1.5;
      if (!s.mask) ctx.strokeRect(X + s.x * z + 0.5, Y + s.y * z + 0.5, s.w * z - 1, s.h * z - 1);
      else { // the outline of the selected pixels: every edge between a selected pixel and one that is not
        ctx.beginPath();
        for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
          if (!s.mask[y * s.w + x]) continue; const px = X + (s.x + x) * z, py = Y + (s.y + y) * z, on = (i, j) => i >= 0 && j >= 0 && i < s.w && j < s.h && s.mask[j * s.w + i];
          if (!on(x, y - 1)) { ctx.moveTo(px, py + 0.5); ctx.lineTo(px + z, py + 0.5); } if (!on(x, y + 1)) { ctx.moveTo(px, py + z - 0.5); ctx.lineTo(px + z, py + z - 0.5); }
          if (!on(x - 1, y)) { ctx.moveTo(px + 0.5, py); ctx.lineTo(px + 0.5, py + z); } if (!on(x + 1, y)) { ctx.moveTo(px + z - 0.5, py); ctx.lineTo(px + z - 0.5, py + z); }
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    // anchor
    const ax = X + d.anchor[0] * z, ay = Y + d.anchor[1] * z; ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax - 7, ay); ctx.lineTo(ax + 7, ay); ctx.moveTo(ax, ay - 7); ctx.lineTo(ax, ay + 7); ctx.stroke();
    // the pixels the next touch changes: the brush (pencil, eraser, mirrored too) or the one pixel the other tools use
    if (S.hover) {
      const [hx, hy] = S.hover, b = S.tool === 'pencil' || S.tool === 'eraser' ? S.brush : 1, o = brushOff(b);
      if (hx >= 0 && hy >= 0 && hx < d.w && hy < d.h) {
        ctx.strokeStyle = 'rgba(29,79,145,0.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(X + (hx - o) * z + 0.5, Y + (hy - o) * z + 0.5, z * b - 1, z * b - 1);
        if (S.mirror && (S.tool === 'pencil' || S.tool === 'eraser')) { ctx.setLineDash([3, 3]); ctx.strokeRect(X + (d.w - (hx - o) - b) * z + 0.5, Y + (hy - o) * z + 0.5, z * b - 1, z * b - 1); ctx.setLineDash([]); }
      }
    }
  }

  // =====================================================================================================
  // Pointer: tools, plus two-finger pan and pinch (and wheel zoom)
  // =====================================================================================================
  // A two-finger tap undoes and a three-finger tap redoes (as in drawing apps); a single finger draws at once, so the
  // first finger of such a tap is taken back (cancelStroke, or `instant` for fill, eyedropper and anchor).
  const pointers = new Map(); let stroke = null, gesture = null, tap = null, instant = null;
  const toPx = (e) => { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientX - r.left - S.ox) / S.zoom), Math.floor((e.clientY - r.top - S.oy) / S.zoom)]; };
  const toF = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left - S.ox) / S.zoom, (e.clientY - r.top - S.oy) / S.zoom]; };
  const local = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const inside = (p, r) => r && p[0] >= r.x && p[1] >= r.y && p[0] < r.x + r.w && p[1] < r.y + r.h;
  cv.addEventListener('pointerdown', (e) => {
    if (!D()) return; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ } pointers.set(e.pointerId, local(e));
    if (pointers.size === 1) tap = { t0: performance.now(), max: 1, moved: false, starts: new Map() };
    if (tap) { tap.max = Math.max(tap.max, pointers.size); tap.starts.set(e.pointerId, local(e)); }
    if (pointers.size === 2) {
      cancelStroke(); takeBackInstant();
      const [a, b] = [...pointers.values()]; gesture = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; return;
    }
    if (pointers.size > 2) return;
    if (e.button === 1 || (e.button === 0 && keys.space)) { gesture = { pan: local(e) }; return; }
    const ri = curRef(); if (S.refMove && ri) { gesture = { ref: toF(e), x0: ri.x, y0: ri.y }; return; }
    toolDown(toPx(e), e);
  });
  cv.addEventListener('pointermove', (e) => {
    if (!D()) return; const p = toPx(e); S.hover = p;
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, local(e));
    if (tap && tap.starts.has(e.pointerId)) { const a = tap.starts.get(e.pointerId), l = local(e); if (Math.hypot(l[0] - a[0], l[1] - a[1]) > 14) tap.moved = true; }
    if (gesture && gesture.ref) { const ri = curRef(), f = toF(e); if (ri) { ri.x = gesture.x0 + f[0] - gesture.ref[0]; ri.y = gesture.y0 + f[1] - gesture.ref[1]; } draw(); return; }
    if (gesture && gesture.pan) { const l = local(e); S.ox += l[0] - gesture.pan[0]; S.oy += l[1] - gesture.pan[1]; gesture.pan = l; draw(); return; }
    if (gesture && pointers.size >= 2) { const [a, b] = [...pointers.values()], dd = Math.hypot(a[0] - b[0], a[1] - b[1]), c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; S.ox += c[0] - gesture.c[0]; S.oy += c[1] - gesture.c[1]; gesture.c = c; if (Math.abs(dd / gesture.d - 1) > 0.12) { zoomAt(c[0], c[1], dd / gesture.d); gesture.d = dd; } draw(); return; }
    if (stroke) toolMove(p, e); else draw();
  });
  const up = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size === 0 && tap) { const t = tap; tap = null; if (!t.moved && t.max >= 2 && performance.now() - t.t0 < 450) { gesture = null; if (t.max === 2) undo(); else redo(); return; } }
    if (gesture) { if (pointers.size === 0) { if (gesture.ref && S.item) saveRef(S.item.id); gesture = null; } return; }
    if (stroke) toolUp(toPx(e), e);
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', () => { S.hover = null; draw(); });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); const l = local(e); zoomAt(l[0], l[1], e.deltaY < 0 ? 1.25 : 0.8); }, { passive: false });
  function cancelStroke() { if (stroke && stroke.undo) dropLastStep(); stroke = null; S.shape = null; draw(); }
  function takeBackInstant() {
    const i = instant; instant = null; if (!i || performance.now() - i.t > 300) return;
    const d = D(); if (i.undo !== undefined && d.undo.length === i.undo + 1) dropLastStep();
    S.color = i.color; if (S.tool !== i.tool) setTool(i.tool); renderColors(); draw();
  }
  function toolDown(p, e) {
    const t = (e.altKey && (S.tool === 'pencil' || S.tool === 'fill')) ? 'picker' : S.tool, d = D();
    if (t === 'fill' || t === 'picker' || t === 'anchor') instant = { t: performance.now(), undo: t === 'picker' ? undefined : d.undo.length, color: S.color, tool: S.tool };
    if (t !== 'move' && t !== 'select' && S.float) commitFloat();
    if (t === 'pencil' || t === 'eraser') { pushUndo(); stroke = { t, last: p, undo: true }; dab(p[0], p[1], t === 'eraser' ? CLEAR : S.color); changed(false, true); return; }
    if (t === 'fill') { pushUndo(); flood(p[0], p[1], S.color); changed(); return; }
    if (t === 'picker') { pick(p); return; }
    if (t === 'anchor') {
      // raid sprites always stand on their bottom edge, centred (raidview places them so); the others take the tapped corner
      if (d.kind === 'sprite') { toast('Raid sprites always stand on their bottom edge, centred: draw the feet on the last row'); return; }
      pushUndo(); d.anchor = [Math.max(0, Math.min(d.w, p[0])), Math.max(0, Math.min(d.h, p[1]))]; changed(); return;
    }
    if (t === 'select') {
      const add = S.addSel || e.ctrlKey || e.metaKey || e.shiftKey;
      if (!add && S.float && selHas(S.float, p[0], p[1])) { stroke = { t: 'drag', from: p, ox: S.float.x, oy: S.float.y }; return; }
      if (!add && S.sel && selHas(S.sel, p[0], p[1])) { lift(); stroke = { t: 'drag', from: p, ox: S.float.x, oy: S.float.y }; return; }
      commitFloat(); const base = add ? S.sel : null; stroke = { t: 'select', from: p, base }; S.sel = unionSel(base, { x: p[0], y: p[1], w: 1, h: 1 }); draw(); return;
    }
    if (t === 'move') {
      if (!S.float && S.sel) lift();
      if (!S.float) { S.sel = { x: 0, y: 0, w: d.w, h: d.h }; lift(); }
      stroke = { t: 'drag', from: p, ox: S.float.x, oy: S.float.y }; return;
    }
    if (['line', 'rect', 'rectf', 'ellipse', 'ellipsef'].includes(t)) { stroke = { t: 'shape' }; S.shape = { a: p, b: p }; draw(); }
  }
  function toolMove(p, e) {
    const st = stroke;
    if (st.t === 'pencil' || st.t === 'eraser') { for (const [x, y] of linePts(st.last[0], st.last[1], p[0], p[1])) dab(x, y, st.t === 'eraser' ? CLEAR : S.color); st.last = p; changed(false, true); return; }
    if (st.t === 'select') { const a = st.from, r = { x: Math.min(a[0], p[0]), y: Math.min(a[1], p[1]), w: Math.abs(p[0] - a[0]) + 1, h: Math.abs(p[1] - a[1]) + 1 }; S.sel = unionSel(st.base, r); draw(); return; }
    if (st.t === 'drag') { S.float.x = st.ox + p[0] - st.from[0]; S.float.y = st.oy + p[1] - st.from[1]; draw(); return; }
    if (st.t === 'shape') { let b = p; if (e.shiftKey && S.tool !== 'line') { const a = S.shape.a, m = Math.max(Math.abs(p[0] - a[0]), Math.abs(p[1] - a[1])); b = [a[0] + Math.sign(p[0] - a[0] || 1) * m, a[1] + Math.sign(p[1] - a[1] || 1) * m]; } S.shape.b = b; draw(); }
  }
  function toolUp(p) {
    const st = stroke; stroke = null;
    if (st.t === 'shape') { pushUndo(); for (const [x, y] of shapePts(S.tool, S.shape.a, S.shape.b)) setPx(F(), x, y, S.color); S.shape = null; changed(); return; }
    if (st.t === 'select') { syncAlpha(); draw(); return; }
    changed();
  }
  function pick(p) { const d = D(); if (p[0] < 0 || p[1] < 0 || p[0] >= d.w || p[1] >= d.h) return; const v = flat(d, S.frame)[p[1] * d.w + p[0]], ref = v === CLEAR ? refColor(p) || (S.paper ? paperColor(d, p) : null) : null; S.color = v !== CLEAR ? v : ref ? color(d, ref) : CLEAR; renderColors(); if (S.tool === 'picker') setTool(DRAWING.includes(S.prevTool) ? S.prevTool : 'pencil'); }
  const DRAWING = ['pencil', 'fill', 'line', 'rect', 'rectf', 'ellipse', 'ellipsef'];

  // =====================================================================================================
  // Your own picture behind the pixels, to draw over (one per sprite, kept in this browser's IndexedDB)
  // =====================================================================================================
  const refImgs = new Map(); // id -> { img, blob, fit, scale, x, y (sprite px), opacity, front }
  let idb = null;
  function db() { if (!idb) idb = new Promise((ok) => { try { const r = indexedDB.open('hb-editor', 1); r.onupgradeneeded = () => r.result.createObjectStore('refimg'); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); } catch (e) { ok(null); } }); return idb; }
  async function idbDo(mode, fn) { const d = await db(); if (!d) return null; return new Promise((ok) => { try { const r = fn(d.transaction('refimg', mode).objectStore('refimg')); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null); } catch (e) { ok(null); } }); }
  const blobImage = (blob) => new Promise((ok, no) => { const img = new Image(); img.onload = () => ok(img); img.onerror = no; img.src = URL.createObjectURL(blob); });
  const curRef = () => (S.item && refImgs.get(S.item.id)) || null;
  function saveRef(id) { const r = refImgs.get(id); if (r) idbDo('readwrite', st => st.put({ blob: r.blob, fit: r.fit, scale: r.scale, x: r.x, y: r.y, opacity: r.opacity, front: !!r.front }, id)); }
  async function loadRefImg(id) {
    S.refMove = false; renderRefCtl(); if (CV.open) closeConvert();
    if (refImgs.has(id)) return;
    const v = await idbDo('readonly', st => st.get(id)); if (!v || !v.blob) return;
    try { const img = await blobImage(v.blob); refImgs.set(id, Object.assign({}, v, { img })); if (S.item && S.item.id === id) { renderRefCtl(); draw(); } } catch (e) { /* unreadable */ }
  }
  function drawRef(ri, X, Y, z) { ctx.save(); ctx.globalAlpha = ri.opacity; ctx.imageSmoothingEnabled = true; ctx.drawImage(ri.img, X + ri.x * z, Y + ri.y * z, ri.img.width * ri.scale * z, ri.img.height * ri.scale * z); ctx.restore(); }
  /** the colour of your picture under a pixel (for the eyedropper), or null */
  function refColor(p) {
    const ri = curRef(); if (!ri) return null;
    if (!ri.sample) { const c = document.createElement('canvas'); c.width = ri.img.width; c.height = ri.img.height; c.getContext('2d').drawImage(ri.img, 0, 0); ri.sample = c.getContext('2d'); }
    const ix = Math.floor((p[0] + 0.5 - ri.x) / ri.scale), iy = Math.floor((p[1] + 0.5 - ri.y) / ri.scale);
    if (ix < 0 || iy < 0 || ix >= ri.img.width || iy >= ri.img.height) return null;
    const px = ri.sample.getImageData(ix, iy, 1, 1).data; return px[3] < 128 ? null : hexOf(px[0], px[1], px[2]);
  }
  function renderRefCtl() {
    const r = curRef(); $('refimg-ctl').hidden = !r; $('btn-refimg').textContent = r ? 'Change image…' : 'Image behind…';
    if (r) { $('in-refop').value = Math.round(r.opacity * 100); $('in-refsc').value = Math.round(r.scale / r.fit * 100); $('btn-reffront').classList.toggle('on', !!r.front); }
    $('btn-refmove').classList.toggle('on', !!(S.refMove && r));
  }
  $('btn-refimg').onclick = () => $('in-refimg').click();
  $('in-refimg').onchange = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; const d = D(); if (!f || !d) return;
    try {
      const img = await blobImage(f), fit = Math.min(d.w / img.width, d.h / img.height);
      refImgs.set(d.id, { img, blob: f, fit, scale: fit, x: (d.w - img.width * fit) / 2, y: (d.h - img.height * fit) / 2, opacity: 0.5, front: false });
      saveRef(d.id); renderRefCtl(); draw();
      if (CV.openAfterLoad) { CV.openAfterLoad = false; openConvert(); } else toast('Your picture is behind the pixels: draw over it. The eyedropper picks its colours where a pixel is empty.', 5000);
    } catch (err) { toast('Could not read that image'); }
  };
  $('in-refop').oninput = (e) => { const r = curRef(); if (!r) return; r.opacity = +e.target.value / 100; draw(); };
  $('in-refsc').oninput = (e) => { const r = curRef(); if (!r) return; const cx = r.x + r.img.width * r.scale / 2, cy = r.y + r.img.height * r.scale / 2; r.scale = r.fit * +e.target.value / 100; r.x = cx - r.img.width * r.scale / 2; r.y = cy - r.img.height * r.scale / 2; draw(); };
  $('in-refop').onchange = $('in-refsc').onchange = () => { if (S.item) saveRef(S.item.id); };
  $('btn-refmove').onclick = () => { S.refMove = !S.refMove; renderRefCtl(); if (S.refMove) toast('Drag on the canvas to move your picture; tap Move it again to draw'); };
  $('btn-reffront').onclick = () => { const r = curRef(); if (!r) return; r.front = !r.front; saveRef(S.item.id); renderRefCtl(); draw(); };
  $('btn-refdel').onclick = () => { if (!S.item) return; refImgs.delete(S.item.id); idbDo('readwrite', st => st.delete(S.item.id)); S.refMove = false; renderRefCtl(); draw(); };

  // =====================================================================================================
  // Picture → pixels: your picture, where it sits on the grid, turned into pixel art and tuned with sliders.
  // Each grid pixel looks at the part of the picture under it (k×k samples): enough dark ink makes it a line pixel,
  // paper-coloured samples make it clear, otherwise it takes the average colour; colours are then reduced.
  // =====================================================================================================
  const CV = { open: false, grid: null, canvas: null, key: '', raf: 0, openAfterLoad: false };
  const cvOpts = () => ({ keep: $('cv-keep').value, n: +$('cv-n').value, pal: $('cv-pal').value, dark: +$('cv-dark').value, cover: +$('cv-cover').value, bg: +$('cv-bg').value, sat: +$('cv-sat').value / 100, line: $('cv-line').value.toLowerCase(), outline: $('cv-outline').checked });
  const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
  const cdist2 = (a, b) => 2 * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + 3 * (a[2] - b[2]) ** 2; // green counts most, as for the eye
  const boost = (c, k) => { const m = (c[0] + c[1] + c[2]) / 3; return c.map(v => HB.clamp(Math.round(m + (v - m) * k), 0, 255)); };
  /** the picture sampled k×k times under every grid pixel, where it sits (kept until it moves or the canvas changes) */
  function samples(d, ri) {
    const k = HB.clamp(Math.floor(Math.sqrt(1.6e6 / (d.w * d.h))), 2, 10), key = [d.w, d.h, ri.x, ri.y, ri.scale, k].join(',');
    if (ri.cvs && ri.cvs.key === key) return ri.cvs;
    const c = document.createElement('canvas'); c.width = d.w * k; c.height = d.h * k;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(ri.img, ri.x * k, ri.y * k, ri.img.width * ri.scale * k, ri.img.height * ri.scale * k);
    // worked out once per placement, so moving a slider only compares numbers: brightness and distance from the paper
    const data = g.getImageData(0, 0, c.width, c.height).data, N = c.width * c.height, lum = new Uint8Array(N), pd = new Uint16Array(N).fill(65535), paper = paperOf(ri);
    for (let i = 0, o = 0; i < N; i++, o += 4) {
      if (data[o + 3] < 128) { lum[i] = 255; pd[i] = 0; continue; } // see-through: treated as paper
      const R = data[o], G = data[o + 1], B = data[o + 2]; lum[i] = Math.round(luma(R, G, B));
      if (paper) pd[i] = Math.min(65535, Math.round(Math.sqrt((2 * (R - paper[0]) ** 2 + 4 * (G - paper[1]) ** 2 + 3 * (B - paper[2]) ** 2) / 9)));
    }
    return (ri.cvs = { key, k, W: c.width, data, lum, pd });
  }
  /** the paper's colour: the picture's corners, averaged over those that agree (null if they are see-through) */
  function paperOf(ri) {
    if (ri.paper !== undefined) return ri.paper;
    const w = Math.min(ri.img.width, 400), h = Math.max(1, Math.round(ri.img.height * w / ri.img.width)), c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.drawImage(ri.img, 0, 0, w, h);
    const sz = Math.max(1, Math.min(6, w >> 2, h >> 2)), pts = [[0, 0], [w - sz, 0], [0, h - sz], [w - sz, h - sz]].map(([x, y]) => { const px = g.getImageData(x, y, sz, sz).data, n = px.length / 4, t = [0, 0, 0, 0]; for (let i = 0; i < px.length; i++) t[i % 4] += px[i]; return t.map(v => v / n); });
    const solid = pts.filter(q => q[3] > 128); if (!solid.length) return (ri.paper = null);
    const best = solid.map(q => [q, solid.filter(r => cdist2(q, r) < 2400).length]).sort((a, b) => b[1] - a[1])[0][0], near = solid.filter(r => cdist2(best, r) < 2400);
    return (ri.paper = [0, 1, 2].map(i => near.reduce((t, r) => t + r[i], 0) / near.length));
  }
  /** n representative colours: median cut over the (weighted) colours, then two k-means passes */
  function reduceColours(cols, n) {
    const buckets = new Map();
    for (const c of cols) { const key = (c[0] >> 3) << 10 | (c[1] >> 3) << 5 | (c[2] >> 3), b = buckets.get(key); if (b) { b[0] += c[0]; b[1] += c[1]; b[2] += c[2]; b[3]++; } else buckets.set(key, [c[0], c[1], c[2], 1]); }
    const pts = [...buckets.values()].map(b => [b[0] / b[3], b[1] / b[3], b[2] / b[3], b[3]]);
    if (pts.length <= n) return pts.map(p => p.slice(0, 3));
    let boxes = [pts];
    const range = (bx, i) => { let lo = 255, hi = 0; for (const p of bx) { if (p[i] < lo) lo = p[i]; if (p[i] > hi) hi = p[i]; } return hi - lo; };
    while (boxes.length < n) {
      let bi = -1, bs = -1, ch = 0;
      boxes.forEach((bx, i) => { if (bx.length < 2) return; for (let c = 0; c < 3; c++) { const sc = range(bx, c) * Math.sqrt(bx.reduce((t, p) => t + p[3], 0)); if (sc > bs) { bs = sc; bi = i; ch = c; } } });
      if (bi < 0) break;
      const bx = boxes[bi].sort((a, b) => a[ch] - b[ch]), total = bx.reduce((t, p) => t + p[3], 0); let acc = 0, cut = 1;
      for (let i = 0; i < bx.length - 1; i++) { acc += bx[i][3]; if (acc >= total / 2) { cut = i + 1; break; } }
      boxes.splice(bi, 1, bx.slice(0, cut), bx.slice(cut));
    }
    let cen = boxes.map(bx => { const t = [0, 0, 0, 0]; for (const p of bx) { t[0] += p[0] * p[3]; t[1] += p[1] * p[3]; t[2] += p[2] * p[3]; t[3] += p[3]; } return [t[0] / t[3], t[1] / t[3], t[2] / t[3]]; });
    for (let it = 0; it < 2; it++) {
      const sum = cen.map(() => [0, 0, 0, 0]);
      for (const p of pts) { let bi = 0, bd = Infinity; cen.forEach((c, i) => { const dd = cdist2(p, c); if (dd < bd) { bd = dd; bi = i; } }); sum[bi][0] += p[0] * p[3]; sum[bi][1] += p[1] * p[3]; sum[bi][2] += p[2] * p[3]; sum[bi][3] += p[3]; }
      cen = cen.map((c, i) => sum[i][3] ? [sum[i][0] / sum[i][3], sum[i][1] / sum[i][3], sum[i][2] / sum[i][3]] : c);
    }
    return cen;
  }
  /** the converted picture: '#rrggbb' or null for every grid pixel */
  function convertPicture(d, ri, o) {
    const sm = samples(d, ri), k = sm.k, data = sm.data, lum = sm.lum, pd = sm.pd, W2 = sm.W;
    const darkCut = o.dark * 1.8, tol = o.bg > 0 ? o.bg * 0.7 : -1, need = o.cover / 100, cells = new Array(d.w * d.h).fill(null), cols = [], colAt = [];
    for (let cy = 0; cy < d.h; cy++) for (let cx = 0; cx < d.w; cx++) {
      let n = 0, clear = 0, dark = 0, r = 0, g = 0, b = 0, cn = 0;
      for (let sy = 0; sy < k; sy++) {
        let si = (cy * k + sy) * W2 + cx * k;
        for (let sx = 0; sx < k; sx++, si++) {
          n++;
          if (pd[si] <= tol || data[si * 4 + 3] < 128) { clear++; continue; }
          if (lum[si] < darkCut) { dark++; continue; }
          r += data[si * 4]; g += data[si * 4 + 1]; b += data[si * 4 + 2]; cn++;
        }
      }
      const i = cy * d.w + cx;
      if (dark / n >= need && dark > 0) cells[i] = 'L';
      else if (cn >= n * 0.35) { cols.push(boost([r / cn, g / cn, b / cn], o.sat)); colAt.push(i); }
    }
    // the colours to use: the picture's own (reduced), this sprite's, or the game's
    const cand = o.pal === 'sprite' ? d.palette.map(rgbOf) : o.pal === 'game' ? [...new Set(Object.values(HB.px_palette || {}).map(h => String(h).toLowerCase()))].filter(h => /^#[0-9a-f]{6}$/.test(h)).map(rgbOf) : reduceColours(cols, o.n);
    const hexes = cand.map(c => hexOf(...c.map(v => HB.clamp(Math.round(v), 0, 255))));
    cols.forEach((c, j) => { let bi = 0, bd = Infinity; cand.forEach((q, qi) => { const dd = cdist2(c, q); if (dd < bd) { bd = dd; bi = qi; } }); cells[colAt[j]] = hexes[bi]; });
    // an outline around the shape, on the clear pixels next to it
    if (o.outline) { const add = []; for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) { const i = y * d.w + x; if (cells[i]) continue; if ((x > 0 && cells[i - 1] && cells[i - 1] !== 'L') || (x < d.w - 1 && cells[i + 1] && cells[i + 1] !== 'L') || (y > 0 && cells[i - d.w] && cells[i - d.w] !== 'L') || (y < d.h - 1 && cells[i + d.w] && cells[i + d.w] !== 'L')) add.push(i); } for (const i of add) cells[i] = 'L'; }
    // lines and colours kept apart (each can go on its own layer); under the lines the colours carry on from their
    // neighbours, so a colour layer has no gaps when its lines sit on another layer or are redrawn
    const lines = cells.map(v => v === 'L'), colours = cells.map(v => v && v !== 'L' ? v : null);
    for (let pass = 0; pass < 4; pass++) {
      const fill = [];
      for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) {
        const i = y * d.w + x; if (!lines[i] || colours[i]) continue;
        const count = new Map(); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if ((dx || dy) && X >= 0 && Y >= 0 && X < d.w && Y < d.h) { const c = colours[Y * d.w + X]; if (c) count.set(c, (count.get(c) || 0) + 1); } }
        let best = null, bn = 0; for (const [c, n] of count) if (n > bn) { bn = n; best = c; } if (best) fill.push([i, best]);
      }
      if (!fill.length) break; for (const [i, c] of fill) colours[i] = c;
    }
    return { lines, colours, line: o.line };
  }
  /** what a conversion looks like with its keep setting: lines over colours, lines alone, or colours alone */
  const convPicture = (r, keep) => r.lines.map((l, i) => keep === 'lines' ? (l ? r.line : null) : keep === 'colours' ? r.colours[i] : (l ? r.line : r.colours[i]));
  const convLayer = (r, part) => r.lines.map((l, i) => part === 'lines' ? (l ? r.line : null) : (r.colours[i] || null));
  function runConvert() {
    CV.raf = 0; const d = D(), ri = curRef(); if (!CV.open || !d || !ri) return;
    const o = cvOpts(); CV.key = convKey(d, ri, o);
    CV.res = convertPicture(d, ri, o); CV.grid = convPicture(CV.res, o.keep);
    $('cv-colour-ctl').classList.toggle('dim', o.keep === 'lines');
    const c = CV.canvas && CV.canvas.width === d.w && CV.canvas.height === d.h ? CV.canvas : document.createElement('canvas'); c.width = d.w; c.height = d.h;
    const g = c.getContext('2d'), img = g.createImageData(d.w, d.h);
    CV.grid.forEach((hex, i) => { if (!hex) return; const v = rgbOf(hex), q = i * 4; img.data[q] = v[0]; img.data[q + 1] = v[1]; img.data[q + 2] = v[2]; img.data[q + 3] = 255; });
    g.putImageData(img, 0, 0); CV.canvas = c;
    const used = new Set(CV.grid.filter(Boolean)); $('cv-n-v').textContent = o.pal === 'free' ? `${o.n} (+ line)` : `${used.size} used`;
    draw();
  }
  const convKey = (d, ri, o) => [d.id, d.w, d.h, ri.x, ri.y, ri.scale, JSON.stringify(o)].join('|');
  function scheduleConvert() { if (CV.open && !CV.raf) CV.raf = requestAnimationFrame(runConvert); }
  function openConvert() {
    if (!D()) return;
    if (!curRef()) { CV.openAfterLoad = true; $('in-refimg').click(); toast('Choose a picture to convert'); return; }
    CV.open = true; $('conv').hidden = false; labelConvert(); runConvert();
  }
  function closeConvert() { CV.open = false; CV.grid = null; $('conv').hidden = true; draw(); }
  function labelConvert() { $('cv-dark-v').textContent = $('cv-dark').value; $('cv-cover-v').textContent = $('cv-cover').value + '%'; $('cv-bg-v').textContent = +$('cv-bg').value ? $('cv-bg').value : 'off'; $('cv-sat-v').textContent = $('cv-sat').value + '%'; }
  document.querySelectorAll('#conv input, #conv select').forEach(el => { el.addEventListener('input', () => { labelConvert(); if (el.id === 'cv-show') draw(); else scheduleConvert(); }); el.addEventListener('change', () => { if (el.id === 'cv-show') draw(); else scheduleConvert(); }); });
  $('btn-convert').onclick = openConvert;
  $('cv-cancel').onclick = closeConvert;
  $('cv-side').onclick = () => $('conv').classList.toggle('left');
  $('cv-apply').onclick = () => {
    const d = D(); if (!d || !CV.grid) return; commitFloat(); pushUndo();
    const keep = $('cv-keep').value, into = $('cv-into').value, map = new Map();
    const toFrame = (grid) => { const f = blank(d); grid.forEach((hex, i) => { if (!hex) return; if (!map.has(hex)) map.set(hex, color(d, hex)); f[i] = map.get(hex); }); return f; };
    const addLayer = (name, grid) => { const frames = d.frames.map(() => blank(d)); frames[S.frame] = toFrame(grid); d.layers.splice(d.layer + 1, 0, { name, hidden: false, frames }); useLayer(d, d.layer + 1); };
    let msg;
    if (into === 'apart' && keep === 'both') { addLayer('colours', convLayer(CV.res, 'colours')); addLayer('lines', convLayer(CV.res, 'lines')); msg = 'Converted into two new layers, “lines” above “colours”'; }
    else if (into === 'this') { d.frames[S.frame] = toFrame(CV.grid); msg = 'Converted into this layer'; }
    else { const name = keep === 'lines' ? 'lines' : keep === 'colours' ? 'colours' : 'converted'; addLayer(name, CV.grid); msg = `Converted into a new layer, “${name}”`; }
    closeConvert(); renderColors(); changed();
    toast(msg + ': touch it up, hide your picture, or undo to try again', 4500);
  };

  // =====================================================================================================
  // Colour wheel: the colour around the dial, stronger towards the edge, lighter or darker on the bar. Moving it
  // changes the colour you draw with: a colour no pixel uses yet changes in place (no clutter of in-between colours);
  // a used one becomes a new colour, unless "change it everywhere" is ticked (the sprite recolours live, one undo step).
  // =====================================================================================================
  const WH = { h: 0, s: 0, v: 0.15, drag: null, target: null, old: null, undone: false, fromWheel: false, disc: null };
  function hsvToRgb(h, s, v) { const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5), f(3), f(1)].map(x => Math.round(x * 255)); }
  function rgbToHsv(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dd = mx - mn; let h = 0; if (dd) { h = mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? dd / mx : 0, mx]; }
  const wheelHex = () => hexOf(...hsvToRgb(WH.h, WH.s, WH.v));
  function fitCanvas(c) { const dpr = window.devicePixelRatio || 1, r = c.getBoundingClientRect(), w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr)); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return dpr; }
  function drawWheel() {
    const c = $('wheel'), dpr = fitCanvas(c), g = c.getContext('2d'), W = c.width, R = W / 2 - 2 * dpr;
    if (!WH.disc || WH.disc.v !== WH.v || WH.disc.w !== W) { // the disc at this brightness, drawn once per brightness
      const img = g.createImageData(W, W);
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const dx = x + 0.5 - W / 2, dy = y + 0.5 - W / 2, rr = Math.hypot(dx, dy); if (rr > R + 1) continue;
        const rgb = hsvToRgb((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, Math.min(1, rr / R), WH.v), o = (y * W + x) * 4;
        img.data[o] = rgb[0]; img.data[o + 1] = rgb[1]; img.data[o + 2] = rgb[2]; img.data[o + 3] = rr > R ? Math.round(255 * (R + 1 - rr)) : 255;
      }
      WH.disc = { v: WH.v, w: W, img };
    }
    g.putImageData(WH.disc.img, 0, 0);
    const a = WH.h * Math.PI / 180, ring = WH.v > 0.55 ? '#1a1016' : '#ffffff';
    g.lineWidth = 2 * dpr; g.strokeStyle = ring; g.beginPath(); g.arc(W / 2 + Math.cos(a) * WH.s * R, W / 2 + Math.sin(a) * WH.s * R, 6 * dpr, 0, Math.PI * 2); g.stroke();
    const b = $('vbar'), bd = fitCanvas(b), bg = b.getContext('2d'), gr = bg.createLinearGradient(0, 0, 0, b.height);
    gr.addColorStop(0, hexOf(...hsvToRgb(WH.h, WH.s, 1))); gr.addColorStop(1, '#000000'); bg.fillStyle = gr; bg.fillRect(0, 0, b.width, b.height);
    bg.strokeStyle = ring; bg.lineWidth = 2 * bd; bg.strokeRect(bd, (1 - WH.v) * b.height - 3 * bd, b.width - 2 * bd, 6 * bd);
  }
  /** show the colour you draw with on the wheel (keeping the dial's position for greys and black) */
  function syncWheel() {
    const d = D(), hex = d && S.color !== CLEAR ? d.palette[S.color] : null;
    $('in-hex').value = hex || ''; if (!hex) { drawWheel(); return; }
    const [h, s, v] = rgbToHsv(...rgbOf(hex)); if (v > 0 && s > 0) WH.h = h; if (v > 0) WH.s = s; WH.v = v; drawWheel();
  }
  const colourUsed = (d, i) => d.layers.some(l => l.frames.some(f => f.includes(i)));
  function startWheelChange() {
    const d = D(); WH.old = S.color !== CLEAR ? d.palette[S.color] || null : null; WH.undone = false; WH.alpha = WH.old ? WH.old.slice(7, 9) : '';
    WH.target = S.color !== CLEAR && ($('chk-recolor').checked || !colourUsed(d, S.color)) ? S.color : null;
  }
  function applyWheel(done) {
    const d = D(); if (!d) return; const hex = wheelHex() + (WH.alpha || ''), everywhere = $('chk-recolor').checked && WH.target !== null;
    if (everywhere && !WH.undone) { pushUndo(); WH.undone = true; }
    if (WH.target === null) { if (d.palette.length >= AL.length) S.color = color(d, hex); else { d.palette.push(hex); WH.target = S.color = d.palette.length - 1; } }
    else { d.palette[WH.target] = hex; S.color = WH.target; }
    WH.fromWheel = true; renderColors(); WH.fromWheel = false; $('in-hex').value = hex; drawWheel();
    if (everywhere) changed(false, !done); else draw();
  }
  function endWheelChange() { if (WH.undone) changed(); WH.undone = false; $('old-swatch').style.background = WH.old || 'transparent'; }
  /** set the wheel to a colour and apply it, as one change (typed hex, the old-colour swatch) */
  function wheelTo(hex) { if (!D() || !HEX.test(hex)) return; const [h, s, v] = rgbToHsv(...rgbOf(hex)); if (s > 0 && v > 0) WH.h = h; if (v > 0) WH.s = s; WH.v = v; startWheelChange(); WH.alpha = hex.slice(7, 9); applyWheel(true); endWheelChange(); }
  for (const [id, which] of [['wheel', 'disc'], ['vbar', 'bar']]) {
    const el = $(id);
    const move = (e) => {
      const r = el.getBoundingClientRect();
      if (which === 'disc') { const dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2; WH.h = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360; WH.s = Math.min(1, Math.hypot(dx, dy) / (r.width / 2 - 2)); }
      else WH.v = HB.clamp(1 - (e.clientY - r.top) / r.height, 0, 1);
      applyWheel(false);
    };
    el.addEventListener('pointerdown', (e) => { if (!D()) return; try { el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ } WH.drag = which; startWheelChange(); move(e); });
    el.addEventListener('pointermove', (e) => { if (WH.drag === which) move(e); });
    const end = () => { if (WH.drag !== which) return; WH.drag = null; endWheelChange(); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  $('in-hex').addEventListener('change', (e) => { let v = e.target.value.trim().toLowerCase(); if (/^[0-9a-f]{6}([0-9a-f]{2})?$/.test(v)) v = '#' + v; if (HEX.test(v)) wheelTo(v); else { toast('Type a colour as #rrggbb (or #rrggbbaa: the last two say how solid, 00–ff)'); syncWheel(); } });
  $('in-hex').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
  $('old-swatch').onclick = () => { if (WH.old) wheelTo(WH.old); };

  // =====================================================================================================
  // The map's parchment under the drawing (the same paper the map is drawn on), and its colours for the eyedropper
  // =====================================================================================================
  let paperPat = null; const paperCache = { key: '', c: null };
  function paperPattern() {
    if (paperPat) return paperPat;
    try { if (!HB.parchment.tile) { HB.app = HB.app || {}; if (!HB.app.ctx) HB.app.ctx = document.createElement('canvas').getContext('2d'); HB.parchment.init(); } paperPat = ctx.createPattern(HB.parchment.tile, 'repeat'); } catch (e) { paperPat = null; }
    return paperPat;
  }
  /** the paper's grain in sprite pixels: on the map one paper texel is about zoom / 1.5 screen px and a map symbol's
   *  pixel scale × zoom (src/views/mapview.js), so a texel is 1 / (1.5 × scale) pixels */
  const paperTexel = (d) => 1 / (1.5 * (d.kind === 'map' ? d.scale || 1 : 1));
  /** the parchment's colour under pixel p (averaged over the pixel) */
  function paperColor(d, p) {
    const pp = paperPattern(); if (!pp) return null;
    const key = `${d.w}x${d.h}@${paperTexel(d)}`;
    if (paperCache.key !== key) {
      const big = document.createElement('canvas'); big.width = d.w * 4; big.height = d.h * 4; const bg = big.getContext('2d'), k = 4 / paperTexel(d);
      pp.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0])); bg.fillStyle = pp; bg.fillRect(0, 0, big.width, big.height);
      const c = document.createElement('canvas'); c.width = d.w; c.height = d.h; const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(big, 0, 0, d.w, d.h);
      paperCache.key = key; paperCache.c = g.getImageData(0, 0, d.w, d.h).data;
    }
    const o = (p[1] * d.w + p[0]) * 4, D2 = paperCache.c; return hexOf(D2[o], D2[o + 1], D2[o + 2]);
  }

  // =====================================================================================================
  // See-through pixels: the selected pixels' opacity, so the parchment (or whatever the sprite is drawn on) shows
  // through. Stored as #rrggbbaa colours, so a later change to the paper shows through too.
  // =====================================================================================================
  const OP = { live: null };
  /** the slider shows the opacity of the selection's first drawn pixel */
  function syncAlpha() {
    const d = D(), sl = S.sel; let a = 255;
    if (d && sl) { const f = F(); outer: for (let y = 0; y < sl.h; y++) for (let x = 0; x < sl.w; x++) { const X = sl.x + x, Y = sl.y + y; if (!selHas(sl, X, Y) || X >= d.w || Y >= d.h) continue; const v = f[Y * d.w + X]; if (v !== CLEAR) { a = rgbaOf(d.palette[v])[3]; break outer; } } }
    $('in-alpha').value = String(Math.round(a / 2.55)); $('alpha-v').textContent = Math.round(a / 2.55) + '%';
  }
  function setAlpha(pct, done) {
    const d = D(); if (!d) return;
    if (!OP.live) {
      commitFloat(); const sl = S.sel; if (!sl) { toast('Select pixels first (⬚ Select: tap a pixel or drag a box; Ctrl, Shift or ＋ Add adds more), or Select drawn'); syncAlpha(); return; }
      pushUndo(); OP.live = { frame: F().slice(), palette: d.palette.slice(), sel: sl };
    }
    const L = OP.live, f = F(), a = Math.round(HB.clamp(pct, 0, 100) * 2.55), aa = a >= 255 ? '' : a.toString(16).padStart(2, '0');
    d.palette = L.palette.slice(); f.set(L.frame); let full = false;
    const map = new Map();
    for (let y = 0; y < L.sel.h; y++) for (let x = 0; x < L.sel.w; x++) {
      const X = L.sel.x + x, Y = L.sel.y + y; if (X >= d.w || Y >= d.h || !selHas(L.sel, X, Y)) continue;
      const i = Y * d.w + X, v = L.frame[i]; if (v === CLEAR) continue;
      if (!map.has(v)) { const hex = L.palette[v].slice(0, 7) + aa, n0 = d.palette.length, k = color(d, hex); if (d.palette[k] !== hex.toLowerCase() && hex.length > 7 && n0 >= AL.length) full = true; map.set(v, k); }
      f[i] = map.get(v);
    }
    $('alpha-v').textContent = Math.round(a / 2.55) + '%';
    if (done) { OP.live = null; if (full) toast('This sprite has 62 colours: some pixels took the nearest colour. Delete unused colours by saving, or use fewer.'); renderColors(); changed(); }
    else changed(false, true);
  }
  // =====================================================================================================
  // Good and evil: how the game tints this drawing in a kind or a cruel setting. Automatic (HB.pixelArt.TONES) unless
  // adjusted here; adjustments are saved in the sprite's file (tones).
  // =====================================================================================================
  const TN = { live: false, keys: ['hue', 'sat', 'light', 'mix'] };
  function renderTone() {
    const d = D(), it = S.item, cur = (it && it.tone) || S.tone; document.querySelectorAll('#tone-row [data-tone]').forEach(b => b.classList.toggle('on', b.dataset.tone === cur));
    $('tn-draw').hidden = !S.tone || !d; $('tn-draw').textContent = S.tone === 'good' ? '✎ Draw the good version' : '✎ Draw the evil version';
    $('tone-own').hidden = !(it && it.tone);
    $('tone-ctl').hidden = !S.tone || !d; if (!S.tone || !d) return;
    const t = PA.tone(d, S.tone); for (const k of TN.keys) $('tn-' + k).value = String(t[k]); $('tn-tint').value = t.tint;
    $('tn-auto').disabled = !(d.tones && d.tones[S.tone]);
  }
  function toneEdit(key, value, done) {
    const d = D(); if (!d || !S.tone) return;
    if (!TN.live) { pushUndo(); TN.live = true; }
    d.tones = d.tones || {}; d.tones[S.tone] = Object.assign(PA.tone(d, S.tone), { [key]: value });
    if (done) { TN.live = false; renderTone(); changed(); } else changed(false, true);
  }
  document.querySelectorAll('#tone-row [data-tone]').forEach(b => { b.onclick = () => { if (!S.item) return; openVersion(baseOf(S.item), S.item.n || 1, b.dataset.tone); }; });
  // the good or evil version becomes its own drawing, starting from the tinted picture
  $('tn-draw').onclick = () => {
    const d = D(), base = baseOf(S.item), n = S.item.n || 1, t = S.tone; if (!d || !t) return; commitFloat();
    const def = toDef(d); def.palette = PA.tonedPalette(def, t); delete def.tones; def.id = idOf(base.id, n, t);
    const nd = fromDef(def); nd.fresh = false; docs.set(def.id, nd); S.tone = ''; open(itemFor(base, n, t)); changed();
    toast(`Your own ${t} version: change it as much as you like. The game uses it ${t === 'good' ? 'in a kind setting' : 'in a cruel setting'} instead of the tint.`, 5000);
  };
  $('tn-undraw').onclick = () => {
    const it = S.item; if (!it || !it.tone) return; const base = baseOf(it), n = it.n || 1, t = it.tone;
    if (!confirm(`Remove your ${t} drawing? The game tints the normal one again. (Removed from GitHub with your next save.)`)) return;
    if (saved.has(it.id)) deleted.add(it.id); docs.delete(it.id); saveDrafts(); S.tone = t; open(itemFor(base, n, '')); status(); renderList();
  };
  for (const k of TN.keys) { $('tn-' + k).addEventListener('input', (e) => toneEdit(k, +e.target.value, false)); $('tn-' + k).addEventListener('change', (e) => toneEdit(k, +e.target.value, true)); }
  $('tn-tint').addEventListener('input', (e) => toneEdit('tint', e.target.value, false)); $('tn-tint').addEventListener('change', (e) => toneEdit('tint', e.target.value, true));
  $('tn-auto').onclick = () => { const d = D(); if (!d || !d.tones || !d.tones[S.tone]) return; pushUndo(); delete d.tones[S.tone]; if (!Object.keys(d.tones).length) d.tones = null; renderTone(); changed(); };

  $('in-alpha').addEventListener('input', (e) => setAlpha(+e.target.value, false));
  $('in-alpha').addEventListener('change', (e) => setAlpha(+e.target.value, true));

  // =====================================================================================================
  // Saved palettes: named sets of colours you like (map, map good, map evil…) in assets/pixelart/palettes.js,
  // saved to GitHub with the art (kept as a draft in this browser until then)
  // =====================================================================================================
  const PAL_DRAFT = 'hb.editor.palettes';
  const PAL = { list: [], savedText: null, sel: 0, removing: false };
  const palettesText = (list) => `/* Saved colour palettes for the pixel editor (editor/index.html). Written by the editor; safe to edit by hand. */\nHB.pixelArt && HB.pixelArt.palettes([\n${list.map(p => ' ' + JSON.stringify({ name: p.name, colors: p.colors })).join(',\n')}\n]);\n`;
  const cleanPalettes = (list) => (Array.isArray(list) ? list : []).filter(p => p && typeof p.name === 'string').map(p => ({ name: p.name.slice(0, 40), colors: (Array.isArray(p.colors) ? p.colors : []).map(c => String(c).toLowerCase()).filter(c => HEX.test(c)).slice(0, 64) }));
  const palDirty = () => palettesText(PAL.list) !== PAL.savedText;
  function palettesEdited() { try { if (palDirty()) localStorage.setItem(PAL_DRAFT, JSON.stringify(PAL.list)); else localStorage.removeItem(PAL_DRAFT); } catch (e) { /* private mode */ } renderPalettes(); status(); }
  function renderPalettes() {
    const sel = $('pal-sel'); sel.innerHTML = '';
    if (!PAL.list.length) { const o = document.createElement('option'); o.textContent = 'none yet: + New'; sel.appendChild(o); }
    PAL.list.forEach((p, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = `${p.name} (${p.colors.length})`; sel.appendChild(o); });
    PAL.sel = HB.clamp(PAL.sel, 0, Math.max(0, PAL.list.length - 1)); if (PAL.list.length) sel.value = String(PAL.sel);
    const p = PAL.list[PAL.sel], box = $('pal-swatches'); box.innerHTML = ''; box.classList.toggle('removing', PAL.removing && !!p);
    if (p) p.colors.forEach((hex, ci) => {
      const sw = document.createElement('div'); sw.className = 'sw'; sw.style.background = swatchBg(hex); sw.title = PAL.removing ? `Take ${hex} out of “${p.name}”` : `${hex}: draw with it`;
      sw.onclick = () => { if (PAL.removing) { p.colors.splice(ci, 1); palettesEdited(); return; } const d = D(); if (!d) return; S.color = color(d, hex); renderColors(); };
      box.appendChild(sw);
    });
    for (const id of ['pal-add', 'pal-remove', 'pal-use', 'pal-rename', 'pal-del']) $(id).disabled = !p;
    $('pal-remove').classList.toggle('on', PAL.removing && !!p); $('pal-unsaved').hidden = !palDirty();
  }
  $('pal-sel').onchange = (e) => { PAL.sel = +e.target.value || 0; PAL.removing = false; renderPalettes(); };
  $('pal-new').onclick = () => {
    const name = (prompt('Name the new palette (for example: map good)', '') || '').trim().slice(0, 40); if (!name) return;
    const d = D(), cols = d ? toDef(d).palette.map(c => c.toLowerCase()) : [];
    PAL.list.push({ name, colors: cols }); PAL.sel = PAL.list.length - 1; PAL.removing = false; palettesEdited();
    toast(`“${name}” made with ${cols.length} colour${cols.length === 1 ? '' : 's'} from this sprite. Add more with + Colour; it goes to GitHub with your next save.`, 5000);
  };
  $('pal-add').onclick = () => { const p = PAL.list[PAL.sel], d = D(); if (!p || !d) return; if (S.color === CLEAR) { toast('Pick a colour first'); return; } const hex = d.palette[S.color].toLowerCase(); if (p.colors.includes(hex)) { toast('Already in this palette'); return; } p.colors.push(hex); palettesEdited(); };
  $('pal-remove').onclick = () => { PAL.removing = !PAL.removing; renderPalettes(); if (PAL.removing) toast('Tap a colour in the palette to take it out; tap − Colour again when you are done'); };
  $('pal-use').onclick = () => { const p = PAL.list[PAL.sel], d = D(); if (!p || !d) return; for (const hex of p.colors) color(d, hex); renderColors(); toast(`“${p.name}”: its colours are now in this sprite's colours`); };
  $('pal-rename').onclick = () => { const p = PAL.list[PAL.sel]; if (!p) return; const v = (prompt('Rename the palette', p.name) || '').trim().slice(0, 40); if (!v || v === p.name) return; p.name = v; palettesEdited(); };
  $('pal-del').onclick = () => { const p = PAL.list[PAL.sel]; if (!p || !confirm(`Delete the palette “${p.name}”? (It is removed from GitHub with your next save.)`)) return; PAL.list.splice(PAL.sel, 1); PAL.sel = Math.max(0, PAL.sel - 1); PAL.removing = false; palettesEdited(); };

  // =====================================================================================================
  // Panels
  // =====================================================================================================
  function setTool(t) { if (t !== S.tool) S.prevTool = S.tool; if (t !== 'move' && t !== 'select') commitFloat(); S.tool = t; document.querySelectorAll('#tools button').forEach(b => b.classList.toggle('on', b.dataset.tool === t)); draw(); }
  function renderColors() {
    const d = D(), pal = $('palette'); pal.innerHTML = '';
    const clear = document.createElement('div'); clear.className = 'sw clear' + (S.color === CLEAR ? ' cur' : ''); clear.title = 'Transparent'; clear.onclick = () => { S.color = CLEAR; renderColors(); }; pal.appendChild(clear);
    if (d) d.palette.forEach((hex, i) => { const s = document.createElement('div'); s.className = 'sw' + (S.color === i ? ' cur' : ''); s.style.background = swatchBg(hex); s.title = hex.length > 7 ? `${hex} (${Math.round(rgbaOf(hex)[3] / 2.55)}% solid)` : hex; s.onclick = () => { S.color = i; renderColors(); }; pal.appendChild(s); });
    $('cur-swatch').style.background = S.color === CLEAR || !d ? 'repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 10px 10px' : swatchBg(d.palette[S.color]);
    if (!WH.fromWheel) syncWheel();
  }
  function renderGamePalette() {
    const gp = $('gamepal'); gp.innerHTML = ''; const seen = new Set();
    for (const [name, hex] of Object.entries(HB.px_palette || {})) { const h = String(hex).toLowerCase(); if (!/^#[0-9a-f]{6}$/.test(h) || seen.has(h)) continue; seen.add(h); const s = document.createElement('div'); s.className = 'sw'; s.style.background = h; s.title = `${name} ${h}`; s.onclick = () => { if (!D()) return; S.color = color(D(), h); renderColors(); }; gp.appendChild(s); }
  }
  /** the layer list, top layer first (as it stacks) */
  function renderLayers() {
    const d = D(), box = $('layers'); box.innerHTML = ''; if (!d) return;
    for (let i = d.layers.length - 1; i >= 0; i--) {
      const l = d.layers[i], el = document.createElement('div'); el.className = 'ly' + (i === d.layer ? ' cur' : '') + (l.hidden ? ' off' : '');
      const eye = document.createElement('button'); eye.className = 'eye'; eye.textContent = l.hidden ? '◌' : '◉'; eye.title = l.hidden ? 'Hidden (left out of the game): tap to show' : 'Shown: tap to hide';
      eye.onclick = (e) => { e.stopPropagation(); pushUndo(); l.hidden = !l.hidden; changed(); };
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = l.name;
      el.append(eye, nm); el.onclick = () => selectLayer(i); el.ondblclick = () => { selectLayer(i); renameLayer(); };
      box.appendChild(el);
    }
    const cur = d.layers[d.layer]; $('ly-op').value = String(lyOp(cur)); $('ly-op-v').textContent = lyOp(cur) + '%'; $('ly-wash').value = String(lyWash(cur)); $('ly-wash-v').textContent = lyWash(cur) + '%';
    $('ly-merge').disabled = d.layer === 0; $('ly-del').disabled = d.layers.length < 2;
    $('ly-up').disabled = d.layer >= d.layers.length - 1; $('ly-down').disabled = d.layer === 0;
  }
  function selectLayer(i) { const d = D(); if (!d || i === d.layer) return; commitFloat(); S.sel = null; useLayer(d, i); renderLayers(); draw(); }
  function renameLayer() {
    const d = D(); if (!d) return; const l = d.layers[d.layer];
    const v = (prompt('Name this layer', l.name) || '').trim().slice(0, 40); if (!v || v === l.name) return;
    pushUndo(); l.name = v; changed();
  }
  $('ly-add').onclick = () => { const d = D(); if (!d) return; commitFloat(); pushUndo(); d.layers.splice(d.layer + 1, 0, { name: `Layer ${d.layers.length + 1}`, hidden: false, frames: d.frames.map(() => blank(d)) }); useLayer(d, d.layer + 1); changed(); };
  $('ly-dup').onclick = () => { const d = D(); if (!d) return; commitFloat(); pushUndo(); const l = d.layers[d.layer]; d.layers.splice(d.layer + 1, 0, { name: `${l.name} copy`, hidden: l.hidden, opacity: l.opacity, wash: l.wash, frames: l.frames.map(f => f.slice()) }); useLayer(d, d.layer + 1); changed(); };
  const moveLayer = (dir) => { const d = D(), j = d ? d.layer + dir : -1; if (!d || j < 0 || j >= d.layers.length) return; commitFloat(); pushUndo(); [d.layers[d.layer], d.layers[j]] = [d.layers[j], d.layers[d.layer]]; useLayer(d, j); changed(); };
  $('ly-up').onclick = () => moveLayer(1); $('ly-down').onclick = () => moveLayer(-1);
  // the layer's opacity and how much territory wash lands on it: live while dragging, one undo step per drag
  const LY = { live: false };
  for (const key of ['opacity', 'wash']) {
    const el = $(key === 'opacity' ? 'ly-op' : 'ly-wash'), lab = $(key === 'opacity' ? 'ly-op-v' : 'ly-wash-v');
    const set = (done) => { const d = D(); if (!d) return; if (!LY.live) { pushUndo(); LY.live = true; } const v = +el.value; d.layers[d.layer][key] = v === 100 ? undefined : v; lab.textContent = v + '%'; if (done) { LY.live = false; changed(); } else changed(false, true); };
    el.addEventListener('input', () => set(false)); el.addEventListener('change', () => set(true));
  }
  $('ly-rename').onclick = renameLayer;
  $('ly-merge').onclick = () => {
    const d = D(); if (!d || d.layer === 0) return; commitFloat(); pushUndo();
    const top = d.layers[d.layer], below = d.layers[d.layer - 1];
    below.frames.forEach((f, k) => { const t = top.frames[k]; for (let i = 0; i < f.length; i++) if (t[i] !== CLEAR) f[i] = t[i]; });
    d.layers.splice(d.layer, 1); useLayer(d, d.layer - 1); changed(); toast(`Merged “${top.name}” into “${below.name}”`);
  };
  $('ly-del').onclick = () => { const d = D(); if (!d || d.layers.length < 2) return; commitFloat(); pushUndo(); const l = d.layers.splice(d.layer, 1)[0]; useLayer(d, Math.min(d.layer, d.layers.length - 1)); changed(); toast(`Deleted “${l.name}” (Undo brings it back)`); };
  function renderFrames() {
    const d = D(), box = $('frames'); box.innerHTML = ''; if (!d) return;
    // map symbols: no animation frames; the strip shows the variants, each its own drawing
    const isMap = d.kind === 'map' && d.frames.length === 1;
    for (const id of ['fr-add', 'fr-dup', 'fr-del', 'fr-left', 'fr-right']) $(id).hidden = isMap;
    $('var-buttons').hidden = !isMap; if (isMap) { renderVariants(); return; }
    const label = d.kind === 'map' ? 'variant' : 'frame', fit = Math.min(4, 64 / Math.max(d.h, 1), 120 / Math.max(d.w, 1)), sc = fit >= 1 ? Math.floor(fit) : fit;
    d.frames.forEach((_, k) => {
      const el = document.createElement('div'); el.className = 'fr' + (k === S.frame ? ' cur' : '');
      const f = flat(d, k); let c = frameCanvas(d, f);
      if (S.ref && S.ghosts.length && f.every(v => v === CLEAR)) { const g = document.createElement('canvas'); g.width = Math.max(1, Math.round(d.w * sc)); g.height = Math.max(1, Math.round(d.h * sc)); const x = g.getContext('2d'); x.globalAlpha = 0.3; x.drawImage(S.ghosts[Math.min(k, S.ghosts.length - 1)], 0, 0, g.width, g.height); c = g; }
      c.style.width = d.w * sc + 'px'; c.style.height = d.h * sc + 'px'; el.appendChild(c);
      const cap = document.createElement('div'); const it = S.item, unused = it && k >= it.frames && (it.kind === 'dragon' || it.kind === 'sprite' || (it.entry && it.entry.framesAre === 'levels'));
      cap.textContent = `${label} ${k + 1}${unused ? ' (unused)' : ''}`; el.appendChild(cap);
      el.onclick = () => { commitFloat(); S.frame = k; S.sel = null; renderFrames(); draw(); }; box.appendChild(el);
    });
  }
  /** the variants of the open map symbol (1 and every '#n' drawing), as tiles; in Good or Evil, their versions */
  function variantNs(base) { const ns = new Set([1]); for (const id of docs.keys()) { const p = pid(id); if (p.base === base.id && !p.tone) ns.add(p.n); } return [...ns].sort((a, b) => a - b); }
  function renderVariants() {
    const base = baseOf(S.item), box = $('frames'), tone = S.item.tone || S.tone, curN = S.item.n || 1;
    for (const n of variantNs(base)) {
      const own = tone && docs.get(idOf(base.id, n, tone)), d = own || docs.get(idOf(base.id, n, '')); if (!d) continue;
      const fit = Math.min(4, 64 / Math.max(d.h, 1), 120 / Math.max(d.w, 1)), sc = fit >= 1 ? Math.floor(fit) : fit;
      const el = document.createElement('div'); el.className = 'fr' + (n === curN ? ' cur' : '');
      const c = frameCanvas(own || !tone ? d : { w: d.w, h: d.h, palette: PA.tonedPalette(d, tone) }, flat(d, 0)); c.style.width = d.w * sc + 'px'; c.style.height = d.h * sc + 'px'; el.appendChild(c);
      const cap = document.createElement('div'); cap.textContent = `variant ${n}${tone ? (own ? ` · ${tone} (drawn)` : ` · ${tone} (tint)`) : ''}`; el.appendChild(cap);
      el.onclick = () => openVersion(base, n, tone); box.appendChild(el);
    }
  }
  /** open variant n in a version: its own good or evil drawing when there is one, else the normal one (tinted when tone) */
  function openVersion(base, n, tone) {
    commitFloat();
    if (tone && docs.has(idOf(base.id, n, tone))) { S.tone = ''; open(itemFor(base, n, tone)); }
    else { S.tone = tone || ''; open(itemFor(base, n, '')); }
  }
  /** an older map drawing with several frames: each frame becomes its own variant ('#2', '#3' …) */
  function splitFrames(doc) {
    const p = pid(doc.id); if (doc.kind !== 'map' || p.tone || doc.frames.length < 2) return 0;
    const base = catalog.find(c => c.id === p.base); if (!base) return 0;
    let next = Math.max(...variantNs(base)) + 1, made = 0;
    for (let k = 1; k < doc.frames.length; k++) {
      const def = toDef(doc), id = idOf(p.base, next++, '');
      if (def.layers) def.layers = def.layers.map(l => Object.assign({}, l, { frames: [l.frames[k]] })); else def.frames = [def.frames[k]];
      def.id = id; const nd = fromDef(def); nd.fresh = false; docs.set(id, nd); made++;
    }
    eachLayer(doc, fr => fr.slice(0, 1)); doc._rev = (doc._rev || 0) + 1; doc.fresh = false;
    return made;
  }
  /** terrain art is drawn into cached map chunks with a margin: the game refuses symbols that reach past it (same rule as the loader) */
  /** a map variant as the game uses it: frame k cut to what is drawn (stretched to hold the anchor), as src/art/pixelart.js does */
  function variantBox(d, k) {
    const b = drawnBox(d, k); if (!b) return null;
    const x0 = Math.min(b.x, d.anchor[0]), y0 = Math.min(b.y, d.anchor[1]), x1 = Math.max(b.x + b.w, d.anchor[0]), y1 = Math.max(b.y + b.h, d.anchor[1]);
    return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0), ax: d.anchor[0] - x0, ay: d.anchor[1] - y0 };
  }
  function terrainWarning(d) {
    const fam = HB.mapSpecFamily && HB.mapSpecFamily(d.id); if (!fam || fam.spec.layer !== 'terrain' || !HB.mapTerrainReach) return '';
    // the biggest variant decides (each variant is checked on its own when the game loads it)
    let t = { ok: true, cells: 0, limit: 2.2 };
    const u = d.scale / HB.mapDrawnK(d.id); // as the game sizes it (src/art/pixelart.js)
    d.frames.forEach((_, k) => { const b = variantBox(d, k); if (!b) return; const r = HB.mapTerrainReach(fam.spec, [b.w * u, b.h * u], [b.w, b.h], [b.ax, b.ay], false); if (r.cells > t.cells) t = r; });
    return t.ok ? '' : `Too big for terrain: it reaches ${t.cells.toFixed(1)} cells from the anchor (the map allows ${t.limit.toFixed(1)}), so the game would use its hand-drawn symbol. Make it smaller, lower the scale, or move the anchor to the middle.`;
  }
  function renderInfo() {
    const d = D(), it = S.item; if (!d) return;
    $('title').textContent = `${it.group} · ${it.label}${isDirty(d) ? '  •  unsaved' : saved.has(d.id) ? '  •  saved' : ''}`;
    const warn = d.kind === 'map' ? terrainWarning(d) : '', fam = d.kind === 'map' && HB.mapSpecFamily ? HB.mapSpecFamily(d.id) : null;
    const nv = d.kind === 'map' ? variantNs(baseOf(it)).length : 0;
    const sizes = (it.tone ? ` Your own ${it.tone} version: the game uses it ${it.tone === 'good' ? 'in a kind setting' : 'in a cruel setting'} instead of tinting the normal drawing.` : '') + (nv > 1 ? ` Variant ${it.n || 1} of ${nv}: each spot gets one at random.` : '');
    $('note').textContent = noteFor(it, d) + (fam ? ` Anchor: ${fam.spec.anchor}.` : '') + sizes + (warn ? '  ⚠ ' + warn : '');
    $('btn-anc-foot').disabled = $('btn-anc-centre').disabled = d.kind === 'sprite';
    $('note').style.color = warn ? '#8a3324' : '';
    $('in-w').value = d.w; $('in-h').value = d.h; $('in-fps').value = d.fps;
    $('scale-wrap').style.display = d.kind === 'map' ? '' : 'none'; $('in-scale').value = String(d.scale);
    $('fr-ref').disabled = it.kind === 'map' && !it.rec;
  }
  function renderList() {
    const q = $('search').value.trim().toLowerCase(), mine = $('only-mine').checked, box = $('list'); box.innerHTML = '';
    let lastGroup = null;
    const related = new Map(); for (const id of new Set([...docs.keys(), ...saved.keys()])) { const b = pid(id).base; if (!related.has(b)) related.set(b, []); related.get(b).push(id); }
    const cur = S.item ? baseOf(S.item).id : null;
    for (const it of catalog) {
      const ids = related.get(it.id) || [it.id], drawn = ids.some(id => saved.has(id) || (docs.get(id) && !docs.get(id).fresh));
      if (mine && !drawn) continue;
      if (q && !(it.id.toLowerCase().includes(q) || it.group.toLowerCase().includes(q))) continue;
      if (it.group !== lastGroup) { const g = document.createElement('div'); g.className = 'group'; g.textContent = it.group; box.appendChild(g); lastGroup = it.group; }
      const el = document.createElement('div'); el.className = 'item' + (cur === it.id ? ' cur' : '');
      const n = ids.filter(id => saved.has(id) || (docs.get(id) && !docs.get(id).fresh)).length;
      const tag = ids.some(id => docs.get(id) && isDirty(docs.get(id)) && !docs.get(id).fresh) ? '✎ unsaved' : n > 1 ? `● ${n} drawings` : n ? '● drawn' : '';
      el.innerHTML = `<span>${it.label}</span><span class="tag">${tag}</span>`; el.onclick = () => open(it); box.appendChild(el);
    }
  }
  function status() {
    const n = dirtyIds().length + deleted.size + (palDirty() ? 1 : 0), gh = ghConfig();
    $('status').textContent = `${n ? n + ' unsaved' : 'all saved'} · ${gh.token ? 'GitHub ready' : 'GitHub token not set'}`;
    $('btn-save').disabled = !n;
  }
  let draftTimer = 0;
  function changed(structure, light) {
    if (D()) { D().fresh = false; D()._rev = (D()._rev || 0) + 1; }
    draw();
    if (light) return; // mid-stroke: the rest refreshes on release
    renderFrames(); renderLayers(); renderInfo(); renderUndo(); status(); clearTimeout(draftTimer); draftTimer = setTimeout(() => { saveDrafts(); renderList(); }, 400);
    void structure;
  }
  function setRefs(art) { S.refs = art ? art.canvases : []; S.ghosts = art ? art.ghosts : []; }
  function open(item) {
    if (S.doc) commitFloat();
    let doc = docs.get(item.id); if (!doc) { doc = newDoc(item); docs.set(item.id, doc); }
    const split = splitFrames(doc); if (split) setTimeout(() => { toast(`Your ${split + 1} variants are now separate drawings (variant 1 to ${split + 1}), each with its own size and anchor. Save to GitHub keeps them.`, 6000); saveDrafts(); status(); renderList(); }, 0);
    S.item = item; S.doc = doc; S.frame = 0; S.sel = null; S.float = null; S.color = Math.min(S.color === CLEAR ? 0 : S.color, Math.max(0, doc.palette.length - 1));
    setRefs(gameArt(item, doc));
    if (doc.fresh) S.ref = true;
    $('chk-ref').checked = S.ref;
    loadRefImg(item.id);
    fit(); renderColors(); renderFrames(); renderLayers(); renderInfo(); renderTone(); renderUndo(); renderList(); syncAlpha(); draw();
    try { localStorage.setItem('hb.editor.last', item.id); } catch (e) { /* private mode */ }
  }

  // =====================================================================================================
  // Preview: the animation at game scale, or a sample map of your map symbols
  // =====================================================================================================
  const pv = $('preview'), pg = pv.getContext('2d');
  let lastT = performance.now();
  function previewLoop(t) {
    const dt = (t - lastT) / 1000; lastT = t; if (S.playing) S.playT += dt;
    drawPreview(); if (S.float || S.sel) draw();
    requestAnimationFrame(previewLoop);
  }
  function bg(kind) {
    const W = pv.width, H = pv.height;
    if (kind === 'raid') { const g = pg.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#9cc4e4'); g.addColorStop(0.72, '#d9ecf2'); g.addColorStop(0.72, '#6f9a3d'); g.addColorStop(1, '#4f7a2a'); pg.fillStyle = g; pg.fillRect(0, 0, W, H); }
    else if (kind === 'parchment') { pg.fillStyle = '#e3d1a6'; pg.fillRect(0, 0, W, H); const R = new HB.RNG(3); for (let i = 0; i < 140; i++) { pg.fillStyle = R.chance(0.5) ? 'rgba(200,176,124,0.35)' : 'rgba(242,229,196,0.5)'; pg.fillRect(R.int(W), R.int(H), 2, 2); } }
    else if (kind === 'dark') { pg.fillStyle = '#2a2420'; pg.fillRect(0, 0, W, H); }
    else { for (let y = 0; y < H; y += 10) for (let x = 0; x < W; x += 10) { pg.fillStyle = ((x + y) / 10) & 1 ? '#e6e0d2' : '#faf6ec'; pg.fillRect(x, y, 10, 10); } }
  }
  function drawPreview() {
    const d = D(); pg.imageSmoothingEnabled = false;
    if (!d) { bg('checker'); return; }
    if (S.sample) { drawSampleMap(); return; }
    const kind = $('in-bg').value, W = pv.width, H = pv.height; bg(kind);
    // big pictures (the lair's) shrink to fit the preview; backdrops (anchor at the corner) are centred
    const sc = Math.min(+$('in-pscale').value, W * 0.96 / d.w, H * 0.96 / d.h), backdrop = d.anchor[0] === 0 && d.anchor[1] === 0;
    const n = d.frames.length, k = S.playing ? Math.floor(S.playT * (d.fps || 2)) % n : S.frame, c = frameCanvas(d, flat(d, k, k === S.frame && S.float ? withFloat() : null));
    const gy = kind === 'raid' ? Math.round(H * 0.72) : Math.round(H * 0.6);
    const ax = backdrop ? (W - d.w * sc) / 2 : W / 2 - d.anchor[0] * sc, ay = backdrop ? (H - d.h * sc) / 2 : (d.kind === 'dragon' ? Math.round(H * 0.42) : Math.min(gy, H - 4 - (d.h - d.anchor[1]) * sc)) - d.anchor[1] * sc;
    pg.drawImage(c, Math.round(ax), Math.round(ay), Math.round(d.w * sc), Math.round(d.h * sc));
    pg.fillStyle = 'rgba(0,0,0,0.45)'; pg.font = '11px system-ui'; pg.fillText(`${d.kind === 'map' ? 'variant' : 'frame'} ${k + 1}/${n}`, 6, 14);
  }
  function withFloat() { const d = D(), f = F().slice(), fl = S.float; for (let y = 0; y < fl.h; y++) for (let x = 0; x < fl.w; x++) { const v = fl.data[y * fl.w + x], X = fl.x + x, Y = fl.y + y; if (v !== CLEAR && X >= 0 && Y >= 0 && X < d.w && Y < d.h) f[Y * d.w + X] = v; } return f; }
  /** your map symbols on a patch of parchment at map zoom 2: terrain in loose clusters, places spread out, the
   *  current symbol most often; variants are picked per spot like the game does */
  function drawSampleMap() {
    bg('parchment'); const W = pv.width, H = pv.height, z = 2, R = new HB.RNG(11), cur = D();
    const maps = [...docs.values()].filter(d => d.kind === 'map' && !pid(d.id).tone && (!d.fresh || d === cur));
    if (!maps.length) { pg.fillStyle = '#6b5a44'; pg.font = '12px system-ui'; pg.fillText('Open a map symbol and draw it to see it here', 24, H / 2); return; }
    const main = cur.kind === 'map' ? cur : maps[0], others = maps.filter(d => d !== main), spots = [];
    const size = (d) => Math.max(10, Math.max(d.w, d.h) * d.scale * z), step = size(main) * (main.id.startsWith('map.terrain') ? 0.8 : 1.6);
    for (let y = step * 0.7; y < H + step * 0.5; y += step * 0.75) for (let x = (Math.round(y / step) % 2) * step / 2; x < W + step; x += step) {
      if (R.chance(0.22)) continue;
      const d = others.length && R.chance(0.3) ? R.pick(others) : main;
      spots.push({ d, x: x + R.range(-0.3, 0.3) * step, y: y + R.range(-0.25, 0.25) * step, k: R.int(64), fl: d.flip && R.chance(0.5) });
    }
    spots.sort((a, b) => a.y - b.y);
    for (const p of spots) { const d = p.d, c = frameCanvas(d, flat(d, p.k % d.frames.length)), s = d.scale * z; pg.save(); pg.translate(Math.round(p.x), Math.round(p.y)); if (p.fl) pg.scale(-1, 1); pg.drawImage(c, -d.anchor[0] * s, -d.anchor[1] * s, d.w * s, d.h * s); pg.restore(); }
    pg.fillStyle = 'rgba(43,26,14,0.6)'; pg.font = '11px system-ui'; pg.fillText(`map zoom ${z} · ${maps.length} symbol${maps.length === 1 ? '' : 's'} drawn`, 6, 14);
  }

  // =====================================================================================================
  // Saving: drafts in this browser; GitHub commits; downloads
  // =====================================================================================================
  function saveDrafts() {
    const out = {}; for (const d of docs.values()) if (isDirty(d)) out[d.id] = toDef(d); for (const id of deleted) out[id] = null;
    try { localStorage.setItem(PA.DRAFTS, JSON.stringify(out)); } catch (e) { toast('Could not keep a draft in this browser (storage full?)'); }
  }
  function ghConfig() { try { return Object.assign({ token: '', repo: DEFAULT_REPO, branch: '' }, JSON.parse(localStorage.getItem(GH_KEY) || '{}')); } catch (e) { return { token: '', repo: DEFAULT_REPO, branch: '' }; } }
  async function gh(path, opts = {}) {
    const c = ghConfig(), r = await fetch(`https://api.github.com/repos/${c.repo}${path}`, Object.assign({ cache: 'no-store' }, opts, { headers: Object.assign({ Authorization: `Bearer ${c.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, opts.body ? { 'Content-Type': 'application/json' } : {}, opts.headers || {}) }));
    if (!r.ok) { let m = ''; try { m = (await r.json()).message; } catch (e) { /* no body */ } throw new Error(`GitHub ${r.status}${m ? ': ' + m : ''}`); }
    return opts.raw ? r.text() : r.json();
  }
  const refPath = (b) => b.split('/').map(encodeURIComponent).join('/');
  async function branchOf() { const c = ghConfig(); return c.branch || (await gh('')).default_branch; }
  async function saveToGitHub() {
    commitFloat(); const c = ghConfig();
    if (!c.token) { openSettings(); toast('Add a GitHub token first'); return; }
    // a drawing with nothing visible would make the sprite vanish in the game: it stays a draft here instead
    const empty = dirtyIds().filter(id => isEmpty(docs.get(id))), ids = dirtyIds().filter(id => !empty.includes(id)), palChanged = palDirty();
    if (!ids.length && !deleted.size && !palChanged) { toast(empty.length ? `Nothing to save: ${empty.join(', ')} ${empty.length === 1 ? 'has' : 'have'} nothing visible yet (the game keeps its own art; Delete art removes a saved one)` : 'Nothing to save', 6000); return; }
    const btn = $('btn-save'); btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const branch = await branchOf(), ref = await gh(`/git/ref/heads/${refPath(branch)}`), head = ref.object.sha, commit = await gh(`/git/commits/${head}`);
      // the index: what is on GitHub now, plus new files, minus deleted ones
      let files = [];
      try { files = parseCall(await gh(`/contents/assets/pixelart/index.js?ref=${encodeURIComponent(branch)}`, { raw: true, headers: { Accept: 'application/vnd.github.raw' } })); } catch (e) { files = PA.files.slice(); }
      // keep only files that are really there (an older editor could list one that was removed)
      try { const there = new Set((await gh(`/contents/assets/pixelart?ref=${encodeURIComponent(branch)}`)).map(f => f.name)); files = files.filter(f => there.has(f)); } catch (e) { /* listing unavailable: keep the list */ }
      const set = new Set(files);
      const tree = ids.map(id => { set.add(PA.fileOf(id)); return { path: 'assets/pixelart/' + PA.fileOf(id), mode: '100644', type: 'blob', content: fileText(toDef(docs.get(id))) }; });
      for (const id of deleted) { if (set.delete(PA.fileOf(id))) tree.push({ path: 'assets/pixelart/' + PA.fileOf(id), mode: '100644', type: 'blob', sha: null }); }
      const list = [...set].sort();
      tree.push({ path: 'assets/pixelart/index.js', mode: '100644', type: 'blob', content: indexText(list) });
      const palText = palettesText(PAL.list); if (palChanged) tree.push({ path: 'assets/pixelart/palettes.js', mode: '100644', type: 'blob', content: palText });
      const t = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: commit.tree.sha, tree }) });
      const names = ids.concat([...deleted].map(id => id + ' (removed)'), palChanged ? ['palettes'] : []);
      const msg = `Pixel art: ${names.slice(0, 6).join(', ')}${names.length > 6 ? ` and ${names.length - 6} more` : ''}\n\nMade with the pixel editor (editor/index.html).`;
      const nc = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message: msg, tree: t.sha, parents: [head] }) });
      await gh(`/git/refs/heads/${refPath(branch)}`, { method: 'PATCH', body: JSON.stringify({ sha: nc.sha }) });
      for (const id of ids) saved.set(id, fileText(toDef(docs.get(id))));
      for (const id of deleted) saved.delete(id);
      deleted.clear(); PA.files = list; saveDrafts();
      if (palChanged) { PAL.savedText = palText; palettesEdited(); }
      const big = ids.filter(id => terrainWarning(docs.get(id)));
      toast(`Saved ${names.join(', ')} to ${branch} (commit ${nc.sha.slice(0, 7)}). The site picks it up after its next deploy.${empty.length ? ` Not saved, nothing visible yet: ${empty.join(', ')}.` : ''}${big.length ? ` Too big for the map, so the game keeps its own drawing until you lower the Scale or centre the anchor: ${big.join(', ')}.` : ''}`, big.length ? 10000 : 7000);
    } catch (e) { toast('Save failed: ' + e.message, 7000); }
    btn.textContent = 'Save to GitHub'; renderInfo(); renderList(); status();
  }
  /** newer art on GitHub than on this site (saved from another device, site not yet redeployed): take it, unless you have unsaved changes to it */
  /** git's id for a file's contents (sha-1 of "blob <bytes>\0<text>"), to skip files that have not changed; null without crypto.subtle */
  async function blobSha(text) {
    if (!(globalThis.crypto && crypto.subtle) || text == null) return null;
    const body = new TextEncoder().encode(text), head = new TextEncoder().encode(`blob ${body.length}\0`), all = new Uint8Array(head.length + body.length); all.set(head); all.set(body, head.length);
    return [...new Uint8Array(await crypto.subtle.digest('SHA-1', all))].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  /** art on GitHub that this site does not have yet (saved from another device, site not yet redeployed): take it,
   *  except where you have unsaved changes; only files whose contents differ are downloaded */
  async function syncFromGitHub() {
    const c = ghConfig(); if (!c.token) return;
    try {
      const branch = await branchOf(), ref = `?ref=${encodeURIComponent(branch)}`, raw = { raw: true, headers: { Accept: 'application/vnd.github.raw' } };
      let listing = []; try { listing = await gh(`/contents/assets/pixelart${ref}`); } catch (e) { if (!/404/.test(e.message)) throw e; }
      if (!Array.isArray(listing) || !listing.some(f => f.name === 'index.js')) return; // nothing saved yet
      const shaOf = new Map(listing.map(f => [f.name, f.sha])), files = parseCall(await gh(`/contents/assets/pixelart/index.js${ref}`, raw));
      const idOfFile = new Map([...saved.keys()].map(id => [PA.fileOf(id), id]));
      let n = 0;
      for (const f of files) {
        const have = idOfFile.get(f);
        if (have && shaOf.has(f) && await blobSha(saved.get(have)) === shaOf.get(f)) continue;
        const def = parseCall(await gh(`/contents/assets/pixelart/${encodeURIComponent(f)}${ref}`, raw)), doc = docs.get(def.id);
        if (doc && isDirty(doc)) continue;
        const fresh = fromDef(def), canon = fileText(toDef(fresh));
        if (saved.get(def.id) !== canon) { docs.set(def.id, fresh); saved.set(def.id, canon); n++; }
      }
      // saved palettes from another device (unless you have unsaved palette changes here)
      if (shaOf.has('palettes.js') && !palDirty() && await blobSha(PAL.savedText) !== shaOf.get('palettes.js')) {
        const list = cleanPalettes(parseCall(await gh(`/contents/assets/pixelart/palettes.js${ref}`, raw))), text = palettesText(list);
        if (text !== PAL.savedText) { PAL.list = list; PAL.savedText = text; renderPalettes(); n++; }
      }
      // removed on GitHub since this site was built
      for (const [file, id] of idOfFile) if (!files.includes(file) && !deleted.has(id) && !(docs.get(id) && isDirty(docs.get(id)))) { saved.delete(id); docs.delete(id); n++; }
      PA.files = files;
      if (n) { buildCatalog(); renderList(); if (S.item) open(catalog.find(i => i.id === S.item.id) || S.item); status(); toast(`Brought in ${n} newer change${n === 1 ? '' : 's'} from GitHub`); }
    } catch (e) { toast('Could not read the latest art from GitHub: ' + e.message, 5000); }
  }
  function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function openSettings() { const c = ghConfig(); $('gh-token').value = c.token; $('gh-repo').value = c.repo; $('gh-branch').value = c.branch; $('dlg-settings').showModal(); }
  $('dlg-settings').addEventListener('close', () => {
    const v = $('dlg-settings').returnValue;
    if (v === 'ok') { localStorage.setItem(GH_KEY, JSON.stringify({ token: $('gh-token').value.trim(), repo: $('gh-repo').value.trim() || DEFAULT_REPO, branch: $('gh-branch').value.trim() })); toast('GitHub settings kept in this browser'); syncFromGitHub(); }
    if (v === 'forget') { const c = ghConfig(); c.token = ''; localStorage.setItem(GH_KEY, JSON.stringify(c)); toast('Token forgotten'); }
    status();
  });

  // =====================================================================================================
  // Buttons and keys
  // =====================================================================================================
  let toastT = 0;
  function toast(msg, ms = 2600) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }
  document.querySelectorAll('#tools button').forEach(b => b.onclick = () => setTool(b.dataset.tool));
  $('in-brush').onchange = (e) => { S.brush = +e.target.value; };
  $('chk-mirror').onchange = (e) => { S.mirror = e.target.checked; };
  $('btn-undo').onclick = undo; $('btn-redo').onclick = redo;
  $('btn-copy').onclick = () => copy(false); $('btn-cut').onclick = () => copy(true); $('btn-paste').onclick = paste; $('btn-del').onclick = deleteSel;
  $('btn-flip').onclick = () => flip(false); $('btn-flipv').onclick = () => flip(true);
  $('btn-clear').onclick = () => { if (!D()) return; pushUndo(); S.float = null; S.sel = null; F().fill(CLEAR); changed(); };
  $('chk-onion').onchange = (e) => { S.onion = e.target.checked; draw(); };
  $('chk-ref').onchange = (e) => { S.ref = e.target.checked; renderFrames(); draw(); };
  $('chk-grid').onchange = (e) => { S.grid = e.target.checked; draw(); };
  $('chk-paper').checked = S.paper;
  $('chk-paper').onchange = (e) => { S.paper = e.target.checked; try { localStorage.setItem('hb.editor.paper', S.paper ? '1' : '0'); } catch (err) { /* private mode */ } draw(); };
  $('btn-seladd').onclick = () => { S.addSel = !S.addSel; $('btn-seladd').classList.toggle('on', S.addSel); if (S.addSel) { setTool('select'); toast('Each tap or box now adds to the selection; tap ＋ Add again to start fresh selections'); } };
  $('btn-seldrawn').onclick = () => selectDrawn();
  $('zoom-in').onclick = () => { const r = stage.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1.5); };
  $('zoom-out').onclick = () => { const r = stage.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1 / 1.5); };
  $('zoom-fit').onclick = () => { fit(); draw(); };
  // frames belong to every layer: adding, duplicating, deleting and moving a frame does it in all of them
  $('v-add').onclick = () => { const d = D(), base = baseOf(S.item); if (!d) return; const n = Math.max(...variantNs(base)) + 1, it = itemFor(base, n, ''), nd = newDoc(it); nd.w = d.w; nd.h = d.h; nd.anchor = d.anchor.slice(); nd.scale = d.scale; nd.flip = d.flip; nd.palette = d.palette.slice(); nd.layers = [{ name: 'Layer 1', hidden: false, frames: [blank(nd)] }]; useLayer(nd, 0); docs.set(it.id, nd); S.tone = ''; open(it); toast(`Variant ${n}: draw it here. The map picks one variant at random for each spot.`, 4000); };
  $('v-dup').onclick = () => { const d = D(), base = baseOf(S.item); if (!d) return; commitFloat(); const n = Math.max(...variantNs(base)) + 1, it = itemFor(base, n, ''), def = toDef(d); def.id = it.id; delete def.tones; const nd = fromDef(def); nd.fresh = false; docs.set(it.id, nd); S.tone = ''; open(it); changed(); toast(`Variant ${n} starts as a copy of the one you had open`); };
  $('v-del').onclick = () => {
    const base = baseOf(S.item), n = S.item.n || 1; if (n === 1) { toast('Variant 1 is the main drawing: Delete art removes it'); return; }
    if (!confirm(`Delete variant ${n}${variantNs(base).length > 2 ? '' : ''} and its own good and evil drawings? (Removed from GitHub with your next save.)`)) return;
    for (const t of ['', 'good', 'evil']) { const id = idOf(base.id, n, t); if (saved.has(id)) deleted.add(id); docs.delete(id); }
    saveDrafts(); S.tone = ''; open(base); status(); renderList();
  };
  $('fr-add').onclick = () => { const d = D(); if (!d) return; commitFloat(); pushUndo(); eachLayer(d, fr => { fr.splice(S.frame + 1, 0, blank(d)); return fr; }); S.frame++; changed(true); };
  $('fr-dup').onclick = () => { const d = D(); if (!d) return; commitFloat(); pushUndo(); eachLayer(d, fr => { fr.splice(S.frame + 1, 0, fr[S.frame].slice()); return fr; }); S.frame++; changed(true); };
  $('fr-del').onclick = () => { const d = D(); if (!d || d.frames.length < 2) { toast('A sprite keeps at least one frame'); return; } pushUndo(); S.float = null; eachLayer(d, fr => { fr.splice(S.frame, 1); return fr; }); S.frame = Math.max(0, S.frame - 1); changed(true); };
  const moveFrame = (dir) => { const d = D(), j = S.frame + dir; if (!d || j < 0 || j >= d.frames.length) return; commitFloat(); pushUndo(); eachLayer(d, fr => { [fr[S.frame], fr[j]] = [fr[j], fr[S.frame]]; return fr; }); S.frame = j; changed(true); };
  $('fr-left').onclick = () => moveFrame(-1); $('fr-right').onclick = () => moveFrame(1);
  // a copied frame keeps its layers; pasting puts each into the layer at the same place (adding layers if needed)
  $('fr-copy').onclick = () => { const d = D(); if (!d) return; commitFloat(); S.frameClip = { layers: d.layers.map(l => ({ name: l.name, data: l.frames[S.frame].slice() })), w: d.w, h: d.h, colors: d.palette.slice() }; toast(d.layers.length > 1 ? `Frame copied (${d.layers.length} layers)` : 'Frame copied'); };
  $('fr-paste').onclick = () => {
    const d = D(), c = S.frameClip; if (!d || !c) { toast('Copy a frame first'); return; }
    pushUndo(); S.float = null;
    c.layers.forEach((cl, i) => {
      if (!d.layers[i]) d.layers.push({ name: cl.name, hidden: false, frames: d.frames.map(() => blank(d)) });
      const m = remapClip({ data: cl.data, colors: c.colors }), f = blank(d);
      for (let y = 0; y < Math.min(c.h, d.h); y++) for (let x = 0; x < Math.min(c.w, d.w); x++) f[y * d.w + x] = m[y * c.w + x];
      d.layers[i].frames[S.frame] = f;
    });
    useLayer(d, d.layer); renderLayers(); changed();
  };
  $('fr-ref').onclick = () => { const d = D(); if (!d || !S.refs.length) return; pushUndo(); const rc = S.refs[Math.min(S.frame, S.refs.length - 1)]; d.frames[S.frame] = quantize(d, rc, d.w, d.h); renderColors(); changed(); };
  $('btn-resize').onclick = () => resize(+$('in-w').value, +$('in-h').value);
  $('btn-crop').onclick = () => { const d = D(); if (!d) return; const b = drawnBox(d); if (!b) { toast('Nothing drawn to crop to'); return; } if (b.w === d.w && b.h === d.h) { toast('Already cropped to the drawing'); return; } cropTo(b); toast(`Cropped to ${b.w}×${b.h}`); };
  $('btn-cropsel').onclick = () => { const s2 = S.float || S.sel; if (!s2) { toast('Drag a box with Select (⬚) first, then Crop to box'); return; } const r = { x: Math.max(0, s2.x), y: Math.max(0, s2.y) }; r.w = Math.min(D().w, s2.x + s2.w) - r.x; r.h = Math.min(D().h, s2.y + s2.h) - r.y; cropTo(r); toast(`Cropped to ${r.w}×${r.h}`); };
  $('btn-anc-foot').onclick = () => anchorAt('foot');
  $('btn-anc-centre').onclick = () => anchorAt('centre');
  document.querySelectorAll('[data-shift]').forEach(b => b.onclick = () => { if (!D()) return; const [dx, dy] = b.dataset.shift.split(',').map(Number); shiftAll(dx, dy); });
  $('in-scale').onchange = (e) => { const d = D(); if (!d) return; pushUndo(); d.scale = +e.target.value; setRefs(gameArt(S.item, d)); changed(); };
  $('in-fps').onchange = (e) => { const d = D(); if (!d) return; pushUndo(); d.fps = Math.max(0.5, Math.min(30, +e.target.value || 2)); changed(); };
  $('btn-revert').onclick = () => {
    const d = D(); if (!d) return; if (!isDirty(d) && !deleted.has(d.id)) { toast('No unsaved changes here'); return; }
    deleted.delete(d.id); const s = saved.get(d.id);
    if (s) docs.set(d.id, fromDef(parseCall(s))); else docs.delete(d.id);
    saveDrafts(); open(S.item); status(); toast('Reverted to the saved version');
  };
  $('btn-delete-art').onclick = () => {
    const d = D(); if (!d) return; if (!confirm(`Remove your art for ${d.id}? The game's own drawing comes back once you save.`)) return;
    if (saved.has(d.id)) deleted.add(d.id); docs.delete(d.id); saveDrafts(); open(S.item); status(); renderList();
  };
  $('btn-play').onclick = () => { S.playing = !S.playing; S.playT = 0; $('btn-play').textContent = S.playing ? '❚❚ Pause' : '▶ Play'; };
  $('in-pscale').onchange = drawPreview; $('in-bg').onchange = drawPreview;
  $('btn-samplemap').onclick = () => { S.sample = !S.sample; $('btn-samplemap').classList.toggle('on', S.sample); };
  $('btn-game-map').onclick = () => { saveDrafts(); window.open('../index.html?scene=mappreview&mappack=pixel&drafts=1', '_blank'); };
  $('btn-game-dragon').onclick = () => { saveDrafts(); window.open('../index.html?scene=dragons&drafts=1', '_blank'); };
  $('btn-game-lair').onclick = () => { saveDrafts(); const id = S.item ? S.item.id : '', tier = (id.match(/^lair\.dragon\.(\d)/) || [])[1]; window.open(`../index.html?scene=lair&drafts=1&preset=${tier === undefined ? 'adult-kind' : ['none', 'young-kind', 'adult-kind', 'adult-kind'][+tier]}${tier === '3' ? '&tier=3' : ''}${/^lair\.(hill|room)/.test(id) ? '&view=rooms' : ''}${/\.sleep$/.test(id) ? '&sleep=1' : ''}`, '_blank'); };
  $('btn-save').onclick = saveToGitHub;
  $('btn-settings').onclick = openSettings;
  $('btn-download').onclick = () => { const d = D(); if (!d) return; commitFloat(); download(PA.fileOf(d.id), new Blob([fileText(toDef(d))], { type: 'text/javascript' })); };
  $('btn-png').onclick = () => { const d = D(); if (!d) return; commitFloat(); const c = document.createElement('canvas'); c.width = d.w * d.frames.length; c.height = d.h; d.frames.forEach((_, k) => c.getContext('2d').drawImage(frameCanvas(d, flat(d, k)), k * d.w, 0)); c.toBlob(b => download(d.id.replace(/[^\w.-]/g, '~') + '.png', b)); };
  $('search').oninput = renderList; $('only-mine').onchange = renderList;
  const keys = { space: false };
  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea') && e.key !== 'Escape') return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (e.code === 'Space') { keys.space = true; e.preventDefault(); return; }
    if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && k === 'y') { e.preventDefault(); redo(); return; }
    if (mod && k === 'c') { e.preventDefault(); copy(false); return; }
    if (mod && k === 'x') { e.preventDefault(); copy(true); return; }
    if (mod && k === 'v') { e.preventDefault(); paste(); return; }
    if (mod && k === 's') { e.preventDefault(); saveToGitHub(); return; }
    if (mod) return;
    if (k === 'delete' || k === 'backspace') { deleteSel(); return; }
    if (k === 'enter') { commitFloat(); return; }
    if (k === 'escape') { if (S.float) { if (D().undo.length) dropLastStep(); S.float = null; } S.sel = null; changed(); return; }
    if (k === 'arrowleft' || k === ',') { if (D() && S.frame > 0) { commitFloat(); S.frame--; renderFrames(); draw(); } return; }
    if (k === 'arrowright' || k === '.') { if (D() && S.frame < D().frames.length - 1) { commitFloat(); S.frame++; renderFrames(); draw(); } return; }
    const tools = { b: 'pencil', e: 'eraser', g: 'fill', i: 'picker', m: 'select', v: 'move', l: 'line', r: e.shiftKey ? 'rectf' : 'rect', o: e.shiftKey ? 'ellipsef' : 'ellipse', a: 'anchor' };
    if (tools[k]) setTool(tools[k]);
    if (k === 'p') $('btn-play').click();
  });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') keys.space = false; });
  window.addEventListener('resize', () => { draw(); drawWheel(); });
  window.addEventListener('beforeunload', (e) => { if (dirtyIds().length || deleted.size || palDirty()) { saveDrafts(); e.preventDefault(); e.returnValue = ''; } });

  // =====================================================================================================
  // Start: the art on this site, then your unsaved drafts from this browser, then (with a token) newer art on GitHub
  // =====================================================================================================
  (async function start() {
    renderGamePalette(); setTool('pencil');
    await PA.load('../assets/pixelart/');
    for (const def of PA.entries.values()) { const doc = fromDef(def); docs.set(def.id, doc); saved.set(def.id, fileText(toDef(doc))); }
    await PA.script('../assets/pixelart/palettes.js'); // saved palettes (missing until the first one is saved)
    PAL.list = cleanPalettes(PA.savedPalettes); PAL.savedText = palettesText(PAL.list);
    try { const pd = JSON.parse(localStorage.getItem(PAL_DRAFT) || 'null'); if (pd) PAL.list = cleanPalettes(pd); } catch (e) { /* no draft */ }
    renderPalettes();
    let restored = 0;
    try { const dr = JSON.parse(localStorage.getItem(PA.DRAFTS) || '{}'); for (const id in dr) { if (dr[id] === null) { if (saved.has(id)) { deleted.add(id); docs.delete(id); restored++; } } else { docs.set(id, fromDef(dr[id])); restored++; } } } catch (e) { /* no drafts */ }
    buildCatalog();
    let last = null; try { last = localStorage.getItem('hb.editor.last'); } catch (e) { /* private mode */ }
    const lp = last ? pid(last) : null, lb = lp && catalog.find(i => i.id === lp.base);
    open(lb && docs.has(last) ? itemFor(lb, lp.n, lp.tone) : lb || catalog.find(i => i.id === 'dragon.1.fly') || catalog[0]);
    status(); requestAnimationFrame(previewLoop);
    if (restored) toast(`${restored} unsaved change${restored === 1 ? '' : 's'} restored from this browser`, 4000);
    syncFromGitHub();
    window.PIXEL_EDITOR = { itemFor, openVersion, variantNs, selectDrawn, setAlpha, renderTone, S, docs, saved, deleted, catalog, open, syncFromGitHub, fromDef, PAL, WH, palettesText, saveToGitHub, isEmpty, setTool, toDef, fileText, indexText, parseCall, isDirty, dirtyIds, undo, redo, paste, copy, commitFloat, toolDown, toolMove, toolUp, flood, resize };
  })();
})();
