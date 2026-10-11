/* Encounter dispatch and consequences: animated raid or decision card, then world memory updates. */
(function () {
  const HB = globalThis.HB;

  const enc = HB.encounter = {
    kindOf(target) {
      if (target.kind) return HB.raidTemplates.pick(target) ? 'raid' : 'none';
      if (HB.raidTemplates.pick(target)) return 'raid';
      if (HB.CARD_ENCOUNTERS[target.type]) return 'card';
      return 'none';
    },
    begin(state, target, map, opts = {}) {
      const kind = enc.kindOf(target);
      state.phase = 'encounter';
      // settlements (and any place under attack) offer a choice on arrival; so do caravans
      const settlement = !target.kind && (['village', 'town', 'city', 'castle', 'hold', 'glade', 'monastery'].includes(target.type) || target.threat || (target.type === 'farm' && (target.trust >= 15 || target.tribute || target.state === 'burned')));
      const story = !target.kind && HB.situations && (HB.situations.isStoryPlace(state, target) || HB.situations.choicesFor(state, target, map).length > 0);
      const struggle = !target.kind && HB.endgame && HB.endgame.isPlace(state, target);
      if (!opts.direct && HB.isBrowser && HB.CardScene) {
        if (struggle) { enc.struggleCard(state, target, map); return; }
        if (settlement || story) { enc.arrivalCard(state, target, map); return; }
        if (target.kind === 'caravan') { enc.caravanCard(state, target, map); return; }
      }
      enc.before = HB.consequences.snapshot(state, target);
      if (kind === 'raid' || opts.defend) {
        const scene = HB.raidTemplates.build(state, target, HB.game.rng, opts);
        const r = HB.raid.create(state, target, scene);
        state.encounter = { kind: opts.defend ? 'defend' : 'raid', targetId: target.id, targetKind: target.kind || 'location' };
        if (HB.isBrowser && HB.RaidScene) HB.scenes.push(new HB.RaidScene(state, r, (res) => enc.finishRaid(state, target, r, map)));
        else return r; // headless: caller drives raid and calls finishRaid
      } else if (kind === 'card') {
        return enc.beginCard(state, target, map);
      } else {
        state.phase = 'planning';
        if (map) map.showToast(`There is nothing to do at ${target.name}.`);
      }
    },
    arrivalCard(state, target, map) {
      const W = state.world, f = target.factionId >= 0 ? W.factions[target.factionId] : null;
      const choices = [];
      const kind = enc.kindOf(target);
      const t = target.threat;
      if (t) choices.push({ label: 'Drive off the raiders', desc: `${HB.fmt.cap(HB.fmt.plural(t.raiders, HB.raiderWord(t)))} from ${t.campName}. Saving ${target.name} wins its trust.`, tooltip: 'Bite them, burn them, or roar to break their nerve. Your fire burns houses as readily as raiders. Afterwards you choose whether to give back what you recover.', onChoose: () => { HB.scenes.pop(card); setTimeout(() => enc.begin(state, target, map, { direct: true, defend: true }), 0); return false; } });
      if (HB.situations) for (const ch of HB.situations.choicesFor(state, target, map)) { const fn = ch.onChoose; choices.push(Object.assign({}, ch, { onChoose: () => { const before = HB.consequences.snapshot(state, target); const res = fn(); if (res !== false) enc.pendingSummary = { before, info: { kind: 'story', label: ch.label } }; return res; } })); }
      const sworn = HB.domain && ['protected', 'allied'].includes(HB.domain.statusOf(state, target));
      if (kind !== 'none') choices.push({ label: kind === 'raid' ? (t ? 'Raid it yourself' : 'Raid') : 'Approach', desc: kind === 'raid' ? (sworn ? 'You swore to protect them: raiding breaks your word, and every place you protect will trust you less.' : 'Enter the animated raid: take what you can, leave when you must.') : 'Deal with the place as it is.', onChoose: () => { HB.scenes.pop(card); setTimeout(() => enc.begin(state, target, map, { direct: true }), 0); return false; } });
      if (HB.tribute && ['farm', 'village', 'town', 'city', 'castle', 'hold', 'glade', 'monastery'].includes(target.type)) {
        const tr = HB.tribute.canDemand(state, target);
        if (target.type === 'farm' && !(target.tribute && !target.tribute.lapsed)) { /* farms cannot pay tribute, but can be protected */ }
        else if (target.tribute && !target.tribute.lapsed) choices.push({ label: target.tribute.willing ? 'Collect their gifts' : 'Collect tribute', desc: `They owe ${HB.fmt.int(target.tribute.amount)} gold a year. Collect what is due.`, onChoose: () => HB.tribute.collect(state, target) });
        else choices.push({ label: 'Demand tribute', desc: tr.ok ? `Likely to accept: ${tr.chanceText}. Yearly payment about ${HB.fmt.int(tr.amount)} gold.` : tr.reason, disabled: !tr.ok, disabledReason: tr.reason, onChoose: () => { const before = HB.consequences.snapshot(state, target); const txt = HB.tribute.demand(state, target); enc.pendingSummary = { before, info: { kind: 'tribute', success: !!(target.tribute && !target.tribute.lapsed) } }; return txt; } });
        const p = HB.tribute.canProtect(state, target);
        if (p.ok || p.show) choices.push({ label: 'Offer protection', desc: p.ok ? 'Promise to guard them from raiders in exchange for gifts. Trust grows; tyranny does not.' : p.reason, disabled: !p.ok, disabledReason: p.reason, onChoose: () => { const before = HB.consequences.snapshot(state, target); const txt = HB.tribute.protect(state, target); enc.pendingSummary = { before, info: { kind: 'protect' } }; return txt; } });
      }
      // your domain: oaths, rebuilding, occupation and its answers
      if (HB.domain) for (const ch of HB.domain.choicesFor(state, target)) { const fn = ch.onChoose; choices.splice(choices.length, 0, Object.assign({}, ch, { onChoose: () => { const before = HB.consequences.snapshot(state, target); const res = fn(); enc.pendingSummary = { before, info: { kind: 'domain', label: ch.label } }; return res; } })); }
      const yours = HB.domain && HB.domain.statusOf(state, target) && HB.DOMAIN_STATUSES[HB.domain.statusOf(state, target)].member;
      if (!yours) choices.push({ label: 'Scout and move on', desc: 'Learn its wealth and defences exactly. No alarm, nothing taken.', onChoose: () => { target.knowledge.scoutedYear = state.time.year; target.knowledge.raided = target.knowledge.raided || false; target.knowledge.exact = true; state.phase = 'planning'; return `You circle ${target.name} twice, counting roofs and spears. ${target.defense > 45 ? 'Too strong to fight; perhaps not too strong to rob.' : 'Nothing here you could not handle with care.'}`; } });
      choices.push({ label: 'Fly on', desc: '', onChoose: () => { state.phase = 'planning'; return 'You fly on.'; } });
      const storyText = HB.situations ? HB.situations.arrivalText(state, target) : '';
      const threatText = (t ? `Smoke rises from ${target.name}: raiders from ${t.campName} are looting it. ` : '') + (storyText && !t ? storyText + ' ' : '');
      const card = new HB.CardScene({ title: `Above ${target.name}`, illustration: target.type === 'castle' ? 'ransom' : target.type === 'glade' || target.type === 'monastery' ? 'monastery' : 'petition', text: `${threatText}${HB.preview.describe(state, target).subtitle}. ${f ? HB.preview.moodText(f) : 'No realm claims it.'} ${enc.placeMood(state, target)}`, choices, onClose: () => { const p = enc.pendingSummary; enc.pendingSummary = null; if (p && map) enc.showSummary(state, target, p.before, p.info, map); } });
      HB.scenes.push(card);
    },
    /** a place of the great struggle: a lieutenant's stronghold, a crystal's sanctuary, the enemy's fortress */
    struggleCard(state, target, map) {
      const choices = [];
      for (const ch of HB.endgame.choicesFor(state, target)) {
        if (ch.raid) choices.push(Object.assign({}, ch, { onChoose: () => { HB.scenes.pop(card); setTimeout(() => enc.begin(state, target, map, { direct: true }), 0); return false; } }));
        else choices.push(ch);
      }
      choices.push({ label: 'Fly on', desc: '', onChoose: () => { state.phase = 'planning'; return 'You fly on.'; } });
      const card = new HB.CardScene({ title: target.name, illustration: target.type === 'sanctuary' ? 'sanctuary' : 'shadow', text: HB.endgame.describe(state, target), choices });
      HB.scenes.push(card);
    },
    /** what this place is to you, in a sentence for its arrival card */
    placeMood(state, L) {
      const s = HB.domain ? HB.domain.statusOf(state, L) : null;
      if (s === 'protected') return `It is under your protection (trust ${Math.round(L.trust)}).`;
      if (s === 'allied') return `It is sworn to you (trust ${Math.round(L.trust)}).`;
      if (s === 'tributary') return `It pays you tribute out of fear (fear ${Math.round(L.fear)}).`;
      if (s === 'occupied') return `Your overseers hold it. Resistance ${Math.round(L.occupation.resistance)} of 60.`;
      if (s === 'resisting') return `It has risen against your overseers and pays nothing.`;
      if (s === 'ruined') return 'Ash and empty doorways.';
      if (L.trust >= 30) return 'They trust you.';
      return L.memory.length ? 'They remember you.' : 'They have never seen a dragon.';
    },
    /** a caravan on the road: rob it, make it pay, guard it, or let it go */
    caravanCard(state, e, map) {
      const W = state.world, origin = W.locations[e.originId];
      const toll = enc.tollTerms(state, e);
      const choices = [
        { label: 'Rob it', desc: `You could carry off about ${HB.fmt.int(HB.goals.haulOf(state, e))} gold worth. Its realm will hire more guards.`, tooltip: 'Enter the animated raid. The strongbox on the first wagon is easy; the best goods ride in the last.', onChoose: () => { HB.scenes.pop(card); setTimeout(() => enc.begin(state, e, map, { direct: true }), 0); return false; } },
        { label: 'Demand a toll', desc: toll.ok ? `About ${HB.fmt.int(toll.amount)} gold to pass (${toll.chanceText}). Nobody dies.` : toll.reason, disabled: !toll.ok, disabledReason: toll.reason, tooltip: 'Merchants who fear you pay to pass. Fear grows a little; nobody is hurt; the caravan lives to trade again.', onChoose: () => { const before = HB.consequences.snapshot(state, e); const res = enc.toll(state, e); enc.pendingSummary = { before, info: { kind: 'toll', success: res.success } }; return res.text; } },
        { label: 'Guard it to the next town', desc: 'Two days flying escort. Its realm will trust you.', tooltip: 'Fly above the wagons until they reach safety. Outlaws may try their luck. Merchants pay a little and talk a lot: three guarded caravans make you Warden of the Roads.', onChoose: () => { const before = HB.consequences.snapshot(state, e); const res = enc.escort(state, e, map, { interactive: true }); if (res.ambush) { HB.scenes.pop(card); setTimeout(() => enc.begin(state, e, map, { direct: true, defend: true }), 0); return false; } enc.pendingSummary = { before, info: { kind: 'escort' } }; return res.text; } },
        { label: 'Let it pass', desc: '', onChoose: () => { state.phase = 'planning'; return 'The wagons roll on. The drivers do not look up.'; } },
      ];
      const card = new HB.CardScene({ title: `The ${e.name}`, illustration: 'petition', text: `${HB.fmt.cap(e.name)} creaks along the road with about ${HB.fmt.int(e.wealth)} gold of goods. ${e.escort >= 2 ? 'Spears glint around the wagons.' : e.escort ? 'A few guards walk beside it.' : 'Nobody guards it but the drivers.'}`, choices, onClose: () => { const p = enc.pendingSummary; enc.pendingSummary = null; if (p && map) enc.showSummary(state, e, p.before, p.info, map); } });
      HB.scenes.push(card);
    },
    tollTerms(state, e) {
      const s = state.dragon.stats, W = state.world, f = e.factionId >= 0 ? W.factions[e.factionId] : null;
      if (e.tolled) return { ok: false, reason: 'They have already paid you.' };
      if (!HB.renown.canToll(state)) return { ok: false, reason: `Merchants do not pay a ${HB.TIERS[state.dragon.tier].name.toLowerCase()} to pass. Rob ${3 - HB.renown.deeds(state, 'caravans')} more caravans to be known as the Road Thief, or grow.` };
      const room = Math.max(0, s.capacity - HB.game.cargoWeight(state)) * 100;
      const amount = Math.round(Math.min(e.wealth * 0.35, room));
      if (amount < 10) return { ok: false, reason: 'You cannot carry any more.' };
      const chance = HB.clamp(0.3 + (f ? f.dragon.fear : 0) / 100 + s.dominance / 120 - (e.escort || 0) * 0.08 + (HB.renown.has(state, 'roadthief') ? 0.2 : 0), 0.05, 0.95);
      return { ok: true, amount, chance, chanceText: chance > 0.7 ? 'very likely' : chance > 0.45 ? 'likely' : 'uncertain' };
    },
    toll(state, e) {
      const t = enc.tollTerms(state, e), W = state.world, f = e.factionId >= 0 ? W.factions[e.factionId] : null;
      state.phase = 'planning';
      if (!t.ok) return { success: false, text: t.reason };
      if (!HB.game.rng.chance(t.chance)) {
        if (f) HB.factions.adjust(state, f, { hostility: 2 }, `a toll refused on the ${e.name}`);
        e.tolled = true;
        return { success: false, text: 'The caravan master spits, and the guards close ranks. They will not pay. You could still rob them.' };
      }
      state.cargo.gold += t.amount; e.wealth -= t.amount; e.tolled = true;
      if (f) HB.factions.adjust(state, f, { fear: 3 * HB.renown.fearMul(state), hostility: 1 }, `toll taken from the ${e.name}`);
      state.dragon.alignment = HB.clamp(state.dragon.alignment - 0.5, -100, 100);
      HB.renown.record(state, 'tolls', { factionId: e.factionId, place: e.name });
      HB.game.chronicle(state, `Took ${HB.fmt.int(t.amount)} gold in toll from the ${e.name}.`, 'raid');
      return { success: true, text: `A strongbox is set down in the road and opened: ${HB.fmt.int(t.amount)} gold. The wagons roll on faster than they came.` };
    },
    /** fly above a caravan for two days. Outlaws may strike: an animated defence when played, a quick roll headless. */
    escort(state, e, map, opts = {}) {
      const W = state.world, d = state.dragon, rng = HB.game.rng;
      state.phase = 'planning';
      HB.game.advanceDays(state, 2); if (HB.worldsim) HB.worldsim.tickDays(state, 2);
      d.stamina = Math.max(0, Math.round(d.stamina - d.stats.maxStamina * 0.15));
      if (!e.dead) { d.x = e.x; d.y = e.y; const res = HB.world.reveal(state, d.x, d.y, d.stats.vision); if (map) map.onReveal(res); }
      const ambush = rng.chance(0.45);
      if (ambush && opts.interactive && HB.isBrowser && map) return { ambush: true };
      let text;
      if (ambush) {
        const dmg = Math.max(1, Math.round(rng.between(2, 10) - d.stats.defense * 0.5));
        d.health = Math.max(1, d.health - dmg); state.counters.kills += 2;
        text = `On the second day outlaws came out of the trees. You dropped among them (${dmg} wounds) and they scattered.`;
      } else text = 'Two quiet days above the wagons. Nothing on the road dared show itself.';
      return { text: text + ' ' + enc.escortReward(state, e, ambush) };
    },
    /** the caravan reached safety under your wings */
    escortReward(state, e, fought) {
      const W = state.world, d = state.dragon, f = e.factionId >= 0 ? W.factions[e.factionId] : null, origin = W.locations[e.originId];
      let text = '';
      const gift = Math.min(Math.round(e.wealth * (fought ? 0.1 : 0.05)), Math.max(0, d.stats.capacity - HB.game.cargoWeight(state)) * 100);
      if (gift > 0) { state.cargo.gold += gift; text += `At the gate the caravan master leaves you ${HB.fmt.int(gift)} gold${fought ? ', with thanks' : ', and does not quite meet your eye'}.`; }
      e.escorted = true;
      if (f) { HB.factions.adjust(state, f, { trust: fought ? 7 : 4, hostility: -2 }, `guarded the ${e.name}`); HB.heat.add(state, f, -8); }
      if (origin) origin.trust = Math.min(100, origin.trust + (fought ? 10 : 6));
      state.dragon.alignment = HB.clamp(state.dragon.alignment + 2, -100, 100);
      HB.renown.record(state, 'escorted', { factionId: e.factionId, place: origin ? origin.name : null });
      HB.game.chronicle(state, `Guarded the ${e.name} on the road${fought ? ' and fought off an ambush' : ''}.`, 'deed');
      return text;
    },
    beginCard(state, target, map) {
      const def = HB.CARD_ENCOUNTERS[target.type];
      const rng = HB.game.rng;
      const before = enc.before || HB.consequences.snapshot(state, target);
      let chosen = null;
      const ctx = { state, L: target, rng, stats: state.dragon.stats, stolen: 0, damage: 0, fear: 0, hostility: 0, trust: 0, alignment: 0, burned: 0, kills: 0, extraWeight: 0, roll: (p) => rng.chance(HB.clamp(p, 0.02, 0.98)) };
      const finish = (res, choice) => {
        if (res.scar) state.dragon.scars++;
        enc.applyConsequences(state, target, { stolenValue: ctx.stolen, destroyedValue: 0, burned: ctx.burned, kills: ctx.kills, civiliansKilled: 0, captured: 0, fear: ctx.fear, hostility: ctx.hostility, trust: ctx.trust, alignment: ctx.alignment, label: choice.label, damageTaken: ctx.damage }, map);
        if (ctx.artifact) { state.counters.artifactsFound++; }
        state.phase = 'planning';
        if (HB.save && HB.save.autosave) HB.save.autosave(state);
      };
      if (!HB.isBrowser || !HB.CardScene) { const ch = def.choices[0]; const res = ch.resolve(ctx); finish(res, ch); return res; }
      HB.scenes.push(new HB.CardScene({
        title: target.name, illustration: def.illustration, text: def.intro(ctx),
        choices: def.choices.map(ch => ({ label: ch.label, desc: ch.desc, disabled: ch.disabled ? ch.disabled(ctx) : false, disabledReason: ch.disabledReason, onChoose: () => { const res = ch.resolve(ctx); finish(res, ch); chosen = ch; return res.text; } })),
        onClose: () => { if (!map) return; if (chosen && !/^(fly on|leave them be)/i.test(chosen.label)) enc.showSummary(state, target, before, { kind: 'card', label: chosen.label }, map); else enc.afterEncounterPrompt(state, map); },
      }));
    },
    /** called when a raid scene ends */
    finishRaid(state, target, r, map) {
      const d = state.dragon;
      d.health = Math.max(0, Math.round(r.dragon.hp));
      d.stamina = Math.max(0, Math.round(r.dragon.stamina));
      const outcome = r.outcome || 'withdrew';
      // merge loot (unless defeated: loot is lost)
      let lostLoot = null;
      if (outcome === 'defeated') { lostLoot = r.loot; d.health = Math.max(1, Math.round(d.stats.maxHealth * 0.2)); d.injury = Math.min(1, d.injury + 0.6); d.scars++; state.counters.defeats++; }
      else { state.cargo.gold += r.loot.gold; for (const it of r.loot.items) state.cargo.items.push(it); for (const c of r.loot.captives) { state.cargo.captives.push(c); if (HB.situations) HB.situations.onCaptured(state, c); } }
      const rival = r.entities.find(e => e.kind === 'rivalDragon');
      const rivalSlain = !!(rival && rival.dead);
      if (rivalSlain && target.dragon) { HB.game.chronicle(state, `Slew ${target.dragon.name}${target.dragon.tier >= 3 ? ', the elder wyrm,' : ''} in its own lair.`, 'legend'); d.prestige += target.dragon.tier >= 3 ? 60 : 25; state.counters.kills++; if (target.dragon.tier >= 3) state.flags.legend = true; target.state = 'ruin'; target.dragon = null; target.name = 'The Dead Wyrm’s Lair'; }
      const defend = r.mode === 'defend';
      let fearGain = Math.min(20, r.stolenValue / 150 + r.burned * 3 + r.kills * 1.2 + r.roars * 0.5 + r.captured * 3) + (rivalSlain ? 15 : 0);
      let hostGain = Math.min(25, r.burned * 4 + r.civiliansKilled * 2 + r.kills * 0.8 + r.captured * 3 + r.stolenValue / 400);
      let alignment = -(r.burned * 4 + r.civiliansKilled * 2 + r.captured * 1) + (r.stolenValue > 0 && !r.burned && !r.civiliansKilled ? 0.5 : 0);
      // killing outlaws who were sacking a village frightens nobody's lord; burning the village you came to save does
      if (defend) { fearGain = Math.min(6, r.roars * 0.5 + r.raidersKilled * 0.6); hostGain = r.burned * 5 + r.civiliansKilled * 3; alignment = (outcome === 'defended' ? 5 : 0) - r.burned * 4 - r.civiliansKilled * 3; }
      enc.applyConsequences(state, target, { stolenValue: outcome === 'defeated' ? 0 : r.stolenValue, destroyedValue: r.destroyedValue, burned: r.burned, kills: r.kills, civiliansKilled: r.civiliansKilled, captured: r.captured, famine: r.famine, fear: fearGain, hostility: hostGain, trust: 0, alignment, outcome, pursued: r.pursued, label: outcome, damageTaken: r.damageTaken, tookArtifact: r.tookArtifact, duel: r.scene.duel, lostLoot, defend, raidersKilled: r.raidersKilled, raidersFled: r.fled }, map);
      state.counters.raids++; state.counters.kills += r.kills; state.counters.captures += r.captured; state.counters.burned += r.burned; state.counters.goldStolen += outcome === 'defeated' ? 0 : r.stolenValue;
      state.encounter = null;
      if (outcome === 'defeated') { enc.afterDefeat(state, target, map); return; }
      state.phase = 'planning';
      if (HB.save && HB.save.autosave) HB.save.autosave(state);
      if (HB.petitions && HB.petitions.onRaid && !defend) HB.petitions.onRaid(state, target, r);
      const before = enc.before || HB.consequences.snapshot(state, target);
      enc.before = null;
      if (HB.endgame) HB.endgame.onRaidEnd(state, target, r); // a lieutenant slain, a crystal taken
      const info = { kind: defend ? 'defend' : 'raid', outcome, r, pursuitText: HB.pursuit.start(state, target, r) };
      const next = () => enc.showSummary(state, target, before, info, map);
      const afterStory = () => { if (!HB.situations || !HB.situations.onRaidEnd(state, target, r, map, next)) next(); };
      if (defend && outcome === 'defended' && (r.recoveredValue > 0)) enc.returnGoodsCard(state, target, r, map, afterStory);
      else afterStory();
      if (rivalSlain && state.flags.legend && !state.flags.legendShown && HB.isBrowser && HB.LegendScene) { state.flags.legendShown = true; HB.scenes.push(new HB.LegendScene(state)); }
    },
    applyConsequences(state, target, c, map) {
      const W = state.world;
      const year = state.time.year;
      const d = state.dragon;
      const isLoc = target.type !== undefined && target.kind === undefined;
      const R = HB.renown;
      c.fear = (c.fear || 0) * R.fearMul(state);
      // a realm learning something is a world reaction with a cause
      const learn = (f, key, why) => { f.learned[key]++; HB.consequences.react(state, HB.consequences.LEARNED[key](f), why); };
      if (isLoc && c.defend) {
        const L = target, f = L.factionId >= 0 ? W.factions[L.factionId] : null;
        L.memory.push({ year, kind: c.outcome === 'defended' ? 'defended' : 'abandoned', burned: c.burned, killed: c.civiliansKilled });
        if (L.memory.length > 12) L.memory.shift();
        L.knowledge.scoutedYear = year;
        if (c.burned >= 2 || (c.burned >= 1 && L.tier === 0)) { L.state = 'burned'; L.flags.burnedYear = year; }
        if (c.outcome === 'defended') {
          const t = L.threat; L.threat = null; L.flags.noThreatUntil = state.time.totalDays + 540;
          const camp = t && t.campId >= 0 ? W.locations[t.campId] : null;
          if (camp) { camp.wealth = Math.round(camp.wealth * 0.7); camp.defense = Math.max(5, camp.defense - 3); }
          const gain = Math.max(0, 25 - c.burned * 10 - c.civiliansKilled * 6) * R.trustMul(state);
          L.trust = Math.min(100, L.trust + gain); L.fear = Math.min(100, L.fear + 2);
          L.flags.savedYear = year;
          if (HB.domain && HB.domain.statusOf(state, L) === 'protected' && L.trust >= 50 && !L.flags.oathOffered) { L.flags.oathOffered = year; HB.consequences.react(state, `${L.name} asks to swear an oath to you and join your domain.`, 'because you kept your promise to protect it'); }
          if (f) { HB.factions.adjust(state, f, { trust: gain > 0 ? 6 : 0, fear: c.fear, hostility: c.hostility }, `drove the raiders of ${t ? t.campName : 'the hills'} from ${L.name}`); HB.heat.add(state, f, -12); }
          if (gain > 0) {
            R.record(state, 'defended', { factionId: L.factionId, place: L.name });
            HB.consequences.react(state, `${L.name} trusts you. Its people will work for you willingly and would accept your protection.`, `because you drove off the raiders of ${t ? t.campName : 'the hills'}`);
            if (camp) HB.consequences.react(state, `${camp.name} lost men and loot.`, `because you broke their raid on ${L.name}`);
          }
          HB.game.chronicle(state, `Drove the raiders of ${t ? t.campName : 'the hills'} out of ${L.name}${c.burned ? `, burning ${HB.fmt.plural(c.burned, 'house')} in the doing` : ''}.`, 'deed', L.id);
        } else if (f && (c.hostility || c.fear)) HB.factions.adjust(state, f, { fear: c.fear, hostility: c.hostility }, `fire at ${L.name}`);
      } else if (isLoc) {
        const L = target;
        if (HB.domain) HB.domain.onRaid(state, L, c);
        L.wealth = Math.max(Math.round(L.wealthMax * 0.08), Math.round(L.wealth - c.stolenValue - c.destroyedValue));
        if (c.famine) { L.wealth = Math.round(L.wealth * 0.6); L.flags.famine = year; }
        if (c.burned >= 3 || (c.burned >= 1 && L.tier === 0)) { L.state = 'burned'; L.flags.burnedYear = year; L.pop = Math.round(L.pop * 0.6); }
        else if (c.burned > 0) { L.flags.scorched = year; }
        L.memory.push({ year, kind: 'raid', stolen: Math.round(c.stolenValue), burned: c.burned, killed: c.kills + c.civiliansKilled, captured: c.captured, outcome: c.outcome || c.label });
        if (L.memory.length > 12) L.memory.shift();
        L.lastRaidYear = year; L.knowledge.raided = true; L.knowledge.scoutedYear = year;
        L.fear = Math.min(100, L.fear + c.fear * 2); L.trust = Math.max(0, L.trust - c.hostility + (c.trust || 0) * 2);
        if (c.tookArtifact) { L.special = null; }
        if (c.outcome === 'defeated') { L.flags.repelled = (L.flags.repelled || 0) + 1; }
        // learning (a lieutenant's warcamp belongs to the enemy, not to the realm whose land it stands on)
        const f = L.factionId >= 0 && L.type !== 'stronghold' ? W.factions[L.factionId] : null;
        if (f) {
          const adj = { fear: c.fear, hostility: c.hostility, trust: c.trust || 0 };
          if (HB.factions) HB.factions.adjust(state, f, adj, `${c.label} at ${L.name}`); else { f.dragon.fear += adj.fear; f.dragon.hostility += adj.hostility; f.dragon.trust += adj.trust; }
          f.dragon.known = true;
          if (c.captured) learn(f, 'rescue', `because you carried people off from ${L.name}`);
          if (c.stolenValue > 300 && (L.type === 'town' || L.type === 'city' || L.type === 'castle')) learn(f, 'vaults', `because you robbed ${L.name} of ${HB.fmt.int(c.stolenValue)} gold worth`);
          if (L.type === 'castle' || L.type === 'city' || c.captured || c.burned >= 2) learn(f, 'hunters', c.burned >= 2 ? `because you burned ${L.name}` : c.captured ? `because you took captives at ${L.name}` : `because you dared to raid ${L.name}`);
          if (c.burned >= 2 || c.civiliansKilled >= 3) f.history.push({ year, text: `${d.name} burned ${L.name}.` });
          if (HB.history) HB.history.onRaid(state, L, f, c);
          // heat: short-term answer to theft and fire (robbing outlaws cools it instead)
          if (L.type === 'camp' || L.type === 'warren') { if (c.kills || c.stolenValue) HB.heat.add(state, f, -5); }
          else { const h = (c.stolenValue > 0 ? 10 + Math.min(10, c.stolenValue / 60) : 0) + c.burned * 8 + c.civiliansKilled * 3 + c.captured * 12 + (L.type === 'castle' && c.stolenValue > 0 ? 10 : 0); HB.heat.add(state, f, h, `you ${c.burned ? 'burned' : c.captured ? 'carried people off from' : 'robbed'} ${L.name}`); }
        }
        if (c.outcome !== 'defeated') {
          for (let i = 0; i < c.burned; i++) R.record(state, 'burned', { factionId: L.factionId, place: L.name });
          if (L.type === 'castle' && c.stolenValue > 0) R.record(state, 'castles', { factionId: L.factionId, place: L.name });
        }
        // breaking an outlaw camp spares the villages it was raiding
        if ((L.type === 'camp' || L.type === 'warren') && c.outcome !== 'defeated' && (c.kills >= 2 || c.stolenValue > 0 || c.burned > 0)) {
          for (const V of W.locations) {
            if (!V.threat || V.threat.campId !== L.id) continue;
            V.threat = null; V.flags.noThreatUntil = state.time.totalDays + 540; V.trust = Math.min(100, V.trust + 12 * R.trustMul(state));
            const fv = V.factionId >= 0 ? W.factions[V.factionId] : null; if (fv) HB.factions.adjust(state, fv, { trust: 3 }, `broke the outlaws of ${L.name}`);
            R.record(state, 'defended', { factionId: V.factionId, place: V.name });
            HB.consequences.react(state, `${V.name} is spared, and grateful.`, `because you broke the camp at ${L.name} that was raiding it`);
          }
        }
        if (L.type === 'rivalLair' && c.duel && c.outcome === 'withdrew' && c.stolenValue > 0 && L.dragon) { /* rival survives; its hoard reduced */ }
        if (L.type === 'rivalLair' && c.duel && c.rivalSlain) { L.state = 'ruin'; L.type = 'ruin'; }
      } else {
        // entity (caravan, hero, hunting party)
        const e = target;
        const f = e.factionId >= 0 ? W.factions[e.factionId] : null;
        const origin = e.originId !== undefined ? W.locations[e.originId] : null;
        if (c.defend && e.kind === 'caravan') {
          if (c.outcome === 'defended') c.escortText = enc.escortReward(state, e, true);
          else { e.wealth = Math.round(e.wealth * 0.5); if (origin) origin.trust = Math.max(0, origin.trust - 3); HB.consequences.react(state, `Outlaws robbed the ${e.name} while you watched.`, 'because you left them to it'); }
        } else if (e.kind === 'hunters') {
          if (c.kills > 0 && c.outcome !== 'defeated') {
            e.dead = true; d.prestige += 3;
            for (const g of state.memory.grudges) if (g.entityId === e.id) g.active = false;
            R.record(state, 'heroes', { factionId: e.factionId, place: e.name });
            if (f) HB.factions.adjust(state, f, { fear: 6, hostility: 4 }, `killed ${e.name}`);
            HB.consequences.react(state, `${e.name} will hunt no one again.`, 'because you turned and fought');
          } else if (c.outcome !== 'defeated') { e.restUntil = state.time.totalDays + 3; const ang = Math.atan2(e.y - d.y, e.x - d.x); e.x = d.x + Math.cos(ang) * 5; e.y = d.y + Math.sin(ang) * 5; }
        } else {
        if (f) { const adj = { fear: c.fear, hostility: c.hostility, trust: 0 }; if (HB.factions) HB.factions.adjust(state, f, adj, `${c.label} on ${e.name}`); else { f.dragon.fear += adj.fear; f.dragon.hostility += adj.hostility; } f.dragon.known = true; if (e.kind === 'caravan') { learn(f, 'escorts', `because you robbed the ${e.name}`); f.history.push({ year, text: `${d.name} plundered a caravan near ${e.name}.` }); } if (HB.history) HB.history.onRaid(state, e, f, c); }
        if (e.kind === 'caravan') { e.wealth = Math.max(0, e.wealth - c.stolenValue - c.destroyedValue); e.raided = true; if (c.outcome !== 'defeated') e.dead = true; if (c.outcome !== 'defeated' && c.stolenValue > 0) { R.record(state, 'caravans', { factionId: e.factionId, place: origin ? origin.name : null }); if (origin) origin.trust = Math.max(0, origin.trust - 6); } }
        if (e.kind === 'hero') { if (c.kills > 0 || c.outcome === 'withdrew') { e.dead = c.kills > 0; if (c.kills > 0 && HB.history) HB.history.onHeroSlain(state, e); else if (HB.history) HB.history.onHeroSurvived(state, e); if (c.kills > 0) R.record(state, 'heroes', { factionId: e.factionId, place: e.name }); } }
        if (e.kind === 'caravan' && f && c.stolenValue > 0 && c.outcome !== 'defeated') HB.heat.add(state, f, 12 + Math.min(8, c.stolenValue / 80), `you robbed the ${e.name}`);
        }
      }
      // dragon
      d.alignment = HB.clamp(d.alignment + (c.alignment || 0), -100, 100);
      // witnesses know a dragon did it (attention); riders who follow you home learn where you sleep (pursuit.onHome)
      state.lair.attention = (state.lair.attention || 0) + (c.stolenValue > 0 && !c.defend ? 0.5 : 0) + c.burned * 1 + (c.stolenValue > 800 ? 1 : 0);
      if (c.damageTaken > 0 && c.outcome !== 'defeated' && HB.game.rng.chance(Math.min(0.5, c.damageTaken / 80))) d.scars++;
      // chronicle
      const name = target.name || 'the road';
      let text;
      if (c.defend) text = null;
      else if (c.outcome === 'defeated') text = `Fell at ${name}, bleeding, and lost everything carried.`;
      else if (isLoc && (c.stolenValue > 0 || c.burned > 0 || c.captured > 0)) text = `${c.burned ? 'Burned' : 'Raided'} ${name}: took ${HB.fmt.int(c.stolenValue)} gold worth${c.burned ? `, burned ${HB.fmt.plural(c.burned, 'building')}` : ''}${c.captured ? `, carried off ${HB.fmt.plural(c.captured, 'captive')}` : ''}${c.kills ? `, killed ${c.kills}` : ''}.`;
      else if (!isLoc) text = `${c.outcome === 'withdrew' && c.stolenValue > 0 ? 'Plundered' : 'Attacked'} ${name}: ${HB.fmt.int(c.stolenValue)} gold worth${c.kills ? `, ${c.kills} slain` : ''}.`;
      else if (c.outcome === 'withdrew') text = `Flew over ${name} and left with nothing${c.kills ? ` but ${c.kills} dead behind` : ''}.`;
      else text = `${HB.fmt.cap(c.label)} at ${name}.`;
      if (text) HB.game.chronicle(state, text, 'raid', isLoc ? target.id : null);
      // stats recompute (cargo does not change stats, but injury does)
      HB.stats.recompute(state);
    },
    /** after saving a village: give back what you took from the raiders, or keep it */
    returnGoodsCard(state, L, r, map, then) {
      const value = r.recoveredValue;
      const give = () => {
        const g = Math.min(state.cargo.gold, r.recoveredGold); state.cargo.gold -= g;
        state.cargo.items = state.cargo.items.filter(it => it.recovered !== L.id);
        L.wealth += value; L.trust = Math.min(100, L.trust + 10 * HB.renown.trustMul(state));
        const f = L.factionId >= 0 ? state.world.factions[L.factionId] : null; if (f) HB.factions.adjust(state, f, { trust: 3 }, `returned what the raiders took from ${L.name}`);
        state.dragon.alignment = HB.clamp(state.dragon.alignment + 3, -100, 100);
        HB.game.chronicle(state, `Gave back to ${L.name} the ${HB.fmt.int(value)} gold worth the raiders had taken.`, 'deed', L.id);
        r.goodsReturned = 'returned';
        return `You set it all down in the square. Nobody in ${L.name} has ever seen a dragon give anything back. They will not forget it.`;
      };
      const keep = () => { r.goodsReturned = 'kept'; for (const it of state.cargo.items) if (it.recovered === L.id) delete it.recovered; L.trust = Math.max(0, L.trust - 5); return `You keep it. They saw you take it; they are grateful anyway, a little less than they were.`; };
      if (!HB.isBrowser || !HB.CardScene || !map) { give(); if (then) then(); return; }
      HB.scenes.push(new HB.CardScene({ title: `What Was Taken from ${L.name}`, illustration: 'petition', text: `You carry ${HB.fmt.int(value)} gold worth that the raiders had stolen from ${L.name}. The people are coming out of their houses, watching you.`, choices: [
        { label: 'Give it back', desc: `More trust with ${L.name}; kinder name.`, onChoose: give },
        { label: 'Keep it', desc: 'Treasure for the hoard. A little less trust.', onChoose: keep },
      ], onClose: () => { if (then) then(); } }));
    },
    /** show what changed (or store it, headless) */
    showSummary(state, target, before, info, map) {
      const sum = HB.consequences.summarize(state, target, before, info);
      state.lastConsequence = sum;
      if (HB.isBrowser && HB.ConsequenceScene && map) HB.scenes.push(new HB.ConsequenceScene(state, sum, map));
      else if (map) enc.afterEncounterPrompt(state, map);
      return sum;
    },
    afterDefeat(state, target, map) {
      const d = state.dragon, W = state.world, H = W.home;
      // emergency return: guarantee enough stamina to crawl home (forgiving rule) and mark the lair as more findable
      const back = HB.travel.cost(state, d.x, d.y, H.x, H.y);
      d.stamina = Math.max(d.stamina, Math.ceil(back.stamina * 1.15));
      state.lair.attention = (state.lair.attention || 0) + 2;
      state.phase = 'planning';
      const text = `You fall from the sky at ${target.name || 'the road'} and crawl into the brush as they search for you. Everything you carried is gone. When night comes you drag yourself into the air and limp home.`;
      HB.game.chronicle(state, `Defeated at ${target.name || 'the road'}; crawled home injured.`, 'defeat');
      if (HB.isBrowser && HB.CardScene) HB.scenes.push(new HB.CardScene({ title: 'You Fall', illustration: 'defeat', text, choices: [{ label: 'Limp home', desc: 'Return to the lair injured. Flight is slower until you have rested.', onChoose: () => { HB.travel.returnHome(state, map); return 'You fly home low and slow.'; } }] }));
      else HB.travel.returnHome(state, map);
    },
    /** nothing changed (flew on): only ask about going home if something is carried */
    afterEncounterPrompt(state, map) {
      const carried = state.cargo.gold + state.cargo.items.reduce((x, i) => x + i.value, 0);
      if (!carried && !state.cargo.captives.length) return;
      HB.modal({ title: 'Where Now?', text: `You carry ${HB.fmt.int(carried)} gold worth. It only makes you stronger once it is stored in your lair.`, buttons: [{ label: 'Fly home', primary: true, onClick: () => HB.travel.returnHome(state, map) }, { label: 'Stay on the map', cancel: true }] });
    },
  };
})();
