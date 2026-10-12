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
  const MAP_GROUP = { terrain: 'Map · terrain', place: 'Map · places', entity: 'Map · moving pieces', seal: 'Map · marks', seal2: 'Map · marks', threat: 'Map · marks', rumor: 'Map · marks', fog: 'Map · fog', ui: 'Map · other' };
  const GROUP_ORDER = ['Dragon · Hatchling', 'Dragon · Young', 'Dragon · Adult', 'Dragon · Ancient', 'Lair · dragon', 'Lair · places', 'People', 'Animals', 'Treasure', 'Props', 'Map · terrain', 'Map · places', 'Map · moving pieces', 'Map · marks', 'Map · fog', 'Map · other'];
  let catalog = [];
  function buildCatalog() {
    catalog = [];
    for (const e of HB.art.list()) catalog.push({ id: e.id, kind: e.kind, group: e.group, label: e.label, frames: e.frames, fps: e.fps, entry: e });
    if (globalThis.MAPART_EXPORT) for (const rec of MAPART_EXPORT.R) catalog.push({ id: rec.id, kind: 'map', group: MAP_GROUP[rec.screen] || 'Map · other', label: rec.id.replace(/^map\./, ''), frames: 1, fps: 1, rec });
    // art for ids the game no longer registers (renamed or removed): still listed so it can be deleted or kept
    for (const id of docs.keys()) if (!catalog.some(c => c.id === id)) { const d = docs.get(id); catalog.push({ id, kind: d.kind, group: 'Other', label: id, frames: d.frames.length, fps: d.fps || 2 }); }
    const groups = GROUP_ORDER.slice(); for (const c of catalog) if (!groups.includes(c.group) && c.group !== 'Other') groups.push(c.group);
    groups.push('Other');
    catalog = catalog.map((c, i) => [c, i]).sort((a, b) => groups.indexOf(a[0].group) - groups.indexOf(b[0].group) || a[1] - b[1]).map(p => p[0]);
  }
  const noteFor = (item, doc) => item.entry && item.entry.note ? item.entry.note
    : item.kind === 'dragon' ? `The game shows frames 1–${item.frames} of this pose (${item.fps} fps). One drawing serves every breed and alignment. Put the anchor (⊕) on the body centre: the dragon is placed there.`
      : item.kind === 'sprite' ? 'A raid sprite: drawn standing on its anchor (⊕, bottom centre) at 4× in the 320×180 scene. The game uses the first frame.'
        : item.kind === 'map' ? `A map symbol: each frame is a variant (the map picks one per symbol and keeps it). Drawn pixel-sharp; one pixel = ${doc ? doc.scale : 1} map pixels at zoom 1. The anchor (⊕) sits on the symbol's spot. Choose “Pixel art (editor)” in Settings → Map art to see these in the game.`
          : 'No longer used by the game (its id is not registered).';

  // =====================================================================================================
  // Documents: one per sprite id. frames are Uint8Arrays of palette indices (255 = transparent)
  // =====================================================================================================
  const docs = new Map(), saved = new Map(), deleted = new Set();
  const S = { item: null, doc: null, frame: 0, tool: 'pencil', prevTool: 'pencil', color: 0, zoom: 8, ox: 0, oy: 0, sel: null, float: null, clip: null, frameClip: null, playing: false, playT: 0, sample: false, brush: 1, mirror: false, onion: true, ref: false, grid: true, refs: [], ghosts: [] };
  const hexOf = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  const rgbOf = (hex) => { const v = PA.hex(hex); return v ? [v[0], v[1], v[2]] : [0, 0, 0]; };
  function fromDef(def) {
    const w = def.w | 0, h = def.h | 0, frames = (def.frames || [{ rows: [] }]).map((f) => { const a = new Uint8Array(w * h).fill(CLEAR); (f.rows || []).forEach((row, y) => { for (let x = 0; x < Math.min(w, row.length); x++) { const i = AL.indexOf(row[x]); if (i >= 0) a[y * w + x] = i; } }); return a; });
    return { id: def.id, kind: def.kind || 'sprite', w, h, anchor: (def.anchor || [w >> 1, h]).slice(), palette: (def.palette || []).slice(), frames, fps: def.fps || 2, scale: def.scale || 1, flip: !!def.flip, bodyLength: def.bodyLength || null, undo: [], redo: [] };
  }
  function toDef(doc) {
    const def = { id: doc.id, kind: doc.kind, w: doc.w, h: doc.h, anchor: doc.anchor.slice(), fps: doc.fps };
    if (doc.kind === 'map') { def.scale = doc.scale; if (doc.flip) def.flip = true; }
    if (doc.kind === 'dragon' && doc.bodyLength) def.bodyLength = doc.bodyLength;
    // keep only colours in use, in order
    const used = new Set(); for (const f of doc.frames) for (const v of f) if (v !== CLEAR) used.add(v);
    const keep = [...used].sort((a, b) => a - b), remap = new Map(keep.map((v, i) => [v, i]));
    def.palette = keep.map(i => doc.palette[i]);
    def.frames = doc.frames.map(f => ({ rows: Array.from({ length: doc.h }, (_, y) => { let s = ''; for (let x = 0; x < doc.w; x++) { const v = f[y * doc.w + x]; s += v === CLEAR ? '.' : AL[remap.get(v)]; } return s; }) }));
    return def;
  }
  /** the file for one sprite: JSON with one field per line and each frame's rows as a grid (easy to read and diff) */
  const fileText = (def) => {
    const fields = Object.entries(def).map(([k, v]) => k !== 'frames' ? ` ${JSON.stringify(k)}: ${JSON.stringify(v)}`
      : ` "frames": [\n${v.map(f => `  { "rows": [\n${f.rows.map(r => '   ' + JSON.stringify(r)).join(',\n')}\n  ] }`).join(',\n')}\n ]`);
    return `/* HoardBound pixel art: ${def.id}. Made with the pixel editor (editor/index.html); safe to edit by hand: '.' is clear, other characters index the palette. */\nHB.pixelArt && HB.pixelArt.add({\n${fields.join(',\n')}\n});\n`;
  };
  const indexText = (files) => `/* Pixel art made with the editor (editor/index.html): the list of sprite files in this folder. Written by the editor. */\nHB.pixelArt && HB.pixelArt.index(${JSON.stringify(files, null, 1)});\n`;
  const parseCall = (text) => { const a = text.indexOf('('), b = text.lastIndexOf(')'); return JSON.parse(text.slice(text.indexOf(a >= 0 && text[a + 1] === '[' ? '[' : '{', a), b)); };
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
    hex = hex.toLowerCase(); const i = doc.palette.indexOf(hex); if (i >= 0) return i;
    const [r, g, b] = rgbOf(hex); let best = 0, bd = Infinity;
    doc.palette.forEach((p, k) => { const q = rgbOf(p), d = (q[0] - r) ** 2 + (q[1] - g) ** 2 + (q[2] - b) ** 2; if (d < bd) { bd = d; best = k; } });
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
    const doc = { id: item.id, kind: item.kind, w: 16, h: 16, anchor: [8, 16], palette: [item.kind === 'map' ? '#2b1a0e' : '#2a1c22'], frames: [], fps: item.fps, scale: 1, flip: item.kind === 'map' && item.id.startsWith('map.terrain'), bodyLength: null, undo: [], redo: [], fresh: true };
    const art = gameArt(item, null);
    if (art) { doc.w = art.w; doc.h = art.h; doc.anchor = art.anchor.slice(); doc.bodyLength = art.bodyLength || null; }
    doc.frames = Array.from({ length: Math.max(1, item.frames) }, () => new Uint8Array(doc.w * doc.h).fill(CLEAR));
    return doc;
  }

  // =====================================================================================================
  // Editing primitives (with undo)
  // =====================================================================================================
  const D = () => S.doc, F = () => S.doc.frames[S.frame];
  function snapshot() { const d = D(); return { frames: d.frames.map(f => f.slice()), w: d.w, h: d.h, anchor: d.anchor.slice(), frame: S.frame, palette: d.palette.slice(), fps: d.fps, scale: d.scale }; }
  function restore(s) { const d = D(); d.frames = s.frames.map(f => f.slice()); d.w = s.w; d.h = s.h; d.anchor = s.anchor.slice(); S.frame = Math.min(s.frame, d.frames.length - 1); if (s.palette) { d.palette = s.palette.slice(); d.fps = s.fps; d.scale = s.scale; } d._rev = (d._rev || 0) + 1; }
  /** how many steps back a sprite keeps: 120, fewer for very big canvases (never under 20) */
  const undoCap = (d) => Math.max(20, Math.min(120, Math.floor(24e6 / Math.max(1, d.w * d.h * d.frames.length))));
  function pushUndo() { const d = D(); d.undo.push(snapshot()); while (d.undo.length > undoCap(d)) d.undo.shift(); d.redoKept = d.redo; d.redo = []; d.fresh = false; }
  /** take back the step just pushed (the first finger of a two- or three-finger tap), keeping what could be redone */
  function dropLastStep() { const d = D(); restore(d.undo.pop()); if (d.redoKept) d.redo = d.redoKept; d.redoKept = null; }
  function undo() { const d = D(); dropFloat(); if (!d.undo.length) { toast('Nothing to undo'); return; } d.redo.push(snapshot()); restore(d.undo.pop()); renderColors(); changed(true); }
  function redo() { const d = D(); if (!d.redo.length) { toast('Nothing to redo'); return; } d.undo.push(snapshot()); restore(d.redo.pop()); renderColors(); changed(true); }
  function renderUndo() { const d = D(), u = d ? d.undo.length : 0, r = d ? d.redo.length : 0; $('btn-undo').textContent = `↶ Undo${u ? ` (${u})` : ''}`; $('btn-redo').textContent = `↷ Redo${r ? ` (${r})` : ''}`; $('btn-undo').disabled = !u; $('btn-redo').disabled = !r; }
  function setPx(f, x, y, v) { const d = D(); if (x < 0 || y < 0 || x >= d.w || y >= d.h) return; f[y * d.w + x] = v; if (S.mirror) { const mx = d.w - 1 - x; f[y * d.w + mx] = v; } }
  function dab(x, y, v) { const f = F(), b = S.brush, o = Math.floor((b - 1) / 2); for (let j = 0; j < b; j++) for (let i = 0; i < b; i++) setPx(f, x - o + i, y - o + j, v); }
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
  // selection and floating pixels (a paste, or a selection lifted to move)
  function region(f, r) { const d = D(), out = new Uint8Array(r.w * r.h).fill(CLEAR); for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const X = r.x + x, Y = r.y + y; if (X >= 0 && Y >= 0 && X < d.w && Y < d.h) out[y * r.w + x] = f[Y * d.w + X]; } return out; }
  function clearRegion(f, r) { const d = D(); for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (x >= 0 && y >= 0 && x < d.w && y < d.h) f[y * d.w + x] = CLEAR; }
  function lift() { if (S.float || !S.sel) return; pushUndo(); S.float = Object.assign({}, S.sel, { data: region(F(), S.sel) }); clearRegion(F(), S.sel); }
  function commitFloat() { const fl = S.float; if (!fl) return; const d = D(), f = F(); for (let y = 0; y < fl.h; y++) for (let x = 0; x < fl.w; x++) { const v = fl.data[y * fl.w + x], X = fl.x + x, Y = fl.y + y; if (v !== CLEAR && X >= 0 && Y >= 0 && X < d.w && Y < d.h) f[Y * d.w + X] = v; } S.sel = { x: fl.x, y: fl.y, w: fl.w, h: fl.h }; S.float = null; changed(); }
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
    if (S.float) { S.float.data = fl(S.float.data, S.float.w, S.float.h); changed(); return; }
    pushUndo();
    if (S.sel) { const r = region(F(), S.sel), f2 = fl(r, S.sel.w, S.sel.h); clearRegion(F(), S.sel); for (let y = 0; y < S.sel.h; y++) for (let x = 0; x < S.sel.w; x++) { const X = S.sel.x + x, Y = S.sel.y + y; if (X >= 0 && Y >= 0 && X < d.w && Y < d.h) F()[Y * d.w + X] = f2[y * S.sel.w + x]; } }
    else d.frames[S.frame] = fl(F(), d.w, d.h);
    changed();
  }
  function resize(w, h) {
    const d = D(); w = Math.max(1, Math.min(512, w | 0)); h = Math.max(1, Math.min(512, h | 0)); if (w === d.w && h === d.h) return;
    pushUndo(); commitFloat();
    d.frames = d.frames.map(f => { const o = new Uint8Array(w * h).fill(CLEAR); for (let y = 0; y < Math.min(h, d.h); y++) for (let x = 0; x < Math.min(w, d.w); x++) o[y * w + x] = f[y * d.w + x]; return o; });
    d.w = w; d.h = h; d.anchor = d.kind === 'sprite' ? [w >> 1, h] : [Math.min(d.anchor[0], w), Math.min(d.anchor[1], h)]; S.sel = null; fit(); changed(true);
  }
  function shiftAll(dx, dy) {
    const d = D(); pushUndo(); commitFloat();
    d.frames = d.frames.map(f => { const o = new Uint8Array(d.w * d.h).fill(CLEAR); for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) { const X = x - dx, Y = y - dy; if (X >= 0 && Y >= 0 && X < d.w && Y < d.h) o[y * d.w + x] = f[Y * d.w + X]; } return o; });
    changed(true);
  }

  // =====================================================================================================
  // Drawing the editor
  // =====================================================================================================
  const cv = $('canvas'), ctx = cv.getContext('2d'), stage = $('stage');
  function frameCanvas(doc, f, alpha = 1) {
    const c = document.createElement('canvas'); c.width = doc.w; c.height = doc.h; const g = c.getContext('2d'), img = g.createImageData(doc.w, doc.h), Dd = img.data, pal = doc.palette.map(rgbOf);
    for (let i = 0; i < f.length; i++) { const v = f[i]; if (v === CLEAR || !pal[v]) continue; const o = i * 4; Dd[o] = pal[v][0]; Dd[o + 1] = pal[v][1]; Dd[o + 2] = pal[v][2]; Dd[o + 3] = 255 * alpha; }
    g.putImageData(img, 0, 0); return c;
  }
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
    // transparency checker
    ctx.save(); ctx.beginPath(); ctx.rect(X, Y, W, H); ctx.clip();
    const cs = Math.max(4, z); for (let y = 0; y < d.h * z; y += cs) for (let x = 0; x < d.w * z; x += cs) { ctx.fillStyle = ((x / cs + y / cs) & 1) ? '#efe6d2' : '#fbf6ea'; ctx.fillRect(X + x, Y + y, cs, cs); }
    // your picture, the game's drawing behind (to trace), the previous frame (onion skin), the frame, floating pixels
    const ri = curRef(); if (ri && !ri.front) drawRef(ri, X, Y, z);
    if (S.ref && S.ghosts.length) { ctx.globalAlpha = 0.32; ctx.imageSmoothingEnabled = d.kind === 'map'; ctx.drawImage(S.ghosts[Math.min(S.frame, S.ghosts.length - 1)], X, Y, W, H); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1; }
    if (S.onion && S.frame > 0) { ctx.globalAlpha = 0.25; ctx.drawImage(frameCanvas(d, d.frames[S.frame - 1]), X, Y, W, H); ctx.globalAlpha = 1; }
    ctx.drawImage(frameCanvas(d, F()), X, Y, W, H);
    if (S.shape) { const pts = shapePts(S.tool, S.shape.a, S.shape.b), col = S.color === CLEAR ? 'rgba(255,255,255,0.8)' : d.palette[S.color]; ctx.fillStyle = col; for (const [x, y] of pts) ctx.fillRect(X + x * z, Y + y * z, z, z); }
    if (S.float) { const fl = S.float; ctx.drawImage(frameCanvas({ w: fl.w, h: fl.h, palette: d.palette }, fl.data), X + fl.x * z, Y + fl.y * z, fl.w * z, fl.h * z); }
    if (ri && ri.front) drawRef(ri, X, Y, z);
    ctx.restore();
    // grid
    if (S.grid && z >= 6) { ctx.strokeStyle = 'rgba(60,40,20,0.12)'; ctx.lineWidth = 1; ctx.beginPath(); for (let x = 0; x <= d.w; x++) { ctx.moveTo(X + x * z + 0.5, Y); ctx.lineTo(X + x * z + 0.5, Y + H); } for (let y = 0; y <= d.h; y++) { ctx.moveTo(X, Y + y * z + 0.5); ctx.lineTo(X + W, Y + y * z + 0.5); } ctx.stroke(); }
    ctx.strokeStyle = 'rgba(60,40,20,0.5)'; ctx.strokeRect(X - 0.5, Y - 0.5, W + 1, H + 1);
    // selection marquee
    const s = S.float || S.sel; if (s) { ctx.save(); ctx.setLineDash([4, 3]); ctx.lineDashOffset = -(performance.now() / 60) % 7; ctx.strokeStyle = '#1d4f91'; ctx.lineWidth = 1.5; ctx.strokeRect(X + s.x * z + 0.5, Y + s.y * z + 0.5, s.w * z - 1, s.h * z - 1); ctx.restore(); }
    // anchor
    const ax = X + d.anchor[0] * z, ay = Y + d.anchor[1] * z; ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax - 7, ay); ctx.lineTo(ax + 7, ay); ctx.moveTo(ax, ay - 7); ctx.lineTo(ax, ay + 7); ctx.stroke();
    if (S.hover) { const [hx, hy] = S.hover; if (hx >= 0 && hy >= 0 && hx < d.w && hy < d.h) { ctx.strokeStyle = 'rgba(29,79,145,0.7)'; ctx.strokeRect(X + hx * z + 0.5, Y + hy * z + 0.5, z * S.brush - 1, z * S.brush - 1); } }
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
      if (S.float && inside(p, S.float)) { stroke = { t: 'drag', from: p, ox: S.float.x, oy: S.float.y }; return; }
      if (S.sel && inside(p, S.sel)) { lift(); stroke = { t: 'drag', from: p, ox: S.float.x, oy: S.float.y }; return; }
      commitFloat(); S.sel = null; stroke = { t: 'select', from: p }; S.sel = { x: p[0], y: p[1], w: 1, h: 1 }; draw(); return;
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
    if (st.t === 'select') { const a = st.from; S.sel = { x: Math.min(a[0], p[0]), y: Math.min(a[1], p[1]), w: Math.abs(p[0] - a[0]) + 1, h: Math.abs(p[1] - a[1]) + 1 }; draw(); return; }
    if (st.t === 'drag') { S.float.x = st.ox + p[0] - st.from[0]; S.float.y = st.oy + p[1] - st.from[1]; draw(); return; }
    if (st.t === 'shape') { let b = p; if (e.shiftKey && S.tool !== 'line') { const a = S.shape.a, m = Math.max(Math.abs(p[0] - a[0]), Math.abs(p[1] - a[1])); b = [a[0] + Math.sign(p[0] - a[0] || 1) * m, a[1] + Math.sign(p[1] - a[1] || 1) * m]; } S.shape.b = b; draw(); }
  }
  function toolUp(p) {
    const st = stroke; stroke = null;
    if (st.t === 'shape') { pushUndo(); for (const [x, y] of shapePts(S.tool, S.shape.a, S.shape.b)) setPx(F(), x, y, S.color); S.shape = null; changed(); return; }
    if (st.t === 'select') { draw(); return; }
    changed();
  }
  function pick(p) { const d = D(); if (p[0] < 0 || p[1] < 0 || p[0] >= d.w || p[1] >= d.h) return; const v = F()[p[1] * d.w + p[0]], ref = v === CLEAR ? refColor(p) : null; S.color = v !== CLEAR ? v : ref ? color(d, ref) : CLEAR; renderColors(); if (S.tool === 'picker') setTool(DRAWING.includes(S.prevTool) ? S.prevTool : 'pencil'); }
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
    S.refMove = false; renderRefCtl();
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
      saveRef(d.id); renderRefCtl(); draw(); toast('Your picture is behind the pixels: draw over it. The eyedropper picks its colours where a pixel is empty.', 5000);
    } catch (err) { toast('Could not read that image'); }
  };
  $('in-refop').oninput = (e) => { const r = curRef(); if (!r) return; r.opacity = +e.target.value / 100; draw(); };
  $('in-refsc').oninput = (e) => { const r = curRef(); if (!r) return; const cx = r.x + r.img.width * r.scale / 2, cy = r.y + r.img.height * r.scale / 2; r.scale = r.fit * +e.target.value / 100; r.x = cx - r.img.width * r.scale / 2; r.y = cy - r.img.height * r.scale / 2; draw(); };
  $('in-refop').onchange = $('in-refsc').onchange = () => { if (S.item) saveRef(S.item.id); };
  $('btn-refmove').onclick = () => { S.refMove = !S.refMove; renderRefCtl(); if (S.refMove) toast('Drag on the canvas to move your picture; tap Move it again to draw'); };
  $('btn-reffront').onclick = () => { const r = curRef(); if (!r) return; r.front = !r.front; saveRef(S.item.id); renderRefCtl(); draw(); };
  $('btn-refdel').onclick = () => { if (!S.item) return; refImgs.delete(S.item.id); idbDo('readwrite', st => st.delete(S.item.id)); S.refMove = false; renderRefCtl(); draw(); };

  // =====================================================================================================
  // Panels
  // =====================================================================================================
  function setTool(t) { if (t !== S.tool) S.prevTool = S.tool; if (t !== 'move' && t !== 'select') commitFloat(); S.tool = t; document.querySelectorAll('#tools button').forEach(b => b.classList.toggle('on', b.dataset.tool === t)); draw(); }
  function renderColors() {
    const d = D(), pal = $('palette'); pal.innerHTML = '';
    const clear = document.createElement('div'); clear.className = 'sw clear' + (S.color === CLEAR ? ' cur' : ''); clear.title = 'Transparent'; clear.onclick = () => { S.color = CLEAR; renderColors(); }; pal.appendChild(clear);
    if (d) d.palette.forEach((hex, i) => { const s = document.createElement('div'); s.className = 'sw' + (S.color === i ? ' cur' : ''); s.style.background = hex; s.title = hex; s.onclick = () => { S.color = i; renderColors(); }; pal.appendChild(s); });
    $('cur-swatch').style.background = S.color === CLEAR || !d ? 'repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 10px 10px' : d.palette[S.color];
    if (d && S.color !== CLEAR && d.palette[S.color]) $('in-color').value = d.palette[S.color];
  }
  function renderGamePalette() {
    const gp = $('gamepal'); gp.innerHTML = ''; const seen = new Set();
    for (const [name, hex] of Object.entries(HB.px_palette || {})) { const h = String(hex).toLowerCase(); if (!/^#[0-9a-f]{6}$/.test(h) || seen.has(h)) continue; seen.add(h); const s = document.createElement('div'); s.className = 'sw'; s.style.background = h; s.title = `${name} ${h}`; s.onclick = () => { if (!D()) return; S.color = color(D(), h); renderColors(); }; gp.appendChild(s); }
  }
  function renderFrames() {
    const d = D(), box = $('frames'); box.innerHTML = ''; if (!d) return;
    const label = d.kind === 'map' ? 'variant' : 'frame', fit = Math.min(4, 64 / Math.max(d.h, 1), 120 / Math.max(d.w, 1)), sc = fit >= 1 ? Math.floor(fit) : fit;
    d.frames.forEach((f, k) => {
      const el = document.createElement('div'); el.className = 'fr' + (k === S.frame ? ' cur' : '');
      let c = frameCanvas(d, f);
      if (S.ref && S.ghosts.length && f.every(v => v === CLEAR)) { const g = document.createElement('canvas'); g.width = Math.max(1, Math.round(d.w * sc)); g.height = Math.max(1, Math.round(d.h * sc)); const x = g.getContext('2d'); x.globalAlpha = 0.3; x.drawImage(S.ghosts[Math.min(k, S.ghosts.length - 1)], 0, 0, g.width, g.height); c = g; }
      c.style.width = d.w * sc + 'px'; c.style.height = d.h * sc + 'px'; el.appendChild(c);
      const cap = document.createElement('div'); const it = S.item, unused = it && k >= it.frames && (it.kind === 'dragon' || it.kind === 'sprite' || (it.entry && it.entry.framesAre === 'levels'));
      cap.textContent = `${label} ${k + 1}${unused ? ' (unused)' : ''}`; el.appendChild(cap);
      el.onclick = () => { commitFloat(); S.frame = k; S.sel = null; renderFrames(); draw(); }; box.appendChild(el);
    });
  }
  /** terrain art is drawn into cached map chunks with a margin: the game refuses symbols that reach past it (same rule as the loader) */
  function terrainWarning(d) {
    const fam = HB.mapSpecFamily && HB.mapSpecFamily(d.id); if (!fam || fam.spec.layer !== 'terrain' || !HB.mapTerrainReach) return '';
    const t = HB.mapTerrainReach(fam.spec, [d.w * d.scale, d.h * d.scale], [d.w, d.h], d.anchor, false);
    return t.ok ? '' : `Too big for terrain: it reaches ${t.cells.toFixed(1)} cells from the anchor (the map allows ${t.limit.toFixed(1)}), so the game would use its hand-drawn symbol. Make it smaller, lower the scale, or move the anchor to the middle.`;
  }
  function renderInfo() {
    const d = D(), it = S.item; if (!d) return;
    $('title').textContent = `${it.group} · ${it.label}${isDirty(d) ? '  •  unsaved' : saved.has(d.id) ? '  •  saved' : ''}`;
    const warn = d.kind === 'map' ? terrainWarning(d) : '';
    $('note').textContent = noteFor(it, d) + (warn ? '  ⚠ ' + warn : '');
    $('note').style.color = warn ? '#8a3324' : '';
    $('in-w').value = d.w; $('in-h').value = d.h; $('in-fps').value = d.fps;
    $('scale-wrap').style.display = d.kind === 'map' ? '' : 'none'; $('in-scale').value = String(d.scale);
    $('fr-ref').disabled = it.kind === 'map' && !it.rec;
  }
  function renderList() {
    const q = $('search').value.trim().toLowerCase(), mine = $('only-mine').checked, box = $('list'); box.innerHTML = '';
    let lastGroup = null;
    for (const it of catalog) {
      const doc = docs.get(it.id), drawn = saved.has(it.id) || (doc && !doc.fresh);
      if (mine && !drawn) continue;
      if (q && !(it.id.toLowerCase().includes(q) || it.group.toLowerCase().includes(q))) continue;
      if (it.group !== lastGroup) { const g = document.createElement('div'); g.className = 'group'; g.textContent = it.group; box.appendChild(g); lastGroup = it.group; }
      const el = document.createElement('div'); el.className = 'item' + (S.item && S.item.id === it.id ? ' cur' : '');
      const tag = doc && isDirty(doc) ? '✎ unsaved' : saved.has(it.id) ? '● drawn' : '';
      el.innerHTML = `<span>${it.label}</span><span class="tag">${tag}</span>`; el.onclick = () => open(it); box.appendChild(el);
    }
  }
  function status() {
    const n = dirtyIds().length + deleted.size, gh = ghConfig();
    $('status').textContent = `${n ? n + ' unsaved' : 'all saved'} · ${gh.token ? 'GitHub ready' : 'GitHub token not set'}`;
    $('btn-save').disabled = !n;
  }
  let draftTimer = 0;
  function changed(structure, light) {
    if (D()) { D().fresh = false; D()._rev = (D()._rev || 0) + 1; }
    draw();
    if (light) return; // mid-stroke: the rest refreshes on release
    renderFrames(); renderInfo(); renderUndo(); status(); clearTimeout(draftTimer); draftTimer = setTimeout(() => { saveDrafts(); renderList(); }, 400);
    void structure;
  }
  function setRefs(art) { S.refs = art ? art.canvases : []; S.ghosts = art ? art.ghosts : []; }
  function open(item) {
    if (S.doc) commitFloat();
    let doc = docs.get(item.id); if (!doc) { doc = newDoc(item); docs.set(item.id, doc); }
    S.item = item; S.doc = doc; S.frame = 0; S.sel = null; S.float = null; S.color = Math.min(S.color === CLEAR ? 0 : S.color, Math.max(0, doc.palette.length - 1));
    setRefs(gameArt(item, doc));
    if (doc.fresh) S.ref = true;
    $('chk-ref').checked = S.ref;
    loadRefImg(item.id);
    fit(); renderColors(); renderFrames(); renderInfo(); renderUndo(); renderList(); draw();
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
    const n = d.frames.length, k = S.playing ? Math.floor(S.playT * (d.fps || 2)) % n : S.frame, c = frameCanvas(d, k === S.frame && S.float ? withFloat() : d.frames[k]);
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
    const maps = [...docs.values()].filter(d => d.kind === 'map' && (!d.fresh || d === cur));
    if (!maps.length) { pg.fillStyle = '#6b5a44'; pg.font = '12px system-ui'; pg.fillText('Open a map symbol and draw it to see it here', 24, H / 2); return; }
    const main = cur.kind === 'map' ? cur : maps[0], others = maps.filter(d => d !== main), spots = [];
    const size = (d) => Math.max(10, Math.max(d.w, d.h) * d.scale * z), step = size(main) * (main.id.startsWith('map.terrain') ? 0.8 : 1.6);
    for (let y = step * 0.7; y < H + step * 0.5; y += step * 0.75) for (let x = (Math.round(y / step) % 2) * step / 2; x < W + step; x += step) {
      if (R.chance(0.22)) continue;
      const d = others.length && R.chance(0.3) ? R.pick(others) : main;
      spots.push({ d, x: x + R.range(-0.3, 0.3) * step, y: y + R.range(-0.25, 0.25) * step, k: R.int(64), fl: d.flip && R.chance(0.5) });
    }
    spots.sort((a, b) => a.y - b.y);
    for (const p of spots) { const d = p.d, c = frameCanvas(d, d.frames[p.k % d.frames.length]), s = d.scale * z; pg.save(); pg.translate(Math.round(p.x), Math.round(p.y)); if (p.fl) pg.scale(-1, 1); pg.drawImage(c, -d.anchor[0] * s, -d.anchor[1] * s, d.w * s, d.h * s); pg.restore(); }
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
    const ids = dirtyIds(); if (!ids.length && !deleted.size) { toast('Nothing to save'); return; }
    const btn = $('btn-save'); btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const branch = await branchOf(), ref = await gh(`/git/ref/heads/${refPath(branch)}`), head = ref.object.sha, commit = await gh(`/git/commits/${head}`);
      // the index: what is on GitHub now, plus new files, minus deleted ones
      let files = [];
      try { files = parseCall(await gh(`/contents/assets/pixelart/index.js?ref=${encodeURIComponent(branch)}`, { raw: true, headers: { Accept: 'application/vnd.github.raw' } })); } catch (e) { files = PA.files.slice(); }
      const set = new Set(files);
      const tree = ids.map(id => { set.add(PA.fileOf(id)); return { path: 'assets/pixelart/' + PA.fileOf(id), mode: '100644', type: 'blob', content: fileText(toDef(docs.get(id))) }; });
      for (const id of deleted) { if (set.delete(PA.fileOf(id))) tree.push({ path: 'assets/pixelart/' + PA.fileOf(id), mode: '100644', type: 'blob', sha: null }); }
      const list = [...set].sort();
      tree.push({ path: 'assets/pixelart/index.js', mode: '100644', type: 'blob', content: indexText(list) });
      const t = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: commit.tree.sha, tree }) });
      const names = ids.concat([...deleted].map(id => id + ' (removed)'));
      const msg = `Pixel art: ${names.slice(0, 6).join(', ')}${names.length > 6 ? ` and ${names.length - 6} more` : ''}\n\nMade with the pixel editor (editor/index.html).`;
      const nc = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message: msg, tree: t.sha, parents: [head] }) });
      await gh(`/git/refs/heads/${refPath(branch)}`, { method: 'PATCH', body: JSON.stringify({ sha: nc.sha }) });
      for (const id of ids) saved.set(id, fileText(toDef(docs.get(id))));
      for (const id of deleted) saved.delete(id);
      deleted.clear(); PA.files = list; saveDrafts();
      toast(`Saved ${names.length} sprite${names.length === 1 ? '' : 's'} to ${branch} (commit ${nc.sha.slice(0, 7)}). The site picks it up after its next deploy.`, 6000);
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
  $('in-color').oninput = (e) => { if (!D()) return; S.color = color(D(), e.target.value); renderColors(); };
  $('btn-recolor').onclick = () => { const d = D(); if (!d || S.color === CLEAR) return; pushUndo(); const hex = $('in-color').value.toLowerCase(), was = d.palette[S.color]; const other = d.palette.indexOf(hex); if (other >= 0 && other !== S.color) { for (const f of d.frames) for (let i = 0; i < f.length; i++) if (f[i] === S.color) f[i] = other; S.color = other; } else d.palette[S.color] = hex; renderColors(); changed(); toast(`${was} → ${hex}`); };
  $('btn-undo').onclick = undo; $('btn-redo').onclick = redo;
  $('btn-copy').onclick = () => copy(false); $('btn-cut').onclick = () => copy(true); $('btn-paste').onclick = paste; $('btn-del').onclick = deleteSel;
  $('btn-flip').onclick = () => flip(false); $('btn-flipv').onclick = () => flip(true);
  $('btn-clear').onclick = () => { if (!D()) return; pushUndo(); S.float = null; S.sel = null; F().fill(CLEAR); changed(); };
  $('chk-onion').onchange = (e) => { S.onion = e.target.checked; draw(); };
  $('chk-ref').onchange = (e) => { S.ref = e.target.checked; renderFrames(); draw(); };
  $('chk-grid').onchange = (e) => { S.grid = e.target.checked; draw(); };
  $('zoom-in').onclick = () => { const r = stage.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1.5); };
  $('zoom-out').onclick = () => { const r = stage.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1 / 1.5); };
  $('zoom-fit').onclick = () => { fit(); draw(); };
  $('fr-add').onclick = () => { const d = D(); if (!d) return; pushUndo(); commitFloat(); d.frames.splice(S.frame + 1, 0, new Uint8Array(d.w * d.h).fill(CLEAR)); S.frame++; changed(true); };
  $('fr-dup').onclick = () => { const d = D(); if (!d) return; commitFloat(); pushUndo(); d.frames.splice(S.frame + 1, 0, F().slice()); S.frame++; changed(true); };
  $('fr-del').onclick = () => { const d = D(); if (!d || d.frames.length < 2) { toast('A sprite keeps at least one frame'); return; } pushUndo(); S.float = null; d.frames.splice(S.frame, 1); S.frame = Math.max(0, S.frame - 1); changed(true); };
  const moveFrame = (dir) => { const d = D(), j = S.frame + dir; if (!d || j < 0 || j >= d.frames.length) return; pushUndo(); commitFloat(); [d.frames[S.frame], d.frames[j]] = [d.frames[j], d.frames[S.frame]]; S.frame = j; changed(true); };
  $('fr-left').onclick = () => moveFrame(-1); $('fr-right').onclick = () => moveFrame(1);
  $('fr-copy').onclick = () => { if (!D()) return; commitFloat(); S.frameClip = { data: F().slice(), w: D().w, h: D().h, colors: D().palette.slice() }; toast('Frame copied'); };
  $('fr-paste').onclick = () => { const d = D(), c = S.frameClip; if (!d || !c) { toast('Copy a frame first'); return; } pushUndo(); S.float = null; const m = remapClip(c), f = new Uint8Array(d.w * d.h).fill(CLEAR); for (let y = 0; y < Math.min(c.h, d.h); y++) for (let x = 0; x < Math.min(c.w, d.w); x++) f[y * d.w + x] = m[y * c.w + x]; d.frames[S.frame] = f; changed(); };
  $('fr-ref').onclick = () => { const d = D(); if (!d || !S.refs.length) return; pushUndo(); const rc = S.refs[Math.min(S.frame, S.refs.length - 1)]; d.frames[S.frame] = quantize(d, rc, d.w, d.h); renderColors(); changed(); };
  $('btn-resize').onclick = () => resize(+$('in-w').value, +$('in-h').value);
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
  $('btn-png').onclick = () => { const d = D(); if (!d) return; commitFloat(); const c = document.createElement('canvas'); c.width = d.w * d.frames.length; c.height = d.h; d.frames.forEach((f, k) => c.getContext('2d').drawImage(frameCanvas(d, f), k * d.w, 0)); c.toBlob(b => download(d.id.replace(/[^\w.-]/g, '~') + '.png', b)); };
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
  window.addEventListener('resize', () => draw());
  window.addEventListener('beforeunload', (e) => { if (dirtyIds().length || deleted.size) { saveDrafts(); e.preventDefault(); e.returnValue = ''; } });

  // =====================================================================================================
  // Start: the art on this site, then your unsaved drafts from this browser, then (with a token) newer art on GitHub
  // =====================================================================================================
  (async function start() {
    renderGamePalette(); setTool('pencil');
    await PA.load('../assets/pixelart/');
    for (const def of PA.entries.values()) { const doc = fromDef(def); docs.set(def.id, doc); saved.set(def.id, fileText(toDef(doc))); }
    let restored = 0;
    try { const dr = JSON.parse(localStorage.getItem(PA.DRAFTS) || '{}'); for (const id in dr) { if (dr[id] === null) { if (saved.has(id)) { deleted.add(id); docs.delete(id); restored++; } } else { docs.set(id, fromDef(dr[id])); restored++; } } } catch (e) { /* no drafts */ }
    buildCatalog();
    let last = null; try { last = localStorage.getItem('hb.editor.last'); } catch (e) { /* private mode */ }
    open(catalog.find(i => i.id === last) || catalog.find(i => i.id === 'dragon.1.fly') || catalog[0]);
    status(); requestAnimationFrame(previewLoop);
    if (restored) toast(`${restored} unsaved change${restored === 1 ? '' : 's'} restored from this browser`, 4000);
    syncFromGitHub();
    window.PIXEL_EDITOR = { S, docs, saved, deleted, catalog, open, syncFromGitHub, setTool, toDef, fileText, indexText, parseCall, isDirty, dirtyIds, undo, redo, paste, copy, commitFloat, toolDown, toolMove, toolUp, flood, resize };
  })();
})();
