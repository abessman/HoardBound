/* Watercolour preview (index.html?scene=washpreview; ?scene=inkpreview still works): a small sheet of parchment with a
 * mountain, a forest and a village under the fog, as on the map. Fly east and the land is uncovered by the reveal wash
 * (HB.mapReveal); the buttons try the territory watercolour (HB.mapWash). Not a campaign: nothing is saved and no game
 * state changes. Instructions: docs/map-art/WASH_PREVIEW.md.
 * URL options: &mappack=<name|none>, &reducedmotion=1, &slow=1 (quarter speed), &auto=1 (flies and blooms by itself). */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;
  const CELL = 22, W = 40, H = 20, OX = 8, OY = 1; // a wide sheet; the scene sits at OX, OY so washes never meet its edge

  class WashPreviewScene {
    constructor(params) {
      this.opaque = true; this.ui = new HB.ui.UI(); this.t = 0; this.params = params; this.sheet = { W, H, OX, OY };
      this.frameMs = []; this.auto = params && params.get('auto') === '1'; this.speed = params && params.get('slow') === '1' ? 0.25 : 1;
      if (params && params.get('reducedmotion') === '1') HB.mapFx.reducedOverride = true;
      const R = new HB.RNG('wp-clouds'); this.cloudField = new Float32Array(W * H * 3);
      for (let i = 0; i < W * H; i++) { this.cloudField[i * 3] = R.range(-0.3, 0.3); this.cloudField[i * 3 + 1] = R.range(-0.3, 0.3); this.cloudField[i * 3 + 2] = R.range(0.75, 1.15); }
      this.reset();
    }
    reset() {
      const P = HB.mapart.proc, rngOf = (k) => new HB.RNG(HB.hash32(k));
      this.revealed = new Uint8Array(W * H); this.fog = new Float32Array(W * H).fill(1);
      this.reveal = new HB.mapReveal.Layer({ seed: 'washpreview' });
      const mtW = 26.4 * 1.15, mtH = 20.9 * 1.15;
      const village = { id: 9001, type: 'village', state: 'normal', tier: 1, flags: {}, name: 'Brookmere', factionId: -1, knowledge: { seen: true } };
      this.village = village;
      const fs = [{ key: 'pv:mountain', ids: ['map.terrain.mountain'], x: 9.5 + OX, y: 10.3 + OY, cx: 9 + OX, cy: 9 + OY, param: mtW, paramY: mtH, proc: (g, x, y, s) => P.mountain(g, x, y, mtW * s, mtH * s, rngOf('pv:mountain'), {}) }];
      [[14.6, 9.7, 'round'], [15.5, 10.0, 'pine'], [16.3, 9.6, 'round'], [14.9, 10.7, 'round'], [15.9, 10.9, 'pine'], [16.8, 10.4, 'round'], [15.3, 11.5, 'round']].forEach(([x, y, kind], k) => {
        const s = kind === 'pine' ? 0.15 * CELL * 1.1 : 0.17 * CELL * 1.1, key = 'pv:tree' + k;
        fs.push({ key, ids: ['map.terrain.tree.' + kind], x: x + OX, y: y + OY, cx: Math.floor(x) + OX, cy: Math.floor(y - 0.3) + OY, param: s, proc: (g, gx, gy, sc) => (kind === 'pine' ? P.treePine : P.treeRound)(g, gx, gy, s * sc, rngOf(key)) });
      });
      fs.push({ key: 'loc9001', place: true, ids: HB.mapAssets ? HB.mapAssets.placeIds(village).ids : ['map.place.village'], x: 21.5 + OX, y: 10.35 + OY, cx: 21 + OX, cy: 9 + OY, param: 10, proc: (g, x, y, s) => P.settlement(g, village, x, y, 10 * s, rngOf('loc9001'), {}) });
      this.features = fs;
      this.cam = this.cam || { x: 13 + OX, y: 10.2 + OY, zoom: 2.5 };
      this.dragon = { x: 4.5 + OX, y: 9.6 + OY, tx: 4.5 + OX, facing: 1, frame: 0 };
      this.revealCircle(4.5 + OX, 9.5 + OY, 3.2, false);
      this.sources = [{ key: 'lair', lair: true, x: 4.8 + OX, y: 11 + OY, r: 3.5, side: 1, ph: [1.3, 4.1, 2.2] }];
      this.wash = new HB.mapWash.Layer({ res: 8, seed: 'washpreview' });
      this.washBuilt = false; this.lastReveal = 0; this.autoT = 0; this._a1 = this._a2 = this._a3 = false;
      this.buildUi();
    }
    // knowledge: cells are revealed around the dragon, as on the map; nothing under the fog is drawn
    revealCircle(cx, cy, r, animate) {
      const newly = [];
      for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(H - 1, Math.ceil(cy + r)); y++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W - 1, Math.ceil(cx + r)); x++) {
        const i = y * W + x; if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > r || this.revealed[i]) continue;
        this.revealed[i] = 1; newly.push(i);
      }
      if (!newly.length) return;
      if (animate) this.reveal.add(newly, W, this.t, this.dragon.x, this.dragon.y); else for (const i of newly) this.fog[i] = 0;
    }
    shown(f) { return this.fog[f.cy * W + f.cx] < 1 && this.revealed[f.cy * W + f.cx]; }
    // territory (a stand-in for HB.domain's sources: the lair, and the village once it serves you)
    setRule(side) { for (const s of this.sources) s.side = side; this.rebuildWash(); }
    grow() { const L = this.sources.find(s => s.lair); L.r = Math.min(13, L.r + 2.5); this.rebuildWash(); }
    villageJoins() {
      const v = this.features.find(f => f.place);
      if (this.fog[v.cy * W + v.cx] > 0) { HB.notice('Not yet', 'You have not discovered the village: nothing can be known of it, let alone ruled.'); return; }
      if (this.sources.some(s => s.key === 'village')) return;
      this.sources.push({ key: 'village', x: 21.5 + OX, y: 10 + OY, r: 4, side: this.sources[0].side, ph: [2.7, 0.4, 5.1] }); this.rebuildWash();
    }
    rebuildWash(bloomIn) { this.wash.update(this.sources.map(s => Object.assign({}, s)), { now: this.t, w: W, h: H, mask: () => true, bloomIn }); this.washBuilt = true; }
    buildUi() {
      const ui = this.ui; ui.clear();
      const b = (x, w, label, onClick, tooltip) => ui.add(new HB.ui.Button({ x, y: HB.H - 52, w, h: 38, label, size: 14, onClick, tooltip }));
      let x = 14;
      b(x, 110, 'Fly east', () => { this.dragon.tx = 28 + OX; }, 'The dragon flies across; the land it uncovers washes in.'); x += 116;
      b(x, 90, 'Reset', () => this.reset(), 'Back to the start: only the west is known. Then fly again to replay the reveal.'); x += 96;
      b(x, 120, this.speed === 1 ? 'Speed: 1×' : 'Speed: ¼×', () => { this.speed = this.speed === 1 ? 0.25 : 1; this.buildUi(); }, 'Slow motion: everything at a quarter of its speed, to look at the edge of the wash.'); x += 126;
      b(x, 104, 'Kind rule', () => this.setRule(1), 'Your territory turns green and gold: the new colour blooms from its sources.'); x += 110;
      b(x, 104, 'Cruel rule', () => this.setRule(-1), 'Your territory turns rust and charcoal.'); x += 110;
      b(x, 76, 'Grow', () => this.grow(), 'Your territory widens (a new life phase, a richer hoard): the bloom spreads outward from its old edge.'); x += 82;
      b(x, 124, 'Village joins', () => this.villageJoins(), 'The village swears to you (or is occupied): a bloom spreads from it. Only possible once it is discovered.'); x += 130;
      b(x, 156, HB.mapFx.reduced() ? 'Motion: reduced' : 'Motion: full', () => { HB.mapFx.reducedOverride = !HB.mapFx.reduced(); this.buildUi(); }, 'Reduced motion: the land and the washes fade in without spreading. (Settings → Reduce motion does the same everywhere.)'); x += 162;
      const pack = HB.mapAssets ? HB.mapAssets.packName : 'none';
      b(x, 140, pack === 'none' ? 'Art: hand-drawn' : `Art: ${pack}`, () => { const next = HB.mapAssets.packName === 'none' ? 'sample' : 'none'; HB.mapAssets.use(next).then(() => this.buildUi()); this.buildUi(); }, 'The wash does not depend on the symbols: try it with the hand-drawn ones and with a pack.');
      ui.add(new HB.ui.Button({ x: HB.W - 124, y: 14, w: 110, h: 34, label: 'Back', size: 14, hotkey: 'cancel', hotkeyLabel: 'Esc', onClick: () => this.leave() }));
      ui.onCancel = () => this.leave();
    }
    leave() { HB.mapFx.reducedOverride = null; HB.scenes.replace(new HB.TitleScene()); }
    // camera (world-anchored: everything is placed through worldToScreen)
    worldToScreen(wx, wy) { const z = CELL * this.cam.zoom; return { x: HB.W / 2 + (wx - this.cam.x) * z, y: HB.H / 2 + (wy - this.cam.y) * z }; }
    zoomAt(sx, sy, f) { const z0 = CELL * this.cam.zoom, wx = this.cam.x + (sx - HB.W / 2) / z0, wy = this.cam.y + (sy - HB.H / 2) / z0; this.cam.zoom = HB.clamp(this.cam.zoom * f, 0.8, 4); const z1 = CELL * this.cam.zoom; this.cam.x = wx - (sx - HB.W / 2) / z1; this.cam.y = wy - (sy - HB.H / 2) / z1; }
    update(dtReal) {
      this.ui.update(dtReal);
      const dt = dtReal * this.speed; this.t += dt;
      const inp = HB.input, ptr = inp.pointer, overUi = this.ui.hoverWidget || this.ui.consumedPointer;
      if (!overUi) {
        if (ptr.down && ptr.dragging) { const z = CELL * this.cam.zoom; this.cam.x -= ptr.dx / z; this.cam.y -= ptr.dy / z; }
        if (ptr.wheel) this.zoomAt(ptr.x, ptr.y, Math.pow(1.18, -ptr.wheel));
        if (ptr.pinch) this.zoomAt(ptr.x, ptr.y, 1 + ptr.pinch);
      }
      if (inp.pressed('zoomIn')) this.zoomAt(HB.W / 2, HB.H / 2, 1.3); if (inp.pressed('zoomOut')) this.zoomAt(HB.W / 2, HB.H / 2, 1 / 1.3);
      this.cam.x = HB.clamp(this.cam.x, 0, W); this.cam.y = HB.clamp(this.cam.y, 0, H);
      // the dragon flies and uncovers the land around itself, as on the map
      const d = this.dragon; d.frame += dt;
      if (Math.abs(d.tx - d.x) > 0.05) { d.facing = d.tx > d.x ? 1 : -1; d.x += Math.sign(d.tx - d.x) * Math.min(Math.abs(d.tx - d.x), 4 * dt); if (this.t - this.lastReveal > 0.2) { this.lastReveal = this.t; this.revealCircle(d.x, d.y, 3.2, true); } }
      const RW = this.reveal;
      if (RW.active()) { for (const i of RW.cells.keys()) this.fog[i] = 1 - RW.progress(i, this.t); RW.prune(this.t); }
      if (!this.washBuilt) this.rebuildWash(true);
      if (this._rev !== (HB.mapAssets ? HB.mapAssets.revision : 0)) { this._rev = HB.mapAssets ? HB.mapAssets.revision : 0; this.rebuildWash(false); }
      if (this.auto) { const a = this.autoT += dt; if (!this._a1 && a > 0.8) { this._a1 = true; d.tx = 28 + OX; } if (!this._a2 && a > 7.5) { this._a2 = true; this.villageJoins(); } if (!this._a3 && a > 10.5) { this._a3 = true; this.grow(); } }
    }
    drawCrisp(ctx, f, sx, sy, scale) {
      const MA = HB.mapAssets, r = MA && MA.entries.size ? MA.resolve(f.ids, f.key) : null;
      ctx.save(); HB.mapart.setup(ctx);
      if (r) MA.drawResolved(ctx, r, sx, sy, f.param * scale, { key: f.key, paramY: f.paramY !== undefined ? f.paramY * scale : undefined }); else f.proc(ctx, sx, sy, scale);
      ctx.restore();
    }
    draw(ctx) {
      const t0 = performance.now(), cam = this.cam, now = this.t, z = CELL * cam.zoom, F = this.fog, RW = this.reveal;
      HB.parchment.fill(ctx, 0, 0, HB.W, HB.H);
      this.wash.draw(ctx, (x, y) => this.worldToScreen(x, y), now);
      for (const f of this.features.slice().sort((a, b) => a.y - b.y)) {
        if (!this.shown(f)) continue;
        const p = this.worldToScreen(f.x, f.y), s = f.place ? HB.clamp(Math.sqrt(cam.zoom), 0.4, 1.2) : cam.zoom;
        this.drawCrisp(ctx, f, p.x, p.y, s);
      }
      const v = this.features.find(f => f.place), va = 1 - F[v.cy * W + v.cx] / 0.4;
      if (this.revealed[v.cy * W + v.cx] && va > 0) { const p = this.worldToScreen(v.x, v.y + 0.15), sz = HB.clamp(11.5 * Math.sqrt(cam.zoom), 10, 18); ctx.save(); ctx.globalAlpha = HB.clamp(va, 0, 1); HB.text.draw(ctx, this.village.name, p.x, p.y + sz + 4, { size: sz, align: 'center', color: HB.palette.ink, stroke: 'rgba(240,228,200,0.75)', strokeWidth: 2.5 }); ctx.restore(); }
      // the fog: blank paper over what is unknown, the reveal wash over what is being uncovered, clouds on the frontier
      const paper = (g, x, y, w, h) => { g.fillStyle = HB.parchment.pattern; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,250,235,0.22)'; g.fillRect(x, y, w, h); };
      // only the cells on screen (and one around them)
      const vx0 = Math.max(0, Math.floor(cam.x - HB.W / 2 / z) - 1), vx1 = Math.min(W - 1, Math.ceil(cam.x + HB.W / 2 / z) + 1), vy0 = Math.max(0, Math.floor(cam.y - HB.H / 2 / z) - 1), vy1 = Math.min(H - 1, Math.ceil(cam.y + HB.H / 2 / z) + 1);
      ctx.save();
      for (let y = vy0; y <= vy1; y++) for (let x = vx0; x <= vx1; x++) { const i = y * W + x; if (F[i] <= 0 || RW.revealing(i)) continue; const p = this.worldToScreen(x, y); ctx.globalAlpha = F[i]; paper(ctx, p.x - 1, p.y - 1, z + 2, z + 2); }
      ctx.globalAlpha = 1;
      RW.draw(ctx, now, (x, y) => this.worldToScreen(x, y), (i) => this.revealed[i] && !RW.revealing(i), paper);
      const A = HB.mapart, cf = this.cloudField;
      for (let y = vy0; y <= vy1; y++) for (let x = vx0; x <= vx1; x++) {
        const i = y * W + x, a = RW.revealing(i) ? HB.clamp((F[i] - 0.6) / 0.4, 0, 1) : F[i]; if (a <= 0.02) continue;
        let edge = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && (F[ny * W + nx] < 0.5 || RW.revealing(ny * W + nx))) { edge = true; break; } }
        if (!edge && (x * 7 + y * 13) % 5 !== 0) continue;
        const p = this.worldToScreen(x + 0.5 + cf[i * 3], y + 0.5 + cf[i * 3 + 1]);
        ctx.globalAlpha = a * (edge ? 0.95 : 0.6);
        A.cloud(ctx, p.x, p.y, z * 0.75 * cf[i * 3 + 2], new HB.RNG(i), { fill: '#efe6cc', outline: edge, alpha: 0.55, ink: A.INK, storm: false, key: 'wpfog' + i });
      }
      ctx.restore();
      // the dragon
      const dp = this.worldToScreen(this.dragon.x, this.dragon.y - 0.6), flying = Math.abs(this.dragon.tx - this.dragon.x) > 0.05;
      const spec = { tier: 1, breed: 'red', alignment: this.sources[0].side * 30, mutations: [], scars: 0, element: 'fire' };
      HB.dragonArt.draw(ctx, spec, flying ? 'fly' : 'idle', HB.dragonArt.frameAt(spec, flying ? 'fly' : 'idle', this.dragon.frame, flying ? 4 : 2, flying ? 8 : 1.5), dp.x, dp.y, HB.clamp(cam.zoom * 1.1, 0.9, 2.2), this.dragon.facing);
      HB.parchment.panel(ctx, 14, 12, 470, 92, { shadow: false, stains: false, vignette: 0.05 });
      HB.text.draw(ctx, 'Watercolour preview', 30, 40, { size: 20, family: 'sc' });
      HB.text.paragraph(ctx, 'Fly east: the land the dragon uncovers washes in. The buttons try the territory\'s watercolour. Drag to pan, wheel or pinch to zoom. Nothing here is saved.', 30, 50, 440, { size: 13, italic: true, color: HB.palette.inkSoft, lineHeight: 16, maxLines: 3 });
      const ms = performance.now() - t0; this.frameMs.push(ms); if (this.frameMs.length > 120) this.frameMs.shift();
      const avg = this.frameMs.reduce((a, b) => a + b, 0) / this.frameMs.length;
      HB.text.draw(ctx, `revealing: ${RW.cells.size} cells${this.wash.active(now) ? ' · bloom' : ''} · script ${avg.toFixed(1)} ms · zoom ${cam.zoom.toFixed(2)} · ${this.speed === 1 ? 'real speed' : 'slow motion'} · ${HB.mapFx.reduced() ? 'reduced motion' : 'full motion'}`, HB.W - 14, HB.H - 64, { size: 13, align: 'right', color: HB.palette.inkSoft });
      this.ui.draw(ctx);
      this.stats = { revealing: RW.cells.size, washActive: this.wash.active(now), avgMs: avg };
    }
  }
  HB.WashPreviewScene = WashPreviewScene;
})();
