/* Sleep: durations, preview, year-by-year simulation with intrusions, warnings, keeper episodes, maturation and the awakening summary. Headless-safe (prompts resolve to defaults). */
(function () {
  const HB = globalThis.HB;

  const sleep = HB.sleep = {
    durations(state) {
      const tier = HB.TIERS[state.dragon.tier];
      const opts = [
        { years: 0.25, label: 'A season’s rest', summary: 'Heal, let construction advance, let the roads refill. No growth.' },
        { years: 5, label: 'Five years', summary: 'A short slumber. Villages recover; children grow; grudges are still fresh.' },
        { years: 20, label: 'Twenty years', summary: 'A generation. Towns grow or fall; lords die; hunters train.' },
        { years: 50, label: 'Fifty years', summary: 'Rulers you knew are dead. Realms may have changed hands.' },
        { years: 100, label: 'A century', summary: 'Your name becomes a story. Stories bring heroes.' },
        { years: 200, label: 'Two centuries', summary: 'Kingdoms rise and fall. You wake into a different world.' },
      ];
      for (const o of opts) { o.allowed = o.years <= tier.sleepMax; o.reason = o.allowed ? '' : `Too young to sleep so long: a ${tier.name.toLowerCase()} would wake starved and wild. (Limit ${tier.sleepMax} years.)`; }
      return opts;
    },
    threatEstimate(state) {
      const v = HB.lair.values(state);
      const value = HB.game.hoardValue(state);
      const attention = state.lair.attention || 0;
      const host = HB.factions ? HB.factions.maxHostility(state) : 0;
      const hunters = state.world.factions.reduce((a, f) => a + f.learned.hunters, 0);
      const found = HB.pursuit ? HB.pursuit.lairFoundCount(state) : 0; // realms whose riders followed you home
      const thief = HB.clamp((state.dragon.tier === 0 ? 0.02 : 0.04) + found * 0.02 + value / 40000 + attention * 0.01 - v.concealment * 0.012 + (HB.lair.hoardOverflow(state) > 0 ? 0.05 : 0), 0.02, 0.5);
      let hunt = HB.clamp(found * 0.03 + (host / 100) * 0.12 + hunters * 0.025 + attention * 0.012 - v.concealment * 0.012 + (state.dragon.alignment < -40 ? 0.03 : 0) + (state.dragon.stats.prestige > 50 ? 0.02 : 0) + (HB.history ? HB.history.activeOrders(state).length * 0.03 : 0), 0, 0.45);
      // hunters come for dragons that have made enemies; a hatchling nobody fears is a rumour, not a quarry
      const enemies = found > 0 || host >= 20 || hunters >= 2 || attention >= 3 || (HB.history && (HB.history.leadHunter(state) || HB.history.activeOrders(state).length));
      if (state.dragon.tier === 0) hunt *= 0.4;
      if (!enemies) hunt *= 0.5;
      return { thief, hunt, defense: v.defense, traps: v.traps, ward: v.ward, guards: v.guardStrength, warnings: v.warning + (HB.history ? HB.history.loyalWarning(state) : 0), sleepSafety: v.sleepSafety };
    },
    /** chance that one thief / one hunting party is turned back at the door, for given lair values (default: current) */
    stopChances(state, v) {
      v = v || HB.lair.values(state);
      const W = state.world;
      const avg = (arr, fn) => arr.length ? arr.reduce((a, x) => a + fn(x), 0) / arr.length : 0;
      const known = W.factions.filter(f => f.dragon.known);
      const vb = avg(known.length ? known : W.factions, f => f.learned.vaults) * 2;
      const below = (D, base, spread) => HB.clamp((D - base) / spread, 0, 1);
      const tb = 6 + state.dragon.tier * 6 + vb;
      const thief = 0.75 * below(v.defense + v.traps * 0.8 + v.ward * 0.3, tb, 20) + 0.25 * below(v.defense + v.traps * 0.8 + v.ward, tb + 10, 20);
      const hostile = W.factions.filter(f => f.dragon.hostility > 20);
      const lead = HB.history ? HB.history.leadHunter(state) : null;
      const orders = HB.history ? HB.history.activeOrders(state) : [];
      const base = 18 + avg(hostile.length ? hostile : W.factions, f => f.learned.hunters) * 8 + (lead ? lead.level * 6 : 0) + orders.reduce((a, o) => a + o.strength * 6, 0) + state.dragon.tier * 8;
      const hunt = below((v.defense + v.traps + (HB.history ? HB.history.loyalGuardBonus(state) : 0)) / 0.85, base, 25);
      return { thief, hunt };
    },
    preview(state, years) {
      const d = state.dragon, lines = [];
      const next = HB.TIERS[d.tier + 1];
      const energy = HB.stats.hoardEnergy(state);
      if (years < 1) lines.push({ text: 'You will heal fully. The world moves a season.' });
      else if (next && d.age + years >= next.minAge && energy >= next.energy) lines.push({ text: `You will wake ${HB.fmt.a(next.name.toLowerCase())}: larger, stronger, with farther sight and more to carry. Growing consumes about ${HB.fmt.int(Math.round(next.energy * 0.1))} gold of the hoard’s coin; named treasures are never consumed.`, tone: 'good' });
      else if (next && d.age + years >= next.minAge) lines.push({ text: `Old enough to become ${HB.fmt.a(next.name.toLowerCase())}, but the hoard is too small to feed the change (${HB.fmt.int(energy)} of ${HB.fmt.int(next.energy)}). You would wake older, not larger.`, tone: 'warn' });
      else if (next) lines.push({ text: `You will be ${Math.floor(d.age + years)} on waking; ${HB.fmt.a(next.name.toLowerCase())} needs ${next.minAge}.` });
      const wages = state.lair.workers.filter(w => w.status === 'paid').reduce((a, w) => a + w.count * HB.WORKER_TYPES[w.type].wage, 0) * Math.max(1, Math.floor(years));
      if (wages) lines.push({ text: `Wages over the sleep: about ${HB.fmt.int(wages)} gold${wages > state.hoard.gold ? ' — more than you have. Unpaid crews lose loyalty and leave.' : '.'}`, tone: wages > state.hoard.gold ? 'warn' : undefined });
      const ens = state.lair.workers.filter(w => w.status === 'enslaved').reduce((a, w) => a + w.count, 0);
      if (ens) lines.push({ text: `${ens} enslaved workers: expect sabotage, escapes or revolt over ${HB.fmt.years(Math.max(1, Math.floor(years)))}.`, tone: 'warn' });
      const t = sleep.threatEstimate(state);
      const fut = HB.lair.valuesAfter(state, HB.DAYS_PER_YEAR);
      if (fut.done.length && years >= 1) lines.push({ text: `${HB.fmt.list(fut.done.map(id => HB.UPGRADE_BY_ID[id].name))} will be finished in the first year of the sleep, before any thief comes.`, tone: 'good' });
      lines.push({ text: `Defence ${Math.round(t.defense)} (traps ${t.traps}, guards ${Math.round(t.guards)}, ward ${t.ward}); ${t.warnings ? HB.fmt.plural(t.warnings, 'warning') + ' before the worst' : 'no warning before the worst'}; ${t.sleepSafety ? 'a sleeping chamber between you and the door' : 'no sleeping chamber: hunters who get in reach you'}.`, tone: t.defense < 15 ? 'warn' : undefined });
      const sc = sleep.stopChances(state, years >= 1 ? fut.v : undefined);
      lines.push({ text: `At the door your defences turn back about ${Math.round(sc.thief * 100)}% of thieves and ${Math.round(sc.hunt * 100)}% of hunting parties.`, tone: sc.thief < 0.3 ? 'warn' : undefined });
      const yrs = Math.max(1, Math.floor(years));
      const pThief = 1 - Math.pow(1 - t.thief, yrs), pHunt = 1 - Math.pow(1 - t.hunt, yrs);
      lines.push({ text: `Thieves: ${sleep.likelihood(pThief)} to try over the sleep. Hunters: ${sleep.likelihood(pHunt)}.`, tone: pHunt > 0.5 ? 'bad' : pThief > 0.3 ? 'warn' : 'good' });
      if (next && energy >= next.energy && d.age + years >= next.minAge && d.age < next.minAge) {
        const yrsTo = Math.max(1, Math.ceil(next.minAge - d.age)), pBefore = 1 - Math.pow(1 - t.thief * (1 - sc.thief), yrsTo);
        const room = (1 + 2.5) * (1 + d.tier * 0.6) * 100, margin = energy - next.energy;
        if (margin < room) lines.push({ text: `You come of age in year ${yrsTo}. A theft before then (${sleep.likelihood(pBefore)}) could take up to ${HB.fmt.int(room)} gold worth, and you have only ${HB.fmt.int(margin)} to spare: a stronger door, or more treasure, keeps the growth safe.`, tone: 'warn' });
        else lines.push({ text: `You come of age in year ${yrsTo}, with ${HB.fmt.int(margin)} to spare: a theft would not stop the change.`, tone: 'good' });
      }
      if (HB.lair.hoardOverflow(state) > 0) lines.push({ text: `${HB.fmt.int(HB.lair.hoardOverflow(state))} gold worth does not fit in the treasure chamber and lies where thieves can carry it off.`, tone: 'warn' });
      { const locked = HB.hoard.protectedIds(state); const loose = state.hoard.items.filter(i => !locked.has(i.id) && HB.hoard.itemDensity(i) >= 300); const lockedN = locked.size;
        if (loose.length) lines.push({ text: `Thieves go for small, valuable things first: ${HB.fmt.plural(loose.length, 'treasure')} worth ${HB.fmt.int(loose.reduce((a, b) => a + b.value, 0))} could fit in a thief’s sack${lockedN ? `; ${lockedN} more ${lockedN === 1 ? 'is' : 'are'} locked in the strongroom` : '. A strongroom would lock the best of them away'}.`, tone: 'warn' });
        else if (lockedN) lines.push({ text: `Your ${HB.fmt.plural(lockedN, 'most prized treasure')} ${lockedN === 1 ? 'is' : 'are'} locked in the strongroom.`, tone: 'good' }); }
      if (HB.tribute && years >= 1) { const oe = HB.tribute.offeringEstimate(state, years); if (oe.places.length) { const rc = HB.worldsim ? Math.round(oe.places.reduce((a, L) => a + HB.worldsim.repelChance(state, L), 0) / oe.places.length * 100) : 0; lines.push({ text: `${HB.fmt.list(oe.places.slice(0, 3).map(L => L.name))} ${oe.places.length === 1 ? 'trusts' : 'trust'} you: offerings of about ${HB.fmt.int(oe.lo)}–${HB.fmt.int(oe.hi)} gold over the sleep, if raiders do not ruin them. Without you they drive raiders off about ${rc}% of the time; guards on duty and loyal guardians help.`, tone: 'good' }); } }
      if (HB.domain && years >= 1) {
        const h = HB.domain.home(state), nr = HB.domain.nextReqs(state);
        if (h.stage > 0 && nr.target) {
          const yrs = nr.reqs.find(r => r.key === 'years'), other = nr.reqs.filter(r => r.key !== 'years' && !r.done);
          if (!other.length && yrs) lines.push({ text: `${h.name} grows into ${nr.target.noun} ${yrs.done ? 'in the first year' : `in about ${yrs.need - yrs.cur} years`}${yrs.done || yrs.need - yrs.cur <= years ? ', within this sleep' : ', after this sleep'}.`, tone: 'good' });
          else if (other.length) lines.push({ text: `${h.name} cannot grow into ${nr.target.noun} until it has: ${HB.domain.missingText(nr, true)}.` });
        }
        if (h.stage > 0 && h.path === 'tyrannical') { const S = HB.domain.stageInfo(state), calm = HB.lair.guardStrength(state) / 3 + (HB.lair.level(state, 'guardpost') ? 3 : 0), rate = S.unrest - calm; if (rate > 0) { const yrsTo = Math.ceil((60 - h.unrest) / rate); lines.push({ text: `Unrest in ${h.name} is ${Math.round(h.unrest)} and rises about ${rate.toFixed(0)} a year: ${yrsTo <= years ? `expect a revolt in about ${HB.fmt.plural(yrsTo, 'year')}` : 'no revolt this sleep'}. Guards and a guard post hold it down.`, tone: yrsTo <= years ? 'warn' : undefined }); } }
        const occ = HB.domain.members(state).filter(m => m.status === 'occupied');
        if (occ.length) lines.push({ text: `${HB.fmt.list(occ.slice(0, 3).map(m => m.L.name))} ${occ.length === 1 ? 'resists' : 'resist'} your overseers a little more each year; left alone, a revolt breaks a place free in three years.`, tone: 'warn' });
      }
      if (HB.keeper && HB.keeper.enabled(state) && years >= 5) lines.push({ text: 'The Keeper will tend you: expect one or two moments where its choices matter.' });
      const warning = pHunt > 0.5 && !t.sleepSafety ? `Hunters are likely (${sleep.likelihood(pHunt)}) and nothing stands between them and the sleeper.` : pThief > 0.6 ? 'Thieves are likely; the hoard is exposed.' : null;
      return { lines, warning, pThief, pHunt };
    },
    likelihood(p) { return p < 0.1 ? 'unlikely' : p < 0.3 ? 'possible' : p < 0.6 ? 'likely' : 'very likely'; },
    // ---------- running
    begin(state, years, map) {
      const d = state.dragon;
      state.phase = 'sleeping';
      state.sleeping = { years, yearsDone: 0, events: [], mods: { defense: 0, ward: 0, thiefMod: 0, growth: 0, unrest: 0 }, before: sleep.snapshot(state), interrupted: false, forced: false, keeperDone: 0, keeperAt: years >= 5 ? 1 + Math.floor(years * 0.4) : -1, keeperAt2: years >= 20 && HB.game.rng.chance(0.6) ? Math.floor(years * 0.8) : -1, wakeRequested: false, dead: false, log: [] };
      d.x = state.world.home.x; d.y = state.world.home.y;
      HB.game.chronicle(state, `Lay down to sleep for ${years < 1 ? 'a season' : HB.fmt.years(years)}.`, 'sleep');
      if (HB.isBrowser && HB.SleepScene) HB.scenes.push(new HB.SleepScene(state, map));
      else { while (!sleep.done(state)) { const p = sleep.stepYear(state); if (p) sleep.resolvePrompt(state, p, 0); } sleep.finish(state, map); }
    },
    done(state) { const sl = state.sleeping; return !sl || sl.yearsDone >= sl.years || sl.interrupted || sl.forced || sl.dead; },
    snapshot(state) { const d = state.dragon; return { tier: d.tier, age: d.age, stats: Object.assign({}, d.stats), gold: state.hoard.gold, items: state.hoard.items.map(i => i.id), named: state.hoard.items.filter(i => i.named).map(i => i.name), upgrades: Object.assign({}, state.lair.upgrades), factions: state.world.factions.map(f => ({ fear: f.dragon.fear, hostility: f.dragon.hostility, trust: f.dragon.trust })), year: state.time.year, locTiers: state.world.locations.map(L => L.tier + ':' + L.state) }; },
    /** simulate one year (or the remainder); returns a prompt object if the player must decide, else null */
    stepYear(state) {
      const sl = state.sleeping, rng = HB.game.rng, d = state.dragon;
      const step = Math.min(1, sl.years - sl.yearsDone);
      const days = Math.round(step * HB.DAYS_PER_YEAR);
      HB.game.advanceDays(state, days);
      if (HB.worldsim) HB.worldsim.tickDays(state, days);
      if (HB.cheats) HB.cheats.topUp(state);
      sl.yearsDone += step;
      const yearEvents = [];
      const log = (text, kind, bad) => { const e = { year: state.time.year, text, kind: kind || 'sleep', bad: !!bad }; yearEvents.push(e); sl.events.push(e); };
      // healing
      d.health = Math.min(d.stats.maxHealth, d.health + Math.round(d.stats.maxHealth * 0.5 * step)); d.stamina = d.stats.maxStamina; d.injury = Math.max(0, d.injury - 0.5);
      if (step < 1) { return null; }
      // yearly world
      if (HB.worldsim && HB.worldsim.yearly) for (const e of HB.worldsim.yearly(state, rng)) log(e.text, e.kind || 'world', e.bad);
      if (HB.factions) for (const e of HB.factions.yearly(state, rng)) log(e.text, e.kind || 'faction', e.bad);
      if (HB.history) { const ev = []; HB.history.yearly(state, rng, ev); for (const e of ev) log(e.text, e.kind, e.bad); }
      if (HB.tribute) for (const e of HB.tribute.yearly(state, rng)) log(e.text, 'tribute', e.bad);
      for (const e of HB.lair.yearlyWorkers(state, rng)) log(e.text, e.kind, e.bad);
      if (HB.domain) for (const e of HB.domain.yearly(state, rng)) log(e.text, e.kind, e.bad);
      if (HB.endgame) for (const e of HB.endgame.yearly(state, rng)) log(e.text, e.kind, e.bad);
      // attention decays with concealment
      const v = HB.lair.values(state);
      state.lair.attention = Math.max(0, (state.lair.attention || 0) - 0.6 - v.concealment * 0.15);
      // merchants pay a Warden of the Roads
      if (HB.renown) { const wi = HB.renown.wardenIncome(state); if (wi) { state.hoard.gold += wi; log(`Merchants sent ${wi} gold to the Warden of the Roads.`, 'loyal'); } }
      // loyal houses send gifts
      if (HB.history) for (const l of state.memory.loyalties) if (l.kind === 'house' && rng.chance(0.1)) { const g = 40 * l.strength; state.hoard.gold += g; log(`${HB.fmt.cap(l.name)} sent a gift of ${g} gold to the sleeping dragon.`, 'loyal'); }
      // keeper
      const yd = Math.round(sl.yearsDone);
      if (HB.keeper && HB.keeper.enabled(state) && (yd === sl.keeperAt || yd === sl.keeperAt2)) { const ep = HB.keeper.episode(state, sl, rng); return { kind: 'keeper', episode: ep }; }
      // coming of age: the change happens in the year you are old enough, if the hoard can feed it then
      sleep.tryGrow(state, sl, log);
      // threats
      const t = sleep.threatEstimate(state);
      const thiefP = HB.clamp(t.thief + sl.mods.thiefMod * 0.1, 0, 0.6);
      if (HB.cheats && HB.cheats.on(state, 'safeSleep')) return null; // debug: nobody comes
      if (rng.chance(thiefP)) { const p = sleep.thieves(state, sl, log, rng); if (p) return p; }
      if (rng.chance(t.hunt)) { const p = sleep.hunters(state, sl, log, rng); if (p) return p; }
      return null;
    },
    tryGrow(state, sl, log) {
      const d = state.dragon, next = HB.TIERS[d.tier + 1];
      if (sl.grew || !next || d.age < next.minAge || HB.stats.hoardEnergy(state) < next.energy) return false;
      d.tier++; sl.grew = true; sl.grewYear = state.time.year;
      const consumed = Math.min(state.hoard.gold, Math.round(next.energy * 0.1 * (1 - (sl.mods.growth || 0))));
      state.hoard.gold -= consumed; sl.consumed = consumed;
      HB.stats.recompute(state);
      log(`In year ${Math.round(sl.yearsDone)} of your sleep you grew into ${HB.fmt.a(next.name.toLowerCase())}.`, 'growth');
      HB.game.chronicle(state, `Grew into ${HB.fmt.a(next.name.toLowerCase())} in year ${Math.round(sl.yearsDone)} of a long sleep.`, 'growth');
      return true;
    },
    thieves(state, sl, log, rng) {
      const v = HB.lair.values(state);
      const W = state.world;
      const known = W.factions.filter(f => f.dragon.known);
      const f = known.length ? rng.pick(known) : rng.pick(W.factions);
      const name = HB.names.person(rng, f.culture, false);
      const magic = rng.chance(0.25);
      // thieves grow bolder as the dragon (and its hoard) grows: a hatchling's cave draws village burglars, an ancient's draws masters
      const strength = 6 + rng.next() * 20 + state.dragon.tier * 6 + (magic ? 10 : 0) + f.learned.vaults * 2;
      const defense = v.defense + sl.mods.defense + v.traps * 0.8 + (magic ? v.ward + sl.mods.ward : v.ward * 0.3);
      if (strength <= defense) {
        if (v.traps > 0 && rng.chance(0.5)) log(`${name}, a thief out of ${f.name}, died in your traps. ${magic ? 'The runes on the threshold held.' : ''}`, 'thief');
        else log(`${name}, a thief out of ${f.name}, tested the entrance and fled.`, 'thief');
        state.dragon.prestige += 0.5;
        return null;
      }
      const locked = HB.hoard.protectedIds(state);
      const namedReachable = state.hoard.items.filter(i => i.named && !locked.has(i.id));
      const targeted = rng.chance(0.4) && state.hoard.items.some(i => i.named);
      if (targeted && !namedReachable.length) {
        log(`${name}, a thief out of ${f.name}, came for a named treasure and found it behind the strongroom’s bars. They left with nothing.`, 'thief');
        f.learned.vaults++;
        return null;
      }
      if (targeted) {
        // a specialist: the most valuable thing for its size, among the first couple of candidates
        const named = namedReachable.sort((a, b) => HB.hoard.itemDensity(b) - HB.hoard.itemDensity(a));
        const it = named[rng.int(Math.min(2, named.length))];
        HB.hoard.removeItem(state, it.id);
        const dest = sleep.stolenDestination(state, f, rng);
        if (dest) { dest.special = it.artifactId || null; dest.flags.stolenItem = { name: it.name, year: state.time.year, from: 'the dragon' }; if (!dest.special) { dest.wealth += it.value; } }
        state.memory.stolen = state.memory.stolen || []; state.memory.stolen.push({ name: it.name, artifactId: it.artifactId, year: state.time.year, by: name, factionId: f.id, locId: dest ? dest.id : null });
        log(`${name}, a thief out of ${f.name}, crept past the door and took ${it.name}.${dest ? ` It was carried to ${dest.name}.` : ''}`, 'thief', true);
        sleep.noteTheft(state, it.value, it.name, magic);
        HB.game.chronicle(state, `${it.name} was stolen by ${name} of ${f.name}${dest ? ' and taken to ' + dest.name : ''}.`, 'theft');
      } else {
        // plunderers carry what fits in their sacks, best value for its size first; treasure lying outside the chamber is easier to haul
        const sto = HB.lair.storage(state);
        let room = (1 + rng.next() * 2.5) * (1 + state.dragon.tier * 0.6) + Math.min(10, sto.over * 0.5);
        const taken = [];
        // best value for its size first; coin (100 gold per space) competes with the items
        const cands = state.hoard.items.filter(i => !i.named && !locked.has(i.id)).sort((a, b) => HB.hoard.itemDensity(b) - HB.hoard.itemDensity(a));
        const takeItems = (pred) => { for (const it of cands) { if (taken.includes(it) || !pred(it) || (it.weight || 0.1) > room || taken.length >= 4) continue; room -= it.weight || 0.1; taken.push(it); } };
        takeItems(it => HB.hoard.itemDensity(it) >= 100);
        const coinCap = Math.round(state.hoard.gold * 0.45);
        const loss = Math.round(Math.min(coinCap, Math.max(0, room) * 100));
        room -= loss / 100;
        takeItems(() => true);
        for (const it of taken) HB.hoard.removeItem(state, it.id);
        state.hoard.gold -= loss;
        HB.stats.recompute(state);
        const what = taken.map(i => HB.hoard.itemLabel(i)).concat(loss ? [`${HB.fmt.int(loss)} gold`] : []);
        const worth = loss + taken.reduce((a, b) => a + b.value, 0);
        log(`Thieves out of ${f.name} led by ${name} plundered the hoard: ${what.length ? HB.fmt.list(what) : 'nothing worth the climb'} gone${taken.length ? ' — small things, worth the carrying' : ''}.`, 'thief', worth > 0);
        if (worth > 0) sleep.noteTheft(state, worth, null, magic);
        HB.game.chronicle(state, `Thieves from ${f.name} took ${HB.fmt.int(worth)} gold worth from the sleeping dragon’s hoard.`, 'theft');
      }
      f.learned.vaults++;
      return null;
    },
    noteTheft(state, worth, namedName, magic) {
      const P = state.problems || (state.problems = { thefts: 0, stolenValue: 0, stolenNamed: [], hunts: 0, breaches: 0, escapes: 0, rescues: 0 });
      P.thefts++; P.stolenValue += Math.round(worth); if (namedName) P.stolenNamed.push(namedName); if (magic) P.magicThefts = (P.magicThefts || 0) + 1;
      if (HB.consequences) HB.consequences.react(state, `Thieves robbed your hoard of ${namedName || HB.fmt.int(worth) + ' gold worth'}.`, `because a hoard worth ${HB.fmt.int(HB.game.hoardValue(state) + worth)} lay behind a door they could pass`);
    },
    stolenDestination(state, f, rng) {
      const W = state.world;
      const cands = W.locations.filter(L => (L.factionId === f.id && (L.type === 'castle' || L.type === 'city' || L.type === 'town' || L.type === 'hold')) && !L.special);
      if (!cands.length) { const ruins = W.locations.filter(L => L.type === 'ruin' && !L.special); return ruins.length ? rng.pick(ruins) : null; }
      return rng.pick(cands);
    },
    hunters(state, sl, log, rng) {
      const v = HB.lair.values(state), W = state.world;
      const lead = HB.history ? HB.history.leadHunter(state) : null;
      const orders = HB.history ? HB.history.activeOrders(state) : [];
      const hostile = W.factions.filter(f => f.dragon.hostility > 20);
      const f = hostile.length ? rng.pick(hostile) : rng.pick(W.factions);
      const leaderName = lead ? lead.name : HB.names.person(rng, f.culture, false);
      const strength = 18 + rng.next() * 25 + f.learned.hunters * 8 + (lead ? lead.level * 6 : 0) + orders.reduce((a, o) => a + o.strength * 6, 0) + state.dragon.tier * 8;
      const party = { f, leaderName, lead, strength, orderName: orders.length ? orders[0].name : null };
      if (state.problems) state.problems.hunts++;
      const defense = v.defense + sl.mods.defense + v.traps + (HB.history ? HB.history.loyalGuardBonus(state) : 0);
      // phase 1: the entrance
      if (defense >= strength * 0.85) {
        const killed = v.traps > 0 || v.guardStrength > 5;
        log(`${leaderName}${party.orderName ? ' of ' + party.orderName : ''} led hunters from ${f.name} against the lair. ${killed ? 'Traps and guards broke them at the door.' : 'They could not force the entrance and withdrew.'}`, 'hunters');
        if (lead && killed && rng.chance(0.6)) { lead.active = false; log(`${leaderName} died there. ${lead.text ? 'The oath died with them.' : ''}`, 'hunters'); }
        state.dragon.prestige += 2;
        return null;
      }
      // they get in: warning?
      const warnings = v.warning + (HB.history ? HB.history.loyalWarning(state) : 0);
      if (warnings > 0) {
        return { kind: 'warning', party, text: `${leaderName}${party.orderName ? ' of ' + party.orderName : ''} leads hunters from ${f.name} up the hill. ${v.warning ? 'The lookout' : 'A loyal house'} has given warning. Wake now and meet them awake, with the sleep unfinished — or trust the doors and the dark.` };
      }
      return sleep.breach(state, sl, log, rng, party, false);
    },
    /** hunters reach the inner lair. woke: the dragon chose to wake beforehand */
    breach(state, sl, log, rng, party, woke) {
      const v = HB.lair.values(state), d = state.dragon, s = d.stats;
      if (state.problems && !woke) state.problems.breaches++;
      if (HB.domain) HB.domain.onBreach(state, log);
      if (HB.cheats && HB.cheats.on(state, 'invincible')) { log(`${party.leaderName}’s blades could not pierce you (invincible).`, 'hunters'); sl.forced = true; return sleep.fight(state, sl, log, rng, party, 1e9, 'awake'); }
      const power = (s.bite + s.breath) * 3 + s.defense * 2 + d.health / 4 + d.tier * 20;
      if (woke) return sleep.fight(state, sl, log, rng, party, power, 'awake');
      if (v.sleepSafety >= 1 + sl.mods.ward / 100) {
        log(`Hunters broke into the hoard chamber. The sleeping chamber’s door held long enough: you woke to the sound of rams.`, 'hunters', true);
        sl.forced = true;
        return sleep.fight(state, sl, log, rng, party, power * 0.75, 'forced');
      }
      // the first sleep teaches rather than ends the campaign: the dragon wakes as the first blade falls
      if (state.counters.sleeps === 0) {
        log(`${party.leaderName} reached the sleeper. You woke as the first blade fell. (The first sleep is the only one that forgives this.)`, 'hunters', true);
        sl.forced = true;
        return sleep.fight(state, sl, log, rng, party, power * 0.6, 'startled');
      }
      // slaying attempt on the sleeper
      const slayChance = HB.clamp(party.strength / (party.strength + power * 0.6 + v.ward + sl.mods.ward), 0.05, 0.9);
      if (rng.chance(slayChance)) {
        log(`${party.leaderName} reached the sleeper. The blades went in before you woke.`, 'death', true);
        return sleep.slain(state, sl, log, party);
      }
      log(`${party.leaderName} reached the sleeper, but the first blow woke you.`, 'hunters', true);
      sl.forced = true;
      return sleep.fight(state, sl, log, rng, party, power * 0.6, 'startled');
    },
    fight(state, sl, log, rng, party, power, how) {
      const d = state.dragon;
      const win = power * (0.8 + rng.next() * 0.5) > party.strength * (0.8 + rng.next() * 0.5);
      if (win) {
        log(`You fought ${party.leaderName}’s hunters ${how === 'awake' ? 'awake and ready' : how === 'forced' ? 'half-asleep in your own chamber' : 'blind with sleep'} and killed them among the gold.`, 'hunters');
        if (party.lead) { party.lead.active = false; }
        d.health = Math.max(1, Math.round(d.health * (how === 'awake' ? 0.7 : 0.5)));
        d.scars++; d.prestige += 5; state.counters.kills += 4;
        HB.factions.adjust(state, party.f, { fear: 10, hostility: 4 }, `hunters killed at the lair`);
        HB.game.chronicle(state, `Killed ${party.leaderName}’s hunting party in the lair.`, 'hunters');
        return null;
      }
      const loss = Math.round(state.hoard.gold * 0.25);
      state.hoard.gold -= loss;
      d.health = Math.max(1, Math.round(d.stats.maxHealth * 0.15)); d.injury = 1; d.scars += 2;
      log(`${party.leaderName}’s hunters wounded you badly and fled with ${HB.fmt.int(loss)} gold before you could finish them.`, 'hunters', true);
      if (party.lead) { party.lead.level++; party.lead.text = 'wounded the dragon in its own lair'; }
      HB.stats.recompute(state);
      HB.game.chronicle(state, `Wounded by ${party.leaderName}’s hunters in the lair; lost ${HB.fmt.int(loss)} gold.`, 'hunters');
      sl.forced = true;
      return null;
    },
    slain(state, sl, log, party) {
      const mode = state.flags.deathMode || 'legend';
      if (mode === 'mythic') {
        sl.forced = true;
        const loss = Math.round(state.hoard.gold * 0.8);
        state.hoard.gold -= loss;
        const named = state.hoard.items.filter(i => i.named);
        for (const it of named.slice(0, Math.ceil(named.length / 2))) { HB.hoard.removeItem(state, it.id); const dest = sleep.stolenDestination(state, party.f, HB.game.rng); if (dest) { dest.special = it.artifactId; dest.flags.stolenItem = { name: it.name, year: state.time.year }; } }
        state.dragon.health = 1; state.dragon.injury = 1; state.dragon.scars += 3;
        HB.game.advanceDays(state, 100 * HB.DAYS_PER_YEAR); if (HB.worldsim) HB.worldsim.tickDays(state, 30);
        for (let y = 0; y < 100; y += 10) { if (HB.worldsim && HB.worldsim.yearly) HB.worldsim.yearly(state, HB.game.rng); if (HB.factions) HB.factions.yearly(state, HB.game.rng); }
        log(`They thought you dead. They were nearly right. A century passed before you stirred, in a plundered cave, with a hoard of ${HB.fmt.int(state.hoard.gold)} gold and scars you do not remember earning.`, 'death', true);
        HB.game.chronicle(state, `Nearly slain by ${party.leaderName}; slept a century in a plundered lair.`, 'death');
        HB.stats.recompute(state);
        return null;
      }
      sl.dead = true; state.phase = 'dead';
      HB.game.chronicle(state, `Slain in sleep by ${party.leaderName} of ${party.f.name}. The hoard was divided among the hunters.`, 'death');
      return { kind: 'death', party };
    },
    /** resolve a prompt with the chosen option index (used headless and by the view) */
    resolvePrompt(state, p, choice) {
      const sl = state.sleeping, rng = HB.game.rng;
      const log = (text, kind, bad) => { const e = { year: state.time.year, text, kind: kind || 'sleep', bad: !!bad }; sl.events.push(e); };
      if (p.kind === 'keeper') { const ch = p.episode.choices[choice] || p.episode.choices[0]; const text = ch.apply(); log(`The Keeper: ${p.episode.title}. ${text}`, 'keeper'); if (sl.keeperCaught) { sl.forced = true; log('With the Keeper taken, you woke to voices at the door.', 'keeper', true); } if (sl.wakeRequested) sl.interrupted = true; return text; }
      if (p.kind === 'warning') { if (choice === 0) { sl.interrupted = true; log('You woke to meet them.', 'hunters'); sleep.breach(state, sl, log, rng, p.party, true); return 'You wake.'; } const r = sleep.breach(state, sl, log, rng, p.party, false); if (r && r.kind === 'death') return r; return 'You sleep on.'; }
      return null;
    },
    finish(state, map) {
      const sl = state.sleeping; if (!sl) return;
      const d = state.dragon, before = sl.before;
      const summary = { before, events: sl.events, tierUp: false, interrupted: sl.interrupted, forced: sl.forced, dead: sl.dead, years: sl.yearsDone, planned: sl.years, restless: false };
      if (!sl.dead) {
        const next = HB.TIERS[d.tier + 1];
        const energy = HB.stats.hoardEnergy(state);
        const grown = sl.yearsDone >= 1 && !sl.interrupted;
        if (sl.grew) { summary.tierUp = true; summary.consumed = sl.consumed; summary.grewYear = sl.grewYear; }
        else if (next && d.age >= next.minAge && energy >= next.energy && sl.yearsDone >= 1) {
          d.tier++; summary.tierUp = true;
          const consumed = Math.min(state.hoard.gold, Math.round(next.energy * 0.1 * (1 - (sl.mods.growth || 0))));
          state.hoard.gold -= consumed; summary.consumed = consumed;
          HB.game.chronicle(state, `Woke ${HB.fmt.a(next.name.toLowerCase())} after ${HB.fmt.years(Math.round(sl.yearsDone))}.`, 'growth');
        } else if (next && d.age >= next.minAge && sl.yearsDone >= 1) { summary.restless = true; d.restless = (d.restless || 0) + 1; }
        HB.stats.recompute(state);
        d.health = d.stats.maxHealth; d.stamina = d.stats.maxStamina;
        if (sl.forced) { d.health = Math.max(1, Math.min(d.health, Math.round(d.stats.maxHealth * 0.6))); }
        state.counters.sleeps++;
        state.phase = 'home';
        if (HB.worldsim && HB.worldsim.afterSleep) HB.worldsim.afterSleep(state);
      }
      summary.after = sleep.snapshot(state);
      state.lastSleep = summary;
      state.sleeping = null;
      if (HB.save && !sl.dead) HB.save.autosave(state);
      if (HB.isBrowser && HB.AwakenScene && !sl.dead) HB.scenes.push(new HB.AwakenScene(state, summary, map));
      else if (HB.isBrowser && sl.dead && HB.DeathScene) HB.scenes.push(new HB.DeathScene(state, summary));
      return summary;
    },
  };
})();
