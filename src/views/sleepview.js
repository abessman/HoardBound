/* Sleep presentation: years pass with events; prompts for keeper episodes and warnings; awakening summary; death. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  class SleepScene {
    constructor(state, map) { this.state = state; this.map = map; this.opaque = true; this.ui = new HB.ui.UI(); this.t = 0; this.tick = 0; this.shown = 0; this.waiting = false; this.finished = false; this.speed = 1; }
    enter() {
      this.ui.add(new HB.ui.Button({ x: HB.W - 200, y: HB.H - 56, w: 180, h: 40, label: 'Wake early', size: 15, tooltip: 'Interrupt the sleep now. Growth needs a completed sleep.', onClick: () => { if (!this.waiting && !HB.sleep.done(this.state)) { this.state.sleeping.interrupted = true; HB.game.chronicle(this.state, 'Woke early by choice.', 'sleep'); } } }));
      this.ui.add(new HB.ui.Button({ x: HB.W - 390, y: HB.H - 56, w: 180, h: 40, label: 'Faster', size: 15, hotkey: 'speed', hotkeyLabel: 'Shift', onClick: () => { this.speed = this.speed >= 4 ? 1 : this.speed * 2; } }));
    }
    update(dt) {
      this.t += dt; this.ui.update(dt);
      const st = this.state, sl = st.sleeping;
      if (this.finished) return;
      if (!sl || HB.sleep.done(st)) { this.finished = true; HB.scenes.pop(this); HB.sleep.finish(st, this.map); return; }
      if (this.waiting) return;
      const perYear = sl.years < 1 ? 0.8 : HB.clamp(2.2 / Math.sqrt(sl.years) , 0.12, 0.8) / this.speed / (HB.input.held('speed') ? 3 : 1);
      this.tick += dt;
      if (this.tick >= perYear) {
        this.tick = 0;
        const p = HB.sleep.stepYear(st);
        if (p) this.prompt(p);
      }
    }
    prompt(p) {
      const st = this.state;
      this.waiting = true;
      if (p.kind === 'keeper') {
        const ep = p.episode;
        HB.scenes.push(new HB.CardScene({ title: ep.title, illustration: 'keeper', text: ep.text, choices: ep.choices.map((c, i) => ({ label: c.label, desc: c.desc, disabled: !!c.disabled, disabledReason: 'Not possible', onChoose: () => HB.sleep.resolvePrompt(st, p, i) })), onClose: () => { this.waiting = false; } }));
      } else if (p.kind === 'warning') {
        HB.scenes.push(new HB.CardScene({ title: 'Hunters on the Hill', illustration: 'hunters', text: p.text, choices: [
          { label: 'Wake and fight them', desc: 'The sleep ends now. You meet them awake.', onChoose: () => { const r = HB.sleep.resolvePrompt(st, p, 0); return r; } },
          { label: 'Trust the doors and sleep on', desc: 'Defences and luck decide. If they reach you asleep, you may not wake.', onChoose: () => { const r = HB.sleep.resolvePrompt(st, p, 1); return typeof r === 'string' ? r : 'Darkness.'; } },
        ], onClose: () => { this.waiting = false; } }));
      } else if (p.kind === 'death') { this.waiting = false; }
    }
    draw(ctx) {
      const st = this.state, sl = st.sleeping, Pp = HB.palette;
      ctx.fillStyle = '#120a06'; ctx.fillRect(0, 0, HB.W, HB.H);
      // illustration
      HB.illustrations.draw(ctx, 'sleep', 0, 0, HB.W, 360, this.t);
      ctx.fillStyle = 'rgba(18,10,6,0.35)'; ctx.fillRect(0, 0, HB.W, 360);
      const years = sl ? sl.yearsDone : 0;
      HB.text.draw(ctx, sl && sl.years < 1 ? 'A season passes' : `${Math.floor(years)} of ${HB.fmt.years(Math.round(sl ? sl.years : 0))}`, HB.W / 2, 70, { size: 44, family: 'display', align: 'center', color: Pp.parchmentLight, shadow: 'rgba(0,0,0,0.7)' });
      HB.text.draw(ctx, HB.game.dateString(st), HB.W / 2, 100, { size: 18, italic: true, align: 'center', color: Pp.parchmentLight, shadow: 'rgba(0,0,0,0.7)' });
      // event log
      HB.parchment.panel(ctx, 40, 376, HB.W - 80, HB.H - 376 - 72, { tone: 'light', title: 'While you slept' });
      const events = (sl ? sl.events : []).slice(-9);
      let y = 420;
      for (const e of events) { HB.text.draw(ctx, `Year ${e.year}`, 70, y + 14, { size: 12, family: 'sc', color: Pp.inkSoft }); const h = HB.text.paragraph(ctx, e.text, 150, y, HB.W - 230, { size: 14, color: e.bad ? Pp.bad : e.kind === 'loyal' || e.kind === 'growth' ? Pp.good : Pp.ink, maxLines: 1, lineHeight: 16 }); y += Math.max(h, 18) + 4; }
      this.ui.draw(ctx);
    }
  }
  HB.SleepScene = SleepScene;

  class AwakenScene {
    constructor(state, summary, map) { this.state = state; this.s = summary; this.map = map; this.opaque = true; this.ui = new HB.ui.UI(); this.t = 0; }
    enter() {
      const st = this.state, s = this.s, d = st.dragon, b = s.before, a = s.after;
      const lines = [];
      const W = st.world;
      lines.push({ h: 'Body' });
      if (s.tierUp) lines.push({ text: `You are a ${HB.TIERS[d.tier].name.toLowerCase()} now, ${HB.game.ageString(st)}. ${HB.TIERS[d.tier].land && !HB.TIERS[b.tier].land ? 'You can land and smash open what you could only burn before. ' : ''}Sight ${b.stats.vision.toFixed(1)} → ${a.stats.vision.toFixed(1)}; carry ${b.stats.capacity} → ${a.stats.capacity}; health ${b.stats.maxHealth} → ${a.stats.maxHealth}; breath ${b.stats.breath} → ${a.stats.breath}.${s.consumed ? ` The growing consumed ${HB.fmt.int(s.consumed)} gold of coin.` : ''}`, tone: 'good' });
      else if (s.restless) lines.push({ text: `You are ${HB.game.ageString(st)} and no larger. The hoard was too small to feed the change (${HB.fmt.int(HB.stats.hoardEnergy(st))} of ${HB.fmt.int(HB.TIERS[d.tier + 1].energy)}). Gather more and sleep again.`, tone: 'warn' });
      else lines.push({ text: `You are ${HB.game.ageString(st)}. ${s.interrupted ? 'The sleep was cut short; growth needs an unbroken slumber.' : s.forced ? 'You were forced awake.' : 'You slept well.'}` });
      const diff = HB.stats.diff(b.stats, a.stats).filter(x => ['maxHealth', 'defense', 'breath', 'bite'].includes(x.key));
      if (!s.tierUp && diff.length) lines.push({ text: 'Hoard power: ' + diff.map(x => `${x.label} ${HB.fmt.signed(x.delta, 1)}`).join(', ') + '.' });
      lines.push({ h: 'Hoard' });
      const gained = st.hoard.items.filter(i => !b.items.includes(i.id)), lost = b.named.filter(n => !st.hoard.items.some(i => i.name === n));
      lines.push({ text: `Gold ${HB.fmt.int(b.gold)} → ${HB.fmt.int(st.hoard.gold)}.${gained.length ? ' Gained ' + HB.fmt.list(gained.map(i => HB.hoard.itemLabel(i))) + '.' : ''}${lost.length ? ' Lost ' + HB.fmt.list(lost) + ' — stolen; the chronicle says where.' : ''}`, tone: lost.length ? 'bad' : undefined });
      const done = Object.keys(st.lair.upgrades).filter(k => (b.upgrades[k] || 0) < st.lair.upgrades[k]);
      if (done.length) lines.push({ text: 'Finished in the lair: ' + HB.fmt.list(done.map(k => HB.UPGRADE_BY_ID[k].name + ' ' + st.lair.upgrades[k])) + '.', tone: 'good' });
      lines.push({ h: 'The world' });
      const changes = [];
      W.locations.forEach((L, i) => { const old = b.locTiers[i]; if (!old) return; const [ot, os] = old.split(':'); if (L.knowledge.seen && (Number(ot) !== L.tier || os !== L.state)) changes.push(`${L.name}: ${os !== L.state ? L.state : HB.world.locTypeName(L)}`); });
      if (changes.length) lines.push({ text: changes.slice(0, 8).join('; ') + (changes.length > 8 ? `; and ${changes.length - 8} more` : '') + '.' });
      W.factions.forEach((f, i) => { const o = b.factions[i]; if (!f.dragon.known) return; const dh = f.dragon.hostility - o.hostility, df = f.dragon.fear - o.fear; if (Math.abs(dh) >= 5 || Math.abs(df) >= 5) lines.push({ text: `${f.name}: ${df >= 5 ? 'fears you more' : df <= -5 ? 'fears you less' : ''}${df && dh ? ', ' : ''}${dh >= 5 ? 'hates you more' : dh <= -5 ? 'hates you less' : ''}.` }); });
      const important = s.events.filter(e => e.kind === 'war' || e.kind === 'rival' || e.kind === 'grudge' || e.kind === 'hunters' || e.kind === 'thief' || e.kind === 'loyal').slice(-8);
      for (const e of important) lines.push({ text: `Year ${e.year}: ${e.text}`, tone: e.bad ? 'bad' : undefined });
      this.lines = lines;
      this.ui.add(new HB.ui.ListBox({ x: 60, y: 110, w: HB.W - 120, h: HB.H - 200, items: lines, itemHeight: 46, gap: 2, focusable: true, drawItem: (ctx, l, x, y, w, h) => { if (l.h) { HB.text.draw(ctx, l.h, x + 10, y + 28, { size: 18, family: 'sc' }); return; } HB.text.paragraph(ctx, l.text, x + 10, y + 6, w - 20, { size: 14, maxLines: 2, lineHeight: 17, color: l.tone === 'good' ? HB.palette.good : l.tone === 'bad' ? HB.palette.bad : l.tone === 'warn' ? HB.palette.warn : HB.palette.ink }); } }));
      this.ui.add(new HB.ui.Button({ x: HB.W / 2 - 110, y: HB.H - 70, w: 220, h: 44, label: 'Wake', primary: true, size: 18, onClick: () => { HB.scenes.pop(this); if (this.map) { this.map.centerOn(this.state.dragon.x + 0.5, this.state.dragon.y + 0.5, 1.6); this.map.selected = null; this.map.chunks.clear(); this.map.chunkOrder.length = 0; } } }));
      this.ui.focusFirst();
    }
    update(dt) { this.t += dt; this.ui.update(dt); }
    draw(ctx) {
      const st = this.state;
      HB.parchment.fill(ctx, 0, 0, HB.W, HB.H);
      HB.parchment.vignette(ctx, 0, 0, HB.W, HB.H, 0.45);
      HB.parchment.border(ctx, 14, 14, HB.W - 28, HB.H - 28, { width: 2.5, flourish: 16 });
      HB.text.draw(ctx, this.s.tierUp ? 'You wake, and you have grown' : this.s.forced ? 'You are woken' : 'You wake', HB.W / 2, 66, { size: 40, family: 'display', align: 'center', spacing: 3 });
      const planned = st.lastSleep && st.lastSleep.planned ? st.lastSleep.planned : null;
      HB.text.draw(ctx, `${HB.game.dateString(st)} · ${HB.fmt.years(Math.round(this.s.years))} passed${planned && Math.round(this.s.years) < planned ? ` of the ${planned} you meant to sleep` : ''}`, HB.W / 2, 92, { size: 15, italic: true, align: 'center', color: HB.palette.inkSoft });
      HB.dragonArt.draw(ctx, HB.dragonArt.specOf(st), 'roar', 0, HB.W - 150, 80, 2.2 - st.dragon.tier * 0.3, -1);
      this.ui.draw(ctx);
    }
  }
  HB.AwakenScene = AwakenScene;

  class DeathScene {
    constructor(state, summary) { this.state = state; this.s = summary; this.opaque = true; this.ui = new HB.ui.UI(); this.t = 0; }
    enter() {
      const st = this.state;
      this.ui.add(new HB.ui.Button({ x: HB.W / 2 - 110, y: HB.H - 90, w: 220, h: 44, label: 'Return to title', primary: true, onClick: () => { HB.save.write(st, 'ended-' + Date.now()); HB.scenes.replace(new HB.TitleScene()); } }));
      this.ui.focusFirst();
    }
    update(dt) { this.t += dt; this.ui.update(dt); }
    draw(ctx) {
      const st = this.state;
      ctx.fillStyle = '#120a06'; ctx.fillRect(0, 0, HB.W, HB.H);
      HB.parchment.panel(ctx, 160, 60, HB.W - 320, HB.H - 120, { tone: 'dark', title: `The Death of ${st.dragon.name}` });
      const last = st.chronicle[st.chronicle.length - 1];
      HB.text.paragraph(ctx, `${last ? last.text : ''}\n\n${st.dragon.name} lived ${Math.floor(st.dragon.age)} years, raided ${st.counters.raids} times, stole ${HB.fmt.int(st.counters.goldStolen)} gold, burned ${st.counters.burned} buildings and released ${st.counters.released} captives. The hoard is scattered among the hunters, and the realms will tell the story for a hundred years.`, 200, 120, HB.W - 400, { size: 18 });
      const c = st.chronicle.slice(-8);
      let y = 300; for (const e of c) { HB.text.draw(ctx, `Year ${e.year}: ${e.text}`, 200, y, { size: 13, color: HB.palette.inkSoft, maxWidth: HB.W - 400 }); y += 20; }
      this.ui.draw(ctx);
    }
  }
  HB.DeathScene = DeathScene;

  class LegendScene {
    constructor(state) { this.state = state; this.opaque = false; this.ui = new HB.ui.UI(); this.t = 0; }
    enter() { this.ui.add(new HB.ui.Button({ x: HB.W / 2 - 110, y: HB.H - 110, w: 220, h: 44, label: 'Go on', primary: true, onClick: () => HB.scenes.pop(this) })); this.ui.focusFirst(); }
    update(dt) { this.t += dt; this.ui.update(dt); }
    draw(ctx) {
      const st = this.state;
      ctx.fillStyle = 'rgba(15,8,4,0.6)'; ctx.fillRect(0, 0, HB.W, HB.H);
      HB.parchment.panel(ctx, 140, 60, HB.W - 280, HB.H - 120, { tone: 'light', title: 'A Legend' });
      HB.dragonArt.draw(ctx, HB.dragonArt.specOf(st), 'roar', 0, HB.W / 2, 200, 3 - st.dragon.tier * 0.4, 1);
      HB.text.paragraph(ctx, `The elder wyrm is dead and ${st.dragon.name} is the oldest fire in the world. Kingdoms will mark their borders by where you sleep. There is nothing left to prove, and a great deal left to take.\n\nThe chronicle goes on for as long as you do.`, 190, 300, HB.W - 380, { size: 19, lineHeight: 26, align: 'center' });
      this.ui.draw(ctx);
    }
  }
  HB.LegendScene = LegendScene;
})();
