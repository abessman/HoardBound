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
      // settlements offer a choice on arrival: raid, demand tribute, scout, leave
      const settlement = !target.kind && ['village', 'town', 'city', 'castle', 'hold', 'glade', 'monastery'].includes(target.type);
      if (settlement && !opts.direct && HB.isBrowser && HB.CardScene) { enc.arrivalCard(state, target, map); return; }
      if (kind === 'raid') {
        const scene = HB.raidTemplates.build(state, target, HB.game.rng);
        const r = HB.raid.create(state, target, scene);
        state.encounter = { kind: 'raid', targetId: target.id, targetKind: target.kind || 'location' };
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
      choices.push({ label: kind === 'raid' ? 'Raid' : 'Approach', desc: kind === 'raid' ? 'Enter the animated raid: take what you can, leave when you must.' : 'Deal with the place as it is.', onChoose: () => { setTimeout(() => enc.begin(state, target, map, { direct: true }), 0); return false; } });
      if (HB.tribute) {
        const t = HB.tribute.canDemand(state, target);
        if (target.tribute && !target.tribute.lapsed) choices.push({ label: 'Collect tribute', desc: `They owe ${HB.fmt.int(target.tribute.amount)} gold a year. Collect what is due.`, onChoose: () => HB.tribute.collect(state, target) });
        else choices.push({ label: 'Demand tribute', desc: t.ok ? `Likely to accept: ${t.chanceText}. Yearly payment about ${HB.fmt.int(t.amount)} gold.` : t.reason, disabled: !t.ok, disabledReason: t.reason, onChoose: () => HB.tribute.demand(state, target) });
        const p = HB.tribute.canProtect(state, target);
        if (p.ok || p.show) choices.push({ label: 'Offer protection', desc: p.ok ? 'Promise to guard them from raiders in exchange for gifts. Trust grows; tyranny does not.' : p.reason, disabled: !p.ok, disabledReason: p.reason, onChoose: () => HB.tribute.protect(state, target) });
      }
      choices.push({ label: 'Scout and move on', desc: 'Learn its wealth and defences exactly. No alarm, nothing taken.', onChoose: () => { target.knowledge.scoutedYear = state.time.year; target.knowledge.raided = target.knowledge.raided || false; target.knowledge.exact = true; state.phase = 'planning'; return `You circle ${target.name} twice, counting roofs and spears. ${target.defense > 45 ? 'Too strong to fight; perhaps not too strong to rob.' : 'Nothing here you could not handle with care.'}`; } });
      choices.push({ label: 'Fly on', desc: '', onChoose: () => { state.phase = 'planning'; return 'You fly on.'; } });
      HB.scenes.push(new HB.CardScene({ title: `Above ${target.name}`, illustration: target.type === 'castle' ? 'ransom' : target.type === 'glade' || target.type === 'monastery' ? 'monastery' : 'petition', text: `${HB.preview.describe(state, target).subtitle}. ${f ? HB.preview.moodText(f) : 'No realm claims it.'} ${target.memory.length ? 'They remember you.' : 'They have never seen a dragon.'}`, choices, onClose: () => { if (state.phase === 'planning' && map) { /* nothing else */ } } }));
    },
    beginCard(state, target, map) {
      const def = HB.CARD_ENCOUNTERS[target.type];
      const rng = HB.game.rng;
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
        choices: def.choices.map(ch => ({ label: ch.label, desc: ch.desc, disabled: ch.disabled ? ch.disabled(ctx) : false, disabledReason: ch.disabledReason, onChoose: () => { const res = ch.resolve(ctx); finish(res, ch); return res.text; } })),
        onClose: () => { if (map) enc.afterEncounterPrompt(state, map); },
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
      else { state.cargo.gold += r.loot.gold; for (const it of r.loot.items) state.cargo.items.push(it); for (const c of r.loot.captives) state.cargo.captives.push(c); }
      const rival = r.entities.find(e => e.kind === 'rivalDragon');
      const rivalSlain = !!(rival && rival.dead);
      if (rivalSlain && target.dragon) { HB.game.chronicle(state, `Slew ${target.dragon.name}${target.dragon.tier >= 3 ? ', the elder wyrm,' : ''} in its own lair.`, 'legend'); d.prestige += target.dragon.tier >= 3 ? 60 : 25; state.counters.kills++; if (target.dragon.tier >= 3) state.flags.legend = true; target.state = 'ruin'; target.dragon = null; target.name = 'The Dead Wyrm’s Lair'; }
      const fearGain = Math.min(20, r.stolenValue / 150 + r.burned * 3 + r.kills * 1.2 + r.roars * 0.5 + r.captured * 3) + (rivalSlain ? 15 : 0);
      const hostGain = Math.min(25, r.burned * 4 + r.civiliansKilled * 2 + r.kills * 0.8 + r.captured * 3 + r.stolenValue / 400);
      const alignment = -(r.burned * 4 + r.civiliansKilled * 2 + r.captured * 1) + (r.stolenValue > 0 && !r.burned && !r.civiliansKilled ? 0.5 : 0);
      enc.applyConsequences(state, target, { stolenValue: outcome === 'defeated' ? 0 : r.stolenValue, destroyedValue: r.destroyedValue, burned: r.burned, kills: r.kills, civiliansKilled: r.civiliansKilled, captured: r.captured, famine: r.famine, fear: fearGain, hostility: hostGain, trust: 0, alignment, outcome, pursued: r.pursued, label: outcome, damageTaken: r.damageTaken, tookArtifact: r.tookArtifact, duel: r.scene.duel, lostLoot }, map);
      state.counters.raids++; state.counters.kills += r.kills; state.counters.captures += r.captured; state.counters.burned += r.burned; state.counters.goldStolen += outcome === 'defeated' ? 0 : r.stolenValue;
      state.encounter = null;
      if (outcome === 'defeated') { enc.afterDefeat(state, target, map); return; }
      state.phase = 'planning';
      if (HB.save && HB.save.autosave) HB.save.autosave(state);
      if (HB.petitions && HB.petitions.onRaid) HB.petitions.onRaid(state, target, r);
      if (map) enc.afterEncounterPrompt(state, map, r);
      if (rivalSlain && state.flags.legend && !state.flags.legendShown && HB.isBrowser && HB.LegendScene) { state.flags.legendShown = true; HB.scenes.push(new HB.LegendScene(state)); }
    },
    applyConsequences(state, target, c, map) {
      const W = state.world;
      const year = state.time.year;
      const d = state.dragon;
      const isLoc = target.type !== undefined && target.kind === undefined;
      if (isLoc) {
        const L = target;
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
        // learning
        const f = L.factionId >= 0 ? W.factions[L.factionId] : null;
        if (f) {
          const adj = { fear: c.fear, hostility: c.hostility, trust: c.trust || 0 };
          if (HB.factions) HB.factions.adjust(state, f, adj, `${c.label} at ${L.name}`); else { f.dragon.fear += adj.fear; f.dragon.hostility += adj.hostility; f.dragon.trust += adj.trust; }
          f.dragon.known = true;
          if (c.captured) f.learned.rescue++;
          if (c.stolenValue > 300 && (L.type === 'town' || L.type === 'city' || L.type === 'castle')) f.learned.vaults++;
          if (L.type === 'castle' || L.type === 'city' || c.captured || c.burned >= 2) f.learned.hunters++;
          if (c.burned >= 2 || c.civiliansKilled >= 3) f.history.push({ year, text: `${d.name} burned ${L.name}.` });
          if (HB.history) HB.history.onRaid(state, L, f, c);
        }
        if (L.type === 'rivalLair' && c.duel && c.outcome === 'withdrew' && c.stolenValue > 0 && L.dragon) { /* rival survives; its hoard reduced */ }
        if (L.type === 'rivalLair' && c.duel && c.rivalSlain) { L.state = 'ruin'; L.type = 'ruin'; }
      } else {
        // entity (caravan, hero)
        const e = target;
        const f = e.factionId >= 0 ? W.factions[e.factionId] : null;
        if (f) { const adj = { fear: c.fear, hostility: c.hostility, trust: 0 }; if (HB.factions) HB.factions.adjust(state, f, adj, `${c.label} on ${e.name}`); else { f.dragon.fear += adj.fear; f.dragon.hostility += adj.hostility; } f.dragon.known = true; if (e.kind === 'caravan') { f.learned.escorts++; f.history.push({ year, text: `${d.name} plundered a caravan near ${e.name}.` }); } if (HB.history) HB.history.onRaid(state, e, f, c); }
        if (e.kind === 'caravan') { e.wealth = Math.max(0, e.wealth - c.stolenValue - c.destroyedValue); e.raided = true; if (c.outcome !== 'defeated') e.dead = true; }
        if (e.kind === 'hero') { if (c.kills > 0 || c.outcome === 'withdrew') { e.dead = c.kills > 0; if (c.kills > 0 && HB.history) HB.history.onHeroSlain(state, e); else if (HB.history) HB.history.onHeroSurvived(state, e); } }
      }
      // dragon
      d.alignment = HB.clamp(d.alignment + (c.alignment || 0), -100, 100);
      state.lair.attention = (state.lair.attention || 0) + (c.pursued ? 3 : 0) + c.burned * 1 + (c.stolenValue > 800 ? 1 : 0);
      if (c.damageTaken > 0 && c.outcome !== 'defeated' && HB.game.rng.chance(Math.min(0.5, c.damageTaken / 80))) d.scars++;
      // chronicle
      const name = target.name || 'the road';
      let text;
      if (c.outcome === 'defeated') text = `Fell at ${name}, bleeding, and lost everything carried.`;
      else if (isLoc && (c.stolenValue > 0 || c.burned > 0 || c.captured > 0)) text = `${c.burned ? 'Burned' : 'Raided'} ${name}: took ${HB.fmt.int(c.stolenValue)} gold worth${c.burned ? `, burned ${HB.fmt.plural(c.burned, 'building')}` : ''}${c.captured ? `, carried off ${HB.fmt.plural(c.captured, 'captive')}` : ''}${c.kills ? `, killed ${c.kills}` : ''}.`;
      else if (!isLoc) text = `${c.outcome === 'withdrew' && c.stolenValue > 0 ? 'Plundered' : 'Attacked'} ${name}: ${HB.fmt.int(c.stolenValue)} gold worth${c.kills ? `, ${c.kills} slain` : ''}.`;
      else if (c.outcome === 'withdrew') text = `Flew over ${name} and left with nothing${c.kills ? ` but ${c.kills} dead behind` : ''}.`;
      else text = `${HB.fmt.cap(c.label)} at ${name}.`;
      HB.game.chronicle(state, text, 'raid', isLoc ? target.id : null);
      // stats recompute (cargo does not change stats, but injury does)
      HB.stats.recompute(state);
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
    afterEncounterPrompt(state, map, r) {
      const d = state.dragon;
      const cargo = HB.game.cargoWeight(state);
      const cap = d.stats.capacity;
      const lines = [];
      if (r) { if (r.loot.gold || r.loot.items.length) lines.push(`You carry ${HB.fmt.int(r.loot.gold)} gold and ${HB.fmt.plural(r.loot.items.length, 'item')}${r.loot.captives.length ? ` and ${HB.fmt.plural(r.loot.captives.length, 'captive')}` : ''} (${cargo.toFixed(1)}/${cap} carried).`); if (r.burned) lines.push(`${HB.fmt.plural(r.burned, 'building')} burned.`); if (r.pursued) lines.push('They will send riders after you.'); }
      lines.push('Fly home to add it to the hoard, or look for another target while you have the stamina.');
      HB.modal({ title: 'The Raid Ends', text: lines.join(' '), buttons: [{ label: 'Fly home', primary: true, onClick: () => HB.travel.returnHome(state, map) }, { label: 'Stay on the map', cancel: true }] });
    },
  };
})();
