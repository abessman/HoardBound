/* Consequences: what changed because of an encounter, said plainly, and the log of how the world reacted (with causes).
 * Headless-safe. The ConsequenceScene (views/consequenceview.js) renders a summary. */
(function () {
  const HB = globalThis.HB;

  // what a realm's learning means for you, in one sentence
  const LEARNED = {
    escorts: (f) => `Caravans of ${f.name} will ride with more guards.`,
    vaults: (f) => `${f.name} will lock its valuables away behind stronger doors.`,
    rescue: (f) => `${f.name} will send rescuers after anyone you carry off.`,
    hunters: (f) => `${f.name} is paying hunters to find your lair.`,
  };

  const cons = HB.consequences = {
    LEARNED,
    /** record a world reaction with its cause; shown on waking and in the Aims board */
    react(state, text, cause) {
      if (!state.reactions) state.reactions = [];
      state.reactions.push({ year: state.time.year, day: state.time.day, text, cause: cause || '', seen: false });
      if (state.reactions.length > 80) state.reactions.splice(0, state.reactions.length - 80);
    },
    unseen(state) { return (state.reactions || []).filter(r => !r.seen); },
    markSeen(state) { for (const r of state.reactions || []) r.seen = true; },
    /** capture what we compare against after an encounter */
    snapshot(state, target) {
      const W = state.world;
      const isLoc = !!target && target.type !== undefined && target.kind === undefined;
      const R = HB.renown ? HB.renown.get(state) : { titles: [], deeds: {} };
      return {
        energy: HB.stats.hoardEnergy(state), alignment: state.dragon.alignment, health: state.dragon.health,
        cargoGold: state.cargo.gold, cargoItems: state.cargo.items.map(i => i.id), cargoCaptives: state.cargo.captives.length,
        factions: W.factions.map(f => ({ fear: f.dragon.fear, hostility: f.dragon.hostility, trust: f.dragon.trust, heat: HB.heat ? HB.heat.levelOf(f) : 0, learned: Object.assign({}, f.learned) })),
        loc: isLoc ? { id: target.id, wealth: target.wealth, trust: target.trust, fear: target.fear, state: target.state, threat: target.threat ? Object.assign({}, target.threat) : null } : null,
        threats: W.locations.filter(L => L.threat).map(L => L.id),
        titles: R.titles.length, deeds: Object.assign({}, R.deeds),
      };
    },
    /** value of what is carried, and what storing it at home would do */
    storePreview(state) {
      const carried = state.cargo.gold + state.cargo.items.reduce((a, b) => a + b.value, 0);
      const energyGain = state.cargo.gold + state.cargo.items.reduce((a, b) => a + b.value * (b.cat === 'artifacts' ? 2 : 1), 0);
      const after = HB.stats.preview(state, (h) => { h.gold += state.cargo.gold; for (const it of state.cargo.items) h.items.push(it); });
      const diff = HB.stats.diff(state.dragon.stats, after).filter(x => x.delta > 0);
      return { carried, energyGain, diff };
    },
    diffText(diff, n = 4) { return diff.slice(0, n).map(x => `${HB.fmt.signed(x.delta, 1)} ${x.label.toLowerCase()}`).join(', '); },
    /** who you did it to, in words: "Stoneford's merchants", "Hollin Farm" */
    victimName(state, target) {
      const W = state.world;
      if (target.kind === 'caravan') { const o = W.locations[target.originId]; return o ? `${o.name}’s merchants` : 'a merchant caravan'; }
      return target.name || 'the road';
    },
    /**
     * Build the summary: { title, headline, lines:[{text, tone}], next }.
     * info: { kind: 'raid'|'card'|'defend'|'toll'|'escort'|'tribute'|'protect', outcome, r, label, gained:{gold, items} }
     */
    summarize(state, target, before, info) {
      const W = state.world, lines = [], add = (text, tone) => lines.push({ text, tone });
      const r = info.r || null;
      const isLoc = target.type !== undefined && target.kind === undefined;
      const who = cons.victimName(state, target);
      const outcome = info.outcome || (r && r.outcome) || null;
      // ---- headline
      let headline, title = 'What Changed';
      if (outcome === 'defeated') { headline = `You were beaten at ${target.name || 'the road'} and lost everything you carried.`; title = 'Defeat'; }
      else if (info.kind === 'defend' && target.kind === 'caravan') headline = outcome === 'defended' ? `You drove the outlaws off the ${target.name}.` : `You left the ${target.name} to the outlaws.`;
      else if (info.kind === 'story') headline = `${HB.fmt.cap(info.label)}.`;
      else if (target.kind === 'hunters') headline = r && r.kills > 0 ? `You broke ${target.name}.` : `${HB.fmt.cap(target.name)} are still after you.`;
      else if (info.kind === 'defend') headline = outcome === 'defended' ? `You drove the raiders of ${(before.loc && before.loc.threat && before.loc.threat.campName) || 'the hills'} out of ${target.name}.` : `You left ${target.name} to the raiders.`;
      else if (info.kind === 'toll') headline = info.success ? `${HB.fmt.cap(who)} paid you to let them pass.` : `${HB.fmt.cap(who)} refused to pay.`;
      else if (info.kind === 'escort') headline = `You guarded ${who} on the road.`;
      else if (info.kind === 'tribute') headline = info.success ? `${target.name} agreed to pay you tribute.` : `${target.name} refused your demand.`;
      else if (info.kind === 'protect') headline = `You swore to protect ${target.name}.`;
      else if (target.kind === 'caravan') headline = (r && r.stolenValue > 0) ? `You robbed ${who}.` : `You attacked ${who} and came away with nothing.`;
      else if (target.kind === 'hero') headline = r && r.kills > 0 ? `You killed ${target.name}, a wandering hero.` : `${target.name} lived through meeting you, and will remember.`;
      else if (r) headline = r.burned > 0 ? `You ${r.stolenValue > 0 ? 'robbed and burned' : 'burned'} ${who}.` : r.stolenValue > 0 ? `You robbed ${who}.` : `You flew over ${who} and took nothing.`;
      else headline = info.label ? `${HB.fmt.cap(info.label)} at ${who}.` : `At ${who}.`;
      // ---- what you gained
      const gainedGold = Math.max(0, state.cargo.gold - before.cargoGold);
      const gainedItems = state.cargo.items.filter(i => !before.cargoItems.includes(i.id));
      const gainedValue = gainedGold + gainedItems.reduce((a, b) => a + b.value, 0);
      const caps = state.cargo.captives.length - before.cargoCaptives;
      if (gainedValue > 0 || caps > 0) {
        const parts = [];
        if (gainedGold) parts.push(`${HB.fmt.int(gainedGold)} gold`);
        for (const it of gainedItems.slice(0, 3)) parts.push(`${it.name} (${HB.fmt.int(it.value)})`);
        if (gainedItems.length > 3) parts.push(`${gainedItems.length - 3} more pieces`);
        if (caps > 0) parts.push(HB.fmt.plural(caps, 'captive'));
        add(`+${HB.fmt.list(parts)} carried${gainedValue ? `: ${HB.fmt.int(gainedValue)} gold worth` : ''}.`, 'good');
      }
      for (const n of (r && r.storyNotes) || []) add(n.text, n.tone);
      for (const c of state.cargo.captives) if (c.sitId && before.cargoCaptives < state.cargo.captives.length) add(`You carry ${c.name}. Free them from your lair for their people’s gratitude, or ransom them.`, 'good');
      if (r && r.goodsReturned === 'returned') add(`You gave back the ${HB.fmt.int(r.recoveredValue)} gold worth the raiders had stolen.`, 'good');
      else if (!(gainedValue > 0 || caps > 0) && !(r && r.storyNotes) && outcome !== 'defeated' && !['protect', 'tribute', 'defend', 'story'].includes(info.kind)) add('Nothing taken.');
      if (r && r.goodsReturned === 'kept') add(`You kept what the raiders had stolen. ${target.name} saw.`);
      if (outcome !== 'defeated' && (state.cargo.gold || state.cargo.items.length)) {
        const sp = cons.storePreview(state);
        const next = HB.TIERS[state.dragon.tier + 1];
        const e0 = Math.round(HB.stats.hoardEnergy(state)), e1 = Math.round(e0 + sp.energyGain);
        const prior = sp.carried - gainedValue > 0.5;
        add(`Stored at home${prior ? ' (with everything you carry)' : ''} → ${sp.diff.length ? cons.diffText(sp.diff) : 'no stronger yet'}. Hoard strength ${HB.fmt.int(e0)} → ${HB.fmt.int(e1)}${next ? ` of ${HB.fmt.int(next.energy)}` : ''}.`, sp.diff.length ? 'good' : undefined);

      }
      // ---- the place itself
      if (isLoc && before.loc) {
        const L = target, b = before.loc;
        if (b.threat && !L.threat) add(`${L.name} is safe. The raiders will not come back soon.`, 'good');
        if (L.state === 'burned' && b.state !== 'burned') add(`${L.name} burned. Its people will rebuild slowly, if at all.`, 'bad');
        const lost = b.wealth - L.wealth;
        if (lost > 10) add(`${L.name} is poorer (${HB.fmt.int(b.wealth)} → ${HB.fmt.int(L.wealth)} gold worth). Less to take next time; it recovers over the years.`);
        if (L.flags && L.flags.famine === state.time.year && b.state === L.state) add(`The granary burned: famine in ${L.name}.`, 'bad');
      }
      for (const id of before.threats) { const V = W.locations[id]; if (V && !V.threat && V !== target && (!before.loc || before.loc.id !== id)) add(`${V.name} is spared: its raiders went home to lick their wounds.`, 'good'); }
      // ---- realms: fear, hostility, trust, what they learned
      let trustGained = false;
      if (isLoc && before.loc && target.trust - before.loc.trust >= 1) { trustGained = true; add(`${target.name} trusts you more (+${Math.round(target.trust - before.loc.trust)}).`, 'good'); }
      else if (isLoc && before.loc && before.loc.trust - target.trust >= 1) add(`${target.name} trusts you less (−${Math.round(before.loc.trust - target.trust)}).`, 'bad');
      W.factions.forEach((f, i) => {
        const b = before.factions[i]; if (!b) return;
        const df = Math.round(f.dragon.fear - b.fear), dh = Math.round(f.dragon.hostility - b.hostility), dt = Math.round(f.dragon.trust - b.trust);
        const bits = [];
        if (df >= 1) bits.push(`fear +${df}`); if (dh >= 1) bits.push(`hostility +${dh}`); if (dh <= -1) bits.push(`hostility ${dh}`); if (dt >= 1) { bits.push(`trust +${dt}`); trustGained = true; } if (dt <= -1) bits.push(`trust ${dt}`);
        if (bits.length) add(`${f.name}: ${bits.join(', ')}.`, dh >= 3 ? 'warn' : dt >= 1 ? 'good' : undefined);
        for (const k in LEARNED) if ((f.learned[k] || 0) > (b.learned[k] || 0)) add(LEARNED[k](f), 'warn');
      });
      // heat steps: how hard each realm now pushes back
      W.factions.forEach((f, i) => { const b = before.factions[i]; if (!b || !HB.heat) return; const lv = HB.heat.levelOf(f); if (lv > b.heat) add(`${f.name} is now ${HB.HEAT_LEVELS[lv].name}: ${HB.HEAT_LEVELS[lv].effect.charAt(0).toLowerCase() + HB.HEAT_LEVELS[lv].effect.slice(1)}`, lv >= 2 ? 'bad' : 'warn'); else if (lv < b.heat) add(`${f.name} calms down (${HB.HEAT_LEVELS[lv].name}).`, 'good'); });
      if (info.pursuitText) add(info.pursuitText, 'good');
      else if (state.pursuit && HB.pursuit) add(HB.pursuit.hint(state), 'warn');
      if (!trustGained && outcome !== 'defeated') add('No trust gained.');
      // ---- your name
      const daRaw = state.dragon.alignment - before.alignment, da = Math.abs(daRaw) >= 1.5 ? Math.round(daRaw) : 0;
      if (da >= 1) add(`Your name grows kinder (${HB.fmt.signed(da)} benevolence).`, 'good');
      else if (da <= -1) add(`Your name grows darker (${HB.fmt.signed(da)} benevolence).`, 'warn');
      if (HB.renown) {
        const R = HB.renown.get(state);
        for (const t of R.titles.slice(before.titles)) add(`You are known now as ${t.name}. ${HB.TITLE_BY_ID[t.id].effect}`, 'good');
        for (const T of HB.TITLES) {
          const n = R.deeds[T.deed] || 0;
          if (n > (before.deeds[T.deed] || 0) && !HB.renown.has(state, T.id)) add(`Toward ${T.name(state, '…')}: ${n} of ${T.need} ${HB.DEED_NAMES[T.deed]}.`);
        }
      }
      if (state.dragon.health < before.health - 0.5 && outcome !== 'defeated') add(`You took ${Math.round(before.health - state.dragon.health)} wounds (health ${Math.round(state.dragon.health)}/${state.dragon.stats.maxHealth}).`, state.dragon.health < state.dragon.stats.maxHealth * 0.35 ? 'bad' : undefined);
      const m = HB.goals ? HB.goals.milestone(state) : null;
      return { title, headline, lines, next: m ? m.nextStep : '', milestone: m };
    },
    /** words for a deposit at home */
    depositSummary(state, summary, energyBefore) {
      const next = HB.TIERS[state.dragon.tier + 1];
      const e1 = Math.round(HB.stats.hoardEnergy(state));
      const lines = [];
      lines.push(`+${HB.fmt.int(summary.value)} gold worth stored at home${summary.diff.length ? ' → ' + cons.diffText(summary.diff.filter(x => x.delta > 0), 5) : ''}.`);
      if (next) lines.push(`Hoard strength ${HB.fmt.int(energyBefore)} → ${HB.fmt.int(e1)} of ${HB.fmt.int(next.energy)} needed to become ${HB.fmt.a(next.name.toLowerCase())}.`);
      return lines;
    },
  };
})();
