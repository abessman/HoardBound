/* Named history: grudges, hero lineages, orders, loyal houses and guardians. Headless-safe.
 * The grievance ledger (0.11, shown in Reputation → Grudges): everyone who has sworn vengeance on the dragon, with the
 * cause, the place and year, a strength that grows each time they survive a meeting (with an epithet), what they did
 * since, and how it ended (dead, forgiven, passed to an heir). Kinds: hunter (sworn to kill you), house (a family's
 * grudge), betrayed (people whose protection you broke), rebel (a rising you crushed). */
(function () {
  const HB = globalThis.HB;
  const EPITHETS = [null, null, null, 'the Scarred', 'Dragonfoe', 'the Unbroken', 'Dragonbane', 'Doom of Wyrms'];
  const KIND_NAMES = { hunter: 'Sworn to kill you', house: 'A family’s grudge', betrayed: 'Betrayed by you', rebel: 'A rising you crushed' };

  const history = HB.history = {
    EPITHETS, KIND_NAMES,
    // ---------- the grievance ledger
    /** someone swears vengeance; one already sworn under that name grows stronger instead. Returns the record */
    grievance(state, o) {
      const year = state.time.year, G = state.memory.grudges;
      const same = G.find(g => g.active && g.name === o.name);
      if (same) { history.escalate(state, same, o.text); return same; }
      const g = Object.assign({ id: HB.nextId('gr'), kind: 'hunter', from: '', factionId: -1, year, level: 2, active: true, status: 'sworn', epithet: null, meetings: 0, log: [] }, o);
      g.log = [{ year, text: o.text }];
      G.push(g);
      HB.game.chronicle(state, `${g.name} ${g.text}.`, 'grudge');
      return g;
    },
    /** a meeting they survived (or another wrong): stronger, and known by a harder name */
    escalate(state, g, text) {
      g.level = Math.min(9, (g.level || 1) + 1); g.meetings = (g.meetings || 0) + 1;
      const ep = EPITHETS[Math.min(g.level, EPITHETS.length - 1)]; if (ep && g.kind === 'hunter') g.epithet = ep;
      history.note(state, g, text);
    },
    note(state, g, text) { if (!g.log) g.log = []; if (text) g.log.push({ year: state.time.year, text }); if (g.log.length > 12) g.log.splice(1, 1); },
    /** the grudge ends: status 'dead' | 'forgiven' | 'inherited' */
    end(state, g, status, text) { g.active = false; g.status = status; history.note(state, g, text); },
    title(g) { return g.epithet ? `${g.name} ${g.epithet}` : g.name; },
    statusOf(g) { return g.active ? (g.entityId ? 'hunting' : 'sworn') : (g.status && g.status !== 'sworn' ? g.status : 'dead'); },
    /** houses, the betrayed and rebels can be paid weregild; sworn hunters cannot be bought */
    amendCost(g) { return 150 * Math.max(1, g.level || 1); },
    canAmend(state, g) {
      if (!g.active || !['house', 'betrayed', 'rebel'].includes(g.kind)) return { ok: false, show: false };
      const cost = history.amendCost(g);
      if (state.hoard.gold < cost) return { ok: false, show: true, cost, reason: `Weregild of ${cost} gold from the hoard; you have ${HB.fmt.int(state.hoard.gold)}.` };
      return { ok: true, show: true, cost };
    },
    amend(state, g) {
      const c = history.canAmend(state, g); if (!c.ok) return c.reason;
      HB.hoard.spend(state, c.cost);
      const W = state.world, L = g.locId !== undefined && g.locId !== null ? W.locations[g.locId] : null, f = g.factionId >= 0 ? W.factions[g.factionId] : null;
      if (L) L.trust = Math.min(100, L.trust + 15);
      if (f && HB.factions) HB.factions.adjust(state, f, { trust: 3, hostility: -3 }, `the dragon paid weregild to ${g.name}`);
      state.dragon.alignment = HB.clamp(state.dragon.alignment + 3, -100, 100);
      history.end(state, g, 'forgiven', `accepted ${c.cost} gold in weregild and let the grudge go`);
      HB.game.chronicle(state, `Paid ${c.cost} gold in weregild to ${g.name}; the grudge is ended.`, 'deed');
      if (HB.consequences) HB.consequences.react(state, `${HB.fmt.cap(g.name)} let the grudge go.`, `because you paid ${c.cost} gold in weregild`);
      return `${HB.fmt.cap(g.name)} take${/^the /.test(g.name) ? '' : 's'} the gold, and the old wrong is spoken of as settled.`;
    },
    onRaid(state, target, f, c) {
      const rng = HB.game.rng, year = state.time.year;
      if ((c.kills >= 3 || c.burned >= 2 || c.civiliansKilled >= 2) && rng.chance(0.35)) {
        const culture = f ? f.culture : 'westron';
        const name = HB.names.person(rng, culture, false);
        history.grievance(state, { name, kind: 'hunter', from: target.name, locId: target.id, factionId: f ? f.id : -1, level: 2 + state.dragon.tier, text: `survived the ${c.burned ? 'burning' : 'sack'} of ${target.name} in Year ${year} and swore to kill the dragon` });
      }
      if (c.captured && target.ruler && target.ruler.house && rng.chance(0.5)) {
        if (!state.memory.grudges.some(g => g.name === target.ruler.house)) history.grievance(state, { name: target.ruler.house, kind: 'house', from: target.name, locId: target.id, factionId: f ? f.id : -1, level: 2, text: `has not forgiven the taking of its kin from ${target.name}` });
      }
    },
    onHeroSlain(state, e) {
      const rng = HB.game.rng, year = state.time.year;
      if (rng.chance(0.3)) {
        const order = { id: HB.nextId('ord'), name: HB.names.orderName(rng, e.name).replace(/ \(.*\)/, ''), founder: e.name, factionId: e.factionId, founded: year + 8 + rng.int(10), strength: 1 };
        state.memory.orders.push(order);
        HB.game.chronicle(state, `${e.name} fell to the dragon. Their companions swore to found an order in their name.`, 'grudge');
      }
      const g = state.memory.grudges.find(x => x.active && x.name === e.name); if (g) history.end(state, g, 'dead', `fell to the dragon in Year ${year}`);
      if (rng.chance(0.5)) history.grievance(state, { name: `the kin of ${e.name}`, kind: 'house', from: 'the road', factionId: e.factionId, level: 2, text: `mourn ${e.name}, whom the dragon slew in Year ${year}` });
    },
    onHeroSurvived(state, e) {
      const year = state.time.year;
      const existing = state.memory.grudges.find(g => g.active && g.name === e.name);
      if (existing) history.escalate(state, existing, `faced the dragon again in Year ${year}, and lived`);
      else history.grievance(state, { name: e.name, kind: 'hunter', from: 'the road', factionId: e.factionId, level: (e.level || 1) + 1, text: `faced the dragon in Year ${year} and lived to train for a second meeting` });
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
      for (const g of state.memory.grudges.slice()) {
        if (g.kind === 'hunter' && g.active && state.time.year - g.year > 45 && rng.chance(0.2)) {
          const heirs = rng.chance(0.5);
          history.end(state, g, heirs ? 'inherited' : 'dead', heirs ? 'grew old and passed the oath to an heir' : 'died of old age with the oath unkept');
          ev.push({ text: `${history.title(g)}, who swore to kill you, died of old age with the oath unkept.`, kind: 'grudge' });
          if (heirs) { const heir = HB.names.person(rng, g.factionId >= 0 ? state.world.factions[g.factionId].culture : 'westron', false); history.grievance(state, { name: heir, kind: 'hunter', from: g.from, locId: g.locId, factionId: g.factionId, level: g.level, text: `inherited ${history.title(g)}’s oath against the dragon` }); ev.push({ text: `${heir} took up ${g.name}’s oath.`, kind: 'grudge', bad: true }); }
        }
      }
      for (const l of state.memory.loyalties) { if (l.kind === 'guardians' && state.time.year - l.year === 20) ev.push({ text: `${HB.fmt.cap(l.name)} have become a hereditary order, sworn to the dragon.`, kind: 'loyal' }); }
    },
  };
})();
