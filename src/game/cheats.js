/* Debug tools for testing: toggles (infinite gold, invincible, endless stamina, safe sleep, instant building) and
 * one-off actions (gold, grow, age, benevolence, the domain, the great struggle, reveal the map, cool the realms).
 * Opened from the in-game Menu (views/debugmenu.js). Toggles are saved with the campaign in `state.debug`.
 * Headless-safe. A campaign where they were used is marked (`state.flags.cheated`) and the chronicle says so once. */
(function () {
  const HB = globalThis.HB;
  const GOLD = 100000;

  const cheats = HB.cheats = {
    TOGGLES: [
      { id: 'gold', label: 'Infinite gold', desc: 'The hoard is kept at 100,000 gold coin. It counts as hoard strength: you grow as soon as you are old enough.' },
      { id: 'invincible', label: 'Invincible', desc: 'You take no damage in raids, are never beaten, and cannot be slain in your sleep.' },
      { id: 'stamina', label: 'Endless stamina', desc: 'Stamina never runs out, flying or raiding.' },
      { id: 'safeSleep', label: 'Safe sleep', desc: 'No thieves and no hunters come while you sleep.' },
      { id: 'instantBuild', label: 'Instant building', desc: 'Lair upgrades finish the moment you order them.' },
    ],
    get(state) { if (!state.debug) state.debug = {}; return state.debug; },
    on(state, id) { return !!(state && state.debug && state.debug[id]); },
    any(state) { return !!(state && state.debug && cheats.TOGGLES.some(t => state.debug[t.id])); },
    active(state) { return cheats.TOGGLES.filter(t => cheats.on(state, t.id)).map(t => t.label.toLowerCase()); },
    mark(state) { if (!state.flags.cheated) { state.flags.cheated = true; HB.game.chronicle(state, '(Debug tools were used in this campaign.)', 'note'); } },
    toggle(state, id) { const D = cheats.get(state); D[id] = !D[id]; if (D[id]) cheats.mark(state); cheats.topUp(state); return D[id]; },
    /** keep the toggles true: called every frame on the map and in the lair, and every day of simulated time */
    topUp(state) {
      if (!state || !state.debug) return;
      const d = state.dragon, s = d.stats;
      if (state.debug.gold && state.hoard.gold < GOLD) state.hoard.gold = GOLD;
      if (state.debug.invincible && s) { d.health = s.maxHealth; d.injury = 0; }
      if (state.debug.stamina && s) d.stamina = s.maxStamina;
      if (state.debug.instantBuild && state.lair.construction.length && HB.lair) { for (const c of state.lair.construction) c.progress = 1; HB.lair.tickDays(state, 0); }
    },
    // ---------- one-off actions
    ACTIONS: [
      { id: 'gold1k', label: '+1,000 gold', desc: 'Into the hoard.', run: (st) => { st.hoard.gold += 1000; HB.stats.recompute(st); return '1,000 gold added to the hoard.'; } },
      { id: 'gold10k', label: '+10,000 gold', desc: 'Into the hoard.', run: (st) => { st.hoard.gold += 10000; HB.stats.recompute(st); return '10,000 gold added to the hoard.'; } },
      { id: 'grow', label: 'Grow one stage', desc: 'Become the next size of dragon now, at its youngest age.', run: (st) => cheats.grow(st) },
      { id: 'age10', label: 'Age 10 years', desc: 'Adds ten years to your age (the world does not move).', run: (st) => { st.dragon.age += 10; return `You are ${HB.game.ageString(st)}.`; } },
      { id: 'heal', label: 'Heal fully', desc: 'Health and stamina full, injury gone.', run: (st) => { const d = st.dragon; d.injury = 0; HB.stats.recompute(st); d.health = d.stats.maxHealth; d.stamina = d.stats.maxStamina; return 'Healed.'; } },
      { id: 'kind', label: 'Benevolence +25', desc: 'Your name grows kinder.', run: (st) => { st.dragon.alignment = HB.clamp(st.dragon.alignment + 25, -100, 100); HB.stats.recompute(st); return `Benevolence ${Math.round(st.dragon.alignment)}.`; } },
      { id: 'cruel', label: 'Benevolence −25', desc: 'Your name grows darker.', run: (st) => { st.dragon.alignment = HB.clamp(st.dragon.alignment - 25, -100, 100); HB.stats.recompute(st); return `Benevolence ${Math.round(st.dragon.alignment)}.`; } },
      { id: 'home', label: 'Grow your settlement', desc: 'Found the settlement at your hill, or grow it a stage (kind or cruel by your benevolence).', run: (st) => cheats.growHome(st) },
      { id: 'struggle', label: 'Start the great struggle', desc: 'Begin the endgame now (kind: the Hollow King; cruel: the Crystals of Life), whatever your size.', run: (st) => cheats.startStruggle(st) },
      { id: 'step', label: 'Win the next struggle step', desc: 'Kill the next lieutenant, or take the next crystal into your hoard.', run: (st) => cheats.struggleStep(st) },
      { id: 'reveal', label: 'Reveal the whole map', desc: 'Every land charted and every place seen.', run: (st) => cheats.revealAll(st) },
      { id: 'cool', label: 'Calm every realm', desc: 'Heat, hostility and hunters gone; nobody on your trail.', run: (st) => cheats.coolRealms(st) },
      { id: 'season', label: 'Pass a season', desc: '90 days pass at home: construction, offerings, the world.', run: (st) => { HB.game.advanceDays(st, 90); if (HB.worldsim) HB.worldsim.tickDays(st, 90); return `It is ${HB.game.dateString(st)}.`; } },
      { id: 'home2', label: 'Back to the lair', desc: 'You are at home, rested.', run: (st) => { const H = st.world.home; st.travel = null; st.dragon.x = H.x; st.dragon.y = H.y; st.phase = 'home'; return 'You are home.'; } },
    ],
    run(state, id) {
      const a = cheats.ACTIONS.find(x => x.id === id); if (!a) return '';
      cheats.mark(state);
      const text = a.run(state);
      HB.stats.recompute(state);
      if (HB.domain) HB.domain.bump(state);
      return text;
    },
    grow(state) {
      const d = state.dragon, next = HB.TIERS[d.tier + 1];
      if (!next) return 'You are already an ancient dragon.';
      d.tier++; d.age = Math.max(d.age, next.minAge);
      HB.stats.recompute(state); d.health = d.stats.maxHealth; d.stamina = d.stats.maxStamina;
      HB.game.chronicle(state, `Grew into ${HB.fmt.a(next.name.toLowerCase())} (debug).`, 'growth');
      if (HB.domain) HB.domain.advance(state, HB.game.rng);
      if (HB.endgame) HB.endgame.check(state, HB.game.rng);
      return `You are ${HB.fmt.a(next.name.toLowerCase())} now, ${HB.game.ageString(state)}.`;
    },
    growHome(state) {
      const D = HB.domain, h = D.home(state), year = state.time.year;
      if (h.stage >= 4) return `${h.name} is already ${D.stageInfo(state).noun}.`;
      if (h.stage === 0) {
        h.path = state.dragon.alignment >= 0 ? 'benevolent' : 'tyrannical'; h.stage = 1; h.founded = year; h.character = state.dragon.alignment;
        h.name = h.name || D.makeName(state, HB.game.rng);
      } else h.stage++;
      h.stageYear = year; h.unrest = 0;
      D.bump(state);
      return `${h.name} is ${D.stageInfo(state).noun} now.`;
    },
    startStruggle(state) {
      const E = HB.endgame.get(state);
      if (E.path) return 'The great struggle has already begun.';
      HB.endgame.begin(state, state.dragon.alignment >= 0 ? 'shadow' : 'crystals', HB.game.rng);
      return HB.endgame.hint(state) || 'The great struggle begins.';
    },
    struggleStep(state) {
      const E = HB.endgame.get(state), W = state.world;
      if (!E.path) return 'The great struggle has not begun.';
      if (E.path === 'shadow') {
        const lt = E.lieutenants.find(l => l.alive && l.locId !== null);
        if (!lt) return 'No lieutenant is left.';
        return HB.endgame.lieutenantSlain(state, lt, W.locations[lt.locId])[0].text;
      }
      const c = E.crystals.find(x => !x.taken && x.locId !== null);
      if (!c) return 'No crystal is left.';
      const notes = HB.endgame.crystalTaken(state, c, W.locations[c.locId]);
      state.hoard.items.push(HB.hoard.makeArtifact('crystal_' + c.id, W.locations[c.locId].name, state.time.year));
      return notes[0].text + ' It is in your hoard.';
    },
    revealAll(state) {
      const W = state.world, K = state.know;
      for (let i = 0; i < W.w * W.h; i++) {
        if (K.revealed[i]) continue;
        K.revealed[i] = 1;
        const s = W.sub[i]; if (s >= 0) { K.subRevealedCount[s]++; K.subSeen[s] = 1; }
        const r = W.region[i]; if (r >= 0) { K.regionRevealedCount[r]++; K.regionSeen[r] = 1; }
      }
      for (const L of W.locations) if (L.knowledge) L.knowledge.seen = true;
      return 'The whole world is charted.';
    },
    coolRealms(state) {
      for (const f of state.world.factions) { f.dragon.hostility = 0; f.dragon.heat = 0; }
      for (const e of state.entities) if (e.kind === 'hunters') e.dead = true;
      state.entities = state.entities.filter(e => !e.dead);
      state.pursuit = null; state.ambush = null;
      return 'Every realm is calm.';
    },
  };
})();
