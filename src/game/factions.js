/* Faction memory, reactions, relations between realms, wars and armies. Headless-safe. */
(function () {
  const HB = globalThis.HB;

  const factions = HB.factions = {
    adjust(state, f, delta, cause) {
      const m = f.dragon;
      if (delta.fear) m.fear = HB.clamp(m.fear + delta.fear, 0, 100);
      if (delta.hostility) m.hostility = HB.clamp(m.hostility + delta.hostility, 0, 100);
      if (delta.trust) m.trust = HB.clamp(m.trust + delta.trust, 0, 100);
      m.known = true;
      if (cause) { f.history.push({ year: state.time.year, text: `${HB.fmt.cap(cause)}.`, delta }); if (f.history.length > 30) f.history.shift(); }
    },
    maxHostility(state) { let h = 0; for (const f of state.world.factions) h = Math.max(h, f.dragon.hostility); return h; },
    knownFactions(state) { return state.world.factions.filter(f => f.dragon.known); },
    /** neighbouring factions by subregion adjacency */
    neighbours(state, f) {
      const W = state.world; const set = new Set();
      for (const s of f.subregions) for (const n of W.subregions[s].neighbors) { const fid = W.subregions[n].factionId; if (fid >= 0 && fid !== f.id) set.add(fid); }
      return [...set];
    },
    tickDays(state, days) { /* fast decay of fear while awake happens yearly */ },
    /** yearly: relations, wars, hunters funding, decay; returns events */
    yearly(state, rng) {
      const W = state.world, ev = [];
      W.wars = W.wars || [];
      for (const f of W.factions) {
        const m = f.dragon;
        m.fear = Math.max(0, m.fear - 2); m.hostility = Math.max(0, m.hostility - 1); m.trust = Math.max(0, m.trust - 0.5);
        if (m.hostility > 50 && state.time.year % 5 === 0) { f.learned.hunters++; ev.push({ text: `${f.name} put a price on the dragon’s head and funded hunters.`, kind: 'faction', bad: true }); }
        if (f.kind === 'goblin') continue;
        // relations with neighbours drift; grievances
        for (const nid of factions.neighbours(state, f)) {
          const n = W.factions[nid];
          const key = String(nid);
          if (f.relations[key] === undefined) f.relations[key] = n.kind === f.kind ? 0 : n.kind === 'goblin' || f.kind === 'goblin' ? -40 : -10;
          f.relations[key] += rng.range(-6, 4);
          f.relations[key] = HB.clamp(f.relations[key], -100, 100);
          const atWar = f.atWar.includes(nid);
          if (!atWar && f.relations[key] < -35 && rng.chance(0.08) && f.id < nid) factions.declareWar(state, f, n, ev);
        }
      }
      // wars progress
      for (const war of W.wars.slice()) {
        war.years++;
        const a = W.factions[war.a], b = W.factions[war.b];
        // front: a border subregion changes hands with some probability
        if (rng.chance(0.25)) {
          const winner = rng.chance(0.5 + (a.subregions.length - b.subregions.length) * 0.01) ? a : b;
          const loser = winner === a ? b : a;
          war.flipped = war.flipped || [];
          const border = loser.subregions.filter(s => !war.flipped.includes(s) && W.subregions[s].neighbors.some(n => W.subregions[n].factionId === winner.id));
          if (border.length) {
            const sid = rng.pick(border);
            const S = W.subregions[sid];
            S.factionId = winner.id; loser.subregions = loser.subregions.filter(x => x !== sid); winner.subregions.push(sid);
            let named = null;
            for (const lid of S.locations) { const L = W.locations[lid]; if (L.type === 'lair') continue; L.factionId = winner.id; L.wealth = Math.round(L.wealth * 0.7); if (L.tier >= 1 && !named) named = L; if (L.ruler && rng.chance(0.6)) L.ruler = { name: HB.names.person(rng, winner.culture, false), title: L.ruler.title, house: HB.names.house(rng, winner.culture), since: state.time.year }; }
            war.flips++; war.flipped.push(sid);
            ev.push({ text: `${winner.name} took ${S.name}${named ? ' and ' + named.name : ''} from ${loser.name}.`, kind: 'war' });
            // battlefield near the front
            if (rng.chance(0.6)) factions.makeBattlefield(state, S, winner, loser, rng);
          }
        }
        // armies drain treasuries: wealth of capitals falls
        for (const f of [a, b]) { const cap = f.capitalId !== null ? W.locations[f.capitalId] : null; if (cap) cap.wealth = Math.max(cap.wealthMax * 0.2, Math.round(cap.wealth * 0.96)); }
        // garrisons depleted while armies march
        factions.updateArmies(state, war, rng);
        if (war.years >= war.length || (rng.chance(0.15) && war.years > 2)) factions.endWar(state, war, ev);
      }
      // rival dragons act
      factions.rivalsYearly(state, rng, ev);
      return ev;
    },
    declareWar(state, a, b, ev) {
      const W = state.world; W.wars = W.wars || [];
      const war = { id: HB.nextId('war'), a: a.id, b: b.id, started: state.time.year, years: 0, length: 3 + HB.game.rng.int(9), flips: 0, cause: HB.game.rng.pick(['a disputed vale', 'an insulted envoy', 'a murdered merchant', 'an old claim', 'a stolen bride', 'a broken treaty']) };
      W.wars.push(war);
      a.atWar.push(b.id); b.atWar.push(a.id);
      a.history.push({ year: state.time.year, text: `War with ${b.name} over ${war.cause}.` }); b.history.push({ year: state.time.year, text: `War with ${a.name} over ${war.cause}.` });
      ev.push({ text: `${a.name} and ${b.name} went to war over ${war.cause}.`, kind: 'war' });
      HB.game.chronicle(state, `${a.name} and ${b.name} went to war over ${war.cause}.`, 'world');
      factions.updateArmies(state, war, HB.game.rng);
    },
    endWar(state, war, ev) {
      const W = state.world;
      const a = W.factions[war.a], b = W.factions[war.b];
      a.atWar = a.atWar.filter(x => x !== b.id); b.atWar = b.atWar.filter(x => x !== a.id);
      a.relations[String(b.id)] = 10; b.relations[String(a.id)] = 10;
      W.wars = W.wars.filter(w => w !== war);
      state.entities = state.entities.filter(e => !(e.kind === 'army' && e.warId === war.id));
      for (const L of W.locations) if (L.state === 'besieged') { L.state = 'normal'; }
      ev.push({ text: `Peace between ${a.name} and ${b.name} after ${HB.fmt.years(war.years)}.`, kind: 'war' });
      HB.game.chronicle(state, `Peace between ${a.name} and ${b.name}.`, 'world');
    },
    /** armies: one per side, marching on an enemy town; the town is besieged and the army's home garrison depleted */
    updateArmies(state, war, rng) {
      const W = state.world;
      for (const fid of [war.a, war.b]) {
        const f = W.factions[fid], enemy = W.factions[fid === war.a ? war.b : war.a];
        let army = state.entities.find(e => e.kind === 'army' && e.warId === war.id && e.factionId === fid);
        const targets = W.locations.filter(L => L.factionId === enemy.id && (L.type === 'town' || L.type === 'city' || L.type === 'castle') && L.state === 'normal');
        const homes = W.locations.filter(L => L.factionId === fid && (L.type === 'castle' || L.type === 'city'));
        if (!targets.length || !homes.length) continue;
        if (!army) {
          const home = rng.pick(homes), target = targets.sort((p, q) => Math.hypot(p.x - home.x, p.y - home.y) - Math.hypot(q.x - home.x, q.y - home.y))[0];
          army = { id: HB.nextId('ent'), kind: 'army', name: `host of ${f.name}`, factionId: fid, warId: war.id, homeId: home.id, targetId: target.id, x: home.x, y: home.y, strength: 40 + rng.int(40), color: f.color, dead: false };
          state.entities.push(army);
          home.flags.garrisonAway = true; home.defense = Math.round(home.defenseBase * 0.55);
        }
        const T = W.locations[army.targetId];
        if (!T || T.factionId === fid) { const home = W.locations[army.homeId]; if (home) { home.flags.garrisonAway = false; home.defense = home.defenseBase; } army.dead = true; continue; }
        // march toward target (a few cells per year tick is handled by days; here jump)
        const dx = T.x - army.x, dy = T.y - army.y, d = Math.hypot(dx, dy);
        if (d > 3) { army.x += dx / d * Math.min(d, 12); army.y += dy / d * Math.min(d, 12); }
        else { T.state = 'besieged'; T.wealth = Math.round(T.wealth * 0.85); }
      }
    },
    makeBattlefield(state, S, winner, loser, rng) {
      const W = state.world;
      const cells = []; for (let i = 0; i < W.w * W.h; i++) if (W.sub[i] === S.id && W.locAt[i] < 0 && (W.terrain[i] === HB.TERRAIN.PLAINS || W.terrain[i] === HB.TERRAIN.HILLS)) cells.push(i);
      if (!cells.length) return;
      const idx = rng.pick(cells);
      const L = { id: W.locations.length, type: 'battlefield', name: `Field of ${HB.names.place(rng, winner.culture)}`, x: idx % W.w, y: (idx / W.w) | 0, cell: idx, subId: S.id, regionId: W.region[idx], factionId: winner.id, tier: 0, pop: 0, wealth: Math.round(rng.between(150, 500)), wealthMax: 500, defense: 10, defenseBase: 10, state: 'normal', special: null, ruler: null, memory: [], fear: 0, trust: 0, lastRaidYear: -999, knowledge: { seen: false, scoutedYear: -1, raided: false }, flags: { expires: state.time.year + 3 }, founded: state.time.year, capital: false };
      W.locations.push(L); W.locAt[idx] = L.id; S.locations.push(L.id);
      if (state.know.revealed[idx]) L.knowledge.seen = true;
    },
    rivalsYearly(state, rng, ev) {
      const W = state.world;
      for (const L of W.locations) {
        if (L.type !== 'rivalLair' || !L.dragon || L.state === 'ruin') continue;
        L.wealth = Math.round(Math.min(L.wealthMax * 2, L.wealth * 1.04));
        if (rng.chance(0.05)) {
          const victims = HB.world.locationsNear(W, L.x, L.y, 30, V => (V.type === 'village' || V.type === 'town' || V.type === 'farm') && V.state === 'normal');
          if (victims.length) { const V = rng.pick(victims.slice(0, 6)).L; V.wealth = Math.round(V.wealth * 0.6); if (rng.chance(0.4)) { V.state = 'burned'; V.flags.burnedYear = state.time.year; } L.wealth += 200; ev.push({ text: `${L.dragon.name} the wyrm ${V.state === 'burned' ? 'burned' : 'plundered'} ${V.name}.`, kind: 'rival' }); const f = V.factionId >= 0 ? W.factions[V.factionId] : null; if (f) f.dragon.fear = Math.min(100, f.dragon.fear + 2); }
        }
      }
    },
  };
})();
