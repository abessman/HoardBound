/* Tribute and protection: settlements pay from their real wealth; lapses with poverty or new rulers. */
(function () {
  const HB = globalThis.HB;

  const tribute = HB.tribute = {
    canDemand(state, L) {
      const s = state.dragon.stats, W = state.world;
      const f = L.factionId >= 0 ? W.factions[L.factionId] : null;
      if (!['village', 'town', 'city', 'castle', 'hold', 'glade', 'monastery', 'mine'].includes(L.type)) return { ok: false, reason: 'Nothing here can pay tribute' };
      if (L.state !== 'normal') return { ok: false, reason: `${L.name} is ${L.state} and has nothing to give` };
      if (L.tribute && !L.tribute.lapsed) return { ok: false, reason: 'Already pays you tribute' };
      if (state.dragon.tier < 1) return { ok: false, reason: 'A hatchling’s demands are laughed at. Grow first.' };
      const fear = Math.max(L.fear, f ? f.dragon.fear : 0);
      const leverage = fear + s.dominance * 0.8 + s.prestige * 0.3 - L.defense * 0.6;
      const chance = HB.clamp(0.1 + leverage / 100 + (HB.renown && HB.renown.has(state, 'terror') ? 0.15 : 0), 0.02, 0.95);
      const amount = tribute.amountFor(L);
      if (chance < 0.15) return { ok: false, reason: `They are not afraid of you yet (fear ${Math.round(fear)}, dominance ${Math.round(s.dominance)} against defences ${L.defense}).` };
      return { ok: true, chance, chanceText: chance > 0.7 ? 'very likely' : chance > 0.45 ? 'likely' : 'uncertain', amount };
    },
    amountFor(L) { return Math.max(20, Math.round(L.wealth * 0.08)); },
    demand(state, L) {
      const t = tribute.canDemand(state, L); if (!t.ok) return t.reason;
      const f = L.factionId >= 0 ? state.world.factions[L.factionId] : null;
      if (HB.game.rng.chance(t.chance)) {
        L.tribute = { amount: t.amount, since: state.time.year, lapsed: false, willing: false, paidTotal: 0 };
        L.fear = Math.min(100, L.fear + 10);
        state.counters.tributes++;
        state.dragon.alignment = HB.clamp(state.dragon.alignment - 1, -100, 100);
        if (f && HB.factions) HB.factions.adjust(state, f, { fear: 4, hostility: 2 }, `tribute from ${L.name}`);
        HB.game.chronicle(state, `${L.name} agreed to pay ${HB.fmt.int(t.amount)} gold a year in tribute.`, 'tribute', L.id);
        if (HB.renown) HB.renown.record(state, 'tributes', { factionId: L.factionId, place: L.name });
        if (HB.consequences) HB.consequences.react(state, `${L.name} pays you ${HB.fmt.int(t.amount)} gold a year, and resents every coin.`, 'because they feared you more than they trusted their walls');
        // first payment now
        const first = Math.min(L.wealth, t.amount); L.wealth -= first; state.cargo.gold += first; L.tribute.paidTotal += first;
        state.phase = 'planning';
        return `${L.name} bows. ${HB.fmt.int(first)} gold is brought out at once, and ${HB.fmt.int(t.amount)} a year is promised. They will pay as long as they fear you and can afford it.`;
      }
      L.defense = Math.min(100, L.defense + 3);
      if (f) { if (HB.factions) HB.factions.adjust(state, f, { hostility: 6, fear: 1 }, `refused tribute at ${L.name}`); f.learned.hunters++; if (HB.consequences) HB.consequences.react(state, HB.consequences.LEARNED.hunters(f), `because ${L.name} refused your demand and sent for help`); }
      HB.game.chronicle(state, `${L.name} refused tribute.`, 'tribute', L.id);
      state.phase = 'planning';
      return `${L.name} refuses. Doors bar; bows come out; someone rides for the castle. You could still raid them, or remember this for later.`;
    },
    canProtect(state, L) {
      const f = L.factionId >= 0 ? state.world.factions[L.factionId] : null;
      if (!['village', 'town', 'city'].includes(L.type)) return { ok: false, show: false };
      if (L.state !== 'normal') return { ok: false, show: false };
      if (L.tribute && !L.tribute.lapsed) return { ok: false, show: false };
      const trust = Math.max(L.trust, f ? f.dragon.trust : 0);
      const guardian = HB.renown && HB.renown.guardianOf(state).includes(L.name);
      if (trust < 15 && state.dragon.alignment < 10 && !guardian) return { ok: false, show: true, reason: `They have no reason to trust a dragon (trust ${Math.round(trust)} of 15). Drive raiders off them, guard their caravans, release captives.` };
      return { ok: true };
    },
    protect(state, L) {
      const f = L.factionId >= 0 ? state.world.factions[L.factionId] : null;
      const amount = Math.max(10, Math.round(L.wealth * 0.04));
      L.tribute = { amount, since: state.time.year, lapsed: false, willing: true, paidTotal: 0 };
      L.trust = Math.min(100, L.trust + 15);
      L.flags.protected = state.time.year;
      state.dragon.alignment = HB.clamp(state.dragon.alignment + 4, -100, 100);
      if (f && HB.factions) HB.factions.adjust(state, f, { trust: 5 }, `protects ${L.name}`);
      HB.game.chronicle(state, `Swore to protect ${L.name}; they will send gifts of ${HB.fmt.int(amount)} gold a year.`, 'tribute', L.id);
      if (HB.history) HB.history.onProtect(state, L);
      if (HB.renown) HB.renown.record(state, 'protected', { factionId: L.factionId, place: L.name });
      if (HB.consequences) HB.consequences.react(state, `${L.name} sends you ${HB.fmt.int(amount)} gold a year and keeps watch on your approaches.`, 'because you swore to protect it');
      state.phase = 'planning';
      return `The elders of ${L.name} agree, warily. Gifts of about ${HB.fmt.int(amount)} gold a year, and they will speak well of you. Keep the bandits off them and the bargain holds.`;
    },
    collect(state, L) {
      const due = L.tribute.due || 0;
      if (due <= 0) { state.phase = 'planning'; return 'Nothing is due yet. Tribute is set aside at year’s end.'; }
      const paid = Math.min(due, L.wealth); L.wealth -= paid; L.tribute.due = 0; L.tribute.paidTotal += paid; state.cargo.gold += paid;
      state.phase = 'planning';
      return `${L.name} hands over ${HB.fmt.int(paid)} gold.`;
    },
    // ---------- offerings: villages that trust you bring gifts while they prosper and stay safe
    offeringPlaces(state) {
      const W = state.world, H = W.home;
      return W.locations.filter(L => ['farm', 'village', 'town'].includes(L.type) && L.state === 'normal' && !L.threat && L.trust >= 30 && L.wealth >= L.wealthMax * 0.4 && !(L.tribute && !L.tribute.lapsed) && Math.hypot(L.x - H.x, L.y - H.y) <= 30);
    },
    seasonOffering(L) { return Math.round(4 + L.wealth * 0.04); },
    yearOffering(L) { return Math.round(8 + L.wealth * 0.06); },
    /** while awake: offerings pile up at the foot of the hill, collected when you come home */
    accrueOfferings(state, days) {
      if (days >= 300) return;
      for (const L of tribute.offeringPlaces(state)) L.flags.offering = (L.flags.offering || 0) + tribute.seasonOffering(L) * days / 90;
    },
    collectOfferings(state) {
      let total = 0; const names = [];
      for (const L of state.world.locations) { const g = Math.floor(L.flags.offering || 0); if (g > 0) { total += g; names.push(L.name); L.flags.offering -= g; } }
      if (state.pactGold) { total += Math.round(state.pactGold); names.push('your outlaw partners'); state.pactGold = 0; }
      if (total) state.hoard.gold += total;
      return { total, names };
    },
    /** what trusting villages might bring over a sleep of `years` (a range: raiders may ruin some of them) */
    offeringEstimate(state, years) {
      const places = tribute.offeringPlaces(state);
      const full = places.reduce((a, L) => a + tribute.yearOffering(L), 0) * Math.max(0, Math.floor(years));
      return { places, lo: Math.round(full * 0.5), hi: full };
    },
    /** yearly accrual; returns events. Tribute accumulates as 'due' and is delivered to the lair if the settlement is near and willing, else held until collected. */
    yearly(state, rng) {
      const ev = []; const W = state.world; let total = 0;
      for (const L of W.locations) {
        const t = L.tribute; if (!t || t.lapsed) continue;
        if (L.state !== 'normal' || L.wealth < t.amount * 2) { t.lapsed = true; ev.push({ text: `${L.name} can no longer pay tribute: it is ${L.state !== 'normal' ? L.state : 'too poor'}.`, bad: true }); continue; }
        const f = L.factionId >= 0 ? W.factions[L.factionId] : null;
        if (!t.willing && (Math.max(L.fear, f ? f.dragon.fear : 0) < 15 || (L.ruler && L.ruler.since === state.time.year))) { t.lapsed = true; ev.push({ text: `${L.name} stopped paying tribute${L.ruler && L.ruler.since === state.time.year ? ' under its new ruler' : ': they no longer fear you'}.`, bad: true }); continue; }
        if (t.willing && (L.trust < 10 || state.dragon.alignment < -30)) { t.lapsed = true; ev.push({ text: `${L.name} no longer sends gifts; they have stopped trusting you.`, bad: true }); continue; }
        const pay = Math.min(L.wealth, t.amount); L.wealth -= pay; t.paidTotal += pay;
        const dist = Math.hypot(L.x - W.home.x, L.y - W.home.y);
        if (dist < 25) { state.hoard.gold += pay; total += pay; } else { t.due = (t.due || 0) + pay; }
        L.fear = Math.max(0, L.fear - 2);
      }
      if (total) ev.push({ text: `Tribute delivered to the lair: ${HB.fmt.int(total)} gold.` });
      // offerings from villages that trust you, while they prosper
      const off = tribute.offeringPlaces(state); let og = 0;
      for (const L of off) { const g = tribute.yearOffering(L); state.hoard.gold += g; og += g; }
      if (og) ev.push({ text: `Offerings from ${HB.fmt.list(off.slice(0, 3).map(L => L.name))}${off.length > 3 ? ' and others' : ''}: ${HB.fmt.int(og)} gold.`, kind: 'loyal' });
      return ev;
    },
  };
})();
