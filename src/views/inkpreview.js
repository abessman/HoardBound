/* Ink and wash preview (index.html?scene=inkpreview): an isolated piece of parchment with one mountain, one forest
 * and one village, for trying the ink discovery and the watercolour influence (src/art/mapfx.js) and an art pack's
 * masks. Not a campaign: nothing is saved and no game state changes. Instructions: docs/map-art/INK_PREVIEW.md.
 * URL options: &mappack=<name|none>, &reducedmotion=1, &auto=1 (fly and bloom by itself, for screenshots). */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;
  const CELL = 22, W = 40, H = 20, OX = 8, OY = 1; // a wide sheet; the scene sits at OX, OY so washes never meet its edge

  class InkPreviewScene {
    constructor(params) {
      this.opaque = true; this.ui = new HB.ui.UI(); this.t = 0; this.params = params; this.sheet = { W, H, OX, OY };
      this.cam = { x: 13 + OX, y: 10.2 + OY, zoom: 2.5 };
      this.frameMs = []; this.auto = params && params.get('auto') === '1';
      if (params && params.get('reducedmotion') === '1') HB.mapFx.reducedOverride = true;
      this.reset();
    }
    reset() {
      const P = HB.mapart.proc, rngOf = (k) => new HB.RNG(HB.hash32(k));
      this.revealed = new Uint8Array(W * H);
      const mtW = 26.4 * 1.15, mtH = 20.9 * 1.15; // key 'pv:mtn' picks the sample pack's mountain variant a, the one with masks
      const village = { id: 9001, type: 'village', state: 'normal', tier: 1, flags: {}, name: 'Brookmere', factionId: -1, knowledge: { seen: true } };
      this.village = village;
      const fs = [{ key: 'pv:mtn', ids: ['map.terrain.mountain'], x: 9.5 + OX, y: 10.3 + OY, cx: 9 + OX, cy: 9 + OY, param: mtW, paramY: mtH, proc: (g, x, y, s) => P.mountain(g, x, y, mtW * s, mtH * s, rngOf('pv:mountain'), {}) }];
      const trees = [[14.6, 9.7, 'round'], [15.5, 10.0, 'pine'], [16.3, 9.6, 'round'], [14.9, 10.7, 'round'], [15.9, 10.9, 'pine'], [16.8, 10.4, 'round'], [15.3, 11.5, 'round']];
      trees.forEach(([x, y, kind], k) => {
        const s = kind === 'pine' ? 0.15 * CELL * 1.1 : 0.17 * CELL * 1.1, key = 'pv:tree' + k;
        fs.push({ key, ids: ['map.terrain.tree.' + kind], x: x + OX, y: y + OY, cx: Math.floor(x) + OX, cy: Math.floor(y - 0.3) + OY, param: s, proc: (g, gx, gy, sc) => (kind === 'pine' ? P.treePine : P.treeRound)(g, gx, gy, s * sc, rngOf(key)) });
      });
      fs.push({ key: 'loc9001', place: true, ids: HB.mapAssets ? HB.mapAssets.placeIds(village).ids : ['map.place.village'], x: 21.5 + OX, y: 10.35 + OY, cx: 21 + OX, cy: 9 + OY, param: 10, proc: (g, x, y, s) => P.settlement(g, village, x, y, 10 * s, rngOf('loc9001'), {}) });
      for (const f of fs) { f.state = 'hidden'; f.buf = null; }
      this.features = fs;
      this.dragon = { x: 4.5 + OX, y: 9.6 + OY, tx: 4.5 + OX, facing: 1, frame: 0 };
      this.revealCircle(4.5 + OX, 9.5 + OY, 3.2, false);
      this.sources = [{ key: 'lair', lair: true, x: 4.8 + OX, y: 11 + OY, r: 3.5, side: 1, ph: [1.3, 4.1, 2.2] }];
      this.wash = new HB.mapWash.Layer({ res: 8, seed: 'inkpreview' });
      this.washBuilt = false; HB.mapInk.pools = []; this.labelT0 = -1; this.lastReveal = 0;
      this.buildUi();
    }
    // ---------- knowledge: the same rules as the map (revealed cells; sketches only near them; places never sketched)
    revealCircle(cx, cy, r, animate) {
      const newly = [];
      for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(H - 1, Math.ceil(cy + r)); y++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W - 1, Math.ceil(cx + r)); x++) {
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > r || this.revealed[y * W + x]) continue;
        this.revealed[y * W + x] = 1; newly.push(y * W + x);
      }
      if (!newly.length) return;
      const found = [];
      for (const f of this.features) {
        const rev = !!this.revealed[f.cy * W + f.cx];
        if (rev && f.state !== 'drawn' && f.state !== 'revealing' && f.state !== 'fading') found.push(f);
        else if (!rev && f.state === 'hidden' && this.nearRevealed(f.cx, f.cy)) f.state = HB.mapInk.stateFromKnowledge(f, false, true);
      }
      if (!found.length) return;
      if (!animate) { for (const f of found) f.state = 'drawn'; return; }
      // one pool for what this step found: between the dragon and the new features, on the land just uncovered
      const mx = found.reduce((a, f) => a + f.x, 0) / found.length, my = found.reduce((a, f) => a + f.y, 0) / found.length;
      HB.mapInk.reveal(found, { x: mx + (this.dragon.x - mx) * 0.35, y: my + 1.1, r: 0.55, allActive: this.features }, this.t);
      if (found.some(f => f.place)) this.labelT0 = this.t + 1.6;
    }
    nearRevealed(cx, cy) {
      const b = HB.mapFx.LIMITS.sketchBand;
      for (let y = Math.max(0, cy - b); y <= Math.min(H - 1, cy + b); y++) for (let x = Math.max(0, cx - b); x <= Math.min(W - 1, cx + b); x++) if (this.revealed[y * W + x] && Math.hypot(x - cx, y - cy) <= b) return true;
      return false;
    }
    // ---------- territory (a stand-in for HB.domain's sources: the lair, and the village once it serves you)
    setRule(side) { for (const s of this.sources) s.side = side; this.rebuildWash(); }
    grow() { const L = this.sources.find(s => s.lair); L.r = Math.min(13, L.r + 2.5); this.rebuildWash(); }
    villageJoins() {
      const v = this.features.find(f => f.place);
      if (v.state !== 'drawn') { HB.notice('Not yet', 'You have not discovered the village: nothing can be known of it, let alone ruled.'); return; }
      if (this.sources.some(s => s.key === 'village')) return;
      this.sources.push({ key: 'village', x: 21.5 + OX, y: 10 + OY, r: 4, side: this.sources[0].side, ph: [2.7, 0.4, 5.1] }); this.rebuildWash();
    }
    rebuildWash(bloomIn) { this.wash.update(this.sources.map(s => Object.assign({}, s)), { now: this.t, w: W, h: H, mask: () => true, bloomIn }); this.washBuilt = true; }
    buildUi() {
      const ui = this.ui; ui.clear();
      const b = (x, label, onClick, tooltip, w = 150) => ui.add(new HB.ui.Button({ x, y: HB.H - 52, w, h: 38, label, size: 14, onClick, tooltip }));
      let x = 14;
      b(x, 'Fly east', () => { this.dragon.tx = 28 + OX; }, 'The dragon flies across: new land is revealed around it, an ink drop pools there and drains into what it finds.'); x += 158;
      b(x, 'Reset', () => this.reset(), 'Back to the start: only the west is known.', 100); x += 108;
      b(x, 'Kind rule', () => this.setRule(1), 'Your territory turns green and gold: the new colour blooms from its sources.', 120); x += 128;
      b(x, 'Cruel rule', () => this.setRule(-1), 'Your territory turns rust and charcoal.', 120); x += 128;
      b(x, 'Grow', () => this.grow(), 'Your territory widens (a new life phase, a richer hoard): the bloom spreads outward from its old edge.', 90); x += 98;
      b(x, 'Village joins', () => this.villageJoins(), 'The village swears to you (or is occupied): a bloom spreads from it. Only possible once it is discovered.', 140); x += 148;
      this.btnMotion = b(x, '', () => { HB.mapFx.reducedOverride = !HB.mapFx.reduced(); this.buildUi(); }, 'Reduced motion: no pools or spreading; features and washes fade in. (Settings → Reduce motion does the same everywhere.)', 170); x += 178;
      this.btnMotion.label = HB.mapFx.reduced() ? 'Motion: reduced' : 'Motion: full';
      const pack = HB.mapAssets ? HB.mapAssets.packName : 'none';
      b(x, pack === 'none' ? 'Art: hand-drawn' : `Art: ${pack}`, () => { const next = HB.mapAssets.packName === 'none' ? 'sample' : 'none'; HB.mapAssets.use(next).then(() => this.buildUi()); this.buildUi(); }, 'Switch between the hand-drawn symbols and the sample art pack (placeholder art and masks).', 150);
      ui.add(new HB.ui.Button({ x: HB.W - 124, y: 14, w: 110, h: 34, label: 'Back', size: 14, hotkey: 'cancel', hotkeyLabel: 'Esc', onClick: () => { HB.mapFx.reducedOverride = null; HB.scenes.replace(new HB.TitleScene()); } }));
      ui.onCancel = () => { HB.mapFx.reducedOverride = null; HB.scenes.replace(new HB.TitleScene()); };
    }
    // ---------- camera (world-anchored: everything below is placed through worldToScreen)
    worldToScreen(wx, wy) { const z = CELL * this.cam.zoom; return { x: HB.W / 2 + (wx - this.cam.x) * z, y: HB.H / 2 + (wy - this.cam.y) * z }; }
    zoomAt(sx, sy, f) { const z0 = CELL * this.cam.zoom, wx = this.cam.x + (sx - HB.W / 2) / z0, wy = this.cam.y + (sy - HB.H / 2) / z0; this.cam.zoom = HB.clamp(this.cam.zoom * f, 0.6, 3.2); const z1 = CELL * this.cam.zoom; this.cam.x = wx - (sx - HB.W / 2) / z1; this.cam.y = wy - (sy - HB.H / 2) / z1; }
    update(dt) {
      this.t += dt; this.ui.update(dt);
      const inp = HB.input, ptr = inp.pointer, overUi = this.ui.hoverWidget || this.ui.consumedPointer;
      if (!overUi) {
        if (ptr.down && ptr.dragging) { const z = CELL * this.cam.zoom; this.cam.x -= ptr.dx / z; this.cam.y -= ptr.dy / z; }
        if (ptr.wheel) this.zoomAt(ptr.x, ptr.y, Math.pow(1.18, -ptr.wheel));
        if (ptr.pinch) this.zoomAt(ptr.x, ptr.y, 1 + ptr.pinch);
      }
      const pan = 10 / this.cam.zoom * dt;
      if (inp.held('left')) this.cam.x -= pan; if (inp.held('right')) this.cam.x += pan; if (inp.held('up')) this.cam.y -= pan; if (inp.held('down')) this.cam.y += pan;
      if (inp.pressed('zoomIn')) this.zoomAt(HB.W / 2, HB.H / 2, 1.3); if (inp.pressed('zoomOut')) this.zoomAt(HB.W / 2, HB.H / 2, 1 / 1.3);
      this.cam.x = HB.clamp(this.cam.x, 0, W); this.cam.y = HB.clamp(this.cam.y, 0, H);
      // the dragon flies and reveals around itself, as on the map
      const d = this.dragon; d.frame += dt;
      if (Math.abs(d.tx - d.x) > 0.05) { d.facing = d.tx > d.x ? 1 : -1; d.x += Math.sign(d.tx - d.x) * Math.min(Math.abs(d.tx - d.x), 4 * dt); if (this.t - this.lastReveal > 0.2) { this.lastReveal = this.t; this.revealCircle(d.x, d.y, 3.2, true); } }
      if (!this.washBuilt) this.rebuildWash(true);
      if (this._rev !== (HB.mapAssets ? HB.mapAssets.revision : 0)) { this._rev = HB.mapAssets ? HB.mapAssets.revision : 0; this.rebuildWash(false); }
      // &auto=1: a scripted run for screenshots
      if (this.auto) { const a = this.autoT = (this.autoT || 0) + dt; if (!this._a1 && a > 0.8) { this._a1 = true; d.tx = 28 + OX; } if (!this._a2 && a > 7.5) { this._a2 = true; this.villageJoins(); } if (!this._a3 && a > 10.5) { this._a3 = true; this.grow(); } }
    }
    draw(ctx) {
      const t0 = performance.now(), cam = this.cam, now = this.t;
      HB.parchment.fill(ctx, 0, 0, HB.W, HB.H);
      // faint grid of the world's cells (only to show that effects stay put while you pan and zoom)
      ctx.save(); ctx.strokeStyle = 'rgba(90,70,40,0.07)'; ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 2) { const p = this.worldToScreen(x, 0), q = this.worldToScreen(x, H); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
      for (let y = 0; y <= H; y += 2) { const p = this.worldToScreen(0, y), q = this.worldToScreen(W, y); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
      ctx.restore();
      // watercolour influence, under the ink
      this.wash.draw(ctx, (x, y) => this.worldToScreen(x, y), now);
      // features by their base line
      const screenOf = (f) => { const p = this.worldToScreen(f.x, f.y); return { x: p.x, y: p.y, s: HB.mapInk.scaleOf(f, cam.zoom) }; };
      let busy = 0;
      for (const f of this.features.slice().sort((a, b) => a.y - b.y)) { const sc = screenOf(f); if (HB.mapInk.drawFeature(ctx, f, sc.x, sc.y, sc.s, now)) busy++; }
      // the village's name only once it is discovered and inked
      const v = this.features.find(f => f.place);
      if (v.state === 'drawn' || (v.state === 'revealing' && this.labelT0 >= 0)) {
        const a = v.state === 'drawn' && this.labelT0 < 0 ? 1 : HB.clamp((now - this.labelT0) / 0.5, 0, 1);
        if (a > 0) { const p = this.worldToScreen(v.x, v.y + 0.15); ctx.save(); ctx.globalAlpha = a; HB.text.draw(ctx, this.village.name, p.x, p.y + HB.clamp(11.5 * Math.sqrt(cam.zoom), 10, 18) + 4, { size: HB.clamp(11.5 * Math.sqrt(cam.zoom), 10, 18), align: 'center', color: HB.palette.ink, stroke: 'rgba(240,228,200,0.75)', strokeWidth: 2.5 }); ctx.restore(); }
      }
      const pools = HB.mapInk.drawPools(ctx, now, (x, y) => this.worldToScreen(x, y), cam.zoom, screenOf);
      // the dragon
      const dp = this.worldToScreen(this.dragon.x, this.dragon.y - 0.6), flying = Math.abs(this.dragon.tx - this.dragon.x) > 0.05;
      const spec = { tier: 1, breed: 'red', alignment: this.sources[0].side * 30, mutations: [], scars: 0, element: 'fire' };
      HB.dragonArt.draw(ctx, spec, flying ? 'fly' : 'idle', flying ? Math.floor(this.dragon.frame * 8) % 4 : Math.floor(this.dragon.frame * 1.5) % 2, dp.x, dp.y, HB.clamp(cam.zoom * 1.1, 0.9, 2.2), this.dragon.facing);
      // header and status
      HB.parchment.panel(ctx, 14, 12, 470, 92, { shadow: false, stains: false, vignette: 0.05 });
      HB.text.draw(ctx, 'Ink & wash preview', 30, 40, { size: 20, family: 'sc' });
      HB.text.paragraph(ctx, 'Fly east to discover the mountain, the forest and the village. Drag to pan, wheel or pinch to zoom: the ink and the washes stay on the land. Nothing here is saved.', 30, 50, 440, { size: 13, italic: true, color: HB.palette.inkSoft, lineHeight: 16, maxLines: 3 });
      const ms = performance.now() - t0; this.frameMs.push(ms); if (this.frameMs.length > 120) this.frameMs.shift();
      const avg = this.frameMs.reduce((a, b) => a + b, 0) / this.frameMs.length;
      HB.text.draw(ctx, `animating: ${busy} feature${busy === 1 ? '' : 's'}${pools ? ', ink pool' : ''}${this.wash.active(now) ? ', bloom' : ''} · script ${avg.toFixed(1)} ms · zoom ${cam.zoom.toFixed(2)} · ${HB.mapFx.reduced() ? 'reduced motion' : 'full motion'}`, HB.W - 14, HB.H - 64, { size: 13, align: 'right', color: HB.palette.inkSoft });
      this.ui.draw(ctx);
      this.stats = { busy, pools, washActive: this.wash.active(now), avgMs: avg, states: this.features.map(f => f.state) };
    }
  }
  HB.InkPreviewScene = InkPreviewScene;
})();
