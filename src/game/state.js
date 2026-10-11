/* Authoritative campaign state and campaign creation. Headless-safe. */
(function () {
  const HB = globalThis.HB;

  HB.DAYS_PER_YEAR = 360;
  // permanent, age-based characteristics per tier
  HB.TIERS = [
    { id: 0, name: 'Hatchling', minAge: 0, energy: 0, vision: 2.6, capacity: 4, health: 40, stamina: 60, breath: 6, bite: 5, defense: 2, speed: 7, size: 1, roar: 1, land: false, sleepMax: 20 },
    { id: 1, name: 'Young Dragon', minAge: 8, energy: 400, vision: 4.5, capacity: 10, health: 110, stamina: 120, breath: 14, bite: 12, defense: 6, speed: 10, size: 2, roar: 2, land: false, sleepMax: 50 },
    { id: 2, name: 'Adult Dragon', minAge: 40, energy: 3000, vision: 7, capacity: 25, health: 280, stamina: 220, breath: 30, bite: 26, defense: 14, speed: 14, size: 3, roar: 3, land: true, sleepMax: 100 },
    { id: 3, name: 'Ancient Dragon', minAge: 150, energy: 20000, vision: 11, capacity: 60, health: 650, stamina: 400, breath: 60, bite: 50, defense: 28, speed: 20, size: 4, roar: 4, land: true, sleepMax: 200 },
  ];

  const game = HB.game = {
    state: null,
    newCampaign(opts) {
      const seed = String(opts.seed || 'ember');
      const world = HB.worldgen.generate(seed, { size: opts.size || 200 });
      const playRng = new HB.RNG('play:' + seed);
      const tier = HB.TIERS[0];
      const state = {
        version: 1, seed, created: Date.now(), name: opts.name || 'Wyrm',
        world,
        know: HB.world.newKnowledge(world),
        dragon: {
          name: opts.name || 'Wyrm', breed: opts.breed || 'red', tier: 0, age: 0, alignment: 0,
          health: tier.health, stamina: tier.stamina,
          x: world.home.x, y: world.home.y, facing: 1,
          injury: 0, scars: 0, mutations: [], prestige: 0, dominance: 0,
          stats: null, growthDebt: 0, restless: 0,
        },
        hoard: { gold: 0, items: [] },               // stored safely at home
        cargo: { gold: 0, items: [], captives: [] },  // carried
        lair: { upgrades: {}, construction: [], workers: [], captives: [], concealment: 0, defense: 0, lastAttackYear: -99 },
        time: { year: 1, day: 0, totalDays: 0 },
        phase: 'home',
        travel: null,
        encounter: null,
        chronicle: [],
        entities: [],
        flags: { tutorial: 0, keeper: opts.keeper !== false, deathMode: opts.deathMode || 'legend', legend: false },
        memory: { grudges: [], loyalties: [], orders: [] },
        counters: { raids: 0, goldStolen: 0, kills: 0, captures: 0, burned: 0, released: 0, ransoms: 0, tributes: 0, sleeps: 0, defeats: 0, artifactsFound: 0 },
        playRng: playRng.getState(),
      };
      game.state = HB.state = state;
      game.rng = playRng;
      // artifacts are placed by hoard.js if present
      if (HB.hoard && HB.hoard.placeArtifacts) HB.hoard.placeArtifacts(state, playRng);
      if (HB.worldsim && HB.worldsim.init) HB.worldsim.init(state);
      if (HB.stats) HB.stats.recompute(state);
      // opening knowledge
      HB.world.reveal(state, world.home.x, world.home.y, (state.dragon.stats ? state.dragon.stats.vision : tier.vision) + 1.5);
      HB.world.rumor(state, world.home.x, world.home.y, 9);
      const S = world.subregions[world.home.subId];
      game.chronicle(state, `${state.dragon.name} hatched in a cave in ${S.name}, in ${world.regions[0].name}. The world did not notice.`, 'birth');
      return state;
    },
    /** play RNG, restored from state when loading */
    rng: null,
    rand() { return game.rng.next(); },
    chronicle(state, text, kind = 'note', locId = null) {
      state.chronicle.push({ year: state.time.year, day: state.time.day, text, kind, locId });
      if (state.chronicle.length > 600) state.chronicle.splice(0, state.chronicle.length - 600);
    },
    tierOf(state) { return HB.TIERS[state.dragon.tier]; },
    /** advance the calendar by whole days; returns number of year boundaries crossed */
    advanceDays(state, days) {
      let years = 0;
      state.time.day += days; state.time.totalDays += days;
      while (state.time.day >= HB.DAYS_PER_YEAR) { state.time.day -= HB.DAYS_PER_YEAR; state.time.year++; years++; }
      state.dragon.age += days / HB.DAYS_PER_YEAR;
      return years;
    },
    dateString(state) { return `Year ${state.time.year}, ${HB.world.seasonName(state.time.day)}`; },
    ageString(state) { const a = Math.floor(state.dragon.age); return a < 1 ? 'less than a year old' : a === 1 ? '1 year old' : `${a} years old`; },
    hoardValue(state) { let v = state.hoard.gold; for (const it of state.hoard.items) v += it.value; return v; },
    cargoWeight(state) { let w = state.cargo.gold / 100; for (const it of state.cargo.items) w += it.weight; for (const c of state.cargo.captives) w += c.weight || 2; return w; },
  };
})();
