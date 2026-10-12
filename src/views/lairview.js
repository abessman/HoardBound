/* Lair view: the hoard chamber close-up (the dragon on its hoard) or, zoomed out, every room of the lair (pictures in
 * src/art/lairart.js), plus hoard / build / workers / captives / domain / sleep panels. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;
  const px = HB.px;
  const LA = () => HB.lairArt, ZOOM_S = 0.35; // seconds to zoom between the hoard and all rooms

  class LairScene {
    constructor(state, opts = {}) {
      this.state = state; this.opaque = true; this.ui = new HB.ui.UI(); this.tab = opts.tab || 'hoard'; this.t = 0;
      this.buf = px.create(LA().W, LA().H); this.rbuf = px.create(LA().W, LA().H);
      // view: 'hoard' (the close-up) or 'rooms' (zoomed out); zoom runs 0 (hoard) → 1 (rooms)
      this.view = opts.view || 'hoard'; this.zoom = this.view === 'rooms' ? 1 : 0; this.pinchAcc = 0;
      if (opts.upgrade && HB.UPGRADE_BY_ID[opts.upgrade]) this.selectedUpgrade = { u: HB.UPGRADE_BY_ID[opts.upgrade] };
    }
    enter() { this.buildUi(); }
    buildUi() {
      const ui = this.ui; ui.clear(); this.tabWidgets = [];
      const st = this.state;
      const tabs = [['hoard', 'Hoard'], ['build', 'Build'], ['workers', 'Workers'], ['captives', 'Captives'], ['domain', 'Domain'], ['sleep', 'Sleep']];
      const px0 = 730, pw = 536;
      const tw = (pw - (tabs.length - 1) * 6) / tabs.length;
      tabs.forEach(([id, label], i) => ui.add(new HB.ui.Button({ x: px0 + i * (tw + 6), y: 20, w: tw, h: 36, label, size: 15, primary: this.tab === id, onClick: () => { this.tab = id; this.buildUi(); } })));
      ui.add(new HB.ui.Button({ x: 20, y: HB.H - 56, w: 180, h: 40, label: 'Back to map', size: 16, hotkey: 'cancel', hotkeyLabel: 'Esc', onClick: () => HB.scenes.pop(this) }));
      const F = this.frame, rooms = this.view === 'rooms';
      ui.add(new HB.ui.Button({ x: F.x + F.w - 162, y: F.y + 10, w: 152, h: 36, label: rooms ? 'The hoard' : 'All rooms', size: 15, hotkey: rooms ? 'zoomIn' : 'zoomOut', hotkeyLabel: rooms ? '+' : '−',
        tooltip: rooms ? 'Back to the dragon on its hoard (or pinch out, or tap the hoard).' : 'Zoom out to every room of the lair: what is built, what is being dug, and where more could go (or pinch in).',
        onClick: () => this.setView(rooms ? 'hoard' : 'rooms') }));
      ui.add(new HB.ui.Button({ x: 210, y: HB.H - 56, w: 180, h: 40, label: 'Rest a season', size: 16, tooltip: 'Pass 90 days at home: heal fully, let construction advance, let the world move. Workers are not paid until year’s end.', onClick: () => this.rest(90) }));
      this.panel = { x: px0, y: 70, w: pw, h: HB.H - 90 };
      const build = { hoard: this.buildHoardTab, build: this.buildBuildTab, workers: this.buildWorkersTab, captives: this.buildCaptivesTab, domain: this.buildDomainTab, sleep: this.buildSleepTab }[this.tab];
      build.call(this);
      ui.onCancel = () => HB.scenes.pop(this);
    }
    rest(days) {
      const st = this.state, d = st.dragon;
      HB.game.advanceDays(st, days); if (HB.worldsim) HB.worldsim.tickDays(st, days);
      d.health = d.stats.maxHealth; d.stamina = d.stats.maxStamina; d.injury = 0;
      if (HB.ransom) { const ev = HB.ransom.tickDays(st, 0); }
      HB.game.chronicle(st, `Rested at home for a season.`, 'lair');
      this.buildUi();
      if (HB.save) HB.save.autosave(st);
    }
    // ---------- tabs
    buildHoardTab() {
      const st = this.state, p = this.panel, ui = this.ui;
      const items = st.hoard.items.slice().sort((a, b) => (b.named ? 1 : 0) - (a.named ? 1 : 0) || b.value - a.value);
      this.list = ui.add(new HB.ui.ListBox({ x: p.x + 16, y: p.y + 228, w: p.w - 32, h: p.h - 250, items, itemHeight: 40, emptyText: st.hoard.gold > 0 ? 'Only coin so far. Treasures you bring home will be listed here.' : 'The hoard is empty. Everything you bring home will be counted here.',
        drawItem: (ctx, it, x, y, w, h, s) => { const lk = this._locked && this._locked.has(it.id); HB.text.draw(ctx, HB.hoard.itemLabel(it), x + 10, y + 18, { size: 14, family: it.named ? 'sc' : 'body', maxWidth: w - 150 }); HB.text.draw(ctx, `${lk ? 'In the strongroom · ' : ''}${HB.hoard.catName(it.cat)} · from ${it.source || '?'}${it.year ? ', Year ' + it.year : ''}`, x + 10, y + 33, { size: 11, italic: true, color: lk ? HB.palette.good : HB.palette.inkSoft, maxWidth: w - 150 }); HB.text.draw(ctx, HB.fmt.int(it.value) + ' g', x + w - 12, y + 24, { size: 14, align: 'right' }); },
        itemTooltip: (it) => it.named ? `${it.lore}\n\n${it.capability && HB.ARTIFACT_BY_ID[it.artifactId] ? HB.ARTIFACT_BY_ID[it.artifactId].capText + '\n\n' : ''}Effect: ${describeEffect(it.effect)}` : `${HB.hoard.catName(it.cat)}: ${HB.CATEGORIES[it.cat] ? HB.CATEGORIES[it.cat].desc : ''}` }));
    }
    buildBuildTab() {
      const st = this.state, p = this.panel, ui = this.ui;
      // upgrades that answer a problem you have had (or are about to have) come first, with the reason
      const items = HB.UPGRADES.map(u => ({ u, lv: HB.lair.level(st, u.id), can: HB.lair.canBuild(st, u.id), inProgress: st.lair.construction.find(c => c.id === u.id), why: HB.lair.level(st, u.id) < u.levels.length ? HB.lair.whyNow(st, u.id) : null }));
      items.sort((a, b) => (b.why && !b.inProgress ? 1 : 0) - (a.why && !a.inProgress ? 1 : 0));
      this.stopNow = HB.sleep.stopChances(st);
      this.list = ui.add(new HB.ui.ListBox({ x: p.x + 16, y: p.y + 60, w: p.w - 32, h: p.h - 196, items, itemHeight: 86, onSelect: (it) => { this.selectedUpgrade = it; this.buildUi(); }, selected: this.selectedUpgrade ? items.findIndex(i => i.u.id === this.selectedUpgrade.u.id) : -1,
        drawItem: (ctx, it, x, y, w, h) => { const next = it.u.levels[it.lv]; HB.text.draw(ctx, `${it.u.name}${it.lv ? ` (level ${it.lv}${it.lv >= it.u.levels.length ? ', complete' : ''})` : ''}`, x + 10, y + 20, { size: 15, family: 'sc' }); if (it.inProgress) { HB.text.draw(ctx, `Under construction: ${Math.round(it.inProgress.progress * 100)}% · about ${Math.ceil((1 - it.inProgress.progress) * it.inProgress.days / Math.max(0.2, HB.lair.buildRate(st)))} days left`, x + 10, y + 40, { size: 12, italic: true, color: HB.palette.warn }); } else if (next) HB.text.draw(ctx, `Next: ${HB.fmt.int(next.cost)} gold · ~${HB.lair.estimateDays(st, next.days)} days · ${describeEffects(next.effects)}`, x + 10, y + 40, { size: 12, italic: true, color: it.can.ok ? HB.palette.good : HB.palette.inkSoft, maxWidth: w - 20 }); else HB.text.draw(ctx, it.u.mitigates, x + 10, y + 40, { size: 12, italic: true, color: HB.palette.inkSoft }); HB.text.paragraph(ctx, it.why ? 'Why now: ' + it.why : it.u.mitigates, x + 10, y + 47, w - 20, { size: 12, lineHeight: 15, maxLines: 2, italic: !it.why, color: it.why ? HB.palette.warn : HB.palette.inkSoft }); },
        itemTooltip: (it) => `${it.u.desc}\n\nMitigates: ${it.u.mitigates}${it.can.ok ? '' : '\n\n' + it.can.reason}` }));
      const sel = this.selectedUpgrade && items.find(i => i.u.id === this.selectedUpgrade.u.id);
      if (sel) {
        const pv = HB.lair.buildPreview(st, sel.u.id);
        ui.add(new HB.ui.Button({ x: p.x + 16, y: p.y + p.h - 80, w: 220, h: 40, label: `Build ${sel.u.name}`, primary: true, size: 15, disabled: !sel.can.ok, disabledReason: sel.can.reason || '', tooltip: pv ? `Cost ${HB.fmt.int(pv.cost)} gold → ${HB.fmt.int(pv.balance)} left. ${pv.diff.length ? 'Hoard power changes: ' + pv.diff.map(d => `${d.label} ${HB.fmt.signed(d.delta, 1)}`).join(', ') + '.' : 'No change to your power.'} About ${pv.days} days with your current workers.` : '', onClick: () => { const r = HB.lair.build(st, sel.u.id); if (!r.ok) HB.notice('Cannot build', r.reason); else HB.notice('Work begins', `${sel.u.name}: ${HB.fmt.int(pv.cost)} gold spent. ${pv.diff.length ? 'Your hoard’s power shifts: ' + pv.diff.map(d => `${d.label} ${HB.fmt.signed(d.delta, 1)}`).join(', ') + '.' : ''} The workers reckon about ${pv.days} days.`); this.buildUi(); } }));
        this.buildPreviewInfo = pv;
        this.buildEffect = HB.lair.level(st, sel.u.id) < sel.u.levels.length ? HB.goals.upgradeEffect(st, sel.u.id, this.stopNow) : 'Complete.';
      } else this.buildEffect = null;
    }
    buildWorkersTab() {
      const st = this.state, p = this.panel, ui = this.ui;
      const groups = st.lair.workers;
      const taskOpts = Object.keys(HB.WORKER_TASKS).map(k => ({ label: HB.WORKER_TASKS[k].name, value: k }));
      let y = p.y + 50;
      HB.text.draw(HB.app.ctx, '', 0, 0);
      this.workerRows = [];
      for (const g of groups) {
        const T = HB.WORKER_TYPES[g.type];
        const tg = ui.add(new HB.ui.Toggle({ x: p.x + 16, y, w: p.w - 170, h: 30, label: `${g.count} ${g.count === 1 ? T.single : T.name.toLowerCase()} (${g.status}, loyalty ${Math.round(g.loyalty)})`, value: g.task, onChange: (v) => { g.task = v; }, tooltip: `${T.desc}\nFrom ${g.from}. ${g.status === 'enslaved' ? 'Unpaid; unrest grows each year: sabotage, escape, revolt.' : `Wages ${g.count * T.wage} gold a year.`}` }));
        tg.setOptions(taskOpts, g.task);
        ui.add(new HB.ui.Button({ x: p.x + p.w - 146, y, w: 130, h: 30, label: g.status === 'enslaved' ? 'Free them' : 'Dismiss', size: 13, onClick: () => { HB.lair.dismiss(st, g); this.buildUi(); } }));
        y += 38;
      }
      if (!groups.length) { this.workersEmptyY = y; y += 30; }
      this.offersY = y + 16;
      const offers = HB.lair.hireOffers(st);
      this.offerList = ui.add(new HB.ui.ListBox({ x: p.x + 16, y: this.offersY + 24, w: p.w - 32, h: p.h - (this.offersY - p.y) - 60, items: offers, itemHeight: 52, emptyText: 'No crews will come yet.',
        onSelect: (o) => { const r = HB.lair.hire(st, o); if (!r.ok) HB.notice('No deal', r.reason); else { HB.notice('Hired', `${o.count} ${HB.WORKER_TYPES[o.type].name.toLowerCase()} from ${o.from} arrive for ${o.fee} gold. They expect ${o.count * o.wage} gold a year.`); this.buildUi(); } },
        drawItem: (ctx, o, x, y, w, h) => { HB.text.draw(ctx, `${o.count} ${HB.WORKER_TYPES[o.type].name.toLowerCase()} from ${o.from}`, x + 10, y + 20, { size: 14, family: 'sc', color: o.available ? HB.palette.ink : HB.palette.inkSoft }); HB.text.draw(ctx, o.available ? `Fee ${o.fee} gold, then ${o.count * o.wage} a year. Click to hire.` : o.reason, x + 10, y + 38, { size: 12, italic: true, color: o.available ? HB.palette.good : HB.palette.inkSoft, maxWidth: w - 20 }); },
        itemTooltip: (o) => HB.WORKER_TYPES[o.type].desc }));
    }
    buildCaptivesTab() {
      const st = this.state, p = this.panel, ui = this.ui;
      const caps = st.lair.captives;
      this.list = ui.add(new HB.ui.ListBox({ x: p.x + 16, y: p.y + 50, w: p.w - 32, h: 200, items: caps, itemHeight: 46, emptyText: 'No captives. Seize nobles, heirs and craftsmen during raids.', selected: this.selectedCaptive ? caps.indexOf(this.selectedCaptive) : -1, onSelect: (c) => { this.selectedCaptive = c; this.buildUi(); },
        drawItem: (ctx, c, x, y, w, h) => { HB.text.draw(ctx, c.name, x + 10, y + 19, { size: 14, family: 'sc' }); HB.text.draw(ctx, `${HB.CAPTIVE_KINDS[c.kind] ? HB.CAPTIVE_KINDS[c.kind].label : c.kind} from ${c.from}${c.pending ? ` · demand out, ${Math.max(1, Math.ceil(c.pending.daysLeft))} days` : ''}`, x + 10, y + 36, { size: 12, italic: true, color: HB.palette.inkSoft }); } }));
      const c = this.selectedCaptive && caps.includes(this.selectedCaptive) ? this.selectedCaptive : null;
      if (c && HB.ransom) {
        const { opts, rescueRisk } = HB.ransom.options(st, c);
        let y = p.y + 300;
        this.captiveInfoY = p.y + 258; this.captiveRescue = rescueRisk;
        for (const o of opts) { ui.add(new HB.ui.Button({ x: p.x + 16, y, w: p.w - 32, h: 34, label: o.label, size: 14, align: 'left', disabled: !!c.pending || !!o.disabled, disabledReason: c.pending ? 'A demand is already out' : 'Not possible for this captive', tooltip: o.desc, onClick: () => { const r = HB.ransom.demand(st, c, o); HB.notice('Demand sent', r.ok ? `Your terms go to ${HB.ransom.payerName(st, c)}. Expect an answer in about ${r.days} days. Risks: refusal, stalling, a short-weighted chest, or a rescue attempt on the lair (${Math.round(rescueRisk * 100)}%).` : r.reason); this.buildUi(); } })); y += 38; }
        ui.add(new HB.ui.Button({ x: p.x + 16, y: y + 6, w: 200, h: 34, label: 'Release', size: 14, tooltip: 'Let them go. Trust with their realm grows; so does your reputation for mercy.', onClick: () => { HB.ransom.release(st, c); this.selectedCaptive = null; this.buildUi(); } }));
        const trade = c.kind === 'smith' || c.kind === 'engineer' || c.kind === 'miner';
        ui.add(new HB.ui.Button({ x: p.x + 226, y: y + 6, w: 200, h: 34, label: 'Put to work', size: 14, disabled: !trade, disabledReason: 'Only craftsmen and miners are useful as labour', tooltip: 'Forced labour: no wages, low loyalty, unrest over the years, and their realm will hate you for it.', onClick: () => { const r = HB.lair.enslave(st, c); if (!r.ok) HB.notice('No', r.reason); this.selectedCaptive = null; this.buildUi(); } }));
      }
    }
    buildDomainTab() {
      const st = this.state, p = this.panel, ui = this.ui, D = HB.domain;
      if (!D) return;
      const members = D.members(st).concat(st.world.locations.filter(L => D.statusOf(st, L) === 'resisting').map(L => ({ L, status: 'resisting' })));
      const order = { resisting: 0, occupied: 1, allied: 2, protected: 3, tributary: 4 };
      members.sort((a, b) => order[a.status] - order[b.status] || a.L.name.localeCompare(b.L.name));
      this.domainListY = p.y + p.h - 236;
      // the settlement at your hill: gifts from the hoard (adult, a village or more) and its people as workers
      const h = D.home(st), bx = p.x + p.w - 194; let by = p.y + 38; this.domainBtns = false;
      for (const size of ['small', 'great']) {
        const c = D.canGift(st, size); if (!c.show) continue;
        const G = D.GIFTS[size]; this.domainBtns = true;
        ui.add(new HB.ui.Button({ x: bx, y: by, w: 178, h: 32, label: `${size === 'great' ? 'A great gift' : 'Bestow a gift'}: ${G.gold}g`, size: 13, disabled: !c.ok, disabledReason: c.reason,
          tooltip: h.path === 'tyrannical' ? `Bread and beer for ${h.name}: unrest falls by ${G.unrest}, and it counts as ${HB.fmt.plural(G.favour, 'year')} of growth.` : `For ${h.name}: it counts as ${HB.fmt.plural(G.favour, 'year')} of growth, and the places that trust you trust you more (+${G.trust}).`,
          onClick: () => { const t = D.gift(st, size); HB.notice(h.name, t); this.buildUi(); if (HB.save) HB.save.autosave(st); } }));
        by += 38;
      }
      if (h.stage > 0 && HB.lair.hireOffers(st).some(o => o.from === h.name)) { this.domainBtns = true; ui.add(new HB.ui.Button({ x: bx, y: by, w: 178, h: 32, label: 'Recruit workers', size: 13, tooltip: `${h.name}'s people will work for you: see them in the Workers tab.`, onClick: () => { this.tab = 'workers'; this.buildUi(); } })); }
      this.list = ui.add(new HB.ui.ListBox({ x: p.x + 16, y: this.domainListY + 24, w: p.w - 32, h: 196, items: members, itemHeight: 44, emptyText: 'No settlement is yours yet. Protect places that trust you, or make places that fear you pay.',
        onSelect: (m) => { const map = HB.flow && HB.flow.map; HB.scenes.pop(this); if (map) { map.select(m.L); map.centerOn(m.L.x + 0.5, m.L.y + 0.5, Math.max(map.cam.zoom, 1.4)); } },
        drawItem: (ctx, m, x, y, w, h) => {
          const S = HB.DOMAIN_STATUSES[m.status], L = m.L;
          HB.text.draw(ctx, L.name, x + 10, y + 18, { size: 14, family: 'sc', maxWidth: w - 140 });
          HB.text.draw(ctx, S.name, x + w - 10, y + 18, { size: 13, align: 'right', family: 'sc', color: S.color });
          const t = L.tribute && !L.tribute.lapsed ? `${L.tribute.willing ? 'gifts' : 'pays'} ${HB.fmt.int(L.tribute.amount)} a year` : 'pays nothing';
          const extra = L.occupation ? `resistance ${Math.round(L.occupation.resistance)} of 60` : m.status === 'protected' || m.status === 'allied' ? `trust ${Math.round(L.trust)}` : `fear ${Math.round(L.fear)}`;
          HB.text.draw(ctx, `${HB.fmt.cap(HB.world.locTypeName(L))} · ${t} · ${extra}`, x + 10, y + 35, { size: 12, italic: true, color: m.status === 'resisting' ? HB.palette.bad : HB.palette.inkSoft, maxWidth: w - 20 });
        },
        itemTooltip: (m) => `${HB.DOMAIN_STATUSES[m.status].text}\n\nTap to find it on the map.` }));
    }
    drawDomainTab(ctx) {
      const st = this.state, p = this.panel, Pp = HB.palette, D = HB.domain;
      if (!D) return;
      const h = D.home(st), S = D.stageInfo(st), nr = D.nextReqs(st), path = D.path(st), x = p.x + 18, w = p.w - 36 - (this.domainBtns ? 196 : 0);
      let y = p.y + 40;
      if (S) {
        HB.text.draw(ctx, `${h.name}: ${S.name}`, x, y + 14, { size: 18, family: 'sc', color: h.path === 'tyrannical' ? '#7a2418' : '#6a5414', maxWidth: w }); y += 22;
        y += HB.text.paragraph(ctx, S.text, x, y, w, { size: 13, italic: true, color: Pp.inkSoft, lineHeight: 16, maxLines: 2 }) + 4;
        for (const g of S.gives) { ctx.fillStyle = h.path === 'tyrannical' ? Pp.warn : Pp.good; ctx.beginPath(); ctx.arc(x + 4, y + 8, 2.6, 0, Math.PI * 2); ctx.fill(); y += HB.text.paragraph(ctx, g, x + 14, y, w - 14, { size: 13, lineHeight: 16, maxLines: 1 }) + 1; }
        if (h.path === 'tyrannical') { HB.text.draw(ctx, `Unrest ${Math.round(h.unrest)} of 60: guards and a guard post hold it down.`, x, y + 12, { size: 13, italic: true, color: h.unrest >= 40 ? Pp.bad : Pp.warn }); y += 18; }
      } else {
        HB.text.draw(ctx, 'Nobody lives at the foot of your hill', x, y + 14, { size: 17, family: 'sc' }); y += 22;
        y += HB.text.paragraph(ctx, 'Once you are a young dragon, people camp around your hill: pilgrims if they trust you, a cult if they fear you. As an adult the camps become a village (or a fortified settlement); as an ancient dragon a castle (or a dark tower) rises beside your lair.', x, y, w, { size: 13, italic: true, color: Pp.inkSoft, lineHeight: 16, maxLines: 3 }) + 4;
      }
      y += 6; HB.parchment.rule(ctx, x, y, w, { ornament: false }); y += 10;
      if (nr.target) {
        HB.text.draw(ctx, h.stage ? `To grow into ${nr.target.noun}` : `To found ${nr.target.noun}`, x, y + 14, { size: 15, family: 'sc' }); y += 22;
        for (const r of nr.reqs) {
          reqMark(ctx, x + 2, y + 2, r.done);
          HB.text.draw(ctx, `${r.label}${r.need !== undefined && !r.done ? ` (${HB.fmt.int(r.cur)} of ${HB.fmt.int(r.need)})` : ''}`, x + 22, y + 13, { size: 13, color: r.done ? Pp.inkSoft : Pp.ink, maxWidth: w - 22 }); y += 17;
          if (!r.done && r.hint) { y += HB.text.paragraph(ctx, r.hint, x + 22, y, w - 22, { size: 12, italic: true, color: Pp.inkSoft, lineHeight: 14, maxLines: 2 }) + 2; }
        }
      } else if (h.stage >= 4) { y += HB.text.paragraph(ctx, `${h.name} has grown as far as it can.`, x, y, w, { size: 13, italic: true, color: Pp.inkSoft }) + 4; }
      else if (nr.reqs.length) { HB.text.draw(ctx, 'To bring people to your hill', x, y + 14, { size: 15, family: 'sc' }); y += 22; for (const r of nr.reqs) { reqMark(ctx, x + 2, y + 2, r.done); HB.text.draw(ctx, r.label, x + 22, y + 13, { size: 13, maxWidth: w - 22 }); y += 17; if (!r.done && r.hint) y += HB.text.paragraph(ctx, r.hint, x + 22, y, w - 22, { size: 12, italic: true, color: Pp.inkSoft, lineHeight: 14, maxLines: 3 }) + 2; } }
      const inf = D.influence(st), members = D.members(st).length;
      const ly = this.domainListY;
      const lr = D.lairRadius(st), region = st.world.regions[D.homeRegion(st)];
      HB.text.paragraph(ctx, `Your rule: ${path.name.toLowerCase()} (benevolence ${Math.round(st.dragon.alignment)}). ${HB.fmt.cap(HB.fmt.plural(members, 'settlement'))} in your domain. Your territory reaches ${Math.round(lr.r)} leagues from the lair${lr.progress < 1 ? `, more as your hoard grows (up to ${lr.next} in this phase)` : ''}; it cannot pass the storms around ${region.name}.`, x, Math.max(y + 4, ly - 50), p.w - 36, { size: 13, color: Pp.ink, lineHeight: 16, maxLines: 3 });
      HB.text.draw(ctx, 'What is yours', x, ly + 16, { size: 14, family: 'sc' });
    }
    buildSleepTab() {
      const st = this.state, p = this.panel, ui = this.ui;
      if (!HB.sleep) { return; }
      const opts = HB.sleep.durations(st);
      this.sleepOpts = opts;
      this.list = ui.add(new HB.ui.ListBox({ x: p.x + 16, y: p.y + 50, w: p.w - 32, h: 230, items: opts, itemHeight: 54, selected: this.sleepSel || 0, onSelect: (o, i) => { this.sleepSel = i; this.buildUi(); },
        drawItem: (ctx, o, x, y, w, h) => { HB.text.draw(ctx, o.label, x + 10, y + 20, { size: 15, family: 'sc', color: o.allowed ? HB.palette.ink : HB.palette.inkSoft }); HB.text.draw(ctx, o.allowed ? o.summary : o.reason, x + 10, y + 40, { size: 12, italic: true, color: HB.palette.inkSoft, maxWidth: w - 20 }); } }));
      const sel = opts[this.sleepSel || 0];
      this.sleepPreview = sel ? HB.sleep.preview(st, sel.years) : null;
      ui.add(new HB.ui.Button({ x: p.x + 16, y: p.y + p.h - 80, w: 260, h: 40, label: sel ? `Sleep ${sel.label.toLowerCase()}` : 'Sleep', primary: true, size: 15, disabled: !sel || !sel.allowed, disabledReason: sel ? sel.reason : '', tooltip: 'Years pass. You grow; the world changes; thieves and hunters test the lair.', onClick: () => HB.confirm('Sleep?', `${sel.label}: ${this.sleepPreview.warning || 'The hoard is as safe as you have made it.'} Begin?`, () => { HB.scenes.pop(this); HB.sleep.begin(st, sel.years, HB.flow.map); }, { yes: 'Sleep', no: 'Not yet' }) }));
    }
    // ---------- update / draw
    setView(v) { if (v === this.view) return; this.view = v; this.pinnedTrophy = null; this.hoverRoom = null; this.buildUi(); }
    update(dt) {
      this.t += dt; this.ui.update(dt);
      if (HB.cheats && HB.cheats.any(this.state)) { const n = this.state.lair.construction.length; HB.cheats.topUp(this.state); if (n !== this.state.lair.construction.length) this.buildUi(); }
      const target = this.view === 'rooms' ? 1 : 0;
      this.zoom = target > this.zoom ? Math.min(target, this.zoom + dt / ZOOM_S) : Math.max(target, this.zoom - dt / ZOOM_S);
      const ptr = HB.input.pointer, F = this.frame, L = LA();
      const inFrame = HB.pointInRect(ptr.x, ptr.y, F.x, F.y, F.w, F.h);
      // pinch in or wheel down: all rooms; pinch out or wheel up: the hoard
      if (inFrame) {
        this.pinchAcc += ptr.pinch || 0;
        if (ptr.wheel > 0 || this.pinchAcc < -0.25) { this.setView('rooms'); this.pinchAcc = 0; }
        else if (ptr.wheel < 0 || this.pinchAcc > 0.25) { this.setView('hoard'); this.pinchAcc = 0; }
      }
      if (!ptr.down) this.pinchAcc = 0;
      const bx = (ptr.x - F.x) * L.W / F.w, by = (ptr.y - F.y) * L.H / F.h;
      const tapped = ptr.released && !ptr.dragging && !this.ui.consumedPointer && inFrame && this.zoom === target;
      if (this.view === 'hoard') {
        const hit = inFrame ? (this.trophyRects || []).find(r => HB.pointInRect(bx, by, r.x, r.y, r.w, r.h)) : null;
        this.hoverTrophy = hit || null;
        if (tapped) this.pinnedTrophy = hit && this.pinnedTrophy !== hit.item ? hit.item : null;
        if (this.pinnedTrophy && !this.state.hoard.items.includes(this.pinnedTrophy)) this.pinnedTrophy = null;
      } else {
        const hit = inFrame ? (this.rooms || []).find(r => HB.pointInRect(bx, by, r.x, r.y, r.w, r.h)) : null;
        this.hoverRoom = hit || null;
        if (tapped && hit) this.openRoom(hit);
      }
    }
    /** a tapped room: the hoard zooms in; captives open their tab; an upgrade opens in the Build tab */
    openRoom(r) {
      if (r.id === 'chamber') { this.setView('hoard'); return; }
      if (r.captives) { this.tab = 'captives'; this.buildUi(); return; }
      if (HB.UPGRADE_BY_ID[r.id]) { this.tab = 'build'; this.selectedUpgrade = { u: HB.UPGRADE_BY_ID[r.id] }; this.buildUi(); }
    }
    get frame() { return { x: 20, y: 20, w: 690, h: 388 }; } // exactly 2× the 345×194 lair pictures
    drawTrophyTip(ctx) {
      if (this.view !== 'hoard' || this.zoom > 0) return;
      const r = this.hoverTrophy && HB.input.usingPointer() && HB.input.lastDevice !== 'touch' ? this.hoverTrophy : this.pinnedTrophy ? (this.trophyRects || []).find(q => q.item === this.pinnedTrophy) : null;
      if (!r) return;
      const it = r.item, F = this.frame, L = LA();
      const lines = [`${HB.hoard.itemLabel(it)} — ${HB.fmt.int(it.value)} gold`, `${HB.hoard.catName(it.cat)} · from ${it.source || 'somewhere'}${it.year ? ', Year ' + it.year : ''} · ${HB.fmt.int(HB.hoard.itemDensity(it))} gold per space`];
      if (it.lore) lines.push(it.lore);
      lines.push(r.locked ? 'Locked in the strongroom: thieves cannot reach it.' : 'Within a thief’s reach.');
      // place the card above the alcove so the pile stays visible
      const text = lines.join('\n');
      const th = HB.text.wrap(ctx, text, 280, 14).length * 14 * 1.3 + 14;
      const sx = F.x + (r.x + r.w / 2) * F.w / L.W, top = F.y + r.y * F.h / L.H;
      HB.ui.UI.drawTooltip(ctx, text, null, { x: HB.clamp(sx - 150, F.x, F.x + F.w - 300), y: Math.max(F.y + 30, top - th - 6) });
    }
    draw(ctx) {
      const st = this.state, Pp = HB.palette, F = this.frame, L = LA();
      HB.parchment.fill(ctx, 0, 0, HB.W, HB.H, 'dark');
      HB.parchment.vignette(ctx, 0, 0, HB.W, HB.H, 0.45);
      this.drawPicture(ctx);
      HB.parchment.border(ctx, F.x - 2, F.y - 2, F.w + 4, F.h + 4, { width: 2, flourish: 10 });
      // dragon status under the picture
      this.drawStatus(ctx, F.x, F.y + F.h + 16, F.w);
      // caption: how rich the hoard is for its size, or what the rooms view shows
      const dens = HB.hoard.density(st), cap = (txt) => HB.text.draw(ctx, txt, F.x + 12, F.y + 26, { size: 14, italic: true, color: Pp.parchmentLight, stroke: 'rgba(20,10,5,0.75)', strokeWidth: 3, maxWidth: F.w - 190 });
      if (this.zoom === 0 && dens > 0) cap(`${HB.fmt.cap(HB.hoard.richnessName(st))} · ${HB.fmt.int(dens)} gold per space${this.trophyRects && this.trophyRects.length ? ' · tap a treasure on the wall' : ''}`);
      if (this.zoom === 1) cap('Your lair · dotted: could be dug · tap a room');
      // right panel
      const p = this.panel;
      HB.parchment.panel(ctx, p.x, p.y, p.w, p.h, { tone: 'light', title: { hoard: 'The Hoard', build: 'The Lair', workers: 'Workers', captives: 'Captives', domain: 'Your Domain', sleep: 'Sleep' }[this.tab] });
      const drawTab = { hoard: this.drawHoardTab, build: this.drawBuildTab, workers: this.drawWorkersTab, captives: this.drawCaptivesTab, domain: this.drawDomainTab, sleep: this.drawSleepTab }[this.tab];
      drawTab.call(this, ctx);
      this.ui.draw(ctx);
      this.drawTrophyTip(ctx);
    }
    /** the close-up, the rooms view, or (while zooming) the hoard room growing into the close-up */
    drawPicture(ctx) {
      const st = this.state, F = this.frame, L = LA(), z = this.zoom;
      const asleep = st.phase === 'sleeping';
      if (z < 1) this.trophyRects = L.drawChamber(this.buf.ctx, st, this.t, { asleep }).trophyRects;
      if (z > 0) this.rooms = L.drawRooms(this.rbuf.ctx, st, this.t);
      ctx.save(); ctx.beginPath(); ctx.rect(F.x, F.y, F.w, F.h); ctx.clip(); ctx.imageSmoothingEnabled = false;
      if (z === 0) ctx.drawImage(this.buf, F.x, F.y, F.w, F.h);
      else {
        // the hoard room's rectangle in the rooms picture eases from filling the frame (z = 0) to its place (z = 1)
        const hr = L.ROOMS.find(r => r.id === 'chamber'), e = z * z * (3 - 2 * z);
        const sx = F.w / L.W, sy = F.h / L.H, full = { x: F.x, y: F.y, w: F.w, h: F.h }, home = { x: F.x + hr.x * sx, y: F.y + hr.y * sy, w: hr.w * sx, h: hr.h * sy };
        const cur = { x: HB.lerp(full.x, home.x, e), y: HB.lerp(full.y, home.y, e), w: HB.lerp(full.w, home.w, e), h: HB.lerp(full.h, home.h, e) };
        const k = cur.w / (hr.w * sx); // how much the rooms picture is enlarged
        ctx.drawImage(this.rbuf, cur.x - hr.x * sx * k, cur.y - hr.y * sy * k, F.w * k, F.h * k);
        if (z < 0.6) { ctx.globalAlpha = 1 - z / 0.6; ctx.drawImage(this.buf, cur.x, cur.y, cur.w, cur.h); ctx.globalAlpha = 1; }
        if (z === 1) this.drawRoomLabels(ctx);
      }
      ctx.restore();
    }
    drawRoomLabels(ctx) {
      const F = this.frame, L = LA(), sx = F.w / L.W, sy = F.h / L.H, Pp = HB.palette;
      for (const r of this.rooms || []) {
        if (r.optional && !r.built) continue;
        const max = r.max || 1, lv = r.level || 0;
        // built rooms in light text with their level; rooms not dug yet dim (their dotted outline shows where)
        const status = r.building ? ` · ${Math.round(r.building.progress * 100)}%` : r.built && max > 1 ? ` ${lv}/${max}` : '';
        HB.text.draw(ctx, r.label + status, F.x + r.lx * sx, F.y + r.ly * sy + 5, { size: 13, family: 'sc', align: r.align || 'center', color: r.built || r.building ? Pp.parchmentLight : 'rgba(233,220,188,0.6)', stroke: 'rgba(20,10,5,0.85)', strokeWidth: 3 });
        if (this.hoverRoom && this.hoverRoom.id === r.id) { ctx.strokeStyle = 'rgba(255,230,160,0.9)'; ctx.lineWidth = 2; ctx.strokeRect(F.x + r.x * sx - 2, F.y + r.y * sy - 2, r.w * sx + 4, r.h * sy + 4); }
      }
    }
    drawStatus(ctx, x, y, w) {
      const st = this.state, d = st.dragon, s = d.stats, Pp = HB.palette;
      HB.parchment.panel(ctx, x, y, w, HB.H - y - 76, { stains: false, vignette: 0.1, flourish: 0 });
      HB.text.draw(ctx, `${d.name}, ${HB.TIERS[d.tier].name.toLowerCase()}, ${HB.game.ageString(st)}`, x + 16, y + 28, { size: 18, family: 'sc' });
      HB.text.draw(ctx, HB.game.dateString(st), x + w - 16, y + 28, { size: 14, align: 'right', color: Pp.inkSoft });
      const al = d.alignment; const alText = al < -60 ? 'a tyrant' : al < -25 ? 'feared and cruel' : al < 25 ? 'neither cruel nor kind' : al < 60 ? 'known for mercy' : 'a protector';
      HB.text.draw(ctx, `Reputation: ${alText} (${al > 0 ? '+' : ''}${Math.round(al)}) · Prestige ${Math.round(s.prestige)} · Dominance ${Math.round(s.dominance)}`, x + 16, y + 50, { size: 13, italic: true, color: Pp.inkSoft });
      const cols = [['Health', `${d.health}/${s.maxHealth}`], ['Defence', s.defense], ['Breath', s.breath], ['Bite', s.bite], ['Stamina', `${d.stamina}/${s.maxStamina}`], ['Carry', s.capacity], ['Sight', s.vision.toFixed(1)], ['Intel', s.intel.toFixed(1)]];
      const cw = (w - 32) / 4;
      cols.forEach(([k, v], i) => { const cx = x + 16 + (i % 4) * cw, cy = y + 80 + Math.floor(i / 4) * 40; HB.text.draw(ctx, k, cx, cy, { size: 12, family: 'sc', color: Pp.inkSoft }); HB.text.draw(ctx, String(v), cx, cy + 20, { size: 17 }); });
      const next = HB.TIERS[d.tier + 1];
      const m = HB.goals.milestone(st);
      const req = m.reqs.map(r => `${r.label.toLowerCase()} ${HB.fmt.int(r.cur)}/${HB.fmt.int(r.need)}${r.done ? ' (done)' : ''}`).join(', ');
      HB.text.paragraph(ctx, `${m.title}${req ? ': ' + req : ''}. Next: ${m.nextStep}`, x + 16, y + 158, w - 32, { size: 13, italic: true, color: Pp.ink, maxLines: 2, lineHeight: 16 });
    }
    drawHoardTab(ctx) {
      const st = this.state, p = this.panel, Pp = HB.palette;
      const totals = HB.stats.categoryTotals(st);
      const v = HB.lair.values(st);
      const total = HB.game.hoardValue(st);
      const sto = HB.lair.storage(st);
      HB.text.draw(ctx, `${HB.fmt.int(st.hoard.gold)} gold in coin · ${HB.fmt.int(total)} gold worth in all`, p.x + 16, p.y + 44, { size: 14, maxWidth: p.w - 32 });
      const roomText = sto.over > 0
        ? `The hoard fills ${Math.ceil(sto.used)} spaces and the chamber has ${sto.space}. ${HB.fmt.int(sto.exposedValue)} gold worth lies outside it, where thieves can take it easily. Build a larger treasure chamber.`
        : `The hoard fills ${Math.ceil(sto.used)} of the chamber’s ${sto.space} spaces (100 coins to a space; items by size). At ${HB.fmt.int(HB.hoard.density(st))} gold per space it is ${HB.hoard.richnessName(st)}.`;
      this._locked = HB.hoard.protectedIds(st);
      HB.text.paragraph(ctx, roomText, p.x + 16, p.y + 50, p.w - 32, { size: 13, italic: true, color: sto.over > 0 ? Pp.bad : Pp.inkSoft, maxLines: 2, lineHeight: 16 });
      let y = p.y + 92;
      const cats = Object.keys(HB.CATEGORIES);
      for (const c of cats) {
        const def = HB.CATEGORIES[c];
        const val = totals[c] || 0;
        const bonusText = Object.keys(def.bonus).map(k => { const [cap, scale] = def.bonus[k]; const b = HB.stats.diminishing(val, cap, scale); return `${k === 'maxHealth' ? 'health' : k} +${b.toFixed(1)}`; }).join(', ');
        HB.text.draw(ctx, def.name, p.x + 16, y + 14, { size: 13, family: 'sc' });
        HB.text.draw(ctx, HB.fmt.int(val) + ' g', p.x + 190, y + 14, { size: 13, align: 'right' });
        HB.text.draw(ctx, c === 'artifacts' ? `${st.hoard.items.filter(i => i.named).length} named` : bonusText || def.desc, p.x + 200, y + 14, { size: 12, italic: true, color: Pp.inkSoft, maxWidth: p.w - 216 });
        y += 22;
      }
    }
    drawBuildTab(ctx) {
      const st = this.state, p = this.panel, Pp = HB.palette;
      const v = HB.lair.values(st);
      HB.text.draw(ctx, `Defence ${Math.round(v.defense)} · concealment ${v.concealment} · traps ${v.traps} · guards ${Math.round(v.guardStrength)} · ward ${v.ward} · gold ${HB.fmt.int(st.hoard.gold)}`, p.x + 16, p.y + 44, { size: 13, maxWidth: p.w - 32 });
      const sc = this.stopNow || HB.sleep.stopChances(st);
      const ey = p.y + p.h - 130;
      if (this.buildEffect && this.selectedUpgrade) HB.text.paragraph(ctx, `${this.selectedUpgrade.u.name}: ${this.buildEffect}`, p.x + 16, ey, p.w - 32, { size: 13, maxLines: 3, lineHeight: 16 });
      else HB.text.paragraph(ctx, `At the door your defences turn back about ${Math.round(sc.thief * 100)}% of thieves and ${Math.round(sc.hunt * 100)}% of hunting parties. Choose an upgrade to see what it changes.`, p.x + 16, ey, p.w - 32, { size: 13, italic: true, color: Pp.inkSoft, maxLines: 3, lineHeight: 16 });
      if (this.selectedUpgrade && this.buildPreviewInfo) { const pv = this.buildPreviewInfo; HB.text.draw(ctx, `Spend ${HB.fmt.int(pv.cost)} → ${HB.fmt.int(pv.balance)} left${pv.diff.length ? ' · ' + pv.diff.map(d => `${d.label} ${HB.fmt.signed(d.delta, 1)}`).join(', ') : ''} · ~${pv.days} days`, p.x + 250, p.y + p.h - 54, { size: 12, italic: true, color: pv.diff.some(d => d.delta < 0) ? Pp.warn : Pp.inkSoft, maxWidth: p.w - 270 }); }
    }
    drawWorkersTab(ctx) {
      const st = this.state, p = this.panel, Pp = HB.palette;
      const rate = HB.lair.buildRate(st);
      HB.text.draw(ctx, `Build rate ${rate.toFixed(1)}× (a lone dragon manages 0.2×). Guards add ${Math.round(HB.lair.guardStrength(st))} defence.`, p.x + 16, p.y + 40, { size: 13, maxWidth: p.w - 32 });
      if (this.workersEmptyY) HB.text.draw(ctx, 'No workers. Hire crews below, or put captured craftsmen to work.', p.x + 16, this.workersEmptyY + 14, { size: 13, italic: true, color: Pp.inkSoft });
      HB.text.draw(ctx, 'Crews for hire', p.x + 16, this.offersY + 14, { size: 14, family: 'sc' });
    }
    drawCaptivesTab(ctx) {
      const st = this.state, p = this.panel, Pp = HB.palette;
      HB.text.draw(ctx, `${st.lair.captives.length} held. Each resolves once: ransom, release, or labour.`, p.x + 16, p.y + 40, { size: 13 });
      const c = this.selectedCaptive && st.lair.captives.includes(this.selectedCaptive) ? this.selectedCaptive : null;
      if (c && HB.ransom) HB.text.paragraph(ctx, HB.ransom.describe(st, c) + ` Rescue risk if you demand: ${Math.round(this.captiveRescue * 100)}%.`, p.x + 16, this.captiveInfoY, p.w - 32, { size: 13, italic: true, color: Pp.inkSoft });
    }
    drawSleepTab(ctx) {
      const st = this.state, p = this.panel, Pp = HB.palette;
      if (!HB.sleep) { HB.text.draw(ctx, 'Sleep is not available in this build.', p.x + 16, p.y + 44, { size: 14 }); return; }
      HB.text.draw(ctx, 'Sleep ages you, heals you, and lets the world move. The lair is as safe as you have made it.', p.x + 16, p.y + 40, { size: 13, italic: true, color: Pp.inkSoft, maxWidth: p.w - 32 });
      const pv = this.sleepPreview;
      if (pv) { let y = p.y + 300; for (const line of pv.lines) { const h = HB.text.paragraph(ctx, line.text, p.x + 16, y, p.w - 32, { size: 13, color: line.tone === 'bad' ? Pp.bad : line.tone === 'good' ? Pp.good : line.tone === 'warn' ? Pp.warn : Pp.ink }); y += h + 4; } }
    }
  }
  function describeEffect(e) { if (!e) return 'none'; const parts = []; for (const k in e) { if (k === 'mul') for (const kk in e.mul) parts.push(`${kk} ×${e.mul[kk]}`); else parts.push(`${k} ${typeof e[k] === 'number' ? HB.fmt.signed(e[k]) : e[k]}`); } return parts.join(', '); }
  function describeEffects(e) { if (e.space) return `room for ${HB.fmt.int(e.space)} spaces of treasure`; if (e.strongroom) return `locks away your ${e.strongroom} most prized treasures`; const names = { defense: 'defence', concealment: 'concealment', traps: 'traps', guard: 'guard', sleepSafety: 'sleep safety', ward: 'ward', forge: 'forge', heal: 'healing', warning: 'warning' }; return Object.keys(e).map(k => `${names[k] || k} +${e[k]}`).join(', '); }
  /** a drawn tick or cross for a requirement (no font glyphs needed) */
  function reqMark(ctx, x, y, done) {
    ctx.save(); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = done ? HB.palette.good : HB.palette.bad; ctx.beginPath();
    if (done) { ctx.moveTo(x + 1, y + 7); ctx.lineTo(x + 5, y + 11); ctx.lineTo(x + 12, y + 2); } else { ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 11, y + 11); ctx.moveTo(x + 11, y + 2); ctx.lineTo(x + 2, y + 11); }
    ctx.stroke(); ctx.restore();
  }
  HB.LairScene = LairScene;
})();
