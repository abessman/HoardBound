/* World map scene: hand-drawn parchment cartography with fog, labels, camera, target preview and HUD. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;
  const T = () => HB.TERRAIN;

  const CELL = 22;              // px per cell at zoom 1 (lod0 chunk resolution)
  const CHUNK = 16;             // cells per chunk
  const MARGIN = 2;             // cells of glyph spill around a chunk
  const LOD1_CELL = 7;
  const RUMOR_ALPHA = 0.78;     // rumoured cells show a faint sketch of the terrain beneath the mist

  class MapScene {
    constructor(state) {
      this.state = state; this.opaque = true; this.ui = new HB.ui.UI();
      const W = state.world;
      this.cam = { x: W.home.x + 0.5, y: W.home.y + 0.5, zoom: 1.9, tx: null, ty: null, tzoom: null };
      this.chunks = new Map(); this.chunkOrder = []; this.maxChunks = 90;
      this.fogAlpha = new Float32Array(W.w * W.h).fill(1);
      for (let i = 0; i < this.fogAlpha.length; i++) if (state.know.revealed[i]) this.fogAlpha[i] = 0; else if (state.know.rumor[i]) this.fogAlpha[i] = RUMOR_ALPHA;
      this.selected = null; this.hoverLoc = null; this.t = 0; this.frame = 0;
      this.toast = null; this.labelsPlaced = [];
      this.cloudSeed = new HB.RNG('clouds:' + state.seed);
      this.cloudField = new Float32Array(W.w * W.h * 3);
      for (let i = 0; i < W.w * W.h; i++) { this.cloudField[i * 3] = this.cloudSeed.range(-0.3, 0.3); this.cloudField[i * 3 + 1] = this.cloudSeed.range(-0.3, 0.3); this.cloudField[i * 3 + 2] = this.cloudSeed.range(0.75, 1.15); }
      this.pendingReveal = [];
      // newly revealed land is uncovered by a thin watercolour wash bleeding outward from the dragon (src/art/mapfx.js)
      this.revealWash = HB.mapReveal ? new HB.mapReveal.Layer({ seed: state.seed }) : null;
      this.dragonFrameT = 0;
      // the dragon's domain: washes over its territory and changed glyphs near its rule (rebuilt when the domain changes)
      this.showTerritory = true; this._domSig = null; this.mark = null;
      this.syncDomain();
    }
    /** rebuild the territory overlay and glyph marks if the domain changed (chunks re-render with the new glyphs) */
    syncDomain() {
      if (!HB.domain) return;
      const sig = HB.domain.signature(this.state);
      if (sig === this._domSig) return;
      const hadMark = !!this.mark && this.mark.some(v => v);
      this._domSig = sig; this.mark = HB.domain.markField(this.state);
      if (hadMark || this.mark.some(v => v)) { this.chunks.clear(); this.chunkOrder.length = 0; }
    }
    /** the territory as watercolour blooms (HB.mapWash, src/art/mapfx.js): green and gold where your rule is kind,
     *  rust and charcoal where it is cruel; painted from the real territory (HB.domain.influence) over the land of your
     *  home region. When the territory changes, the new or grown part blooms out from the place that changed. */
    drawTerritory(ctx) {
      if (!HB.domain || !this.showTerritory || !HB.mapWash) return;
      const st = this.state, W = st.world, inf = HB.domain.influence(st), rev = HB.mapAssets ? HB.mapAssets.revision : 0;
      if (!this.wash) this.wash = new HB.mapWash.Layer({ res: 6, seed: st.seed });
      if (this.washInf !== inf || this.washRev !== rev || this.washReplay) {
        const rid = inf.region, first = !this.washInf || this.washReplay;
        this.wash.update(inf.count ? inf.sources : [], { now: this.t, w: W.w, h: W.h, bloomIn: first, mask: (x, y) => { const i = y * W.w + x; return W.region[i] === rid && HB.isLand(W.terrain[i]); } });
        this.washInf = inf; this.washRev = rev; this.washReplay = false;
      }
      this.wash.draw(ctx, (x, y) => this.worldToScreen(x, y), this.t);
    }
    /** pennants showing what each settlement is to you; the settlement at your hill */
    drawDomainMarks(ctx, tl, br) {
      if (!HB.domain) return;
      const st = this.state, W = st.world, cam = this.cam, z = CELL * cam.zoom;
      const s = Math.max(4, Math.min(12, 10 * Math.sqrt(cam.zoom)));
      const h = HB.domain.home(st);
      if (h.stage > 0 && W.home.x >= tl.x - 6 && W.home.x <= br.x + 6 && W.home.y >= tl.y - 4 && W.home.y <= br.y + 4) {
        const p = this.worldToScreen(W.home.x + 0.5, W.home.y + 0.85), rng = new HB.RNG(HB.hash32('home' + st.seed));
        let hx = p.x + s * 4.4, hy = p.y + s * 0.2;
        if (h.stage === 1) {
          // devoted camps scattered around the hill: one at first, up to three as the years pass
          const n = 1 + Math.min(2, Math.floor((st.time.year - (h.stageYear || st.time.year)) / 2)), base = (HB.hash32('camps' + st.seed) % 628) / 100;
          for (let k = 0; k < n; k++) {
            const ang = base + k * 2.2, cx = p.x + Math.cos(ang) * z * 1.9, cy = p.y + Math.sin(ang) * z * 1.2 + s * 0.3;
            ctx.save(); HB.mapart.homeSettlement(ctx, cx, cy, s * 0.7, 1, h.path, rng); ctx.restore();
            if (k === 0) { hx = cx; hy = cy; }
          }
        } else { ctx.save(); HB.mapart.homeSettlement(ctx, hx, hy, s * 0.85, h.stage, h.path, rng); ctx.restore(); }
        if (cam.zoom > 0.7) HB.text.draw(ctx, h.name, hx, hy + s * 2.2, { size: HB.clamp(11.5 * Math.sqrt(cam.zoom), 10, 18), italic: true, align: 'center', color: h.path === 'tyrannical' ? '#5a2418' : '#5a4a14', stroke: 'rgba(240,228,200,0.75)', strokeWidth: 2.5 });
      }
      if (cam.zoom < 0.45) return;
      for (const L of W.locations) {
        if (L.x < tl.x - 3 || L.x > br.x + 3 || L.y < tl.y - 3 || L.y > br.y + 3 || this.fogAlpha[L.y * W.w + L.x] >= 0.7) continue;
        const status = HB.domain.statusOf(st, L);
        if (!status || status === 'ruined') continue;
        const S = HB.DOMAIN_STATUSES[status], p = this.worldToScreen(L.x + 0.5, L.y + 0.85);
        const px = p.x + s * (L.type === 'farm' ? 1.9 : 2.4), mark = status === 'allied' || status === 'protected' ? 'sun' : status === 'occupied' ? 'eye' : null;
        ctx.save(); HB.mapart.setup(ctx);
        if (status === 'resisting') HB.mapart.crossedSwords(ctx, px + s * 0.4, p.y - s * 1.4, s * 0.55);
        else HB.mapart.pennant(ctx, px, p.y, s * 0.75, S.color, mark, status);
        ctx.restore();
        if (status === 'resisting' && cam.zoom > 0.7) HB.text.draw(ctx, 'in revolt', px + s * 0.4, p.y - s * 2.4, { size: 11, italic: true, align: 'center', color: '#8f2b1f', stroke: 'rgba(240,228,200,0.85)', strokeWidth: 2.5 });
      }
    }
    /** a small key under the territory toggle */
    drawTerritoryKey(ctx) {
      if (!HB.domain || !this.btnTerritory || !this.btnTerritory.visible || !this.showTerritory || this.selected) return;
      const inf = this.washInf || HB.domain.influence(this.state);
      const rows = [];
      let kind = false, cruel = false, reach = false;
      for (const o of inf.subs.values()) { if (o.c > 0.2) kind = true; else if (o.c < -0.2) cruel = true; else reach = true; }
      const C = HB.mapWash ? HB.mapWash.colours() : { benevolent: [[110, 140, 58]], tyrannical: [[176, 48, 16]], neutral: [[128, 104, 70]] }, rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
      if (kind) rows.push([rgba(C.benevolent[0], 0.6), 'Ruled kindly']); if (cruel) rows.push([rgba(C.tyrannical[0], 0.55), 'Ruled by fear']); if (reach) rows.push([rgba(C.neutral[0], 0.4), 'Within your reach']);
      if (!rows.length) return;
      const b = this.btnTerritory, x = b.x, y = b.y + b.h + 4, w = b.w, hh = 8 + rows.length * 18;
      HB.parchment.panel(ctx, x, y, w, hh, { shadow: false, stains: false, vignette: 0.05, flourish: 0 });
      rows.forEach(([col, label], i) => { ctx.fillStyle = col; ctx.fillRect(x + 10, y + 7 + i * 18, 14, 11); ctx.strokeStyle = HB.palette.inkSoft; ctx.lineWidth = 1; ctx.strokeRect(x + 10, y + 7 + i * 18, 14, 11); HB.text.draw(ctx, label, x + 30, y + 17 + i * 18, { size: 13, color: HB.palette.ink }); });
    }
    enter() { this.buildHud(); }
    // ---------- camera helpers
    screenToWorld(sx, sy) { const z = CELL * this.cam.zoom; return { x: this.cam.x + (sx - HB.W / 2) / z, y: this.cam.y + (sy - HB.H / 2) / z }; }
    worldToScreen(wx, wy) { const z = CELL * this.cam.zoom; return { x: HB.W / 2 + (wx - this.cam.x) * z, y: HB.H / 2 + (wy - this.cam.y) * z }; }
    centerOn(x, y, zoom, instant) { if (instant) { this.cam.x = x; this.cam.y = y; if (zoom) this.cam.zoom = zoom; this.cam.tx = null; } else { this.cam.tx = x; this.cam.ty = y; if (zoom) this.cam.tzoom = zoom; } }
    // ---------- HUD
    buildHud() {
      const ui = this.ui; ui.clear();
      const st = this.state;
      const bw = 118, bh = 34, y = HB.H - bh - 12;
      const btn = (x, label, hotkey, onClick, opts = {}) => ui.add(new HB.ui.Button(Object.assign({ x, y, w: bw, h: bh, label, size: 15, hotkey, hotkeyLabel: opts.hotkeyLabel || '', onClick, tooltip: opts.tooltip || '' }, opts)));
      let x = 14;
      this.btnLair = btn(x, 'Lair', 'lair', () => this.openLair(), { tooltip: 'Return to your cave: hoard, workers, upgrades, captives and sleep. (H)' }); x += bw + 8;
      this.btnChron = btn(x, 'Chronicle', 'chronicle', () => this.openChronicle(), { tooltip: 'The story of this dragon so far. (C)' }); x += bw + 8;
      this.btnRealms = btn(x, 'Reputation', 'factions', () => this.openRealms(), { tooltip: 'How the world sees you: your names, each realm’s fear, trust and anger, who knows your lair, and the grudges sworn against you. (F)' }); x += bw + 8;
      this.btnAims = btn(x, 'Aims', 'KeyG', () => this.openAims(), { tooltip: 'Your goal, what you could do next and why, and what you are known for. (G)' }); x += bw + 8;
      this.btnMenu = btn(x, 'Menu', 'menu', () => this.openMenu(), { tooltip: 'Save, load, settings. (Esc)' }); x += bw + 8;
      this.btnHome = btn(x, 'Find me', null, () => this.centerOn(st.dragon.x + 0.5, st.dragon.y + 0.5), { tooltip: 'Centre the map on your dragon.' });
      this.btnTerritory = ui.add(new HB.ui.Button({ x: HB.W - 280, y: 16, w: 160, h: 30, label: 'Territory: shown', size: 13, hotkey: 'KeyT', hotkeyLabel: 'T', tooltip: 'Show or hide the wash over your territory. It grows with your size and hoard, and around the places that serve you; it cannot pass the storms around your home region. Territory is reach, not loyalty: tap a place to see what it is to you. (T)', onClick: () => { this.showTerritory = !this.showTerritory; this.btnTerritory.label = this.showTerritory ? 'Territory: shown' : 'Territory: hidden'; if (this.showTerritory) this.washReplay = true; } }));
      // the goal panel under the status plaque: always visible, opens the Aims board
      this.goalPanel = ui.add(new HB.ui.Custom({ x: 14, y: 114, w: 330, h: 92, focusable: true, tooltip: 'Your goal and the next step. Open the Aims board for what you could do and why.', render: (ctx, wdg) => this.drawGoalPanel(ctx, wdg), onClick: () => this.openAims() }));
      // context buttons (visibility set per frame)
      const cx = HB.W - 14 - 150;
      this.btnFlyHome = ui.add(new HB.ui.Button({ x: cx, y, w: 150, h: bh, label: 'Fly home', size: 15, primary: true, tooltip: 'Return to the lair with your cargo.', onClick: () => { const lair = st.world.locations[st.world.home.locId]; const err = HB.travel.canBegin(st, lair); if (err) this.showToast(err); else HB.travel.begin(st, lair, this); } }));
      this.btnPause = ui.add(new HB.ui.Button({ x: cx, y, w: 150, h: bh, label: 'Pause', size: 15, hotkey: 'pause', hotkeyLabel: 'P', tooltip: 'Pause or resume the flight.', onClick: () => { HB.travel.togglePause(st); } }));
      this.btnSpeed = ui.add(new HB.ui.Button({ x: cx - 158, y, w: 150, h: bh, label: 'Speed ×1', size: 15, tooltip: 'Cycle flight speed. Hold Shift for a burst.', onClick: () => { const tr = st.travel; if (tr) tr.speedMul = tr.speedMul >= 3 ? 0.6 : tr.speedMul >= 1.6 ? 3 : tr.speedMul >= 1 ? 1.6 : 1; } }));
      this.btnTurn = ui.add(new HB.ui.Button({ x: cx - 316, y, w: 150, h: bh, label: 'Turn back', size: 15, tooltip: 'Abandon this flight and head home.', onClick: () => HB.travel.turnBack(st, this) }));
      this.btnRest = ui.add(new HB.ui.Button({ x: cx - 158, y, w: 150, h: bh, label: 'Rest here', size: 15, tooltip: 'Rest two days where you are: half your stamina returns. People may notice you.', onClick: () => HB.travel.restInWild(st, this) }));
      ui.onCancel = () => { if (this.selected) this.selected = null; else this.openMenu(); };
    }
    updateContextButtons() {
      const st = this.state, tr = st.travel;
      const away = st.phase === 'planning' && Math.hypot(st.dragon.x - st.world.home.x, st.dragon.y - st.world.home.y) > 0.5;
      this.btnFlyHome.visible = away;
      this.btnRest.visible = away && st.dragon.stamina < st.dragon.stats.maxStamina;
      const flying = st.phase === 'traveling' || st.phase === 'returning';
      this.btnPause.visible = flying; this.btnSpeed.visible = flying; this.btnTurn.visible = st.phase === 'traveling';
      if (this.goalPanel) this.goalPanel.h = 92 + (HB.situations && HB.situations.hint(st, true) ? 36 : 0) + (HB.endgame && HB.endgame.hint(st) ? 36 : 0);
      if (this.btnTerritory) this.btnTerritory.visible = !!HB.domain && HB.domain.influence(st).count > 0;
      if (flying && tr) { this.btnPause.label = tr.paused ? 'Resume' : 'Pause'; this.btnSpeed.label = `Speed ×${tr.speedMul}`; }
    }
    openLair() { if (HB.LairScene) HB.scenes.push(new HB.LairScene(this.state)); else HB.notice('Lair', 'The lair view is not built yet.'); }
    openChronicle() { if (HB.ChronicleScene) HB.scenes.push(new HB.ChronicleScene(this.state)); else HB.notice('Chronicle', this.state.chronicle.map(c => `Year ${c.year}: ${c.text}`).slice(-8).join('\n')); }
    openRealms(tab) { if (HB.ReputationScene) HB.scenes.push(new HB.ReputationScene(this.state, { tab })); }
    showAmbush() {
      const st = this.state, e = HB.hunters.find(st, st.ambush);
      if (!e) { st.ambush = null; return; }
      if (this._ambushShown === e.id + ':' + st.time.totalDays) return;
      this._ambushShown = e.id + ':' + st.time.totalDays;
      st.travel = null; if (st.phase === 'traveling' || st.phase === 'returning') st.phase = 'planning';
      const price = HB.hunters.price(e), smoke = HB.caps.has(st, 'smoke');
      const card = new HB.CardScene({ title: 'Hunters!', illustration: 'defeat', text: `${HB.hunters.describe(st, e)} They have caught up with you${Math.hypot(st.dragon.x - st.world.home.x, st.dragon.y - st.world.home.y) < 0.5 ? ' at your own door' : ''}.`, choices: [
        { label: 'Turn and fight', desc: 'An animated fight. Win and they hunt no one again.', onChoose: () => { HB.scenes.pop(card); setTimeout(() => HB.hunters.resolveAmbush(st, 'fight', this), 0); return false; } },
        { label: smoke ? 'Vanish with the Smoke-Glass' : 'Flee', desc: smoke ? 'They lose your trail for good.' : 'Costs a quarter of your stamina; they find your trail again in a few days.', onChoose: () => HB.hunters.resolveAmbush(st, 'flee', this) },
        { label: `Pay them off (${price} gold)`, desc: e.mercenary ? 'Hired hunters can be bought. Their realm cools a little.' : 'Sworn enemies cannot be bought.', disabled: !e.mercenary || st.cargo.gold < price, disabledReason: !e.mercenary ? `${e.leader} swore an oath; gold will not break it` : `You carry ${st.cargo.gold} gold`, onChoose: () => HB.hunters.resolveAmbush(st, 'pay', this) },
      ], onClose: () => { if (st.ambush) st.ambush = null; } });
      HB.scenes.push(card);
    }
    openAims() { if (HB.AimsScene) HB.scenes.push(new HB.AimsScene(this.state, this)); }
    showStruggle() {
      const st = this.state, E = st.endgame, W = st.world, eg = HB.endgame;
      E.announced = true;
      let title, text, first;
      if (E.path === 'shadow') {
        title = `${E.foe.name} Wakes`;
        const lines = E.lieutenants.map(l => { const d = eg.lieutenantDef(l.id); return `• ${l.name}, ${d.title}. ${d.power}: ${d.powerText}`; });
        text = `${HB.ENDGAME.shadow.intro(E.foe.name, E.foe.title)}\n\n${lines.join('\n')}\n\nKill all three and the way to ${HB.ENDGAME.shadow.foe.place} lies open. You may challenge him sooner, at a heavy cost.`;
        first = W.locations[E.lieutenants[0].locId];
      } else {
        title = 'The Crystals of Life';
        text = `${HB.ENDGAME.crystals.intro()}\n\n${E.crystals.map(c => { const d = eg.crystalDef(c.id); return `• ${d.name}: ${d.benefit}`; }).join('\n')}\n\nThe first lies at ${E.crystals[0].locId !== null ? W.locations[E.crystals[0].locId].name : 'a place not yet found'}. When all six are yours, ${E.god.name}, ${E.god.title}, will come for you.`;
        first = E.crystals[0].locId !== null ? W.locations[E.crystals[0].locId] : null;
      }
      const card = new HB.CardScene({ title, illustration: E.path === 'shadow' ? 'shadow' : 'sanctuary', text, width: 860, choices: [
        { label: first ? `Show me ${first.name}` : 'Show me', desc: 'Find it on the map.', onChoose: () => { HB.scenes.pop(card); if (first) { this.select(first); this.centerOn(first.x + 0.5, first.y + 0.5, 1.2); } return false; } },
        { label: 'Later', desc: 'It is on the Aims board and under your goal.', onChoose: () => { HB.scenes.pop(card); return false; } },
      ] });
      HB.scenes.push(card);
    }
    openMenu() { if (HB.MenuScene) HB.scenes.push(new HB.MenuScene(this.state)); else HB.scenes.push(new HB.SettingsScene({ inGame: true })); }

    // ---------- update
    update(dt) {
      this.t += dt; this.frame++;
      const st = this.state, inp = HB.input, ptr = inp.pointer;
      if (HB.cheats) HB.cheats.topUp(st);
      this.updateContextButtons();
      this.ui.update(dt);
      const overUi = this.ui.hoverWidget || this.ui.consumedPointer;
      // camera smoothing
      if (this.cam.tx !== null) { this.cam.x = HB.lerp(this.cam.x, this.cam.tx, Math.min(1, dt * 5)); this.cam.y = HB.lerp(this.cam.y, this.cam.ty, Math.min(1, dt * 5)); if (this.cam.tzoom) this.cam.zoom = HB.lerp(this.cam.zoom, this.cam.tzoom, Math.min(1, dt * 5)); if (Math.abs(this.cam.x - this.cam.tx) < 0.02 && Math.abs(this.cam.y - this.cam.ty) < 0.02) { this.cam.tx = null; this.cam.tzoom = null; } }
      // follow during travel
      if (st.phase === 'traveling' || st.phase === 'returning') { this.cam.x = HB.lerp(this.cam.x, st.dragon.x + 0.5, Math.min(1, dt * 3)); this.cam.y = HB.lerp(this.cam.y, st.dragon.y + 0.5, Math.min(1, dt * 3)); }
      // pan
      if (!overUi) {
        if (ptr.down && ptr.dragging) { const z = CELL * this.cam.zoom; this.cam.x -= ptr.dx / z; this.cam.y -= ptr.dy / z; this.cam.tx = null; }
        if (ptr.wheel) this.zoomAt(ptr.x, ptr.y, Math.pow(1.18, -ptr.wheel));
        if (ptr.pinch) this.zoomAt(ptr.x, ptr.y, 1 + ptr.pinch);
      }
      const panSpeed = 14 / this.cam.zoom * dt;
      if (!this.ui.textFocus && !this.ui.focus) {
        if (inp.held('left')) this.cam.x -= panSpeed; if (inp.held('right')) this.cam.x += panSpeed;
        if (inp.held('up')) this.cam.y -= panSpeed; if (inp.held('down')) this.cam.y += panSpeed;
      }
      if (inp.pressed('zoomIn')) this.zoomAt(HB.W / 2, HB.H / 2, 1.3);
      if (inp.pressed('zoomOut')) this.zoomAt(HB.W / 2, HB.H / 2, 1 / 1.3);
      if (inp.usingGamepad()) { const sx = inp.stick(0), sy = inp.stick(1); if (sx || sy) { this.cam.x += sx * panSpeed * 1.2; this.cam.y += sy * panSpeed * 1.2; } const rx = inp.stick(3); if (Math.abs(rx) > 0.3) this.zoomAt(HB.W / 2, HB.H / 2, 1 - rx * dt); }
      const W = st.world;
      this.cam.x = HB.clamp(this.cam.x, -4, W.w + 4); this.cam.y = HB.clamp(this.cam.y, -4, W.h + 4);
      this.cam.zoom = HB.clamp(this.cam.zoom, 0.22, 3.2);
      // hover + click on locations and moving entities
      this.hoverEntity = overUi || !HB.worldsim ? null : HB.worldsim.entityAtScreen(this, st, ptr.x, ptr.y);
      this.hoverLoc = overUi || this.hoverEntity ? null : this.locationAtScreen(ptr.x, ptr.y);
      if (ptr.released && !ptr.dragging && !overUi && HB.dist(ptr.x, ptr.y, ptr.clickX, ptr.clickY) < 10) {
        if (this.hoverEntity) this.select(this.hoverEntity);
        else if (this.hoverLoc) this.select(this.hoverLoc);
        else if (!this.previewContains(ptr.x, ptr.y) && !HB.pointInRect(ptr.x, ptr.y, 14, 12, 330, 96) && !(this._alertRect && HB.pointInRect(ptr.x, ptr.y, this._alertRect.x, this._alertRect.y, this._alertRect.w, this._alertRect.h))) {
          // tap on empty map: offer to fly there and explore
          if (st.phase === 'home' || st.phase === 'planning' || st.phase === 'traveling' || st.phase === 'returning') { const w = this.screenToWorld(ptr.x, ptr.y); this.select(HB.travel.makePoint(st, w.x - 0.5, w.y - 0.5)); }
          else this.selected = null;
        }
      }
      if (this.selected && this.selected.kind && this.selected.dead) this.selected = null;
      if (inp.pressed('nextTarget')) this.cycleTarget();
      if (this.selected && inp.pressed('confirm') && !this.ui.focus) this.flyToSelected();
      // fog animation
      const F = this.fogAlpha, K = st.know.revealed;
      const RW = this.revealWash;
      if (this.pendingReveal.length) {
        if (RW) RW.add(this.pendingReveal, st.world.w, this.t, st.dragon.x + 0.5, st.dragon.y + 0.5); else for (const i of this.pendingReveal) this.revealAnim.add(i);
        this.pendingReveal.length = 0;
      }
      if (RW && RW.active()) { for (const i of RW.cells.keys()) F[i] = 1 - RW.progress(i, this.t); RW.prune(this.t); }
      else if (this.revealAnim && this.revealAnim.size) { const rate = dt * 1.6; for (const i of this.revealAnim) { F[i] -= rate; if (F[i] <= 0) { F[i] = 0; this.revealAnim.delete(i); } } }
      else if (this.frame % 30 === 0) { /* lazy sync: revealed cells cleared, rumoured cells sketched (e.g. after load or rumours) */ const R = st.know.rumor; for (let i = 0; i < F.length; i++) { if (K[i]) { if (F[i] > 0 && !this.revealAnim.has(i)) F[i] = 0; } else if (R[i] && F[i] > RUMOR_ALPHA) F[i] = RUMOR_ALPHA; } }
      // hunters caught up with you
      if (st.ambush && HB.scenes.top() === this) this.showAmbush();
      // the great struggle has begun: say so once, plainly
      if (st.endgame && st.endgame.path && st.endgame.announced === false && HB.scenes.top() === this) this.showStruggle();
      // travel / world ticks
      if (HB.travel && HB.travel.update) HB.travel.update(st, dt, this);
      if (HB.worldsim && HB.worldsim.tickRealtime) HB.worldsim.tickRealtime(st, dt);
      this.dragonFrameT += dt;
      if (this.toast && (this.toast.t -= dt) <= 0) this.toast = null;
    }
    get revealAnim() { if (!this._ra) this._ra = new Set(); return this._ra; }
    /** called by travel/world when cells are revealed */
    onReveal(res) { for (const i of res.cells) this.pendingReveal.push(i); this.invalidateChunksFor(res.cells); if (res.subs.length) { const S = this.state.world.subregions[res.subs[res.subs.length - 1]]; this.showToast(`You discover ${S.name}`); } for (const r of res.regions) this.showToast(`${this.state.world.regions[r].name} lies open before you`, 4); }
    invalidateChunksFor(cells) { const W = this.state.world; const seen = new Set(); for (const i of cells) { const cx = Math.floor((i % W.w) / CHUNK), cy = Math.floor(((i / W.w) | 0) / CHUNK); seen.add(cx + ',' + cy); } /* chunks render terrain regardless of fog, nothing to do */ }
    showToast(text, t = 2.6) { this.toast = { text, t, max: t }; }
    zoomAt(sx, sy, k) {
      const before = this.screenToWorld(sx, sy);
      this.cam.zoom = HB.clamp(this.cam.zoom * k, 0.22, 3.2); this.cam.tzoom = null;
      const after = this.screenToWorld(sx, sy);
      this.cam.x += before.x - after.x; this.cam.y += before.y - after.y;
    }
    locationAtScreen(sx, sy) {
      const st = this.state, W = st.world;
      const p = this.screenToWorld(sx, sy);
      const z = CELL * this.cam.zoom;
      let best = null, bd = Math.max(1.2, 18 / z);
      for (const L of W.locations) { if (!HB.world.known(L)) continue; const d = Math.hypot(L.x + 0.5 - p.x, L.y + 0.3 - p.y); if (d < bd) { bd = d; best = L; } }
      return best;
    }
    select(L) { this.selected = L; if (HB.audio) HB.audio.play('click'); }
    cycleTarget() {
      const st = this.state, W = st.world;
      const cands = W.locations.filter(L => HB.world.known(L) && L.type !== 'lair').map(L => ({ L, d: Math.hypot(L.x - st.dragon.x, L.y - st.dragon.y) })).sort((a, b) => a.d - b.d).map(c => c.L);
      if (!cands.length) return;
      const i = this.selected ? cands.indexOf(this.selected) : -1;
      this.selected = cands[(i + 1) % cands.length];
      this.centerOn(this.selected.x + 0.5, this.selected.y + 0.5);
    }
    flyToSelected() { if (!this.selected) return; if (HB.travel && HB.travel.begin) { const err = HB.travel.canBegin(this.state, this.selected); if (err) { this.showToast(err); return; } HB.travel.begin(this.state, this.selected, this); this.selected = null; } else this.showToast('Travel is not built yet.'); }

    // ---------- chunk cache
    chunkKey(cx, cy, lod) { return `${lod}:${cx},${cy}`; }
    getChunk(cx, cy, lod, budget) {
      const key = this.chunkKey(cx, cy, lod);
      let c = this.chunks.get(key);
      // a chunk drawn before the art pack's latest image arrived is redrawn when the budget allows; until then the old one shows
      if (c && (c.artRev === this._artRev || budget.n <= 0)) return c;
      if (!c && budget.n <= 0) return null;
      budget.n--;
      const fresh = !c;
      c = this.renderChunk(cx, cy, lod); c.artRev = this._artRev;
      this.chunks.set(key, c); if (fresh) this.chunkOrder.push(key);
      while (this.chunkOrder.length > this.maxChunks) { const k = this.chunkOrder.shift(); this.chunks.delete(k); }
      return c;
    }
    renderChunk(cx, cy, lod) {
      const st = this.state, W = st.world, A = HB.mapart;
      const cp = lod === 0 ? CELL : LOD1_CELL;
      const m = MARGIN; // both levels of detail keep a 2-cell margin so art that spills over a cell is not clipped
      const size = (CHUNK + 2 * m) * cp;
      const c = document.createElement('canvas'); c.width = size; c.height = size;
      const g = c.getContext('2d');
      A.setup(g);
      const rng = new HB.RNG(`chunk:${st.seed}:${cx},${cy}`);
      const x0 = cx * CHUNK, y0 = cy * CHUNK;
      const toPx = (wx, wy) => [(wx - x0 + m) * cp, (wy - y0 + m) * cp];
      const terrainAt = (x, y) => (x < 0 || y < 0 || x >= W.w || y >= W.h) ? T().DEEP : W.terrain[y * W.w + x];
      const land = (x, y) => HB.isLand(terrainAt(x, y));
      // roads, rivers, coasts and water stay procedural so they join up; an art pack may restyle them (HB.mapAssets.style)
      const SY = HB.mapAssets ? HB.mapAssets.style : { road: { color: A.INK, width: 1.2, laneWidth: 0.8, dash: [3, 3], alpha: 0.9, laneAlpha: 0.6 }, river: { color: A.WATER_INK, baseWidth: 0.8, perWidth: 0.6 }, coast: { color: A.INK, width: 1.5 }, water: { color: [105, 140, 170], alpha: 0.07, alphaPerDepth: 0.03 } };
      A.lineScale = lod === 0 ? 1 : 0.55;
      // --- water wash: painted at one pixel per cell and upscaled with smoothing so the edge follows the coast softly
      {
        const sw = CHUNK + 2 * m;
        const small = document.createElement('canvas'); small.width = sw; small.height = sw;
        const sg = small.getContext('2d');
        for (let y = y0 - m; y < y0 + CHUNK + m; y++) for (let x = x0 - m; x < x0 + CHUNK + m; x++) {
          const tt = terrainAt(x, y);
          if (HB.isLand(tt)) continue;
          const cd = (x < 0 || y < 0 || x >= W.w || y >= W.h) ? 6 : W.coastDist[y * W.w + x];
          sg.fillStyle = `rgba(${SY.water.color.join(',')},${SY.water.alpha + SY.water.alphaPerDepth * Math.min(cd, 5)})`;
          sg.fillRect(x - x0 + m, y - y0 + m, 1, 1);
        }
        // clip to the chunk core so overlapping margins do not double the wash
        g.save(); g.beginPath(); g.rect(m * cp, m * cp, CHUNK * cp, CHUNK * cp); g.clip(); g.imageSmoothingEnabled = true; g.drawImage(small, 0, 0, size, size); g.restore();
      }
      // --- waves near the coast
      for (let y = y0 - m; y < y0 + CHUNK + m; y++) for (let x = x0 - m; x < x0 + CHUNK + m; x++) {
        if (x < 0 || y < 0 || x >= W.w || y >= W.h) continue;
        const i = y * W.w + x; const tt = W.terrain[i];
        if (HB.isLand(tt)) continue;
        const cd = W.coastDist[i];
        const [pxx, pyy] = toPx(x, y);
        if (cd >= 1 && cd <= 5) {
          const n = lod === 0 ? (cd <= 2 ? 2 : cd <= 4 ? 1 : (rng.chance(0.5) ? 1 : 0)) : (cd <= 2 && rng.chance(0.4) ? 1 : 0);
          for (let k = 0; k < n; k++) { const wx = pxx + rng.next() * cp * 0.4, wy = pyy + (k + 0.5) * cp / (n + 0.2) + rng.next() * 2, wl = cp * (0.5 + rng.next() * 0.5), key = `w${x},${y}:${k}`; A.wave(g, wx, wy, wl, new HB.RNG(HB.hash32(`${st.seed}:${key}`)), 0.55 + (5 - cd) * 0.07, key); }
        }
      }
      // --- coastline via marching squares on corner samples (core cells only, with 1 cell margin for continuity)
      g.save(); g.beginPath(); g.rect(0, 0, size, size); g.clip();
      const corner = (x, y) => (land(x - 1, y - 1) + land(x, y - 1) + land(x - 1, y) + land(x, y)) >= 2 ? 1 : 0; // corner at top-left of cell (x,y)
      g.lineWidth = lod === 0 ? SY.coast.width : SY.coast.width * 0.67; g.strokeStyle = SY.coast.color;
      for (let y = y0 - m; y < y0 + CHUNK + m; y++) for (let x = x0 - m; x < x0 + CHUNK + m; x++) {
        const tl = corner(x, y), tr = corner(x + 1, y), br = corner(x + 1, y + 1), bl = corner(x, y + 1);
        const code = tl * 8 + tr * 4 + br * 2 + bl;
        if (code === 0 || code === 15) continue;
        const [X, Y] = toPx(x, y);
        const jx = () => (rng.next() - 0.5) * cp * 0.3, jy = () => (rng.next() - 0.5) * cp * 0.3;
        const top = [X + cp / 2 + jx(), Y], right = [X + cp, Y + cp / 2 + jy()], bottom = [X + cp / 2 + jx(), Y + cp], left = [X, Y + cp / 2 + jy()];
        const seg = (a, b) => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
        switch (code) {
          case 1: case 14: seg(left, bottom); break;
          case 2: case 13: seg(bottom, right); break;
          case 3: case 12: seg(left, right); break;
          case 4: case 11: seg(top, right); break;
          case 5: seg(left, top); seg(bottom, right); break;
          case 6: case 9: seg(top, bottom); break;
          case 7: case 8: seg(left, top); break;
          case 10: seg(top, right); seg(left, bottom); break;
        }
      }
      g.restore();
      // --- rivers (clipped to core)
      g.save(); g.beginPath(); g.rect(m * cp, m * cp, CHUNK * cp, CHUNK * cp); g.clip();
      g.strokeStyle = SY.river.color; g.lineCap = 'round'; g.lineJoin = 'round';
      for (const R of W.rivers) {
        let inside = false; for (const [rx, ry] of R.cells) if (rx >= x0 - 1 && rx < x0 + CHUNK + 1 && ry >= y0 - 1 && ry < y0 + CHUNK + 1) { inside = true; break; }
        if (!inside) continue;
        for (let k = 0; k < R.cells.length - 1; k++) {
          const [ax, ay] = R.cells[k], [bx, by] = R.cells[k + 1];
          const width = W.river[ay * W.w + ax] || 1;
          const [pax, pay] = toPx(ax + 0.5, ay + 0.5), [pbx, pby] = toPx(bx + 0.5, by + 0.5);
          g.lineWidth = lod === 0 ? SY.river.baseWidth + width * SY.river.perWidth : (SY.river.baseWidth + width * SY.river.perWidth) * 0.6;
          g.beginPath(); g.moveTo(pax, pay); g.quadraticCurveTo((pax + pbx) / 2 + (rng.next() - 0.5) * cp * 0.5, (pay + pby) / 2 + (rng.next() - 0.5) * cp * 0.5, pbx, pby); g.stroke();
        }
      }
      // --- roads (dashed, clipped to core)
      g.strokeStyle = SY.road.color; g.setLineDash(lod === 0 ? SY.road.dash : SY.road.dash.map(v => v * 0.67));
      for (const R of W.roads) {
        let inside = false; for (const [rx, ry] of R.cells) if (rx >= x0 - 1 && rx < x0 + CHUNK + 1 && ry >= y0 - 1 && ry < y0 + CHUNK + 1) { inside = true; break; }
        if (!inside) continue;
        g.lineWidth = R.lane ? SY.road.laneWidth : SY.road.width; g.globalAlpha = R.lane ? SY.road.laneAlpha : SY.road.alpha;
        g.beginPath();
        for (let k = 0; k < R.cells.length; k++) { const [ax, ay] = R.cells[k]; const [pax, pay] = toPx(ax + 0.5, ay + 0.5); if (k === 0) g.moveTo(pax, pay); else g.lineTo(pax, pay); }
        g.stroke();
      }
      g.setLineDash([]); g.globalAlpha = 1;
      g.restore();
      // --- terrain glyphs: gather per cell then draw sorted by y for overlap
      const glyphs = [];
      for (let y = y0; y < y0 + CHUNK; y++) for (let x = x0; x < x0 + CHUNK; x++) {
        if (x < 0 || y < 0 || x >= W.w || y >= W.h) continue;
        const i = y * W.w + x; const tt = W.terrain[i];
        if (!HB.isLand(tt)) continue;
        if (W.locAt[i] >= 0) continue; // keep the cell clear for its icon
        const [X, Y] = toPx(x, y);
        const cellRng = new HB.RNG(HB.hash32(`${st.seed}:${x},${y}`));
        // each glyph gets its own drawing-only random stream and a stable key (art-pack variant choice): placement above
        // uses cellRng; drawing never consumes it, so replacing one glyph's art cannot shift any other glyph
        let gi = 0;
        const push = (yy, fn) => { const key = `${x},${y}:${gi++}`; glyphs.push({ y: yy, fn, key, rng: new HB.RNG(HB.hash32(`${st.seed}:v:${key}`)) }); };
        const mk = this.mark ? this.mark[i] : 0; // < 0 blighted by tyranny, > 0 flourishing under a protector
        if (mk < 0 && lod === 0 && (tt === T().MOUNTAINS || tt === T().PEAKS)) {
          const w = cp * (tt === T().PEAKS ? 1.6 : 1.2 + cellRng.next() * 0.3), h = cp * (tt === T().PEAKS ? 1.5 : 0.9 + cellRng.next() * 0.4);
          const gx = X + cp * (0.5 + (cellRng.next() - 0.5) * 0.2), gy = Y + cp * 0.9;
          push(gy, (g, vr, key) => A.mountainJagged(g, gx, gy, w, h, vr, { key, deep: mk <= -2, big: tt === T().PEAKS }));
          continue;
        }
        if (mk < 0 && (tt === T().FOREST || tt === T().PINE)) {
          const n = lod === 0 ? 2 : 1;
          for (let k = 0; k < n; k++) { const gx = X + cp * (0.2 + cellRng.next() * 0.6), gy = Y + cp * (0.35 + cellRng.next() * 0.6), s = cp * (lod === 0 ? 0.17 : 0.26); push(gy, (g, vr, key) => (mk <= -2 || vr.chance(0.4) ? A.treeBurned : A.treeBare)(g, gx, gy, s, vr, key)); }
          if (mk <= -2 && lod === 0) { const gx = X + cp * 0.5, gy = Y + cp * 0.8; push(gy, (g, vr, key) => A.ash(g, gx, gy, cp * 0.3, vr, key)); }
          continue;
        }
        if (mk <= -2 && lod === 0 && (tt === T().PLAINS || tt === T().HILLS) && cellRng.chance(0.55)) { const gx = X + cp * (0.3 + cellRng.next() * 0.4), gy = Y + cp * (0.4 + cellRng.next() * 0.4); push(gy, (g, vr, key) => A.ash(g, gx, gy, cp * 0.3, vr, key)); if (tt === T().PLAINS) continue; }
        if (mk > 0 && lod === 0 && tt === T().PLAINS && cellRng.chance(mk >= 2 ? 0.55 : 0.3)) { const gx = X + cp * (0.3 + cellRng.next() * 0.4), gy = Y + cp * (0.4 + cellRng.next() * 0.4); push(gy, (g, vr, key) => A.field(g, gx, gy, cp * 0.28, vr, key)); continue; }
        if (mk > 0 && lod === 0 && (tt === T().FOREST || tt === T().PINE)) {
          const n = 3, pine = tt === T().PINE;
          for (let k = 0; k < n; k++) { const gx = X + cp * (0.2 + cellRng.next() * 0.6), gy = Y + cp * (0.35 + cellRng.next() * 0.6); const s = cp * (pine ? 0.16 : 0.19) * (0.9 + cellRng.next() * 0.3); const fleck = mk >= 2 && cellRng.chance(0.35); push(gy, (g, vr, key) => { pine ? A.treePine(g, gx, gy, s, vr, key) : A.treeRound(g, gx, gy, s, vr, key); if (fleck) A.blossom(g, gx + s * 0.3, gy - s * (pine ? 1.4 : 1.1), s, key + 'b'); }); }
          continue;
        }
        if (lod === 1) {
          // simplified overview glyphs: sparser and smaller
          if (tt === T().PEAKS || (tt === T().MOUNTAINS && cellRng.chance(0.55))) { const gx = X + cp * 0.5, gy = Y + cp * 0.95; const w = cp * (tt === T().PEAKS ? 1.9 : 1.5), h = cp * (tt === T().PEAKS ? 1.7 : 1.1); push(gy, (g, vr, key) => A.mountain(g, gx, gy, w, h, vr, { key, snow: tt === T().PEAKS })); }
          else if (tt === T().HILLS && cellRng.chance(0.4)) { const gx = X + cp * 0.5, gy = Y + cp * 0.8; push(gy, (g, vr, key) => A.hill(g, gx, gy, cp * 1.1, cp * 0.3, vr, key)); }
          else if ((tt === T().FOREST || tt === T().PINE) && cellRng.chance(0.42)) { const gx = X + cp * 0.5, gy = Y + cp * 0.8; const s = cp * 0.26; push(gy, (g, vr, key) => tt === T().PINE ? A.treePine(g, gx, gy, s * 0.8, vr, key) : A.treeRound(g, gx, gy, s, vr, key)); }
          else if (tt === T().SWAMP && cellRng.chance(0.3)) { const gx = X + cp * 0.5, gy = Y + cp * 0.7; push(gy, (g, vr, key) => A.swampTuft(g, gx, gy, cp * 0.25, vr, key)); }
          continue;
        }
        if (tt === T().MOUNTAINS || tt === T().PEAKS) {
          const peaks = tt === T().PEAKS ? 1 : (cellRng.chance(0.5) ? 2 : 1);
          for (let k = 0; k < peaks; k++) {
            const w = cp * (tt === T().PEAKS ? 1.5 : 1.05 + cellRng.next() * 0.35), h = cp * (tt === T().PEAKS ? 1.45 : 0.75 + cellRng.next() * 0.45);
            const gx = X + cp * (0.5 + (peaks === 2 ? (k ? 0.3 : -0.3) : 0) + (cellRng.next() - 0.5) * 0.3), gy = Y + cp * (0.85 + (cellRng.next() - 0.5) * 0.4);
            const snow = tt === T().PEAKS || W.temp[i] < 0.3;
            push(gy, (g, vr, key) => A.mountain(g, gx, gy, w, h, vr, { key, snow, big: tt === T().PEAKS }));
          }
        } else if (tt === T().HILLS) {
          const n = cellRng.chance(0.6) ? 2 : 1;
          for (let k = 0; k < n; k++) { const gx = X + cp * (0.5 + (n === 2 ? (k ? 0.28 : -0.28) : 0)), gy = Y + cp * (0.7 + cellRng.next() * 0.3 + (k ? 0.15 : 0)); const w = cp * (0.7 + cellRng.next() * 0.3), h = cp * (0.22 + cellRng.next() * 0.1); push(gy, (g, vr, key) => A.hill(g, gx, gy, w, h, vr, key)); }
        } else if (tt === T().FOREST || tt === T().PINE) {
          const n = cellRng.chance(0.25) ? 3 : cellRng.chance(0.8) ? 2 : 1;
          const pine = tt === T().PINE;
          for (let k = 0; k < n; k++) { const gx = X + cp * (0.2 + cellRng.next() * 0.6), gy = Y + cp * (0.35 + cellRng.next() * 0.6); const s = cp * (pine ? 0.15 : 0.17) * (0.85 + cellRng.next() * 0.3); push(gy, (g, vr, key) => pine ? A.treePine(g, gx, gy, s, vr, key) : A.treeRound(g, gx, gy, s, vr, key)); }
        } else if (tt === T().SWAMP) {
          const n = lod === 0 ? 2 : 1;
          for (let k = 0; k < n; k++) { const gx = X + cp * (0.2 + cellRng.next() * 0.6), gy = Y + cp * (0.3 + cellRng.next() * 0.6); push(gy, (g, vr, key) => A.swampTuft(g, gx, gy, cp * 0.18, vr, key)); }
        } else if (tt === T().DESERT) {
          if (cellRng.chance(0.6)) { const gx = X + cp * 0.5, gy = Y + cp * (0.4 + cellRng.next() * 0.4); push(gy, (g, vr, key) => A.dune(g, gx, gy, cp * 0.4, vr, key)); }
        } else if (tt === T().SNOW) {
          if (cellRng.chance(0.5)) { const gx = X + cp * 0.5, gy = Y + cp * 0.5; push(gy, (g, vr, key) => A.snowDots(g, gx, gy, cp * 0.35, vr, key)); }
        } else if (tt === T().PLAINS) {
          if (lod === 0 && cellRng.chance(0.14)) { const gx = X + cp * (0.3 + cellRng.next() * 0.4), gy = Y + cp * (0.4 + cellRng.next() * 0.5); push(gy, (g, vr, key) => A.grassTuft(g, gx, gy, cp * 0.14, vr, key)); }
        }
      }
      glyphs.sort((a, b) => a.y - b.y);
      for (const gl of glyphs) gl.fn(g, gl.rng, gl.key);
      A.lineScale = 1;
      return c;
    }

    // ---------- draw
    draw(ctx) {
      const st = this.state, W = st.world, cam = this.cam;
      const z = CELL * cam.zoom;
      const lod = cam.zoom < 0.55 ? 1 : 0;
      const cp = lod === 0 ? CELL : LOD1_CELL;
      const m = MARGIN;
      HB.parchment.fill(ctx, 0, 0, HB.W, HB.H);
      // an art pack finished loading an image (or changed): chunks drawn with the old art (or its fallback) are redrawn,
      // a few per frame, showing the old ones meanwhile (no blank flash); the wash rebuilds itself on a new revision
      if (HB.mapAssets && this._artRev !== HB.mapAssets.revision) this._artRev = HB.mapAssets.revision;
      // visible cell range
      const tl = this.screenToWorld(0, 0), br = this.screenToWorld(HB.W, HB.H);
      const cx0 = Math.max(0, Math.floor(tl.x / CHUNK)), cx1 = Math.min(Math.ceil(W.w / CHUNK) - 1, Math.floor(br.x / CHUNK));
      const cy0 = Math.max(0, Math.floor(tl.y / CHUNK)), cy1 = Math.min(Math.ceil(W.h / CHUNK) - 1, Math.floor(br.y / CHUNK));
      const budget = { n: 3 };
      const scale = z / cp;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        // skip chunks that are entirely fogged
        if (this.chunkFullyFogged(cx, cy)) continue;
        const c = this.getChunk(cx, cy, lod, budget);
        if (!c) continue;
        const p = this.worldToScreen(cx * CHUNK - m, cy * CHUNK - m);
        ctx.drawImage(c, p.x, p.y, c.width * scale, c.height * scale);
      }
      ctx.restore();
      if (this.showChunkEdges) this.drawChunkEdges(ctx, cx0, cx1, cy0, cy1);
      // world edge: beyond the map, waves
      this.drawWorldEdge(ctx);
      // the dragon's territory: a light wash, under the ink
      if (this.frame % 20 === 0) this.syncDomain();
      this.drawTerritory(ctx);
      // locations
      this.drawLocations(ctx, tl, br);
      this.drawDomainMarks(ctx, tl, br);
      // entities
      if (HB.worldsim && HB.worldsim.drawEntities) HB.worldsim.drawEntities(ctx, this, st);
      // route preview / travel path
      if (HB.travel && HB.travel.draw) HB.travel.draw(ctx, this, st);
      // dragon
      this.drawDragon(ctx);
      // fog
      this.drawFog(ctx, tl, br);
      this.drawHazyPlaces(ctx, tl, br);
      this.drawThreats(ctx, tl, br);
      this.drawStoryMarks(ctx, tl, br);
      this.drawStruggleMarks(ctx, tl, br);
      // labels
      this.drawLabels(ctx, tl, br);
      // selection ring / hover
      this.drawSelection(ctx);
      // vignette + border
      HB.parchment.vignette(ctx, 0, 0, HB.W, HB.H, 0.35);
      HB.parchment.border(ctx, 6, 6, HB.W - 12, HB.H - 12, { width: 2, flourish: 12 });
      HB.mapart.compassRose(ctx, HB.W - 70, 92, 34);
      // HUD
      this.drawHud(ctx);
      this.drawTerritoryKey(ctx);
      if (this.selected) this.drawPreview(ctx);
      this.ui.draw(ctx);
      if (this.toast) this.drawToast(ctx);
      if (HB.debugMode) HB.text.draw(ctx, `fps ${HB.app.fps.toFixed(0)} zoom ${cam.zoom.toFixed(2)} cam ${cam.x.toFixed(1)},${cam.y.toFixed(1)} chunks ${this.chunks.size}${HB.mapAssets ? ` · map art ${HB.mapAssets.packName} r${HB.mapAssets.revision} ${HB.mapAssets.entries.size} ids${HB.mapAssets.warnings.length ? `, ${HB.mapAssets.warnings.length} warnings (console)` : ''}` : ''}`, 12, HB.H - 60, { size: 12, color: HB.palette.inkSoft });
    }
    chunkFullyFogged(cx, cy) {
      const W = this.state.world, F = this.fogAlpha;
      const x0 = cx * CHUNK - 1, y0 = cy * CHUNK - 1;
      for (let y = y0; y < y0 + CHUNK + 2; y++) for (let x = x0; x < x0 + CHUNK + 2; x++) { if (x < 0 || y < 0 || x >= W.w || y >= W.h) continue; if (F[y * W.w + x] < 1) return false; }
      return true;
    }
    drawWorldEdge(ctx) {
      const W = this.state.world;
      const a = this.worldToScreen(0, 0), b = this.worldToScreen(W.w, W.h);
      ctx.save(); ctx.strokeStyle = HB.palette.inkFaint; ctx.lineWidth = 1; ctx.setLineDash([6, 6]); ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); ctx.restore();
    }
    drawLocations(ctx, tl, br) {
      const st = this.state, W = st.world, cam = this.cam, z = CELL * cam.zoom;
      const s = Math.max(4, Math.min(12, 10 * Math.sqrt(cam.zoom)));
      for (const L of W.locations) {
        if (L.x < tl.x - 3 || L.x > br.x + 3 || L.y < tl.y - 3 || L.y > br.y + 3) continue;
        const i = L.y * W.w + L.x;
        if (this.fogAlpha[i] >= 0.7) continue;
        const p = this.worldToScreen(L.x + 0.5, L.y + 0.85);
        const rng = new HB.RNG(HB.hash32('loc' + L.id));
        ctx.save();
        if (this.fogAlpha[i] > 0) ctx.globalAlpha *= 1 - this.fogAlpha[i];
        const f = L.factionId >= 0 ? W.factions[L.factionId] : null;
        const tierScale = L.type === 'farm' ? 0.75 : L.type === 'city' ? 1.15 : L.type === 'hold' || L.type === 'rivalLair' ? 1.1 : 1;
        const minor = L.type === 'farm' || L.type === 'camp' || L.type === 'mine' || L.type === 'shrine' || L.type === 'monastery' || L.type === 'ruin' || L.type === 'tower';
        if ((cam.zoom < 0.55 && minor) || (cam.zoom < 0.38 && L.type === 'village')) { ctx.fillStyle = HB.palette.ink; ctx.beginPath(); ctx.arc(p.x, p.y - 2, L.type === 'village' ? 2 : 1.3, 0, Math.PI * 2); ctx.fill(); ctx.restore(); continue; }
        HB.mapart.settlement(ctx, L, p.x, p.y, s * tierScale, rng, { flagColor: f ? f.color : undefined });
        ctx.restore();
      }
    }
    /** places known by rumour (or glimpsed) that still sit under the clouds: faint ink marks you can fly to */
    drawHazyPlaces(ctx, tl, br) {
      const st = this.state, W = st.world, cam = this.cam;
      const s = Math.max(4, Math.min(11, 9 * Math.sqrt(cam.zoom)));
      for (const L of W.locations) {
        if (!HB.world.known(L) || L.type === 'lair') continue;
        if (L.x < tl.x - 3 || L.x > br.x + 3 || L.y < tl.y - 3 || L.y > br.y + 3) continue;
        if (this.fogAlpha[L.y * W.w + L.x] < 0.7) continue;
        const p = this.worldToScreen(L.x + 0.5, L.y + 0.85);
        ctx.save();
        if (L.knowledge.seen) { ctx.globalAlpha *= 0.75; HB.mapart.settlement(ctx, L, p.x, p.y, s, new HB.RNG(HB.hash32('loc' + L.id))); }
        else {
          ctx.globalAlpha *= 0.8;
          HB.mapart.rumorMark(ctx, p.x, p.y, s, 'loc' + L.id);
        }
        ctx.restore();
      }
    }
    /** map-art preview (&chunks=1): thin lines on chunk edges, to check art crossing them for seams or cropping */
    drawChunkEdges(ctx, cx0, cx1, cy0, cy1) {
      ctx.save(); ctx.strokeStyle = 'rgba(30,120,170,0.55)'; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
      for (let cx = cx0; cx <= cx1 + 1; cx++) { const p = this.worldToScreen(cx * CHUNK, 0); ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, HB.H); ctx.stroke(); }
      for (let cy = cy0; cy <= cy1 + 1; cy++) { const p = this.worldToScreen(0, cy * CHUNK); ctx.beginPath(); ctx.moveTo(0, p.y); ctx.lineTo(HB.W, p.y); ctx.stroke(); }
      ctx.restore();
    }
    drawDragon(ctx) {
      const st = this.state, d = st.dragon, sc = this.showcase;
      // the map-art preview flies the dragon in a circle (drawing only: the campaign's dragon stays at home)
      const a = sc ? this.t * 0.35 : 0, facing = sc ? (Math.cos(a) <= 0 ? 1 : -1) : d.facing;
      const p = sc ? this.worldToScreen(sc.x + Math.cos(a) * sc.r, sc.y + Math.sin(a) * sc.r * 0.6) : this.worldToScreen(d.x + 0.5, d.y + 0.5);
      const spec = HB.dragonArt.specOf(st);
      const flying = !!sc || st.phase === 'traveling' || st.phase === 'returning';
      const pose = flying ? 'fly' : (st.phase === 'sleeping' ? 'sleep' : 'idle');
      const frame = flying ? Math.floor(this.dragonFrameT * 8) % 4 : Math.floor(this.dragonFrameT * 1.5) % 2;
      const scale = HB.clamp(this.cam.zoom * 1.1, 0.9, 2.2) * (flying ? 1 : 0.9);
      // shadow
      ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#2b1a0e'; ctx.beginPath(); ctx.ellipse(p.x + 6 * scale, p.y + (flying ? 16 : 8) * scale, 10 * scale * (1 + d.tier * 0.5), 4 * scale * (1 + d.tier * 0.5), 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      const bobY = flying ? Math.sin(this.dragonFrameT * 6) * 2 : 0;
      HB.dragonArt.draw(ctx, spec, pose, frame, p.x, p.y - (flying ? 10 : 2) * scale + bobY, scale, facing);
    }
    drawFog(ctx, tl, br) {
      const st = this.state, W = st.world, F = this.fogAlpha, cam = this.cam, z = CELL * cam.zoom, RW = this.revealWash;
      const step = cam.zoom < 0.4 ? 4 : cam.zoom < 0.8 ? 2 : 1;
      const x0 = Math.max(0, Math.floor(tl.x) - 2), x1 = Math.min(W.w - 1, Math.ceil(br.x) + 2), y0 = Math.max(0, Math.floor(tl.y) - 2), y1 = Math.min(W.h - 1, Math.ceil(br.y) + 2);
      const A = HB.mapart;
      ctx.save();
      // mist fill
      const mistRng = new HB.RNG(1);
      const dragonTier = st.dragon.tier + (st.dragon.stats ? st.dragon.stats.gatePass || 0 : 0);
      // pass 1: fills — untouched parchment (same pattern as the background, so the unexplored world is blank paper)
      for (let y = y0; y <= y1; y += step) for (let x = x0; x <= x1; x += step) {
        const i = y * W.w + x; const a = F[i];
        if (a <= 0 || (RW && step === 1 && RW.revealing(i))) continue;
        const p = this.worldToScreen(x, y);
        const rid = W.region[i];
        const storm = rid >= 0 && W.regions[rid].tier > dragonTier;
        ctx.globalAlpha = a;
        ctx.fillStyle = HB.parchment.pattern;
        ctx.fillRect(p.x - 1, p.y - 1, z * step + 2, z * step + 2);
        ctx.fillStyle = storm ? 'rgba(90,80,70,0.22)' : 'rgba(255,250,235,0.22)';
        ctx.fillRect(p.x - 1, p.y - 1, z * step + 2, z * step + 2);
      }
      // the reveal wash: blank paper dissolving off newly revealed land along a soft irregular edge, a thin warm wash
      // at the wet edge (cell by cell in the far views, where the fill above already fades)
      if (RW && step === 1 && RW.active()) {
        ctx.globalAlpha = 1;
        RW.draw(ctx, this.t, (x, y) => this.worldToScreen(x, y), (i) => st.know.revealed[i] && !RW.revealing(i), (g, x, y, w, h) => { g.fillStyle = HB.parchment.pattern; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,250,235,0.22)'; g.fillRect(x, y, w, h); });
      }
      // pass 2: cloud puffs on the boundary + sparse interior puffs
      const puffR = z * 0.75 * step;
      for (let y = y0; y <= y1; y += step) for (let x = x0; x <= x1; x += step) {
        const i = y * W.w + x;
        // clouds over land being revealed clear early, so the wash's bleeding edge shows
        const a = RW && RW.revealing(i) ? HB.clamp((F[i] - 0.6) / 0.4, 0, 1) : F[i];
        if (a <= 0.02) continue;
        const rid = W.region[i];
        const storm = rid >= 0 && W.regions[rid].tier > dragonTier;
        // an edge: revealed land next door, or the storm wall itself (fogged land on either side of it)
        let edge = false;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx * step, ny = y + dy * step; if (nx < 0 || ny < 0 || nx >= W.w || ny >= W.h) continue; const ni = ny * W.w + nx; if (F[ni] < 0.5 || (RW && RW.revealing(ni))) { edge = true; break; } if (storm && HB.isLand(W.terrain[ni])) { const rn = W.region[ni]; if (rn >= 0 && W.regions[rn].tier <= dragonTier) { edge = true; break; } } }
        const cf = this.cloudField;
        const interior = !edge && ((x * 7 + y * 13) % 5 === 0);
        if (!edge && !interior) continue;
        const p = this.worldToScreen(x + 0.5 + cf[i * 3] * step, y + 0.5 + cf[i * 3 + 1] * step);
        const prng = new HB.RNG(i);
        ctx.globalAlpha = a * (edge ? 0.95 : 0.6);
        A.cloud(ctx, p.x, p.y, puffR * cf[i * 3 + 2], prng, { fill: storm ? '#b9ad8e' : '#efe6cc', outline: edge, alpha: storm ? 0.9 : 0.55, ink: storm ? '#3a2a1a' : A.INK, storm, key: 'fog' + i });
        if (storm && edge && prng.chance(0.25)) A.lightning(ctx, p.x, p.y + puffR * 0.6, puffR * 0.5, prng, 'bolt' + i);
      }
      ctx.restore();
    }
    drawLabels(ctx, tl, br) {
      const st = this.state, W = st.world, cam = this.cam, z = CELL * cam.zoom;
      const placed = [];
      const tryPlace = (x, y, w, h) => { const r = { x: x - w / 2, y: y - h, w, h }; for (const q of placed) if (HB.rectsOverlap(r, q)) return false; placed.push(r); return true; };
      const P = HB.palette;
      ctx.save();
      // region names
      for (const R of W.regions) {
        if (!st.know.regionSeen[R.id]) continue;
        if (R.cx < tl.x - 20 || R.cx > br.x + 20 || R.cy < tl.y - 10 || R.cy > br.y + 10) continue;
        const p = this.worldToScreen(R.cx, R.cy);
        const size = HB.clamp(26 * Math.sqrt(cam.zoom), 16, 44);
        const text = R.name.toUpperCase();
        const w = HB.text.width(text, size, { family: 'display', spacing: size * 0.35 });
        if (!tryPlace(p.x, p.y, w + 10, size * 1.2)) continue;
        HB.text.draw(ctx, text, p.x, p.y, { size, family: 'display', align: 'center', spacing: size * 0.35, color: 'rgba(43,26,14,0.55)', stroke: 'rgba(240,228,200,0.6)', strokeWidth: 3 });
      }
      // subregion names
      if (cam.zoom > 0.45) for (const S of W.subregions) {
        if (!st.know.subSeen[S.id]) continue;
        if (S.cx < tl.x - 8 || S.cx > br.x + 8 || S.cy < tl.y - 4 || S.cy > br.y + 4) continue;
        const p = this.worldToScreen(S.cx, S.cy);
        const size = HB.clamp(13 * Math.sqrt(cam.zoom), 11, 20);
        const w = HB.text.width(S.name, size, { italic: true, spacing: 1.2 });
        if (!tryPlace(p.x, p.y, w + 8, size * 1.3)) continue;
        HB.text.draw(ctx, S.name, p.x, p.y, { size, italic: true, align: 'center', spacing: 1.2, color: 'rgba(43,26,14,0.7)', stroke: 'rgba(240,228,200,0.55)', strokeWidth: 2.5 });
      }
      // location names
      const minTier = cam.zoom < 0.45 ? 3 : cam.zoom < 0.8 ? 2 : cam.zoom < 1.3 ? 1 : 0;
      const locs = W.locations.filter(L => HB.world.known(L) && L.x >= tl.x - 3 && L.x <= br.x + 3 && L.y >= tl.y - 2 && L.y <= br.y + 2);
      locs.sort((a, b) => (b.tier + (b.type === 'lair' ? 9 : 0)) - (a.tier + (a.type === 'lair' ? 9 : 0)));
      for (const L of locs) {
        const important = L.type === 'lair' || L.type === 'city' || L.type === 'hold' || L.type === 'rivalLair' || L.capital;
        if (!important && L.tier < minTier) continue;
        if (L.type === 'farm' && cam.zoom < 1.3) continue;
        const p = this.worldToScreen(L.x + 0.5, L.y + 1.0);
        const lo = HB.mapAssets ? HB.mapAssets.labelOffset(L) : null; // an art pack may move a place's label (logical px at zoom 1)
        if (lo) { const k = HB.clamp(10 * Math.sqrt(cam.zoom), 4, 12) / 10; p.x += lo[0] * k; p.y += lo[1] * k; }
        const size = HB.clamp((L.type === 'city' ? 15 : L.type === 'town' || L.type === 'castle' || L.type === 'hold' ? 13 : 11.5) * Math.sqrt(cam.zoom), 10, 20);
        const sc = L.type === 'city' || L.type === 'hold' || L.type === 'lair';
        const hazy = !L.knowledge.seen || this.fogAlpha[L.y * W.w + L.x] >= 0.5;
        const label = L.knowledge.seen ? L.name : `${L.name}?`;
        const w = HB.text.width(label, size, { family: sc ? 'sc' : 'body', italic: hazy });
        if (!tryPlace(p.x, p.y + size, w + 6, size * 1.25)) continue;
        HB.text.draw(ctx, label, p.x, p.y + size, { size, family: sc && !hazy ? 'sc' : 'body', italic: hazy, align: 'center', color: hazy ? 'rgba(43,26,14,0.62)' : L.state === 'ruin' || L.state === 'abandoned' ? P.inkSoft : P.ink, stroke: 'rgba(240,228,200,0.75)', strokeWidth: 2.5 });
      }
      ctx.restore();
    }
    drawSelection(ctx) {
      const cam = this.cam, z = CELL * cam.zoom;
      for (const [L, kind] of [[this.hoverLoc || this.hoverEntity, 'hover'], [this.selected, 'sel']]) {
        if (!L) continue;
        const p = this.worldToScreen(L.x + 0.5, L.y + 0.5);
        ctx.save(); ctx.strokeStyle = kind === 'sel' ? HB.palette.focus : HB.palette.inkSoft; ctx.lineWidth = kind === 'sel' ? 2.5 : 1.5; ctx.setLineDash(kind === 'sel' ? [] : [4, 3]);
        const r = Math.max(12, z * 0.9) + (kind === 'sel' ? Math.sin(this.t * 4) * 2 : 0);
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
    }
    drawHud(ctx) {
      const st = this.state, d = st.dragon, s = d.stats, P = HB.palette;
      // top-left status plaque
      const x = 14, y = 12, w = 330, h = 96;
      HB.parchment.panel(ctx, x, y, w, h, { shadow: true, stains: false, vignette: 0.1, flourish: 0 });
      HB.text.draw(ctx, d.name, x + 14, y + 28, { size: 22, family: 'sc', color: P.ink, maxWidth: w - 150 });
      const title = HB.renown ? HB.renown.primary(st) : null;
      HB.text.draw(ctx, [title ? title.name : null, HB.TIERS[d.tier].name, HB.game.ageString(st)].filter(Boolean).join(' · '), x + 14, y + 46, { size: 13, italic: true, color: title ? P.good : P.inkSoft, maxWidth: w - 28 });
      HB.text.draw(ctx, HB.game.dateString(st), x + w - 14, y + 28, { size: 14, align: 'right', color: P.inkSoft });
      // meters
      const mw = (w - 40) / 2;
      drawMeter(ctx, x + 14, y + 58, mw, 14, d.health, s.maxHealth, '#8f2b1f', 'Health');
      drawMeter(ctx, x + 26 + mw, y + 58, mw, 14, d.stamina, s.maxStamina, '#3f6d3a', 'Stamina');
      const cargoW = HB.game.cargoWeight(st);
      drawMeter(ctx, x + 14, y + 76, mw, 14, cargoW, s.capacity, '#9c6b1c', 'Cargo');
      HB.text.draw(ctx, `Hoard ${HB.fmt.int(HB.game.hoardValue(st))}g`, x + 26 + mw + mw / 2, y + 87, { size: 13, align: 'center', family: 'sc', color: P.ink });
      // alerts: riders on your trail, hunters closing in
      const alerts = [];
      if (HB.pursuit && st.pursuit) alerts.push(HB.pursuit.short(st));
      for (const e of st.entities) if (e.kind === 'hunters' && !e.dead) { const dd = Math.round(Math.hypot(e.x - d.x, e.y - d.y)); alerts.push(`${HB.fmt.cap(e.name)} ${dd <= 2 ? 'are upon you' : `are ${dd} leagues away`}: ${e.reason}.`); }
      if (alerts.length) {
        const ay = 114 + (this.goalPanel ? this.goalPanel.h : 92) + 8, aw = 330;
        const hs = alerts.slice(0, 3).map(a => HB.text.paragraphHeight(ctx, a, aw - 28, { size: 13, lineHeight: 16 }));
        const ah = 16 + hs.reduce((a, b) => a + b + 4, 0);
        this._alertRect = { x: 14, y: ay, w: aw, h: ah };
        HB.parchment.panel(ctx, 14, ay, aw, ah, { shadow: true, stains: false, vignette: 0.2, flourish: 0 });
        ctx.save(); ctx.strokeStyle = '#8f2b1f'; ctx.lineWidth = 2; HB.parchment.roundRect(ctx, 16, ay + 2, aw - 4, ah - 4, 4); ctx.stroke(); ctx.restore();
        let yy = ay + 8; alerts.slice(0, 3).forEach((a, i) => { HB.text.paragraph(ctx, a, 28, yy, aw - 28, { size: 13, lineHeight: 16, color: '#7a2418' }); yy += hs[i] + 4; });
      } else this._alertRect = null;
      // debug toggles in force: say so, so a test campaign is never mistaken for a real one
      if (HB.cheats && HB.cheats.any(st)) HB.text.draw(ctx, `Debug: ${HB.cheats.active(st).join(', ')}`, HB.W / 2, 26, { size: 14, italic: true, align: 'center', color: '#8f2b1f', stroke: 'rgba(240,228,200,0.85)', strokeWidth: 3 });
      // phase hint
      const tap = HB.input.lastDevice === 'touch' ? 'Tap' : 'Click';
      const hint = st.phase === 'home' || st.phase === 'planning' ? (HB.settings.hints ? `${tap} a place to inspect it, or ${tap.toLowerCase()} anywhere to fly there and explore. Dotted ring: how far your stamina carries you.` : '') : st.phase === 'traveling' ? 'Flying… Shift speeds up, P pauses.' : st.phase === 'returning' ? 'Returning home with cargo.' : '';
      if (hint) HB.text.draw(ctx, hint, HB.W / 2, HB.H - 60, { size: 14, italic: true, align: 'center', color: P.inkSoft, stroke: 'rgba(240,228,200,0.8)', strokeWidth: 3 });
    }
    drawGoalPanel(ctx, wdg) {
      const st = this.state, P = HB.palette, m = HB.goals.milestone(st);
      const { x, y, w, h } = wdg;
      HB.parchment.panel(ctx, x, y, w, h, { shadow: true, stains: false, vignette: 0.1, flourish: 0 });
      if (wdg.hover || wdg.focused) { ctx.save(); ctx.strokeStyle = P.focus; ctx.lineWidth = 2; HB.parchment.roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 4); ctx.stroke(); ctx.restore(); }
      HB.text.draw(ctx, m.title, x + 14, y + 22, { size: 16, family: 'sc', maxWidth: w - 80 });
      HB.text.draw(ctx, 'Aims ›', x + w - 12, y + 21, { size: 13, italic: true, align: 'right', color: P.inkSoft });
      const hoard = m.reqs.find(r => r.key === 'hoard'), age = m.reqs.find(r => r.key === 'age');
      if (hoard) {
        const bw = Math.round((w - 40) * 0.64);
        goalMeter(ctx, x + 14, y + 30, bw, 15, hoard.cur, hoard.need, '#9c6b1c', hoard.done ? 'Hoard strength: enough' : `Hoard ${HB.fmt.int(hoard.cur)} / ${HB.fmt.int(hoard.need)}`, hoard.carried || 0);
        goalMeter(ctx, x + 26 + bw, y + 30, w - 40 - bw, 15, age.cur, age.need, '#3f6d3a', age.done ? 'Age: enough' : `Age ${Math.floor(age.cur)} / ${age.need}`, 0);
      }
      HB.text.paragraph(ctx, 'Next: ' + m.nextStep, x + 14, y + 52, w - 28, { size: 13, italic: true, maxLines: 2, lineHeight: 16, color: P.ink });
      const story = HB.situations ? HB.situations.hint(st, true) : '';
      if (story) HB.text.paragraph(ctx, 'Story: ' + story, x + 14, y + 88, w - 28, { size: 13, maxLines: 2, lineHeight: 16, color: '#7a2418' });
      const strife = HB.endgame ? HB.endgame.hint(st) : '';
      if (strife) HB.text.paragraph(ctx, strife, x + 14, y + 88 + (story ? 36 : 0), w - 28, { size: 13, maxLines: 2, lineHeight: 16, color: '#4a2a5a' });
    }
    /** a red seal over places in a local story; wind swirls over crags; hunting parties shown even through cloud */
    drawStoryMarks(ctx, tl, br) {
      const st = this.state, W = st.world, z = CELL * this.cam.zoom;
      if (!HB.situations) return;
      for (const L of W.locations) {
        if (!HB.world.known(L) || L.x < tl.x - 2 || L.x > br.x + 2 || L.y < tl.y - 2 || L.y > br.y + 2 || L.threat) continue;
        if (!HB.situations.isStoryPlace(st, L)) continue;
        const p = this.worldToScreen(L.x + 0.5, L.y - 0.3), r = HB.clamp(z * 0.32, 5, 9);
        ctx.save();
        if (L.flags.requires === 'wind') {
          ctx.strokeStyle = 'rgba(47,74,102,0.85)'; ctx.lineWidth = 1.5;
          for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(p.x, p.y - r * 2, r * (0.6 + k * 0.45), Math.PI * (0.2 + k * 0.3) + this.t, Math.PI * (1.3 + k * 0.3) + this.t); ctx.stroke(); }
        }
        HB.mapart.seal(ctx, p.x, p.y - r * 2, r, L.flags.requires ? 'locked' : 'story', 'loc' + L.id);
        ctx.restore();
      }
      for (const e of st.entities) {
        if ((e.kind !== 'hunters' && !e.sitId) || e.dead) continue;
        if (Math.hypot(e.x - st.dragon.x, e.y - st.dragon.y) > 30 && !st.know.revealed[Math.round(e.y) * W.w + Math.round(e.x)]) continue;
        const p = this.worldToScreen(e.x + 0.5, e.y + 0.8), s2 = Math.max(4, Math.min(9, 7 * Math.sqrt(this.cam.zoom)));
        ctx.save(); HB.mapart.setup(ctx); HB.mapart.walker(ctx, p.x, p.y, s2, '#7a2418', 'ent' + e.id); ctx.restore();
        HB.text.draw(ctx, e.kind === 'hero' ? `${e.name}, slayer` : e.name, p.x, p.y - s2 * 2.6, { size: 12, italic: true, align: 'center', color: '#7a2418', stroke: 'rgba(240,228,200,0.85)', strokeWidth: 2.5 });
      }
    }
    /** a dark seal over the places of the great struggle, gold-green over the sanctuaries */
    drawStruggleMarks(ctx, tl, br) {
      const st = this.state, W = st.world, z = CELL * this.cam.zoom, eg = HB.endgame;
      if (!eg || !eg.active(st)) return;
      for (const L of W.locations) {
        if (!eg.isPlace(st, L) || L.state === 'ruin' || !HB.world.known(L)) continue;
        if (L.x < tl.x - 2 || L.x > br.x + 2 || L.y < tl.y - 2 || L.y > br.y + 2) continue;
        const p = this.worldToScreen(L.x + 0.5, L.y - 0.6), r = HB.clamp(z * 0.34, 6, 10), crystal = L.type === 'sanctuary';
        ctx.save(); HB.mapart.seal(ctx, p.x, p.y - r * 2, r, crystal ? 'crystal' : 'shadow', 'loc' + L.id); ctx.restore();
      }
    }
    /** crossed swords over places being raided by outlaws */
    drawThreats(ctx, tl, br) {
      const st = this.state, W = st.world, z = CELL * this.cam.zoom;
      for (const L of W.locations) {
        if (!L.threat || !L.knowledge.seen || L.x < tl.x - 2 || L.x > br.x + 2 || L.y < tl.y - 2 || L.y > br.y + 2) continue;
        const p = this.worldToScreen(L.x + 0.5, L.y - 0.2);
        const s = HB.clamp(z * 0.55, 7, 14), pulse = 0.75 + 0.25 * Math.sin(this.t * 5);
        ctx.save(); ctx.globalAlpha = pulse; HB.mapart.threatMark(ctx, p.x, p.y - s * 1.1, s, 'loc' + L.id); ctx.restore();
        if (this.cam.zoom > 0.7) HB.text.draw(ctx, 'under attack', p.x, p.y - s * 2.2, { size: 11, italic: true, align: 'center', color: '#8f2b1f', stroke: 'rgba(240,228,200,0.85)', strokeWidth: 2.5 });
      }
    }
    previewContains(sx, sy) { const r = this.previewRect(); return r && HB.pointInRect(sx, sy, r.x, r.y, r.w, r.h); }
    previewRect() { return this.selected ? { x: HB.W - 372, y: 130, w: 350, h: HB.clamp(this._pvH || 400, 400, 530) } : null; }
    /** height the preview needs for its lines */
    measurePreview(ctx, info, tw) {
      let h = 48 + 10 + 20;
      for (const line of info.lines) h += line.label ? Math.max(HB.text.paragraphHeight(ctx, line.text, tw - 96, { size: 14 }), 18) + 4 : HB.text.paragraphHeight(ctx, line.text, tw, { size: 14, italic: !!line.italic }) + 4;
      return h + 64;
    }
    drawPreview(ctx) {
      const st = this.state, W = st.world, L = this.selected, P = HB.palette, d = st.dragon;
      const info0 = HB.preview ? HB.preview.describe(st, L) : basicDescribe(st, L);
      this._pvH = this.measurePreview(ctx, info0, 350 - 40);
      const r = this.previewRect();
      HB.parchment.panel(ctx, r.x, r.y, r.w, r.h, { tone: 'light', title: L.name, titleSize: 18 });
      let y = r.y + 48; const x = r.x + 20, tw = r.w - 40;
      const info = info0;
      HB.text.draw(ctx, info.subtitle, x, y, { size: 14, italic: true, color: P.inkSoft }); y += 10;
      HB.parchment.rule(ctx, x, y + 6, tw, { ornament: false }); y += 20;
      for (const line of info.lines) {
        const col = line.tone === 'bad' ? P.bad : line.tone === 'good' ? P.good : line.tone === 'warn' ? P.warn : P.ink;
        if (line.label) { HB.text.draw(ctx, line.label, x, y + 14, { size: 13, family: 'sc', color: P.inkSoft }); const h = HB.text.paragraph(ctx, line.text, x + 96, y, tw - 96, { size: 14, color: col }); y += Math.max(h, 18) + 4; }
        else { const h = HB.text.paragraph(ctx, line.text, x, y, tw, { size: 14, color: col, italic: !!line.italic }); y += h + 4; }
      }
      // action buttons (drawn as pseudo-widgets each frame; registered in ui lazily)
      this.ensurePreviewButtons(r, info);
    }
    ensurePreviewButtons(r, info) {
      const L = this.selected;
      if (this._pvFor !== L) {
        if (this._pvBtns) for (const b of this._pvBtns) this.ui.remove(b);
        this._pvBtns = [];
        const by = r.y + r.h - 50;
        const fly = new HB.ui.Button({ x: r.x + 20, y: by, w: 150, h: 36, label: L.type === 'lair' ? 'Go home' : 'Fly there', primary: true, size: 15, hotkeyLabel: 'Enter', onClick: () => this.flyToSelected(), disabled: !!info.flyError, disabledReason: info.flyError || '' });
        const close = new HB.ui.Button({ x: r.x + r.w - 150, y: by, w: 130, h: 36, label: 'Close', size: 15, onClick: () => { this.selected = null; } });
        this._pvBtns.push(this.ui.add(fly), this.ui.add(close));
        this._pvFor = L;
        this._pvFly = fly;
      } else if (this._pvFly) { this._pvFly.disabled = !!info.flyError; this._pvFly.disabledReason = info.flyError || ''; for (const b of this._pvBtns) b.y = r.y + r.h - 50; }
    }
    drawToast(ctx) {
      const k = Math.min(1, this.toast.t * 3, (this.toast.max - this.toast.t) * 3);
      ctx.save(); ctx.globalAlpha = HB.clamp(k, 0, 1);
      const w = HB.text.width(this.toast.text, 18, { family: 'sc' }) + 50;
      HB.parchment.panel(ctx, HB.W / 2 - w / 2, 118, w, 44, { tone: 'light', stains: false, vignette: 0.05, flourish: 0 });
      HB.text.draw(ctx, this.toast.text, HB.W / 2, 147, { size: 18, family: 'sc', align: 'center' });
      ctx.restore();
    }
    passiveUpdate(dt) { this.t += dt; this.dragonFrameT += dt; if (this.toast && (this.toast.t -= dt) <= 0) this.toast = null; this.updateContextButtons(); }
    exit() { if (this._pvBtns) { for (const b of this._pvBtns) this.ui.remove(b); this._pvBtns = null; this._pvFor = null; } }
  }
  // selection cleanup when deselected
  const origUpdate = MapScene.prototype.update;
  MapScene.prototype.update = function (dt) { origUpdate.call(this, dt); if (!this.selected && this._pvBtns) { for (const b of this._pvBtns) this.ui.remove(b); this._pvBtns = null; this._pvFor = null; } };

  function goalMeter(ctx, x, y, w, h, v, m, color, label, pending) {
    const P = HB.palette;
    HB.parchment.plaque(ctx, x, y, w, h, { fill: 'rgba(60,40,20,0.22)', color: P.ink, width: 1, radius: 2 });
    const f = HB.clamp(v / Math.max(1e-6, m), 0, 1), f2 = HB.clamp((v + pending) / Math.max(1e-6, m), 0, 1);
    if (f2 > f) { ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = color; ctx.fillRect(x + 2 + (w - 4) * f, y + 2, (w - 4) * (f2 - f), h - 4); ctx.restore(); }
    ctx.fillStyle = color; ctx.fillRect(x + 2, y + 2, (w - 4) * f, h - 4);
    HB.text.draw(ctx, label, x + w / 2, y + h - 3, { size: 11, align: 'center', family: 'sc', color: P.parchmentLight, shadow: 'rgba(0,0,0,0.7)', maxWidth: w - 4 });
  }
  function drawMeter(ctx, x, y, w, h, v, m, color, label) {
    const P = HB.palette;
    HB.parchment.plaque(ctx, x, y, w, h, { fill: 'rgba(60,40,20,0.22)', color: P.ink, width: 1, radius: 2 });
    ctx.fillStyle = color; ctx.fillRect(x + 2, y + 2, (w - 4) * HB.clamp(v / Math.max(1e-6, m), 0, 1), h - 4);
    HB.text.draw(ctx, `${label} ${Math.round(v)}/${Math.round(m)}`, x + w / 2, y + h - 3, { size: 11, align: 'center', family: 'sc', color: P.parchmentLight, shadow: 'rgba(0,0,0,0.7)' });
  }

  function basicDescribe(st, L) {
    const W = st.world;
    const d = Math.hypot(L.x - st.dragon.x, L.y - st.dragon.y);
    const lines = [{ label: 'Distance', text: `${d.toFixed(0)} leagues` }, { label: 'Realm', text: HB.world.factionName(W, L.factionId) }];
    return { subtitle: HB.fmt.cap(HB.world.locTypeName(L)), lines, flyError: null };
  }

  HB.MapScene = MapScene;
  HB.MAP_CELL = CELL;
})();
