/* Named history: grudges, hero lineages, orders, loyal houses and guardians. Headless-safe. */
(function () {
  const HB = globalThis.HB;

  const history = HB.history = {
    onRaid(state, target, f, c) {
      const rng = HB.game.rng, year = state.time.year;
      if ((c.kills >= 3 || c.burned >= 2 || c.civiliansKilled >= 2) && rng.chance(0.35)) {
        const culture = f ? f.culture : 'westron';
        const name = HB.names.person(rng, culture, false);
        const g = { id: HB.nextId('gr'), name, kind: 'hunter', from: target.name, factionId: f ? f.id : -1, year, level: 2 + state.dragon.tier, text: `survived the ${c.burned ? 'burning' : 'sack'} of ${target.name} in Year ${year} and swore to kill the dragon`, active: true };
        state.memory.grudges.push(g);
        HB.game.chronicle(state, `${name} survived ${target.name} and swore vengeance.`, 'grudge');
      }
      if (c.captured && target.ruler && target.ruler.house && rng.chance(0.5)) {
        if (!state.memory.grudges.some(g => g.name === target.ruler.house)) state.memory.grudges.push({ id: HB.nextId('gr'), name: target.ruler.house, kind: 'house', from: target.name, factionId: f ? f.id : -1, year, level: 2, text: `has not forgiven the taking of its kin from ${target.name}`, active: true });
      }
    },
    onHeroSlain(state, e) {
      const rng = HB.game.rng, year = state.time.year;
      if (rng.chance(0.3)) {
        const order = { id: HB.nextId('ord'), name: HB.names.orderName(rng, e.name).replace(/ \(.*\)/, ''), founder: e.name, factionId: e.factionId, founded: year + 8 + rng.int(10), strength: 1 };
        state.memory.orders.push(order);
        HB.game.chronicle(state, `${e.name} fell to the dragon. Their companions swore to found an order in their name.`, 'grudge');
      }
    },
    onHeroSurvived(state, e) {
      const year = state.time.year;
      const existing = state.memory.grudges.find(g => g.name === e.name);
      if (existing) { existing.level++; existing.text = `has faced the dragon ${existing.level - 1} times and lived`; }
      else state.memory.grudges.push({ id: HB.nextId('gr'), name: e.name, kind: 'hunter', from: 'the road', factionId: e.factionId, year, level: (e.level || 1) + 1, text: `faced the dragon in Year ${year} and lived to train for a second meeting`, active: true });
    },
    onRelease(state, c) {
      if (!c.house && !c.from) return;
      const name = c.house || `the family of ${c.name}`;
      const existing = state.memory.loyalties.find(l => l.name === name);
      if (existing) existing.strength++; else state.memory.loyalties.push({ id: HB.nextId('loy'), name, kind: 'house', factionId: c.factionId, year: state.time.year, strength: 1, text: `remembers that the dragon returned ${c.name} unharmed` });
    },
    onProtect(state, L) {
      const name = `the guardians of ${L.name}`;
      if (!state.memory.loyalties.some(l => l.name === name)) state.memory.loyalties.push({ id: HB.nextId('loy'), name, kind: 'guardians', factionId: L.factionId, locId: L.id, year: state.time.year, strength: 1, text: `keep watch over the dragon’s approaches in return for its protection` });
    },
    /** strongest active named hunter to lead an attack, or null */
    leadHunter(state) {
      const hs = state.memory.grudges.filter(g => g.active && g.kind === 'hunter');
      hs.sort((a, b) => b.level - a.level);
      return hs[0] || null;
    },
    /** orders that have been founded by now */
    activeOrders(state) { return state.memory.orders.filter(o => o.founded <= state.time.year); },
    loyalGuardBonus(state) { let b = 0; for (const l of state.memory.loyalties) if (l.kind === 'guardians') { const L = state.world.locations[l.locId]; if (L && L.tribute && !L.tribute.lapsed) b += 4 + Math.min(6, (state.time.year - l.year) / 5); } return b; },
    loyalWarning(state) { return state.memory.loyalties.some(l => l.kind === 'house' && l.strength >= 1) ? 1 : 0; },
    /** yearly: orders grow, guardians age into tradition; returns events */
    yearly(state, rng, ev) {
      for (const o of state.memory.orders) { if (o.founded === state.time.year) ev.push({ text: `${o.name} was founded in memory of ${o.founder}. Its members train to kill dragons.`, kind: 'grudge', bad: true }); else if (o.founded < state.time.year && rng.chance(0.1)) o.strength++; }
      for (const g of state.memory.grudges) { if (g.kind === 'hunter' && g.active && state.time.year - g.year > 45 && rng.chance(0.2)) { g.active = false; ev.push({ text: `${g.name}, who swore to kill you, died of old age with the oath unkept.`, kind: 'grudge' }); if (rng.chance(0.5)) { const heir = HB.names.person(rng, g.factionId >= 0 ? state.world.factions[g.factionId].culture : 'westron', false); state.memory.grudges.push({ id: HB.nextId('gr'), name: heir, kind: 'hunter', from: g.from, factionId: g.factionId, year: state.time.year, level: g.level, text: `inherited ${g.name}’s oath against the dragon`, active: true }); ev.push({ text: `${heir} took up ${g.name}’s oath.`, kind: 'grudge', bad: true }); } } }
      for (const l of state.memory.loyalties) { if (l.kind === 'guardians' && state.time.year - l.year === 20) ev.push({ text: `${HB.fmt.cap(l.name)} have become a hereditary order, sworn to the dragon.`, kind: 'loyal' }); }
    },
  };
})();
