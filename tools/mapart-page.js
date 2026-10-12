/* Page-side half of tools/mapart-export.mjs (injected into index.html; never loaded by the game).
 * Measures every procedural map glyph, draws the labelled contact sheets and paints the sample pack's test art.
 * All sizes are logical map pixels (screen px at zoom 1); a recipe draws one id (or state) at size factor k. */
(function () {
  const HB = globalThis.HB, P = HB.mapart.proc, S = HB.MAP_SPEC, F = S.families, C = S.cell;
  const clamp = HB.clamp, sq = Math.sqrt;
  const loc = (type, o) => Object.assign({ id: 9000, type, state: 'normal', tier: 2, flags: {}, factionId: -1, knowledge: { seen: true } }, o);
  const FLAG = '#8a3324';
  // how big each layer is drawn on screen at camera zoom z: k is the size factor (param / ref); terrain sits in
  // chunks drawn at k and then scaled with the map by z
  const SCREEN = {
    terrain: (z) => ({ k: 1, scale: z, rule: 'drawn at k into the 22 px/cell chunk, then scaled with the map (×zoom)' }),
    place: (z) => ({ k: clamp(sq(z), 0.4, 1.2), scale: 1, rule: 's = clamp(10·√zoom, 4, 12) × type scale' }),
    entity: (z) => ({ k: clamp(sq(z), 3 / 7, 9 / 7), scale: 1, rule: 's = clamp(7·√zoom, 3, 9)' }),
    seal: (z) => ({ k: clamp(C * z * 0.32, 5, 9) / 7, scale: 1, rule: 'r = clamp(7.04·zoom, 5, 9)' }),
    seal2: (z) => ({ k: clamp(C * z * 0.34, 6, 10) / 7.5, scale: 1, rule: 'r = clamp(7.48·zoom, 6, 10)' }),
    threat: (z) => ({ k: clamp(C * z * 0.55, 7, 14) / 12, scale: 1, rule: 's = clamp(12.1·zoom, 7, 14)' }),
    rumor: (z) => ({ k: clamp(9 * sq(z), 4, 11) / 9, scale: 1, rule: 's = clamp(9·√zoom, 4, 11)' }),
    fog: (z) => ({ k: z, scale: 1, rule: 'r = 16.5·zoom × 0.75–1.15 (doubled below zoom 0.8)' }),
    ui: () => ({ k: 1, scale: 1, rule: 'fixed: r = 34 at the top right' }),
  };
  const R = [];
  const add = (id, screen, draw, o = {}) => R.push(Object.assign({ id, screen, draw, random: true }, o));
  const fam = (id) => F[id];
  // ---- terrain
  const mt = fam('map.terrain.mountain'), jg = fam('map.terrain.mountain.jagged'), hl = fam('map.terrain.hill');
  add('map.terrain.mountain', 'terrain', (g, x, y, k, r) => P.mountain(g, x, y, mt.ref * k, mt.refY * k, r, {}), { call: 'w = 26.4·k, h = 20.9·k (cells: w 1.05–1.4 cell, h 0.75–1.2 cell)' });
  add('map.terrain.mountain.snow', 'terrain', (g, x, y, k, r) => P.mountain(g, x, y, mt.ref * k, mt.refY * k, r, { snow: true }), { state: 'snow', call: 'cold mountains' });
  add('map.terrain.mountain.peak', 'terrain', (g, x, y, k, r) => P.mountain(g, x, y, mt.ref * k, mt.ref * k * 0.967, r, { snow: true, big: true }), { state: 'peak', call: 'peaks: w 1.5 cell (k 1.25), h 1.45 cell' });
  add('map.terrain.mountain.jagged', 'terrain', (g, x, y, k, r) => P.mountainJagged(g, x, y, jg.ref * k, jg.refY * k, r, {}));
  add('map.terrain.mountain.jagged.deep', 'terrain', (g, x, y, k, r) => P.mountainJagged(g, x, y, jg.ref * k, jg.refY * k, r, { deep: true }), { state: 'deep' });
  add('map.terrain.hill', 'terrain', (g, x, y, k, r) => P.hill(g, x, y, hl.ref * k, hl.refY * k, r));
  for (const [id, fn] of [['map.terrain.tree.round', 'treeRound'], ['map.terrain.tree.pine', 'treePine'], ['map.terrain.tree.bare', 'treeBare'], ['map.terrain.tree.burned', 'treeBurned'], ['map.terrain.grass', 'grassTuft'], ['map.terrain.swamp', 'swampTuft'], ['map.terrain.dune', 'dune'], ['map.terrain.snow', 'snowDots'], ['map.terrain.field', 'field'], ['map.terrain.ash', 'ash']]) {
    const f = fam(id); add(id, 'terrain', (g, x, y, k, r) => P[fn](g, x, y, f.ref * k, r));
  }
  add('map.terrain.blossom', 'terrain', (g, x, y, k) => P.blossom(g, x, y, fam('map.terrain.blossom').ref * k), { random: false });
  add('map.terrain.wave', 'terrain', (g, x, y, k, r) => P.wave(g, x, y, fam('map.terrain.wave').ref * k, r, 0.75));
  // ---- places
  const place = (id, L, o = {}) => add(id, 'place', (g, x, y, k, r) => { P.setup(g); P.settlement(g, L, x, y, fam(HB.mapSpecFamily(id).id).ref * k, r, { flagColor: FLAG }); }, o);
  const PLACES = ['farm', 'village', 'town', 'city', 'castle', 'camp', 'mine', 'hold', 'glade', 'monastery', 'shrine', 'ruin', 'warren', 'tower', 'lair', 'rivalLair', 'battlefield', 'fortress', 'stronghold', 'sanctuary'];
  for (const t of PLACES) {
    const f = fam('map.place.' + t), base = t === 'camp' ? { camp: 'bandit' } : t === 'stronghold' ? { lieutenant: 'warlord' } : {};
    place('map.place.' + t, loc(t, base));
    for (const s of f.states) {
      if (s === 'great') place('map.place.city.great', loc('city', { tier: 4 }), { state: 'great', sub: true });
      else place(`map.place.${t}.${s}`, loc(t, Object.assign({}, base, { state: s === 'burned' ? 'burned' : 'ruin' })), { state: s });
    }
  }
  for (const c of ['bandit', 'goblin', 'hunter', 'military']) place('map.place.camp.' + c, loc('camp', { camp: c }), { sub: true });
  for (const l of ['warlord', 'sorcerer', 'blightmother']) place('map.place.stronghold.' + l, loc('stronghold', { lieutenant: l }), { sub: true });
  for (const path of ['benevolent', 'tyrannical']) for (let st = 1; st <= 4; st++) add(`map.home.${path}.${st}`, 'place', (g, x, y, k, r) => { P.setup(g); P.homeSettlement(g, x, y, 8.5 * k, st, path, r); });
  // ---- markers
  const ST = HB.DOMAIN_STATUSES;
  for (const s of ['protected', 'allied', 'tributary', 'occupied']) add('map.marker.pennant.' + s, 'place', (g, x, y, k) => { P.setup(g); P.pennant(g, x, y, 7.5 * k, ST[s].color, s === 'allied' || s === 'protected' ? 'sun' : s === 'occupied' ? 'eye' : null, s); }, { random: false });
  add('map.marker.crossedSwords', 'place', (g, x, y, k) => { P.setup(g); P.crossedSwords(g, x, y, 5.5 * k); }, { random: false });
  add('map.marker.wagon', 'entity', (g, x, y, k) => { P.setup(g); P.wagon(g, x, y, 7 * k); }, { random: false });
  add('map.marker.wagon.rich', 'entity', (g, x, y, k) => { P.setup(g); P.wagon(g, x, y, 7 * k, '#6a4a85'); }, { random: false, state: 'rich' });
  add('map.marker.banner', 'entity', (g, x, y, k) => { P.setup(g); P.banner(g, x, y, 7 * k, FLAG); }, { random: false });
  add('map.marker.walker', 'entity', (g, x, y, k) => { P.setup(g); P.walker(g, x, y, 7 * k); }, { random: false });
  add('map.marker.walker.hunter', 'entity', (g, x, y, k) => { P.setup(g); P.walker(g, x, y, 7 * k, '#7a2418'); }, { random: false, state: 'hunter' });
  add('map.marker.seal.story', 'seal', (g, x, y, k) => P.seal(g, x, y, 7 * k, 'story'), { random: false });
  add('map.marker.seal.story.locked', 'seal', (g, x, y, k) => P.seal(g, x, y, 7 * k, 'locked'), { random: false, state: 'locked' });
  add('map.marker.seal.shadow', 'seal2', (g, x, y, k) => P.seal(g, x, y, 7.5 * k, 'shadow'), { random: false });
  add('map.marker.seal.crystal', 'seal2', (g, x, y, k) => P.seal(g, x, y, 7.5 * k, 'crystal'), { random: false });
  add('map.marker.threat', 'threat', (g, x, y, k) => P.threatMark(g, x, y, 12 * k), { random: false });
  add('map.marker.rumor', 'rumor', (g, x, y, k) => P.rumorMark(g, x, y, 9 * k), { random: false });
  // ---- fog and decoration
  add('map.fog.cloud', 'fog', (g, x, y, k, r) => P.cloud(g, x, y, 16.5 * k, r, { fill: '#efe6cc', outline: true, alpha: 0.55, ink: HB.mapart.INK }));
  add('map.fog.cloud.storm', 'fog', (g, x, y, k, r) => P.cloud(g, x, y, 16.5 * k, r, { fill: '#b9ad8e', outline: true, alpha: 0.9, ink: '#3a2a1a', storm: true }), { state: 'storm' });
  add('map.fog.lightning', 'fog', (g, x, y, k, r) => P.lightning(g, x, y, 8.25 * k, r));
  add('map.decoration.compass', 'ui', (g, x, y, k) => P.compassRose(g, x, y, 34 * k), { random: false });

  // ---------- measuring: draw at 4× on a transparent canvas, union the ink bounds over several random seeds
  const M = 4, SZ = 1200, AX = 600, AY = 600;
  const cv = document.createElement('canvas'); cv.width = SZ; cv.height = SZ;
  const g = cv.getContext('2d', { willReadFrequently: true });
  function boundsOf(rec, k, seed) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, SZ, SZ);
    g.setTransform(M, 0, 0, M, AX, AY); P.setup(g); g.lineCap = 'round'; g.lineJoin = 'round';
    rec.draw(g, 0, 0, k, new HB.RNG(seed));
    g.setTransform(1, 0, 0, 1, 0, 0);
    const d = g.getImageData(0, 0, SZ, SZ).data;
    let x0 = SZ, y0 = SZ, x1 = -1, y1 = -1;
    for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) if (d[(y * SZ + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    return [(x0 - AX) / M, (y0 - AY) / M, (x1 + 1 - AX) / M, (y1 + 1 - AY) / M];
  }
  const r1 = (v) => Math.round(v * 10) / 10;
  function measure(rec) {
    const seeds = rec.random ? 24 : 1; let u = null; const ws = [], hs = [];
    for (let i = 0; i < seeds; i++) {
      const b = boundsOf(rec, 1, 7919 * (i + 1)); if (!b) continue;
      ws.push(b[2] - b[0]); hs.push(b[3] - b[1]);
      u = u ? [Math.min(u[0], b[0]), Math.min(u[1], b[1]), Math.max(u[2], b[2]), Math.max(u[3], b[3])] : b;
    }
    if (!u) return null;
    const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
    return { union: u.map(r1), typical: [r1(med(ws)), r1(med(hs))], reach: r1(Math.max(-u[0], u[2], -u[1], u[3])) };
  }
  function catalog() {
    const out = [];
    for (const rec of R) {
      const f = HB.mapSpecFamily(rec.id), spec = f.spec, m = measure(rec);
      const sc = SCREEN[rec.screen];
      const u = m.union, pad = 1;
      const logical = [Math.ceil(u[2] - u[0] + 2 * pad), Math.ceil(u[3] - u[1] + 2 * pad)];
      const anchor = [r1(-u[0] + pad), r1(-u[1] + pad)];
      const z1 = sc(1), z25 = sc(2.5);
      const entry = {
        id: rec.id, family: f.id, state: rec.state || null, sub: !!rec.sub, purpose: spec.purpose, builder: spec.builder, layer: spec.layer, sampling: spec.sampling,
        param: spec.param, ref: r1(spec.ref), refY: spec.refY ? r1(spec.refY) : null, maxK: spec.maxK, lod1K: spec.lod1K || null, familyStates: spec.states,
        anchor: spec.anchor, proceduralVariation: rec.random ? 'random shape per glyph (seeded)' : 'fixed shape', call: rec.call || null,
        measured: { boundsFromAnchor: u, typicalSize: m.typical, reach: m.reach },
        recommended: { logicalSize: logical, anchorLogical: anchor, sourceSizeAt4x: [logical[0] * 4, logical[1] * 4], anchorPxAt4x: [Math.round(anchor[0] * 4), Math.round(anchor[1] * 4)], variants: spec.layer === 'terrain' && rec.random ? 3 : 1 },
        onScreen: { rule: z1.rule, zoom1: [r1(logical[0] * z1.k * z1.scale), r1(logical[1] * z1.k * z1.scale)], zoom2_5: [r1(logical[0] * z25.k * z25.scale), r1(logical[1] * z25.k * z25.scale)], maxZoom3_2: [r1(logical[0] * sc(3.2).k * sc(3.2).scale), r1(logical[1] * sc(3.2).k * sc(3.2).scale)] },
        label: spec.layer === 'places' && rec.id.startsWith('map.place.') ? 'centred under the anchor; text baseline 3.3·zoom px + font size (11.5–15·√zoom) below it; art may move it with labelOffset' : rec.id.startsWith('map.home.') ? 'name centred 2.2·s below the anchor' : null,
        fallback: 'procedural: ' + spec.builder,
      };
      if (spec.layer === 'terrain') {
        const t = HB.mapTerrainReach(spec, logical, logical, anchor, false);
        entry.terrainReach = { cells: r1(t.cells * 100) / 100, limitCells: t.limit, maxReachAtK1: r1(t.limit / Math.max((spec.maxK || 1) / S.cell, (spec.lod1K || 0) / S.lod1Cell)) };
      }
      out.push(entry);
    }
    return out;
  }

  // ---------- contact sheets
  /** flat parchment (the textured tile makes the PNGs several MB; the colour is the tile's mean) */
  function paper(ctx, w, h) { ctx.fillStyle = '#e6d4a8'; ctx.fillRect(0, 0, w, h); }
  /** one sheet: every recipe at camera zoom z, cell size cw×ch, `mag` extra magnification for a detail sheet */
  function sheet(z, opts = {}) {
    const mag = opts.mag || 1, cols = opts.cols || 8, cw = opts.cw || 150, ch = opts.ch || 128, list = opts.ids ? R.filter(r => opts.ids.includes(r.id)) : R;
    const rows = Math.ceil(list.length / cols), head = 64, W = cols * cw + 20, H = head + rows * ch + 20;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    paper(ctx, W, H);
    HB.text.draw(ctx, opts.title || `HoardBound map glyphs at zoom ${z}`, 16, 30, { size: 20, family: 'sc', color: '#2b1a0e' });
    HB.text.draw(ctx, `Blue box: measured ink bounds (union of 24 random draws). Red cross: anchor. Sizes in screen px${mag > 1 ? ` ×${mag}` : ''}.`, 16, 52, { size: 13, italic: true, color: '#5a4630' });
    // scale reference: one map cell at this zoom
    const cellPx = C * z * mag, sx = W - 20 - Math.max(cellPx, 60);
    ctx.fillStyle = '#2b1a0e'; ctx.fillRect(sx, 40, cellPx, 3); ctx.fillRect(sx, 34, 1.5, 15); ctx.fillRect(sx + cellPx - 1.5, 34, 1.5, 15);
    HB.text.draw(ctx, `1 cell = ${r1(C * z)} px`, sx + cellPx / 2, 30, { size: 12, align: 'center', color: '#2b1a0e' });
    list.forEach((rec, i) => {
      const cx = 10 + (i % cols) * cw, cy = head + Math.floor(i / cols) * ch;
      ctx.save(); ctx.strokeStyle = 'rgba(90,70,40,0.25)'; ctx.strokeRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1); ctx.restore();
      const sc = SCREEN[rec.screen](z), k = sc.k, s = sc.scale * mag;
      const ax = cx + cw / 2, ay = cy + ch * (rec.screen === 'fog' || rec.screen === 'ui' || rec.screen === 'seal' || rec.screen === 'seal2' || rec.screen === 'threat' ? 0.5 : 0.66);
      ctx.save(); ctx.beginPath(); ctx.rect(cx + 1, cy + 1, cw - 2, ch - 24); ctx.clip();
      ctx.translate(ax, ay); ctx.scale(s, s); P.setup(ctx); rec.draw(ctx, 0, 0, k, new HB.RNG(7919)); ctx.restore();
      const m = rec._m || (rec._m = measure(rec));
      if (m) {
        const u = m.union.map(v => v * k * s);
        ctx.save(); ctx.strokeStyle = 'rgba(30,110,170,0.8)'; ctx.lineWidth = 1; ctx.setLineDash([3, 2]); ctx.strokeRect(ax + u[0], ay + u[1], u[2] - u[0], u[3] - u[1]); ctx.restore();
      }
      ctx.save(); ctx.strokeStyle = '#d0201a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ax - 5, ay); ctx.lineTo(ax + 5, ay); ctx.moveTo(ax, ay - 5); ctx.lineTo(ax, ay + 5); ctx.stroke(); ctx.restore();
      HB.text.draw(ctx, rec.id.replace(/^map\./, ''), cx + cw / 2, cy + ch - 9, { size: 11.5, align: 'center', color: '#2b1a0e', maxWidth: cw - 6 });
    });
    return c.toDataURL('image/png');
  }

  // ---------- sample pack test art (deliberately unlike the ink style, so replaced symbols are obvious)
  function art(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.lineJoin = 'round'; x.lineCap = 'round'; fn(x, w, h); return c; }
  function samplePack() {
    const out = {};
    const put = (name, c) => { out[name] = c.toDataURL('image/png'); return [c.width, c.height]; };
    // mountain A, 4×: 128×108, ink outline and hatching only (transparent inside) + an occlusion mask that hides what is behind
    const mountainA = (fillOnly) => art(128, 108, (x) => {
      x.beginPath(); x.moveTo(6, 102); x.lineTo(44, 30); x.lineTo(58, 44); x.lineTo(78, 8); x.lineTo(122, 102); x.closePath();
      if (fillOnly) { x.fillStyle = '#000'; x.fill(); return; }
      x.strokeStyle = '#26324a'; x.lineWidth = 5; x.stroke();
      x.lineWidth = 3; x.strokeStyle = '#3c5a86'; for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(84 + i * 5, 24 + i * 11); x.lineTo(74 + i * 4, 100); x.stroke(); }
      x.fillStyle = '#e8f0f8'; x.beginPath(); x.moveTo(78, 8); x.lineTo(90, 32); x.lineTo(80, 28); x.lineTo(70, 36); x.lineTo(68, 26); x.closePath(); x.fill(); x.strokeStyle = '#26324a'; x.lineWidth = 3; x.stroke();
    });
    put('terrain/mountain-a@4x.png', mountainA(false)); put('terrain/mountain-a-mask@4x.png', mountainA(true));
    // mountain B, 2×: 64×54, the same footprint from half the pixels, filled (opaque, no mask needed)
    put('terrain/mountain-b@2x.png', art(64, 54, (x) => {
      x.beginPath(); x.moveTo(3, 51); x.lineTo(30, 6); x.lineTo(40, 20); x.lineTo(46, 14); x.lineTo(61, 51); x.closePath();
      x.fillStyle = '#8a7aa6'; x.fill(); x.strokeStyle = '#2e2440'; x.lineWidth = 2.5; x.stroke();
      x.fillStyle = '#f2eef8'; x.beginPath(); x.moveTo(30, 6); x.lineTo(36, 15); x.lineTo(30, 13); x.lineTo(25, 15); x.closePath(); x.fill();
    }));
    // broadleaf tree, 4×: 40×48
    put('terrain/tree-round@4x.png', art(40, 48, (x) => {
      x.fillStyle = '#5a3a1e'; x.fillRect(17, 28, 6, 18);
      x.beginPath(); x.arc(20, 18, 15, 0, Math.PI * 2); x.fillStyle = '#4f8a3a'; x.fill(); x.strokeStyle = '#1f3a14'; x.lineWidth = 3; x.stroke();
      x.fillStyle = '#7fbf5a'; x.beginPath(); x.arc(15, 13, 5, 0, Math.PI * 2); x.fill();
    }));
    // village, 4×: 120×92, three red-roofed houses
    const house = (x, cx, by, w, h, roof) => { x.fillStyle = '#efe0bb'; x.fillRect(cx - w / 2, by - h, w, h); x.strokeStyle = '#3a2412'; x.lineWidth = 3; x.strokeRect(cx - w / 2, by - h, w, h); x.beginPath(); x.moveTo(cx - w / 2 - 4, by - h); x.lineTo(cx, by - h - w * 0.55); x.lineTo(cx + w / 2 + 4, by - h); x.closePath(); x.fillStyle = roof; x.fill(); x.stroke(); x.fillStyle = '#3a2412'; x.fillRect(cx - 3, by - 12, 6, 12); };
    put('places/village@4x.png', art(120, 92, (x) => { house(x, 60, 56, 30, 20, '#b2452a'); house(x, 28, 86, 34, 24, '#c0562e'); house(x, 90, 88, 32, 22, '#a53e26'); }));
    // castle, 4×: 112×128, grey keep; the engine draws the faction flag at attach.flag (top of the keep)
    put('places/castle@4x.png', art(112, 128, (x) => {
      x.strokeStyle = '#2a2a30'; x.lineWidth = 3;
      x.fillStyle = '#9a9aa4'; x.fillRect(10, 70, 92, 54); x.strokeRect(10, 70, 92, 54);
      for (let i = 0; i < 6; i++) { x.fillRect(10 + i * 17, 62, 9, 9); x.strokeRect(10 + i * 17, 62, 9, 9); }
      x.fillStyle = '#b4b4be'; x.fillRect(38, 30, 36, 94); x.strokeRect(38, 30, 36, 94);
      for (let i = 0; i < 3; i++) { x.fillRect(38 + i * 14, 22, 8, 9); x.strokeRect(38 + i * 14, 22, 8, 9); }
      x.fillStyle = '#2a2a30'; x.beginPath(); x.arc(56, 124, 9, Math.PI, 0); x.fill();
      x.fillRect(53, 50, 6, 12);
    }));
    // burned town (state variant), 4×: 136×112, charred shells and embers; the engine adds no extra smoke when art has the state
    put('places/town-burned@4x.png', art(136, 112, (x) => {
      x.strokeStyle = '#141010'; x.lineWidth = 3;
      for (const [cx, by, w, h] of [[34, 104, 36, 26], [100, 104, 36, 24], [66, 76, 34, 26]]) { x.fillStyle = '#4a3a34'; x.fillRect(cx - w / 2, by - h, w, h); x.strokeRect(cx - w / 2, by - h, w, h); x.beginPath(); x.moveTo(cx - w / 2, by - h); x.lineTo(cx - 4, by - h - 14); x.lineTo(cx + 6, by - h - 4); x.stroke(); }
      x.fillStyle = '#e0702a'; for (const [ex, ey] of [[30, 96], [104, 92], [62, 66], [72, 70], [44, 100]]) { x.beginPath(); x.arc(ex, ey, 3.5, 0, Math.PI * 2); x.fill(); }
      x.strokeStyle = 'rgba(70,60,56,0.85)'; x.lineWidth = 4; for (const sx of [40, 70, 98]) { x.beginPath(); x.moveTo(sx, 50); x.quadraticCurveTo(sx + 12, 30, sx - 2, 16); x.quadraticCurveTo(sx + 8, 8, sx + 2, 2); x.stroke(); }
    }));
    // caravan wagon as nearest-neighbour pixel art at 1× (12×9 px): shows pixel actors beside smooth ink
    put('markers/wagon-pixel@1x.png', art(12, 9, (x) => {
      const px = (c, a, b, w = 1, h = 1) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
      px('#f4ead0', 2, 0, 8, 4); px('#7a5230', 1, 4, 10, 2); px('#2b1a0e', 2, 6, 2, 2); px('#2b1a0e', 8, 6, 2, 2); px('#2b1a0e', 0, 3, 1, 1); px('#c9a25a', 4, 1, 4, 1);
    }));
    // ---- ink discovery masks (docs/map-art/INK_AND_WASH.md), pixel-aligned with the art above
    // ink: alpha = the line work; order: luminance = when each pixel appears (0 first), alpha 0 = engine decides
    const stroke = (x, pts, w) => { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.lineWidth = w; x.stroke(); };
    const MT = [[6, 102], [44, 30], [58, 44], [78, 8], [122, 102]];
    put('terrain/mountain-a-ink@4x.png', art(128, 108, (x) => {
      x.strokeStyle = '#000'; x.lineCap = 'round'; x.lineJoin = 'round'; stroke(x, MT, 6);
      for (let i = 0; i < 7; i++) stroke(x, [[84 + i * 5, 24 + i * 11], [74 + i * 4, 100]], 4);
      stroke(x, [[78, 8], [90, 32], [80, 28], [70, 36], [68, 26], [78, 8]], 4);
    }));
    // order: the outline from the lower left up over both peaks (0 → 110), the snow (110–130), hatching (130–180), the fill (225)
    put('terrain/mountain-a-order@4x.png', art(128, 108, (x) => {
      x.fillStyle = 'rgb(225,225,225)'; x.beginPath(); MT.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill();
      x.lineCap = 'round'; x.lineJoin = 'round';
      for (let k = 0; k < 7; k++) { const g = 130 + k * 7; x.strokeStyle = `rgb(${g},${g},${g})`; stroke(x, [[84 + k * 5, 24 + k * 11], [74 + k * 4, 100]], 6); }
      x.strokeStyle = 'rgb(118,118,118)'; stroke(x, [[78, 8], [90, 32], [80, 28], [70, 36], [68, 26], [78, 8]], 6);
      // the outline as short segments, each a little lighter than the last
      const seg = []; for (let i = 0; i < MT.length - 1; i++) for (let s = 0; s < 10; s++) { const t0 = s / 10, t1 = (s + 1) / 10, [a0, b0] = MT[i], [a1, b1] = MT[i + 1]; seg.push([[a0 + (a1 - a0) * t0, b0 + (b1 - b0) * t0], [a0 + (a1 - a0) * t1, b0 + (b1 - b0) * t1]]); }
      seg.forEach((sg, k) => { const g = Math.round(k / seg.length * 110); x.strokeStyle = `rgb(${g},${g},${g})`; stroke(x, sg, 8); });
    }));
    // village: ink = walls and roofs outlined; order = the front house first, then the others, windows and doors, fills last
    const houseLines = (x, cx, by, w, h) => { x.strokeRect(cx - w / 2, by - h, w, h); x.beginPath(); x.moveTo(cx - w / 2 - 4, by - h); x.lineTo(cx, by - h - w * 0.55); x.lineTo(cx + w / 2 + 4, by - h); x.stroke(); x.fillRect(cx - 3, by - 12, 6, 12); };
    put('places/village-ink@4x.png', art(120, 92, (x) => { x.strokeStyle = '#000'; x.fillStyle = '#000'; x.lineWidth = 4; houseLines(x, 60, 56, 30, 20); houseLines(x, 28, 86, 34, 24); houseLines(x, 90, 88, 32, 22); }));
    put('places/village-order@4x.png', art(120, 92, (x) => {
      const H = [[28, 86, 34, 24, 0], [90, 88, 32, 22, 45], [60, 56, 30, 20, 90]];
      for (const [cx, by, w, h, o] of H) { const f = 200 + o / 4; x.fillStyle = `rgb(${f},${f},${f})`; x.beginPath(); x.moveTo(cx - w / 2, by); x.lineTo(cx - w / 2, by - h); x.lineTo(cx - w / 2 - 4, by - h); x.lineTo(cx, by - h - w * 0.55); x.lineTo(cx + w / 2 + 4, by - h); x.lineTo(cx + w / 2, by - h); x.lineTo(cx + w / 2, by); x.closePath(); x.fill(); }
      for (const [cx, by, w, h, o] of H) { const g = o; x.strokeStyle = `rgb(${g},${g},${g})`; x.fillStyle = `rgb(${g + 60},${g + 60},${g + 60})`; x.lineWidth = 6; houseLines(x, cx, by, w, h); }
    }));
    // ---- watercolour masks: 256 px, seamless (built from waves with whole periods across the tile and a periodic grain)
    const tile = (fn) => { const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), img = g.createImageData(n, n); for (let y = 0; y < n; y++) for (let xx = 0; xx < n; xx++) { const v = Math.max(0, Math.min(255, Math.round(fn(xx / n, y / n) * 255))), o = (y * n + xx) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = v; img.data[o + 3] = 255; } g.putImageData(img, 0, 0); return c; };
    const P2 = Math.PI * 2, wave = (u, v, a, b, ph) => Math.sin(P2 * (a * u + b * v) + ph);
    const grain = (u, v) => { const x = Math.floor(u * 128) % 128, y = Math.floor(v * 128) % 128; let h = Math.imul(x, 374761393) + Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const flow = (u, v, s) => 0.5 + 0.18 * wave(u, v, 2, 1, s) + 0.14 * wave(u, v, -1, 3, s * 2) + 0.09 * wave(u, v, 5, -2, s * 3) + 0.06 * wave(u, v, 7, 6, s);
    for (const [name, s] of [['kind', 1.1], ['cruel', 2.7]]) {
      put(`wash/${name}-coverage.png`, tile((u, v) => flow(u, v, s) * 0.85 + grain(u, v) * 0.25));
      // pooling: thin wandering veins where the flow crosses two levels (pigment collecting along drying lines)
      put(`wash/${name}-pooling.png`, tile((u, v) => { const f = flow(u, v, s + 1.7); return Math.max(0, 1 - Math.abs(f - 0.5) * 9, 0.8 - Math.abs(f - 0.68) * 10) * (0.75 + grain(u, v) * 0.25); }));
      put(`wash/${name}-hue.png`, tile((u, v) => Math.max(0, Math.min(1, (flow(u, v, s + 4) - 0.45) * 2.2))));
    }
    // a bloom order mask: wets from the centre outward, with fingers (whole cycles around), outside the edge alpha 0
    put('wash/bloom-a.png', (() => { const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), img = g.createImageData(n, n);
      for (let y = 0; y < n; y++) for (let xx = 0; xx < n; xx++) { const dx = (xx + 0.5) / n - 0.5, dy = (y + 0.5) / n - 0.5, d = Math.hypot(dx, dy) * 2, a = Math.atan2(dy, dx); const edge = 0.84 + 0.1 * Math.sin(5 * a + 0.7) + 0.05 * Math.sin(11 * a + 2.1); const o = (y * n + xx) * 4, v = Math.min(255, Math.round(d / edge * 255)); img.data[o] = img.data[o + 1] = img.data[o + 2] = v; img.data[o + 3] = d <= edge ? 255 : 0; }
      g.putImageData(img, 0, 0); return c; })());
    // a test pack of deliberate mistakes (assets/map/packs/test-broken): only the pine is valid
    out['__broken/pine-ok@4x.png'] = art(28, 52, (x) => { x.beginPath(); x.moveTo(14, 2); x.lineTo(26, 42); x.lineTo(2, 42); x.closePath(); x.fillStyle = '#2e6a4a'; x.fill(); x.strokeStyle = '#123'; x.lineWidth = 3; x.stroke(); x.fillStyle = '#5a3a1e'; x.fillRect(12, 42, 4, 8); }).toDataURL('image/png');
    out['__broken/small-32.png'] = art(32, 32, (x) => { x.fillStyle = '#f0f'; x.fillRect(0, 0, 32, 32); }).toDataURL('image/png');
    return out;
  }
  /** palette swatches for the art spec */
  function palette() {
    const sw = [['#2b1a0e', 'ink (outlines, text)'], ['rgba(43,26,14,0.65)', 'soft ink (details, hatching)'], ['#f0e3c3', 'glyph fill / occlusion paper'], ['#d9c89d', 'dark glyph fill (walls, shade)'], ['#e3d1a6', 'parchment base'], ['#c8b07c', 'parchment fleck dark'], ['#f2e5c4', 'parchment fleck light'], ['rgba(48,78,118,0.78)', 'water ink (rivers, marsh)'], ['#698caa', 'sea wash (alpha 0.07–0.22)'], ['#6e8c3a', 'kind watercolour (alpha ≤ 0.45)'], ['#c4a03a', 'kind watercolour, gold blooms'], ['#b03010', 'cruel watercolour, rust'], ['#2c2420', 'cruel watercolour, charcoal edges'], ['#806846', 'neutral watercolour'], ['#24160c', 'discovery ink (wet)'], ['#4c3e2e', 'discovery sketch (alpha 0.5)'], ['#9c7a1c', 'pennant: protected'], ['#b8902a', 'pennant: allied'], ['#8a4a2a', 'pennant: tributary'], ['#5a2418', 'pennant: occupied'], ['#8f2b1f', 'story seal, threat'], ['#3a1e48', 'shadow seal'], ['#3f6d3a', 'crystal seal'], ['#efe6cc', 'fog cloud'], ['#b9ad8e', 'storm cloud']];
    const w = 760, h = 40 + Math.ceil(sw.length / 2) * 34;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); paper(x, w, h);
    HB.text.draw(x, 'Map palette (sampled from src/art/mapart.js, parchment.js, data/domain.js)', 14, 24, { size: 15, family: 'sc', color: '#2b1a0e' });
    sw.forEach(([col, name], i) => { const cx = 14 + (i % 2) * 372, cy = 38 + Math.floor(i / 2) * 34; x.fillStyle = col; x.fillRect(cx, cy, 44, 24); x.strokeStyle = '#2b1a0e'; x.strokeRect(cx + 0.5, cy + 0.5, 44, 24); HB.text.draw(x, `${col}  ${name}`, cx + 54, cy + 17, { size: 13, color: '#2b1a0e' }); });
    return c.toDataURL('image/png');
  }
  globalThis.MAPART_EXPORT = { R, SCREEN, catalog, sheet, samplePack, palette, measure };
})();
