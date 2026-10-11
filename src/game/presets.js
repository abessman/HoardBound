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
  };
})();
