/* The lair's pictures, drawn into a 345×194 buffer that the lair view shows at exactly 2× (src/views/lairview.js):
 *  - the hoard chamber close-up: a large dragon perched (or asleep) on its hoard; the sleep view shows it too;
 *  - the rooms view: a cross-section of the hill with a room for every lair upgrade (built, being dug, or a dotted
 *    outline where it could be dug), for the player to see and tap.
 * Every fixed picture is registered in HB.art, so the pixel editor (editor/index.html) can redraw it:
 *   lair.dragon.<tier>.perch / .sleep (anchor = where it rests on the pile), lair.chamber (frame k = chamber level k),
 *   lair.hill (the rooms view backdrop), lair.room.<id> (frame k = level k + 1).
 * The hoard pile stays generated (by bulk, richness and what it is made of), as do the trophies in their alcoves,
 * torch flames, light, workers, captives and construction. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;
  const px = HB.px, P = HB.px_palette, S = HB.sprites;
  const W = 345, H = 194, FLOOR = 166;
  const LAIR_L = [40, 60, 84, 104];       // the lair dragon's body length per tier (the raid dragon's is 16–66)
  const ROCK = '#21161d', WALL = '#3e2d38', WALL2 = '#4a3644', RIM = '#5e4855', FLOORC = '#33242d', DARK = '#160e13';

  // ---------------------------------------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------------------------------------
  /** an irregular rounded pocket (cave hollow) */
  function pocket(g, x, y, w, h, rng, col, rough = 2) {
    const pts = [], n = Math.max(12, Math.round((w + h) / 6)), cx = x + w / 2, cy = y + h / 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      // a squarish superellipse with a flat floor
      const k = 0.35, ex = Math.sign(ca) * Math.pow(Math.abs(ca), k), ey = Math.sign(sa) * Math.pow(Math.abs(sa), k);
      const j = (rng.next() - 0.5) * rough * 2;
      pts.push([cx + ex * (w / 2 + j), sa > 0.2 ? y + h : cy + ey * (h / 2 + j)]);
    }
    g.fillStyle = col; g.beginPath(); g.moveTo(Math.round(pts[0][0]), Math.round(pts[0][1]));
    for (const p of pts) g.lineTo(Math.round(p[0]), Math.round(p[1]));
    g.closePath(); g.fill();
  }
  /** rock grain: short strokes and specks */
  function grain(g, x, y, w, h, rng, n, cols) { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(x + rng.int(w), y + rng.int(h), 1 + rng.int(3), 1); } }
  function lowestRow(c) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let y = c.height - 1; y >= 0; y--) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 0) return y; return c.height - 1; }
  const levelOf = (st, id) => HB.lair.level(st, id);
  const building = (st, id) => st.lair.construction.find(c => c.id === id) || null;

  // ---------------------------------------------------------------------------------------------------------
  // the lair dragon (placeholder: the composed dragon drawn at a larger body length, in its breed's colours)
  // ---------------------------------------------------------------------------------------------------------
  function dragonGen(t, pose) {
    return (k, spec) => {
      const s = Object.assign({ breed: 'red', alignment: 0, mutations: [], scars: 0 }, spec, { tier: t, length: LAIR_L[t] });
      const c = HB.dragonArt.generated(s, pose === 'perch' ? 'idle' : 'sleep', [0, 1, 1, 0][k % 4]);
      c.anchorY = lowestRow(c) + 1; // rests on the pile with its lowest pixel
      return c;
    };
  }
  for (let t = 0; t < 4; t++) {
    const tn = HB.dragonArt.TIER_NAMES[t].toLowerCase();
    HB.art.define(`lair.dragon.${t}.perch`, { kind: 'anim', group: 'Lair · dragon', label: `${tn} on the hoard`, frames: 4, fps: 2, gen: dragonGen(t, 'perch'),
      note: `The ${tn} dragon sitting on its hoard in the lair, idling (frames loop). Put the anchor ⊕ where it rests on the pile. One drawing serves every breed.` });
    HB.art.define(`lair.dragon.${t}.sleep`, { kind: 'anim', group: 'Lair · dragon', label: `${tn} asleep on the hoard`, frames: 4, fps: 1, gen: dragonGen(t, 'sleep'),
      note: `The ${tn} dragon asleep on its hoard (the lair while it sleeps, and the sleep screen). Anchor ⊕ where it rests on the pile.` });
  }

  // ---------------------------------------------------------------------------------------------------------
  // the hoard chamber backdrop: frame k at chamber level k (0 = the bare cave)
  // ---------------------------------------------------------------------------------------------------------
  const inset = (k) => 30 - k * 6;              // side walls move out as the chamber is dug deeper
  const ceil = (k) => 34 - k * 6;
  function chamberGen(k) {
    const c = px.create(W, H), g = c.ctx, r = new HB.RNG(4100 + k), x0 = inset(k), y0 = ceil(k);
    g.fillStyle = ROCK; g.fillRect(0, 0, W, H);
    grain(g, 0, 0, W, H, r, 500, ['#2a1c24', '#1a1117']);
    pocket(g, x0, y0, W - x0 * 2, FLOOR - y0 + 2, r, WALL, 3);
    pocket(g, x0 + 7, y0 + 6, W - x0 * 2 - 14, FLOOR - y0 - 4, r, WALL2, 3);
    // strata and cracks in the back wall
    for (let i = 0; i < 16; i++) {
      const y = y0 + 16 + i * 8 + r.int(3);
      for (let x = x0 + 12; x < W - x0 - 12; x += 1 + r.int(3)) if (r.chance(0.6)) { g.fillStyle = i % 2 ? '#56404f' : '#3a2a35'; g.fillRect(x, y + Math.round(Math.sin(x * 0.045 + i) * 2), 1 + r.int(4), 1); }
    }
    grain(g, x0 + 8, y0 + 8, W - x0 * 2 - 16, FLOOR - y0 - 12, r, 260, ['#5a4552', '#352631']);
    for (let i = 0; i < 5; i++) { let x = x0 + 30 + r.int(W - x0 * 2 - 60), y = y0 + 20 + r.int(60); g.fillStyle = '#2c1f28'; for (let s = 0; s < 14; s++) { g.fillRect(x, y, 1, 1); x += r.int(3) - 1; y += 1; } }
    // stalactites
    for (let i = 0; i < 14 + k * 3; i++) { const sx = x0 + 14 + r.int(W - x0 * 2 - 28), len = 4 + r.int(12), w = 2 + r.int(3), sy = y0 + 3 + r.int(6); g.fillStyle = r.chance(0.5) ? WALL : '#35262f'; g.beginPath(); g.moveTo(sx - w, sy); g.lineTo(sx + w, sy); g.lineTo(sx, sy + len); g.closePath(); g.fill(); g.fillStyle = '#6a5460'; g.fillRect(sx - 1, sy, 1, Math.round(len * 0.5)); }
    // side passages: to the entrance (left) and to the deeper rooms (right)
    const arch = (ax, w, h) => { g.fillStyle = DARK; g.beginPath(); g.moveTo(ax, FLOOR); g.lineTo(ax, FLOOR - h + w / 2); g.quadraticCurveTo(ax + w / 2, FLOOR - h - w / 3, ax + w, FLOOR - h + w / 2); g.lineTo(ax + w, FLOOR); g.closePath(); g.fill(); g.fillStyle = RIM; g.fillRect(ax - 1, FLOOR - h + w / 2, 1, h - w / 2); g.fillRect(ax + w, FLOOR - h + w / 2, 1, h - w / 2); };
    arch(x0 + 4, 20, 44); arch(W - x0 - 24, 20, 44);
    // carved pillars from level 2, ribs of a vault from level 3, a dragon relief above the hoard at level 4
    if (k >= 2) for (const px0 of [x0 + 44, W - x0 - 56]) {
      g.fillStyle = '#5a4552'; g.fillRect(px0, y0 + 26, 12, FLOOR - y0 - 26); g.fillStyle = '#6e5865'; g.fillRect(px0 + 2, y0 + 26, 3, FLOOR - y0 - 26); g.fillStyle = '#3a2a35'; g.fillRect(px0 + 10, y0 + 26, 2, FLOOR - y0 - 26);
      g.fillStyle = '#6e5865'; g.fillRect(px0 - 2, y0 + 22, 16, 4); g.fillRect(px0 - 2, FLOOR - 5, 16, 5);
    }
    if (k >= 3) { g.strokeStyle = '#5e4855'; g.lineWidth = 2; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(W / 2 + s * (W / 2 - x0 - 50), y0 + 28); g.quadraticCurveTo(W / 2 + s * 40, y0 - 6, W / 2, y0 + 6); g.stroke(); } }
    if (k >= 4) { // a dragon's head carved in the wall behind the hoard
      const cx = W / 2, cy = y0 + 34; g.fillStyle = '#5a4552';
      g.beginPath(); g.moveTo(cx - 26, cy + 10); g.lineTo(cx - 8, cy - 8); g.lineTo(cx + 18, cy - 4); g.lineTo(cx + 32, cy + 4); g.lineTo(cx + 14, cy + 10); g.lineTo(cx - 6, cy + 16); g.closePath(); g.fill();
      g.fillStyle = '#6e5865'; g.fillRect(cx - 4, cy - 14, 2, 8); g.fillRect(cx + 4, cy - 12, 2, 7); g.fillStyle = '#c9a53a'; g.fillRect(cx + 10, cy - 1, 2, 2);
    }
    // veins of ore with a glint of gold, roots through the roof of the bare cave, rubble along the walls
    for (let i = 0; i < 4; i++) { let x = x0 + 20 + r.int(W - x0 * 2 - 40), y = y0 + 30 + r.int(70); for (let s = 0; s < 22; s++) { g.fillStyle = s % 5 ? '#5f4b3c' : '#c9a53a'; g.fillRect(x, y, 1, 1); x += 1; y += r.int(3) - 1; } }
    if (k <= 1) for (let i = 0; i < 6; i++) { const rx = x0 + 40 + r.int(W - x0 * 2 - 80); g.fillStyle = '#4a3326'; let y = y0 + 4; for (let s = 0; s < 8 + r.int(12); s++) { g.fillRect(rx + (s % 4 === 3 ? 1 : 0), y, 1, 1); y++; } }
    for (const side of [0, 1]) for (let i = 0; i < 9; i++) { const bx = side ? W - x0 - 10 - r.int(36) : x0 + 10 + r.int(36), bw = 2 + r.int(5); px.ellipse(g, bx, FLOOR - 1, bw, bw * 0.6, r.chance(0.5) ? '#4f3a46' : '#5a4552'); }
    // banners in the hall from level 3
    if (k >= 3) for (const bx of [W / 2 - 70, W / 2 + 62]) { g.fillStyle = P.wood; g.fillRect(bx - 2, y0 + 22, 12, 1); g.fillStyle = '#6b1f1a'; g.fillRect(bx, y0 + 23, 8, 26); g.beginPath(); g.moveTo(bx, y0 + 49); g.lineTo(bx + 4, y0 + 45); g.lineTo(bx + 8, y0 + 49); g.fill(); g.fillStyle = '#c9a53a'; g.fillRect(bx + 3, y0 + 30, 2, 6); g.fillRect(bx + 2, y0 + 31, 4, 1); }
    // floor, levelled into flagstones once the chamber is dug
    g.fillStyle = FLOORC; g.fillRect(0, FLOOR, W, H - FLOOR);
    g.fillStyle = RIM; g.fillRect(x0, FLOOR, W - x0 * 2, 1);
    if (k >= 1) { g.fillStyle = '#2a1d25'; for (let y = FLOOR + 6; y < H; y += 7) { g.fillRect(x0, y, W - x0 * 2, 1); for (let x = x0 + ((y / 7) % 2) * 9; x < W - x0; x += 18) g.fillRect(x, y - 6, 1, 6); } }
    grain(g, x0, FLOOR + 2, W - x0 * 2, H - FLOOR - 2, r, 120, ['#3f2f39', '#281c23']);
    // a few bones and old coins in the corners
    g.fillStyle = '#d9cdb4'; g.fillRect(x0 + 30, FLOOR + 10, 6, 1); g.fillRect(x0 + 29, FLOOR + 9, 1, 3); g.fillRect(x0 + 36, FLOOR + 9, 1, 3);
    g.fillStyle = P.goldDark; for (let i = 0; i < 10; i++) g.fillRect(x0 + 20 + r.int(W - x0 * 2 - 40), FLOOR + 4 + r.int(H - FLOOR - 6), 1, 1);
    return c;
  }
  HB.art.define('lair.chamber', { kind: 'anim', group: 'Lair · places', label: 'hoard chamber', frames: 5, fps: 0.5, framesAre: 'levels', gen: (k) => chamberGen(k),
    note: 'The hoard chamber behind the dragon (345×194, shown at 2×). Frame 1 is the bare cave, frames 2–5 the Treasure Chamber levels 1–4. The hoard, the trophies in their alcoves, torch flames, workers and the light are drawn on top.' });

  // where the chamber's trophy alcoves and torches sit (drawn on top of the backdrop, drawn or generated)
  function alcoves(k, n) {
    const out = [], x0 = inset(k), per = Math.ceil(n / 2), y = 76;
    for (let i = 0; i < n; i++) {
      const left = i % 2 === 0, j = Math.floor(i / 2);
      const span = [x0 + 34, 120], span2 = [W - 120, W - x0 - 34], s = left ? span : span2, step = (s[1] - s[0]) / Math.max(per, 1);
      out.push({ x: Math.round(s[0] + j * step + (step - 12) / 2), y, w: 12, h: 16 });
    }
    return out;
  }
  const torches = (k) => { const x0 = inset(k), t = [[x0 + 30, 98], [W - x0 - 31, 98]]; if (k >= 2) t.push([x0 + 50, 70], [W - x0 - 51, 70]); if (k >= 4) t.push([W / 2 - 50, 56], [W / 2 + 49, 56]); return t; };

  // ---------------------------------------------------------------------------------------------------------
  // the hoard: generated from what is in it (footprint by bulk, colour by richness, pieces by category)
  // ---------------------------------------------------------------------------------------------------------
  /** the pile's half-width and height: grows with bulk (how much room the treasure takes), up to maxR × maxH */
  function pileSize(st, maxR, maxH, scale) {
    const bulk = HB.hoard.bulk(st);
    if (bulk <= 0) return { w: 0, h: 0 };
    return { w: HB.clamp((16 + Math.sqrt(bulk) * 9) * scale, 12 * scale, maxR), h: HB.clamp((3 + Math.sqrt(bulk) * 2.6) * scale, 3 * scale, maxH) };
  }
  function drawPile(g, st, cx, floor, pw, ph, sc, rng) {
    const t = HB.stats.categoryTotals(st), rich = HB.hoard.richness(st);
    const k = HB.clamp((rich - 0.1) / 0.3, 0, 1); // plain goods are copper and bronze; coin and better is gold
    const c1 = px.mix('#8a5a32', P.gold, k), c2 = px.mix('#b07a46', P.goldLight, k), cd = px.mix('#5e3c22', P.goldDark, k), ch = px.mix('#d8a870', '#fff3b0', k);
    for (let i = 0; i < 4; i++) px.ellipse(g, cx, floor - i * (ph / 4), pw * (1 - i * 0.22), ph * 0.45 * (1 - i * 0.15), i % 2 ? c1 : c2);
    const rx = () => cx + (rng.next() - 0.5) * pw * 1.5, ry = () => floor - rng.next() * ph * 0.75;
    const dots = Math.min(60 * sc * sc, Math.round(pw * ph / 6));
    for (let i = 0; i < dots; i++) { g.fillStyle = i % 4 ? cd : ch; g.fillRect(Math.round(rx()), Math.round(ry()), i % 3 ? 1 : sc, 1); }
    const gemCols = [P.gem, P.gemRed, P.gemGreen, P.gemPurple];
    for (let i = 0; i < Math.min(70 * sc, Math.round(t.gems / 25)); i++) { g.fillStyle = gemCols[i % 4]; g.fillRect(Math.round(rx()), Math.round(ry()), sc > 1 && i % 2 ? 2 : 1, sc > 1 && i % 2 ? 2 : 1); }
    const stick = (id, n) => { for (let i = 0; i < n; i++) { const sp = S.get(id); px.blit(g, sp, Math.round(rx() - sp.width * sc / 2), Math.round(floor - ph * (0.25 + rng.next() * 0.45) - sp.height * sc * 0.6), sc); } };
    const goods = st.hoard.items.filter(i => i.cat === 'gold').length;
    for (let i = 0; i < Math.min(6, goods); i++) { const sp = S.get(['sack', 'crate', 'barrel'][i % 3]); const side = i % 2 ? 1 : -1; px.blit(g, sp, Math.round(cx + side * (pw * 0.85 + 2 * sc + Math.floor(i / 2) * 7 * sc) - sp.width * sc / 2), floor - sp.height * sc, sc); }
    stick('sword', Math.min(4, Math.floor(t.arms / 450)));
    stick('helm', Math.min(2, Math.floor(t.arms / 1200)));
    stick('book', Math.min(3, Math.floor(t.books / 450)));
    stick('chalice', Math.min(3, Math.floor(t.royal / 700)));
    stick('plate', Math.min(2, Math.floor(t.gold / 2500)));
    stick('gemRed', Math.min(3, Math.floor(t.gems / 900)));
  }
  function glowOf(st) { const total = HB.game.hoardValue(st); return { total, glow: HB.clamp(Math.log10(1 + total) / 4.6, 0, 1) * (0.45 + HB.hoard.richness(st) * 0.55) }; }
  function twinkles(g, st, t, cx, floor, pw, ph, glow) {
    const tw = Math.round(1 + HB.hoard.richness(st) * 12 + glow * 4);
    for (let i = 0; i < tw; i++) {
      const speed = 0.6 + (i % 5) * 0.17, cyc = t * speed + i * 0.37, ph2 = cyc % 1;
      if (ph2 > 0.35) continue;
      const r2 = new HB.RNG(i * 977 + Math.floor(cyc));
      const tx = Math.round(cx + (r2.next() - 0.5) * pw * 1.6), ty = Math.round(floor - r2.next() * ph * 0.9 - 1);
      const a = HB.clamp(1 - Math.abs(ph2 - 0.17) / 0.17, 0, 1);
      g.fillStyle = `rgba(255,250,220,${a})`; g.fillRect(tx, ty, 1, 1);
      if (a > 0.6) { g.fillRect(tx - 1, ty, 3, 1); g.fillRect(tx, ty - 1, 1, 3); }
    }
  }
  function flame(g, x, y, t, i, big) {
    g.fillStyle = Math.floor(t * 8 + i) % 2 ? P.fire : P.fireHot; g.fillRect(x - 1, y - 3, 3, 3);
    if (big) { g.fillRect(x, y - 5, 1, 2); g.fillStyle = P.fireCore; g.fillRect(x, y - 2, 1, 1); }
  }

  // ---------------------------------------------------------------------------------------------------------
  // the close-up: the chamber, the trophy alcoves, the hoard and the dragon on it
  // ---------------------------------------------------------------------------------------------------------
  /** draw the chamber into g (345×194). o.asleep: the sleeping pose. Returns { trophyRects } in buffer pixels. */
  function drawChamber(g, st, t, o = {}) {
    const chamber = levelOf(st, 'chamber'), rng = new HB.RNG(HB.hash32('lairpile' + st.seed));
    g.imageSmoothingEnabled = false;
    g.drawImage(HB.art.frame('lair.chamber', chamber), 0, 0);
    const { total, glow } = glowOf(st), cx = W / 2, floor = FLOOR + 6;
    // the hoard lights its own cave
    if (total > 0) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(cx, floor - 14, 6, cx, floor - 30, 60 + glow * 170);
      gr.addColorStop(0, `rgba(255,196,90,${0.10 + glow * 0.30})`); gr.addColorStop(0.5, `rgba(220,150,60,${0.04 + glow * 0.13})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
    }
    // a thin shaft of daylight from a crack in the roof, drifting dust in it
    g.save(); g.globalCompositeOperation = 'lighter'; const sx0 = W / 2 + 64;
    const sh = g.createLinearGradient(sx0, 0, sx0 - 40, FLOOR); sh.addColorStop(0, 'rgba(200,215,230,0.16)'); sh.addColorStop(1, 'rgba(200,215,230,0)');
    g.fillStyle = sh; g.beginPath(); g.moveTo(sx0 - 3, ceil(chamber) + 4); g.lineTo(sx0 + 4, ceil(chamber) + 4); g.lineTo(sx0 - 22, FLOOR); g.lineTo(sx0 - 44, FLOOR); g.closePath(); g.fill();
    for (let i = 0; i < 6; i++) { const k = (t * 0.05 + i / 6) % 1, dx = Math.sin(t * 0.7 + i) * 3; g.fillStyle = `rgba(230,225,210,${0.5 * Math.sin(k * Math.PI)})`; g.fillRect(Math.round(sx0 - 6 - k * 28 + dx), Math.round(ceil(chamber) + 10 + k * (FLOOR - ceil(chamber) - 20)), 1, 1); }
    g.restore();
    // trophy alcoves (the strongroom bars the first ones)
    const trophyRects = drawAlcoves(g, st, t, chamber);
    // torches
    torches(chamber).forEach(([x, y], i) => { g.fillStyle = P.ironDark; g.fillRect(x - 2, y + 2, 5, 1); g.fillStyle = P.wood; g.fillRect(x, y, 1, 7); flame(g, x, y, t, i, true); g.save(); g.globalCompositeOperation = 'lighter'; const lg = g.createRadialGradient(x, y - 2, 1, x, y - 2, 26); lg.addColorStop(0, 'rgba(255,170,80,0.22)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lg; g.fillRect(x - 26, y - 28, 52, 52); g.restore(); });
    // the hoard and the dragon on top of it
    const pile = pileSize(st, 150, 64, 1.6);
    if (pile.w) drawPile(g, st, cx, floor, pile.w, pile.h, 2, rng);
    const spec = HB.dragonArt.specOf(st), id = `lair.dragon.${spec.tier}.${o.asleep ? 'sleep' : 'perch'}`;
    const ds = HB.art.at(id, t, spec, HB.dragonArt.specKey(spec));
    // on top of the pile; a big dragon on a tall pile settles into it rather than leave the picture
    const seatY = Math.max(Math.round(floor - (pile.h ? pile.h * 0.86 : 0)), ds.anchorY + 4);
    px.blit(g, ds, Math.round(cx - ds.anchorX), Math.round(seatY - ds.anchorY));
    drawPrize(g, st, t, cx + ds.width * 0.22, seatY + 2, o.asleep);
    if (o.asleep) for (let i = 0; i < 3; i++) { const k = (t * 0.35 + i * 0.33) % 1, zx = cx + ds.width * 0.3 + k * 16, zy = seatY - ds.height * 0.55 - k * 30; g.fillStyle = `rgba(235,225,205,${0.7 - k * 0.7})`; g.fillRect(Math.round(zx), Math.round(zy), 2, 2); }
    // workers going about the floor (twice raid size, like the dragon)
    let wi = 0;
    for (const grp of st.lair.workers) for (let k = 0; k < Math.min(grp.count, 4); k++) {
      const sp = S.get(HB.WORKER_TYPES[grp.type].sprite), span = W - inset(chamber) * 2 - 60;
      const wx = inset(chamber) + 30 + ((wi * 53 + t * 7 * (grp.task === 'build' ? 1 : 0.35)) % span);
      px.blit(g, sp, Math.round(wx), FLOOR + 22 - sp.height * 2, 2, wi % 2 === 0);
      if (grp.task === 'build') px.blit(g, S.get('pick'), Math.round(wx + 12), FLOOR + 22 - sp.height * 2 - 3, 2);
      wi++;
    }
    if (st.lair.construction.length) { px.blit(g, S.get('crate'), W - inset(chamber) - 44, FLOOR + 22 - 12, 2); px.blit(g, S.get('pick'), W - inset(chamber) - 30, FLOOR + 22 - 18, 2); }
    // shadow at the edges, lighter the richer the hoard
    const vg = g.createRadialGradient(cx, floor - 50, 60, cx, floor - 50, 250); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.6 - glow * 0.25})`); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    if (pile.w) twinkles(g, st, t, cx, floor, pile.w, pile.h, glow);
    return { trophyRects };
  }
  function drawAlcoves(g, st, t, chamber) {
    const slots = HB.clamp(4 + chamber * 2, 4, 12);
    const items = HB.hoard.trophies(st, slots).filter(it => it.named || it.value >= 150);
    const locked = HB.hoard.protectedIds(st), strongN = HB.lair.values(st).strongroom || 0;
    const n = Math.max(items.length, Math.min(slots, strongN)), rects = [];
    alcoves(chamber, n).forEach((a, i) => {
      const it = items[i] || null, isLocked = it ? locked.has(it.id) : i < strongN, { x, y, w, h } = a;
      g.fillStyle = '#1e141a'; g.fillRect(x, y + 2, w, h - 2); g.fillRect(x + 1, y + 1, w - 2, 1); g.fillRect(x + 3, y, w - 6, 1);
      g.fillStyle = '#6a5460'; g.fillRect(x - 1, y + h, w + 2, 2);
      if (it) {
        if (it.named) { g.fillStyle = `rgba(255,220,120,${0.25 + 0.2 * Math.sin(t * 2 + i)})`; g.fillRect(x + 1, y + 3, w - 2, h - 3); }
        const sp = S.get(HB.trophySprite ? HB.trophySprite(it) : 'chest');
        px.blit(g, sp, Math.round(x + (w - sp.width) / 2), y + h - sp.height);
      }
      if (isLocked) { g.fillStyle = P.ironDark; for (let b = 0; b < 4; b++) g.fillRect(x + 1 + b * 3, y + 1, 1, h - 1); g.fillStyle = P.iron; g.fillRect(x, y + 6, w, 1); g.fillStyle = P.goldDark; g.fillRect(x + w / 2 - 1, y + 7, 2, 2); }
      if (it) rects.push({ x: x - 1, y: y - 1, w: w + 2, h: h + 3, item: it, locked: isLocked });
    });
    return rects;
  }
  /** the most prized piece lies in front of the dragon on the pile, glowing */
  function drawPrize(g, st, t, x, y, asleep) {
    const top = HB.hoard.trophies(st, 1)[0];
    if (!top || (!top.named && top.value < 200)) return;
    const sp = S.get(HB.trophySprite ? HB.trophySprite(top) : 'chest');
    if (top.named) { g.fillStyle = `rgba(255,220,120,${0.18 + 0.1 * Math.sin(t * 2)})`; g.fillRect(Math.round(x - 3), Math.round(y - sp.height * 2 - 3), sp.width * 2 + 6, sp.height * 2 + 4); }
    px.blit(g, sp, Math.round(x), Math.round(y - sp.height * 2), 2);
    void asleep;
  }

  // ---------------------------------------------------------------------------------------------------------
  // the rooms view: the hill in cross-section, a room for every upgrade
  // ---------------------------------------------------------------------------------------------------------
  const HILL = [[0, 130], [20, 126], [40, 112], [70, 84], [110, 58], [150, 36], [186, 24], [216, 28], [252, 42], [292, 50], [322, 56], [345, 60]];
  const TUNNEL = { y0: 118, y1: 129, x0: 50, x1: 300 };
  /** rooms (and features in a passage) in buffer pixels; shaft: where it joins the tunnels; lx, ly: where its name
   *  goes (the middle of the text line), align: how it is aligned */
  const ROOMS = [
    { id: 'entrance', label: 'Entrance', x: 30, y: 104, w: 30, h: 26, lx: 40, ly: 137 },
    { id: 'guardpost', label: 'Guard post', x: 66, y: 80, w: 46, h: 28, shaft: [88, 108, 118], lx: 89, ly: 75 },
    { id: 'lookout', label: 'Lookout', x: 164, y: 34, w: 40, h: 20, shaft: [184, 54, 74], lx: 184, ly: 60 },
    { id: 'chamber', label: 'Hoard', x: 122, y: 72, w: 122, h: 66, lx: 183, ly: 145 },
    { id: 'strongroom', label: 'Strongroom', x: 252, y: 74, w: 38, h: 26, shaft: [244, 86, 86, 252], lx: 271, ly: 69 },
    { id: 'sleeping', label: 'Sleeping chamber', x: 262, y: 112, w: 74, h: 40, lx: 299, ly: 159 },
    { id: 'forge', label: 'Forge', x: 50, y: 146, w: 58, h: 34, shaft: [80, 129, 146], lx: 79, ly: 187 },
    { id: 'larder', label: 'Larder', x: 140, y: 152, w: 54, h: 30, shaft: [168, 138, 152], lx: 167, ly: 189 },
    { id: 'cells', label: 'Cells', x: 206, y: 152, w: 40, h: 30, shaft: [226, 138, 152], captives: true, lx: 226, ly: 189 },
    { id: 'traps', label: 'Traps', x: 66, y: TUNNEL.y0, w: 50, h: TUNNEL.y1 - TUNNEL.y0, feature: true, lx: 96, ly: 137 },
    { id: 'concealed', label: 'Concealed', x: 0, y: 108, w: 30, h: 24, feature: true, lx: 3, ly: 99, align: 'left' },
    { id: 'ward', label: 'Ward', x: 56, y: 104, w: 8, h: 26, feature: true, lx: 60, ly: 99 },
  ];
  function hillGen() {
    const c = px.create(W, H), g = c.ctx, r = new HB.RNG(733);
    const sky = g.createLinearGradient(0, 0, 0, H * 0.7); sky.addColorStop(0, '#7fa6c8'); sky.addColorStop(1, '#c9dbe6'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // far ridges
    g.fillStyle = '#9fb0bf'; g.beginPath(); g.moveTo(0, 70); for (let x = 0; x <= W; x += 15) g.lineTo(x, 58 + Math.sin(x * 0.05) * 8 + r.int(5)); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    // the hill in section: turf, earth, rock
    const hillPath = () => { g.beginPath(); g.moveTo(0, H); for (const [x, y] of HILL) g.lineTo(x, y); g.lineTo(W, H); g.closePath(); };
    g.fillStyle = '#2c2027'; hillPath(); g.fill();
    g.save(); hillPath(); g.clip();
    for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#34262f' : '#291d24'; g.beginPath(); g.moveTo(0, 70 + i * 16); for (let x = 0; x <= W; x += 23) g.lineTo(x, 70 + i * 16 + Math.sin(x * 0.03 + i) * 4); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill(); }
    grain(g, 0, 20, W, H - 20, r, 700, ['#3d2d37', '#1f151b', '#47343f']);
    for (let i = 0; i < 14; i++) { const bx = r.int(W), by = 60 + r.int(130), bw = 4 + r.int(9); g.fillStyle = '#3f303a'; px.ellipse(g, bx, by, bw, bw * 0.6, '#3f303a'); g.fillStyle = '#4c3b46'; g.fillRect(bx - bw / 2, by - 1, bw / 2, 1); }
    g.restore();
    // turf and roots along the slope
    for (let i = 0; i < HILL.length - 1; i++) { const [ax, ay] = HILL[i], [bx, by] = HILL[i + 1]; for (let x = ax; x <= bx; x++) { const y = Math.round(ay + (by - ay) * (x - ax) / (bx - ax)); g.fillStyle = '#5c8a3c'; g.fillRect(x, y, 1, 3); g.fillStyle = '#3f6a2d'; g.fillRect(x, y + 3, 1, 2); if (r.chance(0.12)) { g.fillStyle = '#4a3326'; g.fillRect(x, y + 5, 1, 2 + r.int(5)); } if (r.chance(0.06)) { g.fillStyle = '#86b24e'; g.fillRect(x, y - 1, 1, 1); } } }
    // a few trees on the hill
    for (const tx of [96, 140, 232, 300]) { const i = HILL.findIndex(p => p[0] > tx), [ax, ay] = HILL[i - 1], [bx, by] = HILL[i], ty = Math.round(ay + (by - ay) * (tx - ax) / (bx - ax)); const tr = S.get(r.chance(0.5) ? 'pine' : 'tree'); px.blit(g, tr, tx - (tr.width >> 1), ty - tr.height + 2); }
    return c;
  }
  HB.art.define('lair.hill', { kind: 'anim', group: 'Lair · places', label: 'the hill (all rooms)', frames: 1, gen: () => hillGen(),
    note: 'The backdrop of the zoomed-out lair: the hill in cross-section (345×194, shown at 2×). The tunnels and rooms are drawn on top in fixed places.' });

  // room pictures: generated interiors, one frame per upgrade level
  function roomBase(w, h, seed) {
    const c = px.create(w, h), g = c.ctx, r = new HB.RNG(seed);
    pocket(g, 0, 0, w, h, r, '#1b1217', 1.5); pocket(g, 1, 1, w - 2, h - 2, r, WALL, 1.5); pocket(g, 3, 3, w - 6, h - 5, r, WALL2, 1);
    grain(g, 3, 3, w - 6, h - 6, r, (w * h) / 18, ['#56404f', '#3a2a35']);
    g.fillStyle = FLOORC; g.fillRect(2, h - 4, w - 4, 3); g.fillStyle = RIM; g.fillRect(3, h - 4, w - 6, 1);
    return { c, g, r };
  }
  const blitAt = (g, id, x, yb, args, sc = 1) => { const sp = args ? S.get(id, ...args) : S.get(id); px.blit(g, sp, Math.round(x), Math.round(yb - sp.height * sc), sc); return sp; };
  const ROOM_ART = {
    entrance: { levels: 4, base0: true, draw(g, w, h, lv) { const sky = g.createLinearGradient(0, 0, 10, 0); sky.addColorStop(0, '#c9e0ee'); sky.addColorStop(1, 'rgba(201,224,238,0)'); g.fillStyle = sky; g.fillRect(0, 6, 10, h - 10); if (lv >= 1) blitAt(g, 'gate', 14, h - 4, [10, 18]); if (lv >= 2) { g.fillStyle = P.ironLight; g.fillRect(14, h - 22, 10, 2); } if (lv >= 3) { g.fillStyle = P.iron; for (let i = 0; i < 4; i++) g.fillRect(13 + i * 3, h - 24, 1, 20); g.fillRect(12, h - 24, 14, 2); } } },
    guardpost: { levels: 1, draw(g, w, h) { g.fillStyle = P.wood; g.fillRect(4, h - 10, 14, 3); g.fillRect(5, h - 7, 1, 3); g.fillRect(16, h - 7, 1, 3); g.fillStyle = P.woodLight; g.fillRect(24, h - 9, 9, 2); g.fillRect(25, h - 7, 1, 3); g.fillRect(31, h - 7, 1, 3); blitAt(g, 'lantern', 27, h - 9); g.fillStyle = P.wood; for (let i = 0; i < 3; i++) g.fillRect(37 + i * 2, h - 18, 1, 14); g.fillStyle = P.ironLight; for (let i = 0; i < 3; i++) g.fillRect(37 + i * 2, h - 20, 1, 2); blitAt(g, 'shield', 6, h - 13); } },
    lookout: { levels: 1, draw(g, w, h) { g.fillStyle = '#c9e0ee'; g.fillRect(w - 12, 4, 8, 7); g.fillStyle = '#8fb8d8'; g.fillRect(w - 12, 4, 8, 3); g.fillStyle = P.wood; g.fillRect(8, h - 8, 6, 2); g.fillRect(9, h - 6, 1, 3); g.fillRect(13, h - 6, 1, 3); g.fillStyle = P.gold; g.fillRect(18, h - 10, 5, 2); g.fillRect(22, h - 11, 1, 2); } },
    chamber: { levels: 5, base0: true, draw(g, w, h, lv) { g.fillStyle = P.goldDark; const r = new HB.RNG(91 + lv); for (let i = 0; i < 8 + lv * 4; i++) g.fillRect(4 + r.int(w - 8), h - 6 + r.int(2), 1, 1); if (lv >= 2) { g.fillStyle = '#5a4552'; g.fillRect(10, 10, 5, h - 14); g.fillRect(w - 15, 10, 5, h - 14); } } },
    strongroom: { levels: 3, draw(g, w, h, lv) { g.fillStyle = P.ironDark; g.fillRect(2, h - 20, 6, 16); g.fillStyle = P.iron; g.fillRect(2, h - 14, 6, 1); g.fillStyle = P.goldDark; g.fillRect(6, h - 13, 1, 2); for (let i = 0; i < lv + 1; i++) blitAt(g, 'chest', 12 + i * 8, h - 4); if (lv >= 2) blitAt(g, 'coins', 30, h - 4); } },
    sleeping: { levels: 1, draw(g, w, h) { px.ellipse(g, w / 2 + 6, h - 6, w * 0.32, 5, '#6b4328'); px.ellipse(g, w / 2 + 6, h - 7, w * 0.28, 3, '#9a6a3c'); blitAt(g, 'gate', 3, h - 4, [8, 16]); } },
    forge: { levels: 1, draw(g, w, h) { g.fillStyle = '#5a5150'; g.fillRect(6, h - 16, 16, 12); g.fillStyle = '#1a1016'; g.fillRect(9, h - 12, 10, 6); g.fillStyle = '#4a4245'; g.fillRect(11, 2, 6, h - 18); g.fillStyle = P.ironDark; g.fillRect(30, h - 9, 12, 3); g.fillRect(33, h - 6, 6, 2); g.fillRect(34, h - 4, 4, 1); g.fillStyle = P.wood; g.fillRect(46, h - 14, 1, 10); g.fillRect(50, h - 14, 1, 10); g.fillStyle = P.ironLight; g.fillRect(45, h - 16, 3, 2); g.fillRect(49, h - 15, 3, 1); } },
    larder: { levels: 1, draw(g, w, h) { g.fillStyle = P.wood; g.fillRect(4, 6, w - 8, 1); for (let i = 0; i < 3; i++) { const x = 10 + i * 12; g.fillStyle = P.ironLight; g.fillRect(x + 2, 7, 1, 2); g.fillStyle = '#a64a3a'; g.fillRect(x, 9, 5, 9); g.fillStyle = '#e8d8c0'; g.fillRect(x + 1, 11, 3, 1); g.fillRect(x + 1, 15, 3, 1); } blitAt(g, 'barrel', w - 16, h - 4); blitAt(g, 'hay', w - 26, h - 4); } },
    cells: { levels: 1, draw(g, w, h) { g.fillStyle = P.ironDark; for (let i = 0; i < 7; i++) g.fillRect(4 + i * 5, 4, 1, h - 8); g.fillRect(3, 5, w - 6, 1); g.fillStyle = P.iron; g.fillRect(3, h - 6, w - 6, 1); } },
  };
  for (const rm of ROOMS) {
    const art = ROOM_ART[rm.id]; if (!art) continue;
    const u = HB.UPGRADE_BY_ID && HB.UPGRADE_BY_ID[rm.id], name = u ? u.name : rm.label;
    HB.art.define(`lair.room.${rm.id}`, { kind: 'anim', group: 'Lair · places', label: `room: ${name.toLowerCase()}`, frames: art.levels, fps: 0.5, framesAre: 'levels',
      gen: (k) => { const b = roomBase(rm.w, rm.h, 500 + rm.w * 7 + rm.h); art.draw(b.g, rm.w, rm.h, k); return b.c; },
      note: `${name} in the zoomed-out lair (${rm.w}×${rm.h}, shown at 2×)${art.levels > 1 ? (art.base0 ? `: frame 1 before any work, then one frame per level` : ': one frame per level') : ''}. ${rm.id === 'chamber' ? 'The hoard and the dragon are drawn on top.' : rm.id === 'forge' ? 'The fire is drawn on top.' : rm.id === 'cells' ? 'Shown while you hold captives; they are drawn on top.' : ''}` });
  }
  /** room status for the rooms view and its labels */
  function roomState(st, rm) {
    if (rm.captives) return { built: st.lair.captives.length > 0, level: 1, max: 1, building: null, optional: true };
    const u = HB.UPGRADE_BY_ID[rm.id]; if (!u) return { built: true, level: 1, max: 1 };
    const lv = levelOf(st, rm.id);
    return { built: rm.id === 'chamber' || rm.id === 'entrance' ? true : lv > 0, level: lv, max: u.levels.length, building: building(st, rm.id) };
  }
  /** draw the rooms view into g (345×194). Returns the rooms with their state, for labels and taps. */
  function drawRooms(g, st, t) {
    g.imageSmoothingEnabled = false;
    g.drawImage(HB.art.frame('lair.hill', 0), 0, 0);
    const T = TUNNEL, out = [];
    // the main passage from the mouth to the deeper rooms, and the shafts to built rooms
    const carve = (x, y, w, h) => { g.fillStyle = '#140d11'; g.fillRect(x, y, w, h); g.fillStyle = '#3a2a33'; g.fillRect(x + 1, y + 1, w - 2, h - 2); g.fillStyle = '#4f3a46'; g.fillRect(x + 1, y + h - 2, w - 2, 1); };
    carve(T.x0 - 4, T.y0, T.x1 - T.x0 + 4, T.y1 - T.y0);
    const states = new Map(ROOMS.map(rm => [rm.id, roomState(st, rm)]));
    for (const rm of ROOMS) { const s = states.get(rm.id); if (!rm.shaft || !(s.built || s.building)) continue; const [x, a, b, x2] = rm.shaft; if (x2) carve(Math.min(x, x2) - 1, a - 3, Math.abs(x2 - x) + 2, 7); else carve(x - 3, Math.min(a, b), 7, Math.abs(b - a) + 1); }
    for (const rm of ROOMS) {
      const s = states.get(rm.id);
      if (rm.feature) { drawFeature(g, st, t, rm, s); out.push(Object.assign({}, rm, s)); continue; }
      if (s.built) {
        const n = HB.art.frames(`lair.room.${rm.id}`), k = ROOM_ART[rm.id] && ROOM_ART[rm.id].base0 ? s.level : Math.max(0, s.level - 1);
        g.drawImage(HB.art.frame(`lair.room.${rm.id}`, Math.min(k, n - 1)), rm.x, rm.y);
      } else if (s.building) {
        pocketOutline(g, rm, true);
        const b = s.building, k = HB.clamp(b.progress, 0, 1); g.fillStyle = '#3a2a33'; g.fillRect(rm.x + 3, rm.y + rm.h - 4 - Math.round((rm.h - 8) * k), Math.round((rm.w - 6) * k), Math.round((rm.h - 8) * k));
        g.fillStyle = P.wood; g.fillRect(rm.x + 4, rm.y + 4, 1, rm.h - 8); g.fillRect(rm.x + rm.w - 5, rm.y + 4, 1, rm.h - 8); g.fillRect(rm.x + 4, rm.y + 6, rm.w - 8, 1);
        px.blit(g, S.get('crate'), rm.x + rm.w / 2 - 3, rm.y + rm.h - 10); px.blit(g, S.get('pick'), rm.x + rm.w / 2 + 4, rm.y + rm.h - 12);
      } else if (!s.optional) pocketOutline(g, rm, false);
      out.push(Object.assign({}, rm, s));
    }
    // what lives in the rooms: the hoard and the dragon, the forge fire, captives, workers in the passages
    const ch = ROOMS.find(r => r.id === 'chamber'), pile = pileSize(st, ch.w / 2 - 12, 24, 0.5), cx = ch.x + ch.w / 2, fl = ch.y + ch.h - 3;
    if (pile.w) drawPile(g, st, cx, fl, pile.w, pile.h, 1, new HB.RNG(HB.hash32('lairpile' + st.seed)));
    const spec = HB.dragonArt.specOf(st), pose = st.phase === 'sleeping' ? 'sleep' : 'idle', f = Math.floor(t * 1.5) % 2;
    const ds = HB.dragonArt.sprite(spec, pose, f);
    HB.dragonArt.draw(g, spec, pose, f, cx, Math.round(fl - (pile.h ? pile.h * 0.8 : 0) - (ds.height - ds.anchorY) + 1), 1, 1);
    const fg = ROOMS.find(r => r.id === 'forge'); if (states.get('forge').built) { flame(g, fg.x + 12, fg.y + fg.h - 8, t, 0, false); flame(g, fg.x + 16, fg.y + fg.h - 8, t, 1, false); }
    const cl = ROOMS.find(r => r.id === 'cells'); st.lair.captives.slice(0, 3).forEach((c, i) => px.blit(g, S.get(c.kind === 'priest' ? 'priest' : c.kind === 'knight' ? 'knight' : c.kind === 'noble' || c.kind === 'heir' || c.kind === 'official' ? 'noble' : 'villager'), cl.x + 8 + i * 9, cl.y + cl.h - 16));
    let wi = 0;
    for (const grp of st.lair.workers) for (let k = 0; k < Math.min(grp.count, 3); k++) { const sp = S.get(HB.WORKER_TYPES[grp.type].sprite), span = T.x1 - T.x0 - 20; const dir = wi % 2 ? 1 : -1, ph = (wi * 47 + t * 9) % (span * 2), x = T.x0 + 10 + (ph < span ? ph : span * 2 - ph); px.blit(g, sp, Math.round(x), T.y1 - 1 - sp.height, 1, (ph < span) === (dir > 0)); wi++; }
    return out;
  }
  function pocketOutline(g, rm, solid) {
    // where a room could be dug: a dotted outline in the rock
    g.fillStyle = solid ? 'rgba(201,165,58,0.75)' : 'rgba(233,220,188,0.45)';
    const dot = (x, y) => g.fillRect(Math.round(x), Math.round(y), 1, 1);
    for (let x = rm.x + 2; x < rm.x + rm.w - 2; x += 3) { dot(x, rm.y); dot(x, rm.y + rm.h - 1); }
    for (let y = rm.y + 2; y < rm.y + rm.h - 2; y += 3) { dot(rm.x, y); dot(rm.x + rm.w - 1, y); }
  }
  function drawFeature(g, st, t, rm, s) {
    if (!s.built && !s.building) { pocketOutline(g, rm, false); return; }
    const lv = s.level;
    if (rm.id === 'traps') { g.fillStyle = P.ironLight; for (let i = 0; i < 3 + lv * 3; i++) { const tx = rm.x + 3 + i * Math.floor((rm.w - 6) / (3 + lv * 3)); g.beginPath(); g.moveTo(tx, rm.y + rm.h - 1); g.lineTo(tx + 2, rm.y + rm.h - 1); g.lineTo(tx + 1, rm.y + rm.h - 5); g.closePath(); g.fill(); } }
    if (rm.id === 'concealed') { px.blit(g, S.get('bush'), rm.x + 14, rm.y + rm.h - 6); px.blit(g, S.get('bush'), rm.x + 20, rm.y + rm.h - 10); if (lv >= 2) px.blit(g, S.get('tree'), rm.x + 4, rm.y + rm.h - 22); }
    if (rm.id === 'ward') { g.fillStyle = Math.floor(t * 2) % 2 ? '#7fe6ff' : '#4fb0d8'; for (let i = 0; i < 5 + lv; i++) g.fillRect(rm.x + 2 + (i % 2) * 2, rm.y + 3 + i * 4, 2, 2); }
  }

  /** which sprite shows a treasure on the wall */
  function trophySprite(it) {
    const n = (it.name || '').toLowerCase();
    if (/crown|circlet|regalia|diadem/.test(n)) return 'crown';
    if (/signet/.test(n)) return 'signet';
    if (/\bring\b/.test(n)) return 'ring';
    if (/goblet|chalice|cup|comb/.test(n)) return 'chalice';
    if (/shield/.test(n)) return 'shield';
    if (/sword|axe|bow|blade|bane|lance/.test(n)) return 'sword';
    if (/helm|hauberk|mail/.test(n)) return 'helm';
    if (/book|psalter|bestiary|lexicon|ledger|spell/.test(n)) return 'book';
    if (/chart|map|scroll|astrolabe/.test(n)) return 'scroll';
    if (/sceptre|horn|banner/.test(n)) return 'sceptre';
    if (/bell/.test(n)) return 'bell';
    if (/lamp|lantern/.test(n)) return 'lantern';
    if (/pearl/.test(n)) return 'pearl';
    if (/ruby|ember|heart|sun/.test(n)) return 'gemRed';
    if (/emerald/.test(n)) return 'gemGreen';
    if (/plate|silver/.test(n)) return 'plate';
    return { gems: 'gem', royal: 'crown', arms: 'sword', books: 'book', gold: 'coins', artifacts: 'gem' }[it.cat] || 'chest';
  }
  HB.trophySprite = trophySprite;

  HB.lairArt = { W, H, FLOOR, LAIR_L, ROOMS, drawChamber, drawRooms, roomState, alcoves, torches, pileSize };
})();
