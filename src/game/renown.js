/* Renown: deeds, named titles with real effects, and who knows of you. Headless-safe. */
(function () {
  const HB = globalThis.HB;

  const breedWord = (st) => ({ red: 'Red', green: 'Green', black: 'Black', gold: 'Gold', blue: 'Blue' }[st.dragon.breed] || 'Red');

  // Each title is earned by a count of one kind of deed. Effects listed here are implemented where noted.
  HB.TITLES = [
    { id: 'roadthief', deed: 'caravans', need: 3, name: () => 'the Road Thief', verb: 'Rob caravans', effect: 'Merchants know your shadow. Frightened caravans will pay a toll to pass instead of fighting.' /* encounter.caravanCard */ },
    { id: 'guardian', deed: 'defended', need: 1, name: (st, place) => `Guardian of ${place || 'the Vale'}`, verb: 'Drive raiders off a village', effect: 'The people you saved send willing workers and accept your protection.' /* lair.hireOffers, tribute.canProtect */ },
    { id: 'terror', deed: 'burned', need: 5, name: (st) => `the ${breedWord(st)} Terror`, verb: 'Burn buildings', effect: 'Fear of you spreads half again as fast, and settlements give in to tribute demands more readily.' /* encounter fear x1.5, tribute +15% */ },
    { id: 'merciful', deed: 'released', need: 2, name: () => 'the Merciful', verb: 'Release captives', effect: 'Families bargain in good faith: ransom refusals are rarer and every gain in trust is half again as large.' /* ransom, factions.adjust */ },
    { id: 'castlethief', deed: 'castles', need: 1, name: () => 'the Castle-Thief', verb: 'Steal from a castle', effect: 'Your daring is told in every hall: +10 prestige.' /* stats */ },
    { id: 'herobane', deed: 'heroes', need: 2, name: () => 'Bane of Heroes', verb: 'Slay wandering heroes', effect: '+10 prestige. Seasoned heroes come looking for you.' /* stats, worldsim.spawnHeroes */ },
    { id: 'roadwarden', deed: 'escorted', need: 3, name: () => 'Warden of the Roads', verb: 'Guard caravans on the road', effect: 'Merchants send a share of their profits to your lair each year.' /* sleep.stepYear */ },
    { id: 'overlord', deed: 'tributes', need: 2, name: () => 'the Overlord', verb: 'Win tribute from settlements', effect: '+10 dominance: your demands land harder.' /* stats */ },
  ];
  HB.TITLE_BY_ID = {}; for (const t of HB.TITLES) HB.TITLE_BY_ID[t.id] = t;
  HB.DEED_ONE = { caravans: 'a caravan robbed', defended: 'a village defended', burned: 'a building burned', released: 'a captive released', castles: 'a castle robbed', heroes: 'a hero slain', tributes: 'a tribute won', tolls: 'a toll taken', protected: 'a pact of protection', escorted: 'a caravan guarded' };
  const DOING = { caravans: 'robbing caravans', defended: 'defending villages', burned: 'burning buildings', released: 'releasing captives', castles: 'robbing castles', heroes: 'slaying heroes', tributes: 'winning tribute', tolls: 'taking tolls', protected: 'protecting villages', escorted: 'guarding caravans' };
  const DOING_ONE = { defended: 'defending', castles: 'robbing', protected: 'protecting' };
  HB.deedCause = (deed, n, place) => n === 1 && place && DOING_ONE[deed] ? `for ${DOING_ONE[deed]} ${place}` : `for ${DOING[deed]}${n > 1 ? ` (${n} so far)` : ''}`;
  HB.deedPhrase = (deed, n) => n === 1 ? HB.DEED_ONE[deed] : `${n} ${HB.DEED_NAMES[deed]}`;
  HB.DEED_NAMES = { caravans: 'caravans robbed', defended: 'villages defended', burned: 'buildings burned', released: 'captives released', castles: 'castles robbed', heroes: 'heroes slain', tributes: 'tributes won', tolls: 'tolls taken', protected: 'pacts of protection', escorted: 'caravans guarded' };

  const renown = HB.renown = {
    get(state) {
      if (!state.renown) state.renown = { deeds: {}, titles: [], known: {}, places: {} };
      return state.renown;
    },
    deeds(state, deed) { return renown.get(state).deeds[deed] || 0; },
    has(state, id) { return renown.get(state).titles.some(t => t.id === id); },
    /** record a deed; returns newly earned titles [{id, name, effect}] */
    record(state, deed, ctx = {}) {
      const R = renown.get(state);
      R.deeds[deed] = (R.deeds[deed] || 0) + 1;
      if (ctx.place) R.places[deed] = ctx.place;
      if (ctx.factionId !== undefined && ctx.factionId >= 0) {
        const k = String(ctx.factionId);
        R.known[k] = (R.known[k] || 0) + 1;
        // tales spread to neighbouring realms once a realm has seen three deeds
        if (R.known[k] === 3 && HB.factions) for (const n of HB.factions.neighbours(state, state.world.factions[ctx.factionId])) { const nk = String(n); if (!R.known[nk]) R.known[nk] = 0.5; }
      }
      const earned = [];
      for (const T of HB.TITLES) {
        if (T.deed !== deed || renown.has(state, T.id)) continue;
        if (R.deeds[deed] >= T.need) {
          const t = { id: T.id, name: T.name(state, ctx.place), year: state.time.year, place: ctx.place || null };
          R.titles.push(t);
          earned.push(Object.assign({ effect: T.effect }, t));
          HB.game.chronicle(state, `Became known as ${t.name}.`, 'renown');
          if (HB.consequences) HB.consequences.react(state, `You are known as ${t.name}. ${T.effect}`, HB.deedCause(deed, R.deeds[deed], ctx.place));
        }
      }
      if (earned.length) HB.stats.recompute(state);
      return earned;
    },
    /** progress toward one title */
    progress(state, T) { const n = renown.deeds(state, T.deed); return { n, need: T.need, frac: Math.min(1, n / T.need), done: renown.has(state, T.id) }; },
    /** the title shown with the dragon's name: the most recently earned */
    primary(state) { const R = renown.get(state); return R.titles.length ? R.titles[R.titles.length - 1] : null; },
    displayName(state) { const t = renown.primary(state); const n = state.dragon.name; if (!t) return n; return t.name.startsWith('the ') ? `${n} ${t.name}` : `${n}, ${t.name}`; },
    /** realms that know of you, strongest first */
    knownBy(state) {
      const R = renown.get(state), W = state.world;
      return Object.keys(R.known).map(k => ({ f: W.factions[Number(k)], n: R.known[k] })).filter(o => o.f).sort((a, b) => b.n - a.n);
    },
    bonuses(state) {
      const b = { prestige: 0, dominance: 0 };
      if (!state.renown) return b;
      if (renown.has(state, 'castlethief')) b.prestige += 10;
      if (renown.has(state, 'herobane')) b.prestige += 10;
      if (renown.has(state, 'overlord')) b.dominance += 10;
      return b;
    },
    fearMul(state) { return state.renown && renown.has(state, 'terror') ? 1.5 : 1; },
    trustMul(state) { return state.renown && renown.has(state, 'merciful') ? 1.5 : 1; },
    /** place names for which you are a guardian */
    guardianOf(state) { return renown.get(state).titles.filter(t => t.id === 'guardian').map(t => t.place); },
    canToll(state) { return renown.has(state, 'roadthief') || state.dragon.tier >= 2; },
    /** yearly gifts from merchants to a Warden of the Roads */
    wardenIncome(state) { return state.renown && renown.has(state, 'roadwarden') ? Math.min(200, 15 * renown.deeds(state, 'escorted')) : 0; },
  };
})();
