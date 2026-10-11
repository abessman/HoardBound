/* Test starts: jump a fresh campaign to a later point (young or adult, kind or cruel) so the domain and the endgame
 * can be tried without hours of play. Used by `index.html?scene=map&preset=adult-kind` and by tools/test.js.
 * Campaigns started from the URL autosave to their own slot ('test'), never over the player's own autosave. */
(function () {
  const HB = globalThis.HB;

  HB.presets = {
    list: ['young-kind', 'young-cruel', 'adult-kind', 'adult-cruel'],
    apply(state, id) {
      const [age, path] = String(id).split('-');
      if (!['young', 'adult'].includes(age) || !['kind', 'cruel'].includes(path)) return false;
      const W = state.world, H = W.home, d = state.dragon, rng = HB.game.rng;
      const adult = age === 'adult', kind = path === 'kind', lean = kind ? 35 : -40;
      d.tier = adult ? 2 : 1; d.age = adult ? 41 : 9; d.alignment = lean;
      state.hoard.gold += adult ? 2500 : 500;
      state.lair.upgrades.entrance = adult ? 2 : 1;
      if (adult) Object.assign(state.lair.upgrades, { guardpost: 1, forge: 1, sleeping: 1 });
      HB.stats.recompute(state);
      HB.world.reveal(state, H.x, H.y, adult ? 12 : 8);
      const near = HB.world.locationsNear(W, H.x, H.y, 30, L => ['village', 'town', 'farm'].includes(L.type) && L.state === 'normal' && HB.world.canEnterRegion(state, L.regionId)).map(o => o.L);
      for (const L of near.slice(0, adult ? 4 : 1)) {
        HB.world.sight(state, L, 1.2);
        if (kind) { L.trust = 65; HB.tribute.protect(state, L); L.flags.protected = state.time.year - 3; }
        else if (L.type !== 'farm') { L.fear = 90; L.tribute = { amount: Math.max(20, Math.round(L.wealth * 0.08)), since: state.time.year, lapsed: false, willing: false, paidTotal: 0 }; }
      }
      if (kind && adult) for (const L of near.slice(0, 2)) if (HB.domain.canOath(state, L).ok) HB.domain.takeOath(state, L);
      if (!kind && !near.some(L => L.tribute && !L.tribute.willing)) state.lair.captives.push({ id: HB.nextId('cap'), name: 'a captured smith', kind: 'smith', weight: 2, from: 'the road', factionId: -1, year: state.time.year }, { id: HB.nextId('cap'), name: 'a captured miner', kind: 'miner', weight: 2, from: 'the road', factionId: -1, year: state.time.year });
      d.alignment = lean;
      HB.domain.advance(state, rng);
      const h = HB.domain.home(state);
      if (adult && h.stage) { h.stage = 2; h.stageYear = state.time.year - 2; HB.domain.bump(state); }
      if (!kind && adult) for (const L of near.filter(L => L.tribute && !L.tribute.willing).slice(0, 1)) if (HB.domain.canOccupy(state, L).ok) HB.domain.occupy(state, L);
      d.alignment = lean; // the deeds above nudge it; keep the preset's leaning
      if (adult && HB.endgame) HB.endgame.check(state, rng);
      HB.stats.recompute(state);
      d.health = d.stats.maxHealth; d.stamina = d.stats.maxStamina;
      state.phase = 'home';
      state.flags.test = true;
      HB.game.chronicle(state, `(A test start: ${id}.)`, 'note');
      return true;
    },
    /** the map-art preview (index.html?scene=mappreview, see docs/map-art/): the adult-kind start, then near home one
     *  settlement in each domain state, a burned one, one under outlaw attack and the great struggle begun, so every
     *  map symbol state is on screen. Deterministic from the seed; changes nothing but this test campaign. */
    preview(state) {
      HB.presets.apply(state, 'adult-kind');
      const W = state.world, H = W.home, year = state.time.year;
      const free = (L) => ['village', 'town', 'farm', 'castle'].includes(L.type) && L.state === 'normal' && !L.tribute && !L.occupation && !L.threat && HB.world.canEnterRegion(state, L.regionId);
      const near = HB.world.locationsNear(W, H.x, H.y, 18, free).map(o => o.L);
      const take = (pred) => { const i = near.findIndex(pred); return i < 0 ? null : near.splice(i, 1)[0]; };
      const scare = (L) => { L.fear = Math.max(L.fear, 80); L.trust = 0; };
      const tax = (L) => ({ amount: Math.max(20, Math.round(L.wealth * 0.08)), since: year - 2, lapsed: false, willing: false, paidTotal: 0 });
      const prey = take(L => L.type === 'farm' || L.type === 'village');
      if (prey) prey.threat = { campId: -1, campName: 'the hills', goblin: false, since: state.time.totalDays, until: state.time.totalDays + 400, raiders: 3 };
      const burnt = take(L => L.type === 'village') || take(L => L.type !== 'castle'); if (burnt) { burnt.state = 'burned'; burnt.lastRaidYear = year; }
      const trib = take(L => L.type !== 'farm'); if (trib) { scare(trib); trib.tribute = tax(trib); }
      const occ = take(L => L.type !== 'farm'); if (occ) { scare(occ); occ.tribute = tax(occ); occ.occupation = { since: year - 2, resistance: 20, years: 2, resisting: false }; }
      const rev = take(L => L.type !== 'farm'); if (rev) { scare(rev); rev.tribute = tax(rev); rev.occupation = { since: year - 4, resistance: 70, years: 4, resisting: true, resistYears: 1 }; }
      for (const L of [trib, occ, rev, burnt, prey]) if (L) HB.world.sight(state, L, 1.2);
      if (HB.endgame && !HB.endgame.get(state).path) HB.endgame.begin(state, 'shadow', HB.game.rng);
      if (HB.endgame) HB.endgame.get(state).announced = true; // no card over the preview
      HB.domain.bump(state);
      state.flags.test = true;
      return { tributary: trib, occupied: occ, resisting: rev, burned: burnt, threat: prey };
    },
  };
})();
