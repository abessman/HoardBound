/* Raid scene renderer and input: pixel side-view at 320x180 scaled 4x, plus parchment HUD. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;
  const px = HB.px, P = HB.px_palette, S = HB.sprites;
  const PW = HB.PX_W, PH = HB.PX_H, SC = HB.PX_SCALE;

  class RaidScene {
    constructor(state, r, onFinish) {
      this.state = state; this.r = r; this.onFinish = onFinish; this.opaque = true; this.ui = new HB.ui.UI();
      this.buf = px.create(PW, PH); this.t = 0; this.finished = false; this.actionButtons = []; this.lastFocusId = null; this.lastActionsKey = '';
      this.camX = 0; this.introT = 0; this.shake = 0;
    }
    enter() {
      this.ui.clear();
      this.btnWithdraw = this.ui.add(new HB.ui.Button({ x: HB.W - 190, y: HB.H - 104, w: 170, h: 40, label: 'Withdraw', size: 16, hotkey: 'KeyW', hotkeyLabel: 'W', tooltip: 'Leave with what you carry. Archers may send a volley after you if the alarm is high.', onClick: () => this.perform('withdraw') }));
      this.btnWait = this.ui.add(new HB.ui.Button({ x: HB.W - 190, y: HB.H - 58, w: 170, h: 40, label: 'Pass / wait', size: 16, hotkey: ['Space', 'KeyX'], hotkeyLabel: 'Space', tooltip: 'Let this opportunity go by and keep flying.', onClick: () => this.perform('wait') }));
      this.ui.onCancel = () => { HB.modal({ title: 'Withdraw?', text: 'Leave the raid with what you carry?', buttons: [{ label: 'Withdraw', primary: true, onClick: () => this.perform('withdraw') }, { label: 'Keep raiding', cancel: true }] }); };
    }
    perform(id, e) {
      const r = this.r;
      const f = e || HB.raid.focus(r);
      if (id === 'wait') { HB.raid.perform(r, 'wait', f); return; }
      if (id === 'withdraw') { HB.raid.perform(r, 'withdraw'); return; }
      if (!f) return;
      if (HB.raid.perform(r, id, f)) { if (HB.audio) HB.audio.play(id === 'breathe' ? 'fire' : id === 'grab' ? 'coin' : id === 'roar' ? 'roar' : 'click'); }
    }
    update(dt) {
      const r = this.r, inp = HB.input;
      this.t += dt; this.introT += dt;
      this.ui.update(dt);
      if (inp.pressed('nextTarget')) HB.raid.cycleFocus(r, 1);
      // number keys map to the focused target's actions
      const focus = HB.raid.focus(r);
      const acts = focus ? HB.raid.actionsFor(r, focus) : [];
      for (let i = 0; i < acts.length && i < 9; i++) if (inp.pressed(`action${i + 1}`)) { if (acts[i].enabled) this.perform(acts[i].id, focus); }
      if (inp.usingGamepad()) { if (inp.pressed('confirm') && acts[0] && acts[0].enabled && !this.ui.focus) this.perform(acts[0].id, focus); if (inp.pressed('alt')) this.perform('wait'); }
      // pointer click on entity (or a chip in the bar) selects it
      const ptr = inp.pointer;
      if (ptr.released && !ptr.dragging && !this.ui.consumedPointer) {
        if (ptr.y < HB.H - 120) { const hit = this.entityAtScreen(ptr.x, ptr.y); if (hit) { r.focusId = hit.id; r.dismissed.delete(hit.id); } }
        else if (this.chips) { const c = this.chips.find(c => HB.pointInRect(ptr.x, ptr.y, c.x, c.y, c.w, c.h)); if (c) { r.focusId = c.e.id; r.dismissed.delete(c.e.id); } }
      }
      HB.raid.update(r, dt, { speed: inp.held('speed'), slow: inp.held('slow') });
      if (r.dragon.hurtT > 0.2) this.shake = 4;
      this.shake = Math.max(0, this.shake - dt * 12);
      this.rebuildActionButtons();
      if (r.ended && !this.finished && r.endT > 1.0) { this.finished = true; HB.scenes.pop(this); if (this.onFinish) this.onFinish(); }
    }
    rebuildActionButtons() {
      const r = this.r, focus = HB.raid.focus(r);
      const acts = focus ? HB.raid.actionsFor(r, focus) : [];
      const key = focus ? focus.id + '|' + acts.map(a => a.id + (a.enabled ? 1 : 0)).join(',') : '';
      if (key === this.lastActionsKey) return;
      this.lastActionsKey = key;
      for (const b of this.actionButtons) this.ui.remove(b);
      this.actionButtons = [];
      // two columns inside the bottom bar
      const x0 = 24, colW = 330, rowH = 44;
      acts.forEach((a, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const b = new HB.ui.Button({ x: x0 + col * (colW + 10), y: HB.H - 104 + row * rowH, w: colW, h: 38, label: a.label, size: 14, align: 'left', hotkeyLabel: String(i + 1), disabled: !a.enabled, disabledReason: a.reason || '', tooltip: a.desc, onClick: () => this.perform(a.id, focus) });
        b.risk = a.risk;
        const od = b.draw.bind(b);
        b.draw = (ctx, ui) => { od(ctx, ui); const col = { safe: HB.palette.good, low: HB.palette.good, mid: HB.palette.warn, high: HB.palette.bad }[b.risk] || HB.palette.inkSoft; ctx.fillStyle = col; ctx.fillRect(b.x + 4, b.y + 6, 4, b.h - 12); };
        this.actionButtons.push(this.ui.add(b));
      });
      if (this.actionButtons.length && !HB.input.usingPointer()) this.ui.setFocus(this.actionButtons.find(b => !b.disabled) || this.actionButtons[0]);
    }
    // ---------- coordinates
    sceneToScreen(x, y) { return { x: (x - this.camX) * SC, y: y * SC }; }
    entityAtScreen(sx, sy) {
      const r = this.r; let best = null, bd = 30;
      for (const e of r.entities) { if (e.dead || e.insideOf || e.decor) continue; const p = this.sceneToScreen(e.x, e.y - e.h / 2); const d = Math.hypot(p.x - sx, p.y - sy); if (d < bd + e.w * SC * 0.5) { bd = d; best = e; } }
      return best;
    }
    // ---------- draw
    draw(ctx) {
      const r = this.r, st = this.state, D = r.dragon;
      const g = this.buf.ctx;
      // camera
      const targetCam = HB.clamp(D.x - PW * (D.facing > 0 ? 0.38 : 0.62), -40, r.length - PW + 40);
      this.camX = HB.lerp(this.camX, targetCam, 0.12);
      const cam = this.camX;
      this.drawBackdrop(g, cam);
      // ground
      px.blit(g, S.get('ground', PW + 64, r.scene.backdrop === 'castle' || r.scene.backdrop === 'town' ? 'stone' : r.scene.backdrop === 'road' ? 'dirt' : r.scene.backdrop === 'dusk' ? 'dirt' : 'grass', 7), -((cam % 64) + 64) % 64 - 32, HB.raid.GROUND);
      // entities sorted by y then x
      const ents = r.entities.filter(e => !e.insideOf || e.building).slice().sort((a, b) => (a.building ? 0 : 1) - (b.building ? 0 : 1) || a.y - b.y);
      for (const e of ents) this.drawEntity(g, e, cam);
      // dragon
      this.drawDragon(g, cam);
      // projectiles
      for (const p of r.projectiles) { const sp = S.get(p.kind === 'bolt' ? 'bolt' : 'arrow'); const ang = Math.atan2(p.vy, p.vx); g.save(); g.translate(Math.round(p.x - cam), Math.round(p.y)); g.rotate(ang); g.drawImage(sp, -sp.width / 2, -sp.height / 2); g.restore(); }
      // particles
      for (const p of r.particles) { g.fillStyle = p.kind === 'fire' ? (p.t < 0.3 ? P.fireHot : P.fire) : p.kind === 'coin' ? P.goldLight : p.kind === 'spark' ? P.white : P.smoke; g.fillRect(Math.round(p.x - cam), Math.round(p.y), p.kind === 'fire' ? 2 : 1, p.kind === 'fire' ? 2 : 1); }
      // night tint
      if (r.scene.night) { g.fillStyle = 'rgba(20,24,60,0.35)'; g.fillRect(0, 0, PW, PH); }
      // blit: the scene occupies the top 600px; the bottom 120px is the command bar
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const sh = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 2 : 0;
      const visibleRows = (HB.H - 120) / SC;
      ctx.drawImage(this.buf, 0, 0, PW, visibleRows, sh, 0, PW * SC, visibleRows * SC);
      ctx.restore();
      this.drawHud(ctx);
      this.ui.draw(ctx);
    }
    drawBackdrop(g, cam) {
      const r = this.r, kind = r.scene.backdrop || 'village';
      const night = r.scene.night;
      const grad = g.createLinearGradient(0, 0, 0, PH);
      if (night) { grad.addColorStop(0, '#141a33'); grad.addColorStop(1, '#2e3458'); }
      else if (kind === 'dusk') { grad.addColorStop(0, '#5a4a7a'); grad.addColorStop(0.6, '#e7a56b'); grad.addColorStop(1, '#f1c98a'); }
      else { grad.addColorStop(0, '#6fa3d2'); grad.addColorStop(1, '#cfe3ef'); }
      g.fillStyle = grad; g.fillRect(0, 0, PW, PH);
      if (night) { g.fillStyle = P.white; const rng = new HB.RNG(11); for (let i = 0; i < 50; i++) g.fillRect(rng.int(PW), rng.int(PH * 0.6), 1, 1); px.ellipse(g, 260, 24, 8, 8, '#f3efd8'); }
      else { const rng = new HB.RNG(4); for (let i = 0; i < 5; i++) { const c = S.get('cloud', 40 + rng.int(40), i + 20); px.blit(g, c, ((rng.int(PW * 2) - cam * 0.2 + this.t * 2) % (PW + 80) + PW + 80) % (PW + 80) - 80, 8 + rng.int(40)); } }
      const far = S.get('mountainsSilhouette', PW + 80, 70, night ? '#2b3150' : kind === 'dusk' ? '#6b5a7a' : '#8a93a6', 21);
      px.blit(g, far, -((cam * 0.15) % 80) - 40, HB.raid.GROUND - 90);
      const hills = S.get('hillsSilhouette', PW + 120, 50, night ? '#1f2d26' : kind === 'dusk' ? '#4f6a48' : '#5f7f5a', 22);
      px.blit(g, hills, -((cam * 0.35) % 120) - 60, HB.raid.GROUND - 52);
      // tree line for forest/camp
      if (kind === 'forest' || kind === 'night' || kind === 'village' || kind === 'hills') { const rng = new HB.RNG(31); for (let i = 0; i < 14; i++) { const x = i * 60 + rng.int(30); const sx = x - cam * 0.6; const tx = ((sx % (PW + 120)) + PW + 120) % (PW + 120) - 60; px.blit(g, S.get(rng.chance(0.5) ? 'tree' : 'pine'), tx, HB.raid.GROUND - 10 - rng.int(4), 1, false, night ? 0.6 : 0.85); } }
      // ground haze
      g.fillStyle = night ? 'rgba(20,24,50,0.25)' : 'rgba(255,255,255,0.08)'; g.fillRect(0, HB.raid.GROUND - 20, PW, 20);
    }
    drawEntity(g, e, cam) {
      const r = this.r;
      const x = Math.round(e.x - cam), yb = Math.round(e.y);
      if (x < -60 || x > PW + 60) return;
      const G = HB.raid.GROUND;
      if (e.building) {
        let sp;
        if (e.kind === 'wagon') sp = S.get(e.sprite || 'wagon');
        else if (e.kind === 'tent') sp = S.get(e.sprite || 'tent');
        else if (e.kind === 'tower') sp = S.get('towerSeg', 18, 56, 1);
        else if (e.kind === 'keep') sp = e.sprite === 'gate' ? S.get('gate', 34, 30) : S.get('towerSeg', 40, 70, 1);
        else if (e.kind === 'stall') sp = S.get('crate');
        else sp = S.get('house', e.w, e.h, e.variant || 0);
        if (e.burnedDown) { g.fillStyle = P.outline; g.fillRect(x - sp.width / 2, yb - 6, sp.width, 6); g.fillStyle = P.smoke; for (let i = 0; i < 3; i++) g.fillRect(x - 6 + i * 6, yb - 10 - i * 3, 3, 3); return; }
        px.blit(g, sp, x - sp.width / 2, yb - sp.height);
        if (e.burning > 0) { const rng = new HB.RNG(Math.floor(this.t * 12) + e.id); for (let i = 0; i < 8; i++) { const fx = x - sp.width / 2 + rng.int(sp.width), fy = yb - rng.int(sp.height); g.fillStyle = rng.chance(0.5) ? P.fire : P.fireHot; g.fillRect(fx, fy, 2, 3); } for (let i = 0; i < 3; i++) px.blit(g, S.get('smoke'), x - 6 + i * 5, yb - sp.height - 8 - i * 6 - ((this.t * 10) % 6), 1, false, 0.5); }
        return;
      }
      if (e.kind === 'wall') { const w = S.get('wallSegment', e.w, 20); px.blit(g, w, x - w.width / 2, yb - 20); return; }
      if (e.kind === 'campfire') { const f = S.get('campfire'); px.blit(g, f, x - 3, yb - 6); if (Math.floor(this.t * 8) % 2) { g.fillStyle = P.fireHot; g.fillRect(x, yb - 7, 1, 1); } return; }
      if (e.kind === 'corpse') { px.blit(g, S.get('corpse'), x - 4, yb - 10); return; }
      if (e.dead) { if (e.person) px.blit(g, S.get('corpse'), x - 4, yb - 10); return; }
      if (e.loot && !e.person && !e.animal) {
        const spName = e.artifact ? 'crown' : e.kind === 'coins' ? 'coins' : e.kind === 'gem' ? 'gem' : e.kind === 'crown' ? 'crown' : e.kind === 'book' ? 'book' : e.kind === 'sword' ? 'sword' : 'chest';
        const sp = S.get(spName);
        px.blit(g, sp, x - sp.width / 2, yb - sp.height);
        if (e.artifact) { g.fillStyle = P.goldLight; if (Math.floor(this.t * 6) % 2) g.fillRect(x + 3, yb - sp.height - 3, 1, 1); }
        return;
      }
      if (e.kind === 'ballista') { const b = S.get('ballista'); px.blit(g, b, x - 6, yb - 8); if (e.state === 'aiming') { g.fillStyle = P.gemRed; if (Math.floor(this.t * 10) % 2) g.fillRect(x - 1, yb - 14, 3, 3); } return; }
      if (e.kind === 'rivalDragon') {
        const spec = { tier: e.rival ? e.rival.tier : 2, breed: e.rival ? e.rival.breed : 'black', alignment: -60, mutations: ['stonePlates'], scars: 2 };
        const f = Math.floor(this.t * 6) % 4;
        HB.dragonArt.draw(g, spec, e.fearT > 0 ? 'hurt' : (e.cooldown > e.rate - 0.4 ? 'breathe' : 'idle'), e.cooldown > e.rate - 0.4 ? 1 : f % 2, x, yb - 14, 1, e.facing);
        if (e.cooldown > e.rate - 0.35) { const fl = HB.dragonArt.flame(40, 'fire', f); g.drawImage(fl, e.facing > 0 ? x + 16 : x - 16 - fl.width, yb - 24); }
        this.drawHpBar(g, x, yb - 40, e);
        return;
      }
      // people / animals
      const spriteId = e.sprite || ({ guard: 'guard', militia: 'villager2', archer: 'archer', knight: 'knight', hero: 'hero', captain: 'knight', bandit: 'bandit', goblin: 'goblin', goblinArcher: 'goblin', dwarfWarrior: 'dwarf', elfArcher: 'archer', villager: 'villager', merchant: 'villager2', priest: 'priest', noble: 'noble', worker: 'villager2', sheep: 'sheep', cow: 'cow', horse: 'horse' }[e.kind] || 'villager');
      const sp = S.get(spriteId);
      const bob = e.state === 'flee' || (e.melee && e.state === 'alert' && Math.abs(e.vx) > 0) ? (Math.floor(this.t * 10 + e.id) % 2) : 0;
      let yOff = 0;
      if (e.state === 'asleep') { g.save(); g.translate(x, yb); g.rotate(-Math.PI / 2); px.blit(g, sp, -sp.height, -sp.width / 2); g.restore(); if (Math.floor(this.t * 2 + e.id) % 2) { g.fillStyle = P.white; g.fillRect(x + 6, yb - 10, 1, 1); g.fillRect(x + 8, yb - 13, 1, 1); } return; }
      px.blit(g, sp, x - sp.width / 2, yb - sp.height - bob + yOff, 1, e.facing > 0);
      if (e.burning > 0) { g.fillStyle = P.fire; g.fillRect(x - 2, yb - sp.height - 2, 2, 2); g.fillStyle = P.fireHot; g.fillRect(x + 1, yb - sp.height - 4, 1, 2); }
      if (e.fearT > 0 && e.state !== 'dead') { g.fillStyle = P.white; g.fillRect(x - 1, yb - sp.height - 5, 1, 1); g.fillRect(x + 1, yb - sp.height - 7, 1, 1); }
      if (e.defender && e.hp < e.maxHp) this.drawHpBar(g, x, yb - sp.height - 4, e);
      if (e.captive) { g.fillStyle = P.goldLight; if (Math.floor(this.t * 4) % 2) g.fillRect(x - 1, yb - sp.height - 5, 2, 2); }
    }
    drawHpBar(g, x, y, e) { const w = Math.max(8, Math.min(24, e.maxHp / 3)); g.fillStyle = P.outline; g.fillRect(x - w / 2 - 1, y - 1, w + 2, 3); g.fillStyle = P.gemRed; g.fillRect(x - w / 2, y, Math.round(w * HB.clamp(e.hp / e.maxHp, 0, 1)), 1); }
    drawDragon(g, cam) {
      const r = this.r, D = r.dragon, st = this.state;
      const spec = HB.dragonArt.specOf(st);
      const f = D.pose === 'fly' || D.pose === 'grab' ? Math.floor(D.poseT * 8) % 4 : Math.floor(D.poseT * 2) % 2;
      const x = Math.round(D.x - cam), y = Math.round(D.y);
      // shadow
      px.ellipse(g, x, HB.raid.GROUND + 1, 8 + spec.tier * 5, 2 + spec.tier, 'rgba(0,0,0,0.25)');
      const pose = D.hurtT > 0 ? 'hurt' : D.pose === 'breathe' ? 'breathe' : D.pose;
      const sp = HB.dragonArt.draw(g, spec, pose, pose === 'breathe' ? 1 : f, x, y, 1, D.facing);
      if (D.busy && D.busy.id === 'breathe' && D.busy.t > 0.2 && D.busy.t < 0.9) {
        const L = 30 + spec.tier * 18;
        const fl = HB.dragonArt.flame(L, st.dragon.stats.breathElement || 'fire', Math.floor(D.poseT * 10) % 4);
        const mouthX = x + D.facing * (sp.bodyLength * 0.55), mouthY = y - sp.bodyLength * 0.2;
        if (D.facing > 0) g.drawImage(fl, mouthX, mouthY - fl.height / 2); else { g.save(); g.translate(mouthX, mouthY - fl.height / 2); g.scale(-1, 1); g.drawImage(fl, 0, 0); g.restore(); }
      }
      if (D.busy && D.busy.id === 'roar' && D.busy.t < 0.7) { g.strokeStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x + D.facing * 10, y - 4, 10 + i * 8 + (D.busy.t * 40) % 8, -0.6 + (D.facing > 0 ? 0 : Math.PI), 0.6 + (D.facing > 0 ? 0 : Math.PI)); g.stroke(); } }
    }
    drawHud(ctx) {
      const r = this.r, st = this.state, D = r.dragon, s = st.dragon.stats, Pp = HB.palette;
      // top bar
      HB.parchment.panel(ctx, 14, 12, 520, 74, { shadow: true, stains: false, vignette: 0.1, flourish: 0 });
      const mw = 150;
      meter(ctx, 28, 24, mw, 16, D.hp, s.maxHealth, '#8f2b1f', 'Health');
      meter(ctx, 190, 24, mw, 16, D.stamina, s.maxStamina, '#3f6d3a', 'Stamina');
      const carried = HB.game.cargoWeight(st) + HB.raid.lootWeight(r);
      meter(ctx, 352, 24, mw, 16, carried, s.capacity, '#9c6b1c', 'Cargo');
      meter(ctx, 28, 50, 312, 16, r.alarm, 100, r.alarm < 50 ? '#9c6b1c' : '#8f2b1f', r.mode === 'defend' ? `The raid goes on · ${r.entities.filter(e => e.raider && !e.dead).length} raiders left` : 'Alarm', r.mode === 'defend');
      HB.text.draw(ctx, HB.raid.stageName(r), 352, 63, { size: 14, family: 'sc', color: r.alarm >= 70 ? Pp.bad : Pp.ink });
      // target name + loot summary (right top)
      HB.parchment.panel(ctx, HB.W - 334, 12, 320, 74, { shadow: true, stains: false, vignette: 0.1, flourish: 0 });
      HB.text.draw(ctx, r.target.name || 'The road', HB.W - 320, 36, { size: 18, family: 'sc', maxWidth: 290 });
      HB.text.draw(ctx, `Taken: ${HB.fmt.int(r.loot.gold)} gold, ${HB.fmt.plural(r.loot.items.length, 'item')}${r.loot.captives.length ? ', ' + HB.fmt.plural(r.loot.captives.length, 'captive') : ''}`, HB.W - 320, 56, { size: 13, color: Pp.inkSoft });
      HB.text.draw(ctx, `Speed: ${r.hold > 1 ? 'fast (Shift)' : r.decision && !D.busy ? 'slowed — choose' : 'flying'} · Q next target · Esc withdraw`, HB.W - 320, 74, { size: 12, italic: true, color: Pp.inkSoft });
      // focus bracket + label
      const focus = HB.raid.focus(r);
      for (const e of r.opportunities || []) {
        const p = this.sceneToScreen(e.x, e.y - e.h / 2);
        const isF = e === focus;
        ctx.save(); ctx.strokeStyle = isF ? Pp.focus : 'rgba(240,228,200,0.8)'; ctx.lineWidth = isF ? 3 : 1.5; ctx.setLineDash(isF ? [] : [4, 4]);
        const w = Math.max(20, e.w * SC * 0.9), h = Math.max(24, e.h * SC); const bx = p.x - w / 2, by = p.y - h / 2 + (isF ? Math.sin(this.t * 6) * 2 : 0);
        ctx.beginPath(); for (const [cx, cy, dx, dy] of [[bx, by, 1, 1], [bx + w, by, -1, 1], [bx, by + h, 1, -1], [bx + w, by + h, -1, -1]]) { ctx.moveTo(cx, cy + dy * 8); ctx.lineTo(cx, cy); ctx.lineTo(cx + dx * 8, cy); } ctx.stroke(); ctx.restore();
        if (isF) HB.text.draw(ctx, e.label, p.x, by - 8, { size: 14, family: 'sc', align: 'center', color: Pp.parchmentLight, stroke: 'rgba(20,10,5,0.8)', strokeWidth: 3 });
      }
      // command bar
      HB.parchment.fill(ctx, 0, HB.H - 120, HB.W, 120, 'dark');
      ctx.fillStyle = Pp.ink; ctx.fillRect(0, HB.H - 121, HB.W, 2);
      if (focus) HB.text.draw(ctx, `Opportunity: ${focus.label}`, 24, HB.H - 108, { size: 13, family: 'sc', color: Pp.ink });
      else HB.text.draw(ctx, r.ended ? '' : 'Flying on. Opportunities appear as you pass over them.', 24, HB.H - 108, { size: 13, italic: true, color: Pp.inkSoft });
      // other targets in reach: chips (click to focus, Q cycles)
      const others = (r.opportunities || []).filter(e => e !== focus).slice(0, 4);
      if (others.length) {
        let cx = 24 + HB.text.width(`Opportunity: ${focus ? focus.label : ''}`, 13, { family: 'sc' }) + 18;
        HB.text.draw(ctx, 'also here:', cx, HB.H - 108, { size: 12, italic: true, color: Pp.inkSoft }); cx += 62;
        this.chips = [];
        for (const e of others) { const w = HB.text.width(e.label, 12) + 16; if (cx + w > 700) break; HB.parchment.plaque(ctx, cx, HB.H - 120 + 2, w, 18, { fill: 'rgba(255,246,222,0.5)', width: 1, radius: 9 }); HB.text.draw(ctx, e.label, cx + 8, HB.H - 105, { size: 12, color: Pp.ink }); this.chips.push({ x: cx, y: HB.H - 118, w, h: 18, e }); cx += w + 6; }
      } else this.chips = [];
      // messages (middle of the bar)
      const msgs = r.messages.slice(-4);
      const mx = 724, mpw = 320;
      HB.parchment.plaque(ctx, mx, HB.H - 110, mpw, 100, { fill: 'rgba(255,246,222,0.35)', width: 1 });
      msgs.forEach((m, i) => { const col = m.kind === 'hurt' ? Pp.bad : m.kind === 'good' ? Pp.good : m.kind === 'alarm' || m.kind === 'threat' ? Pp.warn : Pp.ink; HB.text.draw(ctx, m.text, mx + 8, HB.H - 92 + i * 22, { size: 13, color: col, maxWidth: mpw - 16 }); });
      // ending overlay
      if (r.ended) {
        ctx.fillStyle = `rgba(15,8,4,${Math.min(0.6, r.endT)})`; ctx.fillRect(0, 0, HB.W, HB.H);
        HB.text.draw(ctx, r.outcome === 'defeated' ? 'You fall' : r.outcome === 'defended' ? 'The raiders are gone' : 'You withdraw', HB.W / 2, HB.H / 2, { size: 48, family: 'sc', align: 'center', color: Pp.parchmentLight, shadow: 'rgba(0,0,0,0.7)' });
      }
      // intro text
      if (this.introT < 4) { ctx.save(); ctx.globalAlpha = Math.min(1, 4 - this.introT); HB.text.draw(ctx, r.scene.intro, HB.W / 2, 120, { size: 18, italic: true, align: 'center', color: Pp.parchmentLight, stroke: 'rgba(20,10,5,0.8)', strokeWidth: 3, maxWidth: 900 }); ctx.restore(); }
    }
  }
  function meter(ctx, x, y, w, h, v, m, color, label, noValue) {
    HB.parchment.plaque(ctx, x, y, w, h, { fill: 'rgba(60,40,20,0.22)', color: HB.palette.ink, width: 1, radius: 2 });
    ctx.fillStyle = color; ctx.fillRect(x + 2, y + 2, (w - 4) * HB.clamp(v / Math.max(1e-6, m), 0, 1), h - 4);
    HB.text.draw(ctx, noValue ? label : `${label} ${Math.round(v)}/${Math.round(m)}`, x + w / 2, y + h - 3, { size: 12, align: 'center', family: 'sc', color: HB.palette.parchmentLight, shadow: 'rgba(0,0,0,0.7)' });
  }
  HB.RaidScene = RaidScene;
})();
