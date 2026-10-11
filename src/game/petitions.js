/* Petitioners at the cave mouth: mercenary contracts from realms at war, gifts from the frightened and the grateful. Headless-safe. */
(function () {
  const HB = globalThis.HB;

  const petitions = HB.petitions = {
    /** called when the dragon returns home; may queue a petition card */
    onReturn(state, map) {
      const rng = HB.game.rng, W = state.world, d = state.dragon;
      state.contracts = state.contracts || [];
      if (state.counters.raids < 1 || !rng.chance(0.3)) return null;
      const known = W.factions.filter(f => f.dragon.known && f.kind !== 'goblin');
      // mercenary offer from a realm at war
      const atWar = known.filter(f => f.atWar.length && (f.dragon.trust >= 5 || f.dragon.fear >= 25) && !state.contracts.some(c => c.factionId === f.id && !c.done));
      if (atWar.length && rng.chance(0.6)) {
        const f = rng.pick(atWar); const enemy = W.factions[f.atWar[0]];
        const targets = W.locations.filter(L => L.factionId === enemy.id && (L.type === 'castle' || L.type === 'town' || L.type === 'city') && L.state === 'normal' && Math.hypot(L.x - W.home.x, L.y - W.home.y) < 60);
        if (targets.length) {
          const T = targets.sort((a, b) => Math.hypot(a.x - W.home.x, a.y - W.home.y) - Math.hypot(b.x - W.home.x, b.y - W.home.y))[0];
          const reward = Math.round(T.wealth * 0.5 + 200 + d.tier * 150);
          const contract = { id: HB.nextId('ct'), kind: 'raid', factionId: f.id, targetId: T.id, reward, expires: state.time.year + 3, done: false };
          return { kind: 'mercenary', contract, text: `Envoys of ${f.name}, at war with ${enemy.name}, stand at the foot of the hill under a flag of truce. They offer ${HB.fmt.int(reward)} gold if ${T.name} burns or is plundered within three years. "Half their host is at the front," the envoy says. "The garrison is thin."`, illustration: 'petition',
            choices: [
              { label: 'Accept the contract', desc: `Raid ${T.name}; the gold is paid on your return. ${enemy.name} will hate you for it.`, apply: () => { state.contracts.push(contract); T.knowledge.seen = true; HB.world.reveal(state, T.x, T.y, 2); HB.game.chronicle(state, `Took a contract from ${f.name} to strike ${T.name}.`, 'contract'); return `The envoys bow and ride off. ${T.name} is marked on your map.`; } },
              { label: 'Demand a gift to even listen', desc: 'A small sum now; no contract. Dominance helps.', apply: () => { const g = Math.round(reward * 0.1 * (1 + state.dragon.stats.dominance / 100)); state.hoard.gold += g; HB.stats.recompute(state); return `They pay ${HB.fmt.int(g)} gold for the privilege of being refused.`; } },
              { label: 'Send them away', desc: '', apply: () => 'The envoys leave. The war goes on without you.' },
            ] };
        }
      }
      // gifts from the frightened: a nearby settlement asks to be spared
      const near = HB.world.locationsNear(W, W.home.x, W.home.y, 22, L => (L.type === 'village' || L.type === 'town') && L.state === 'normal' && L.knowledge.seen && !L.tribute && (L.fear > 20 || (L.factionId >= 0 && W.factions[L.factionId].dragon.fear > 30)));
      if (near.length && rng.chance(0.5)) {
        const L = near[0].L; const gift = Math.round(L.wealth * 0.06 + 20);
        return { kind: 'spare', text: `A reeve from ${L.name} climbs the hill with a cart and no weapons. He offers ${HB.fmt.int(gift)} gold and asks, in a voice he keeps steady, that his village be left alone this year.`, illustration: 'petition',
          choices: [
            { label: 'Take the gift and promise nothing', desc: 'Gold now; fear stays.', apply: () => { state.hoard.gold += gift; L.wealth -= gift; HB.stats.recompute(state); return `You take the gold. He waits for an answer and gets none.`; } },
            { label: 'Take it and swear to spare them', desc: 'Gold now; trust grows; they may pay willingly later.', apply: () => { state.hoard.gold += gift; L.wealth -= gift; L.trust = Math.min(100, L.trust + 15); L.fear = Math.max(0, L.fear - 10); state.dragon.alignment = HB.clamp(state.dragon.alignment + 2, -100, 100); HB.stats.recompute(state); L.flags.spared = state.time.year; return `You swear it. He goes down the hill a different man.`; } },
            { label: 'Refuse and eat his ox', desc: 'Tyranny. Fear spreads; so does hate.', apply: () => { L.fear = Math.min(100, L.fear + 15); const f = L.factionId >= 0 ? W.factions[L.factionId] : null; if (f) HB.factions.adjust(state, f, { fear: 4, hostility: 4 }, `mocked the reeve of ${L.name}`); state.dragon.alignment = HB.clamp(state.dragon.alignment - 3, -100, 100); state.dragon.health = state.dragon.stats.maxHealth; return 'He walks home. The story he tells will bring hunters, and tribute.'; } },
          ] };
      }
      // gifts from the grateful
      const loyal = state.memory.loyalties.filter(l => l.kind === 'guardians');
      if (loyal.length && rng.chance(0.4)) {
        const l = rng.pick(loyal); const L = W.locations[l.locId]; const gift = HB.hoard.makeItem(rng.pick(HB.LOOT.goods.concat(HB.LOOT.books)), rng, L ? L.name : l.name, state.time.year);
        return { kind: 'gift', text: `${HB.fmt.cap(l.name)} send a wagon to the foot of the hill: ${HB.hoard.itemLabel(gift)}, and a boy who asks if the dragon is well.`, illustration: 'petition',
          choices: [{ label: 'Accept the gift', desc: '', apply: () => { HB.hoard.addToHoard(state, gift); return 'The boy goes home with a story.'; } }] };
      }
      return null;
    },
    /** contracts pay out when the target is hit */
    onRaid(state, target, r) {
      if (!state.contracts) return;
      for (const c of state.contracts) {
        if (c.done || c.targetId !== target.id) continue;
        if ((r.stolenValue > 0 || r.burned > 0) && r.outcome !== 'defeated') { c.done = true; state.cargo.gold += c.reward; const f = state.world.factions[c.factionId]; HB.factions.adjust(state, f, { trust: 8, fear: 2 }, `fulfilled a contract against ${target.name}`); HB.game.chronicle(state, `${f.name} paid ${HB.fmt.int(c.reward)} gold for the strike on ${target.name}.`, 'contract'); r.contractPaid = c.reward; }
      }
    },
    expire(state) { if (!state.contracts) return; for (const c of state.contracts) if (!c.done && state.time.year > c.expires) c.done = true; },
    show(state, p, map) {
      if (!HB.isBrowser || !HB.CardScene) { const ch = p.choices[0]; return ch.apply(); }
      HB.scenes.push(new HB.CardScene({ title: 'Petitioners at the Cave', illustration: p.illustration || 'petition', text: p.text, choices: p.choices.map(c => ({ label: c.label, desc: c.desc, onChoose: () => c.apply() })) }));
    },
  };
})();
