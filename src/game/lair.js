/* Lair: upgrades, construction, workers (paid and enslaved), captives, derived defence values. Headless-safe. */
(function () {
  const HB = globalThis.HB;

  const lair = HB.lair = {
    /** current level (0 = none) of an upgrade */
    level(state, id) { return state.lair.upgrades[id] || 0; },
    /** derived lair values from base + upgrades (+ staffed forge bonus) */
    values(state) {
      const v = Object.assign({}, HB.LAIR_BASE);
      for (const u of HB.UPGRADES) { const lv = lair.level(state, u.id); for (let i = 0; i < lv; i++) for (const k in u.levels[i].effects) { if (k === 'space' || k === 'strongroom') v[k] = Math.max(v[k], u.levels[i].effects[k]); else v[k] += u.levels[i].effects[k]; } }
      v.defense += state.lair.forgeBonus || 0;
      v.defense -= state.lair.decay || 0;
      // guards
      const guards = lair.guardStrength(state);
      v.guardStrength = guards;
      v.defense += Math.round(guards);
      return v;
    },
    guardStrength(state) {
      let s = 0;
      const vals = state.lair.upgrades.guardpost ? 1 : 0.35;
      for (const g of state.lair.workers) if (g.task === 'guard') s += g.count * HB.WORKER_TYPES[g.type].guard * (g.loyalty / 100) * 2.5 * vals;
      return Math.min(30, s);
    },
    /** how full the treasure chamber is. Room is by bulk (size), not value. */
    storage(state) {
      const space = lair.values(state).space;
      const used = HB.hoard.bulk(state);
      const over = Math.max(0, used - space);
      const frac = used > 0 ? over / used : 0;
      return { used, space, over, frac, exposedValue: Math.round(HB.game.hoardValue(state) * frac) };
    },
    /** gold worth of treasure lying outside the chamber (easy for thieves) */
    hoardOverflow(state) { return lair.storage(state).exposedValue; },
    // ---------- construction
    canBuild(state, id) {
      const u = HB.UPGRADE_BY_ID[id]; const lv = lair.level(state, id);
      if (lv >= u.levels.length) return { ok: false, reason: 'Already at the highest level' };
      if (state.lair.construction.some(c => c.id === id)) return { ok: false, reason: 'Already under construction' };
      const next = u.levels[lv];
      if (state.hoard.gold < next.cost) return { ok: false, reason: `Needs ${HB.fmt.int(next.cost)} gold in the hoard (you have ${HB.fmt.int(state.hoard.gold)})` };
      if (next.needs === 'human' && !state.lair.workers.some(w => w.type === 'human')) return { ok: false, reason: 'Needs human engineers among your workers' };
      if (next.needs === 'dwarf-or-human' && !state.lair.workers.some(w => w.type === 'human' || w.type === 'dwarf')) return { ok: false, reason: 'Needs dwarves or human smiths among your workers' };
      if (next.needsGems) { const t = HB.stats.categoryTotals(state); if (t.gems < next.needsGems) return { ok: false, reason: `Needs ${HB.fmt.int(next.needsGems)} gold worth of gems stored in the hoard` }; }
      return { ok: true, next };
    },
    /** preview of stat changes if the gold is spent */
    buildPreview(state, id) {
      const c = lair.canBuild(state, id); if (!c.ok) return null;
      const before = state.dragon.stats;
      const after = HB.stats.preview(state, (h) => { h.gold -= c.next.cost; });
      return { cost: c.next.cost, balance: state.hoard.gold - c.next.cost, diff: HB.stats.diff(before, after), days: lair.estimateDays(state, c.next.days), effects: c.next.effects };
    },
    estimateDays(state, baseDays) { const rate = lair.buildRate(state); return Math.ceil(baseDays / Math.max(0.2, rate)); },
    /** work per day relative to one 'standard crew' */
    buildRate(state) {
      let r = 0.2; // the dragon scrapes at the rock itself
      for (const g of state.lair.workers) if (g.task === 'build') r += g.count * HB.WORKER_TYPES[g.type].build * (0.4 + 0.6 * g.loyalty / 100) * 0.2;
      return r;
    },
    build(state, id) {
      const c = lair.canBuild(state, id); if (!c.ok) return c;
      HB.hoard.spend(state, c.next.cost);
      state.lair.construction.push({ id, level: lair.level(state, id) + 1, progress: 0, days: c.next.days, started: state.time.year });
      HB.game.chronicle(state, `Began work on ${HB.UPGRADE_BY_ID[id].name} (level ${lair.level(state, id) + 1}) for ${HB.fmt.int(c.next.cost)} gold.`, 'lair');
      return { ok: true };
    },
    /** advance construction and worker effects by days; returns list of completions */
    tickDays(state, days) {
      const done = [];
      const rate = lair.buildRate(state);
      for (const c of state.lair.construction) {
        c.progress += (rate * days) / c.days;
        if (c.progress >= 1) { state.lair.upgrades[c.id] = c.level; done.push(c); HB.game.chronicle(state, `${HB.UPGRADE_BY_ID[c.id].name} level ${c.level} is complete.`, 'lair'); }
      }
      state.lair.construction = state.lair.construction.filter(c => c.progress < 1);
      // decay slowly unless maintained
      const maintained = state.lair.workers.some(g => g.task === 'maintain' && g.count > 0);
      if (!maintained && (lair.level(state, 'traps') || lair.level(state, 'entrance'))) state.lair.decay = Math.min(10, (state.lair.decay || 0) + days * 0.004);
      else state.lair.decay = Math.max(0, (state.lair.decay || 0) - days * 0.01);
      return done;
    },
    // ---------- workers
    /** offers available to hire now, derived from relations and nearby places */
    hireOffers(state) {
      const W = state.world, d = state.dragon, offers = [];
      const home = W.home;
      const near = (types, r) => HB.world.locationsNear(W, home.x, home.y, r, L => types.includes(L.type) && L.knowledge.seen && L.state === 'normal');
      // dwarves: from holds/mines of dwarven factions, if not hostile
      for (const f of W.factions) {
        if (f.kind !== 'dwarf') continue;
        const hostile = f.dragon.hostility > 40;
        const fee = Math.round(300 * (1 + f.dragon.hostility / 50) * (1 - Math.min(0.4, f.dragon.trust / 100)));
        offers.push({ type: 'dwarf', count: 4, fee, wage: HB.WORKER_TYPES.dwarf.wage, from: f.name, factionId: f.id, available: !hostile && (f.dragon.known || d.prestige > 10 || f.dragon.trust > 0 || state.counters.raids >= 1), reason: hostile ? `${f.name} will not deal with you` : 'No dwarves have heard of you yet' });
      }
      for (const f of W.factions) {
        if (f.kind !== 'goblin') continue;
        const serve = f.dragon.fear >= 10 || d.tier >= 1;
        offers.push({ type: 'goblin', count: 6, fee: 60, wage: HB.WORKER_TYPES.goblin.wage, from: f.name, factionId: f.id, available: serve, reason: 'Goblins serve the strong: frighten them first, or grow' });
      }
      const towns = near(['town', 'city'], 40);
      if (towns.length) { const L = towns[0].L; const f = W.factions[L.factionId]; const ok = f ? f.dragon.hostility < 35 : true; offers.push({ type: 'human', count: 3, fee: 220, wage: HB.WORKER_TYPES.human.wage, from: L.name, factionId: L.factionId, available: ok, reason: `${f ? f.name : 'The town'} is too hostile to send builders` }); }
      return offers;
    },
    hire(state, offer) {
      if (!offer.available) return { ok: false, reason: offer.reason };
      if (state.hoard.gold < offer.fee) return { ok: false, reason: `Needs ${offer.fee} gold in the hoard` };
      HB.hoard.spend(state, offer.fee);
      let g = state.lair.workers.find(w => w.type === offer.type && w.status === 'paid');
      if (g) g.count += offer.count; else state.lair.workers.push({ id: HB.nextId('wg'), type: offer.type, count: offer.count, status: 'paid', loyalty: 65, task: 'build', from: offer.from, factionId: offer.factionId, since: state.time.year, unpaidYears: 0 });
      HB.game.chronicle(state, `Hired ${offer.count} ${HB.WORKER_TYPES[offer.type].name.toLowerCase()} from ${offer.from} for ${offer.fee} gold.`, 'lair');
      return { ok: true };
    },
    /** put a captive to work (enslaved) */
    enslave(state, captive) {
      const type = captive.kind === 'engineer' || captive.kind === 'smith' ? 'human' : captive.kind === 'miner' ? 'human' : null;
      if (!type) return { ok: false, reason: 'This captive has no useful trade' };
      const i = state.lair.captives.indexOf(captive); if (i >= 0) state.lair.captives.splice(i, 1);
      let g = state.lair.workers.find(w => w.type === type && w.status === 'enslaved');
      if (g) g.count += 1; else state.lair.workers.push({ id: HB.nextId('wg'), type, count: 1, status: 'enslaved', loyalty: 20, task: 'build', from: captive.from, factionId: captive.factionId, since: state.time.year, unpaidYears: 0 });
      state.dragon.alignment = HB.clamp(state.dragon.alignment - 4, -100, 100);
      const f = captive.factionId >= 0 ? state.world.factions[captive.factionId] : null;
      if (f) { if (HB.factions) HB.factions.adjust(state, f, { hostility: 4, fear: 2 }, `enslaved ${captive.name}`); else f.dragon.hostility += 4; }
      HB.game.chronicle(state, `Put ${captive.name} to forced labour in the lair.`, 'lair');
      return { ok: true };
    },
    setTask(state, group, task) { group.task = task; },
    dismiss(state, group) { const i = state.lair.workers.indexOf(group); if (i >= 0) state.lair.workers.splice(i, 1); if (group.status === 'enslaved') { state.dragon.alignment = HB.clamp(state.dragon.alignment + 2, -100, 100); HB.game.chronicle(state, `Freed ${group.count} enslaved workers.`, 'lair'); } },
    /** yearly wages, loyalty drift and unrest — called by the sleep simulation per year; returns events */
    yearlyWorkers(state, rng) {
      const ev = [];
      const hasDwarf = state.lair.workers.some(w => w.type === 'dwarf'), hasGoblin = state.lair.workers.some(w => w.type === 'goblin');
      for (const g of state.lair.workers.slice()) {
        const T = HB.WORKER_TYPES[g.type];
        if (g.status === 'paid') {
          const wages = g.count * T.wage;
          if (state.hoard.gold >= wages) { state.hoard.gold -= wages; g.unpaidYears = 0; g.loyalty = Math.min(100, g.loyalty + 4); ev.push({ kind: 'wages', text: `Paid ${HB.fmt.int(wages)} gold in wages to the ${T.name.toLowerCase()}.` }); }
          else { g.unpaidYears++; g.loyalty -= 18; ev.push({ kind: 'unpaid', text: `The ${T.name.toLowerCase()} went unpaid (${HB.fmt.int(wages)} owed). Their loyalty falls.`, bad: true }); }
          if (g.type === 'dwarf' && hasGoblin) { g.loyalty -= 6; }
          if (g.loyalty <= 0) { ev.push({ kind: 'quit', text: `The ${T.name.toLowerCase()} from ${g.from} packed up and left.`, bad: true }); lair.dismiss(state, g); continue; }
          if (g.type === 'goblin' && rng.chance(0.3)) { const stolen = Math.min(state.hoard.gold, Math.round(20 * g.count * rng.next())); if (stolen > 0) { state.hoard.gold -= stolen; ev.push({ kind: 'pilfer', text: `${stolen} gold went missing. The goblins deny everything.`, bad: true }); } }
        } else {
          // enslaved: no wages, loyalty drifts down, unrest
          g.loyalty = Math.max(0, g.loyalty - 5 + (state.lair.upgrades.guardpost ? 2 : 0));
          const unrest = (40 - g.loyalty) / 100 + 0.05;
          const r = rng.next();
          if (r < unrest * 0.5) { const c = state.lair.construction[0]; if (c) { c.progress = Math.max(0, c.progress - 0.25); ev.push({ kind: 'sabotage', text: `Sabotage: the enslaved ${T.name.toLowerCase()} set back work on ${HB.UPGRADE_BY_ID[c.id].name}.`, bad: true }); } }
          else if (r < unrest) { const n = Math.min(g.count, 1 + rng.int(2)); g.count -= n; state.lair.attention = (state.lair.attention || 0) + 3; ev.push({ kind: 'escape', text: `${n} enslaved ${n === 1 ? T.single : T.name.toLowerCase()} escaped and will tell where you sleep.`, bad: true }); if (g.count <= 0) lair.dismiss(state, g); }
          else if (r < unrest * 1.4 && g.count >= 3) { const loss = Math.min(state.hoard.gold, Math.round(rng.between(50, 200))); state.hoard.gold -= loss; state.lair.decay = Math.min(10, (state.lair.decay || 0) + 2); ev.push({ kind: 'revolt', text: `Revolt in the lair: the enslaved ${T.name.toLowerCase()} broke the doors and fled with ${loss} gold.`, bad: true }); lair.dismiss(state, g); }
          const f = g.factionId >= 0 ? state.world.factions[g.factionId] : null;
          if (f && rng.chance(0.25)) { if (HB.factions) HB.factions.adjust(state, f, { hostility: 3 }, 'held their people as slaves'); else f.dragon.hostility += 3; }
        }
      }
      // forge
      const forgeStaffed = lair.level(state, 'forge') && state.lair.workers.some(w => (w.type === 'dwarf' || w.type === 'human') && w.count > 0);
      if (forgeStaffed) { state.lair.forgeBonus = Math.min(20, (state.lair.forgeBonus || 0) + 4); ev.push({ kind: 'forge', text: 'The forge rang all year: the guard is better armed.' }); }
      // scavenging goblins
      for (const g of state.lair.workers) if (g.type === 'goblin' && g.task === 'scavenge') { const got = Math.round(g.count * 15 * rng.range(0.5, 1.5)); state.hoard.gold += got; ev.push({ kind: 'scavenge', text: `The goblins scavenged ${got} gold from the countryside.` }); }
      HB.stats.recompute(state);
      return ev;
    },
    onReturn(state, map) {
      // captives carried home move into the lair
      for (const c of state.cargo.captives) state.lair.captives.push(c);
      state.cargo.captives.length = 0;
    },
  };
})();
