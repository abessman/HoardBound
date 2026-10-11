/* Hoard and cargo: items, deposit, theft, artifact placement, loot generation. Headless-safe. */
(function () {
  const HB = globalThis.HB;

  const hoard = HB.hoard = {
    makeItem(def, rng, source, year) {
      const [name, cat, lo, hi, weight, extra] = def;
      const value = Math.round(rng.between(lo, hi));
      return Object.assign({ id: HB.nextId('it'), name, cat, value, weight, source: source || '', year: year || 0 }, extra || {});
    },
    makeArtifact(aid, source, year) {
      const a = HB.ARTIFACT_BY_ID[aid];
      return { id: HB.nextId('it'), artifactId: a.id, name: a.name, cat: a.cat, value: a.value, weight: a.weight, effect: a.effect, mutation: a.mutation || null, lore: a.lore, source: source || '', year: year || 0, named: true };
    },
    /** distribute named artifacts across suitable locations at world creation */
    placeArtifacts(state, rng) {
      const W = state.world;
      const pool = rng.shuffle(HB.ARTIFACTS.slice());
      const used = new Set();
      for (const a of pool) {
        const cands = W.locations.filter(L => a.placeIn.includes(L.type) && !L.special && !used.has(L.id) && L.type !== 'lair');
        if (!cands.length) continue;
        // prefer farther regions for stronger artifacts
        cands.sort((p, q) => (W.regions[q.regionId].tier - W.regions[p.regionId].tier) * (a.value > 1000 ? 1 : -1) + (rng.next() - 0.5));
        const L = cands[Math.min(cands.length - 1, rng.int(Math.min(4, cands.length)))];
        L.special = a.id; used.add(L.id);
      }
    },
    /** generate loot for a location: returns { gold, items } sized by wealth and type */
    generateLoot(rng, L, fraction = 1, year = 0) {
      const wealth = Math.max(0, L.wealth) * fraction;
      const out = { gold: 0, items: [] };
      const profile = {
        farm: { gold: 0.5, goods: 0.5 }, village: { gold: 0.55, goods: 0.3, arms: 0.05, books: 0.05, gems: 0.05 }, town: { gold: 0.45, goods: 0.2, gems: 0.12, arms: 0.1, books: 0.08, royal: 0.05 },
        city: { gold: 0.4, gems: 0.2, arms: 0.1, books: 0.1, royal: 0.15, goods: 0.05 }, castle: { gold: 0.35, arms: 0.25, royal: 0.2, gems: 0.15, books: 0.05 }, camp: { gold: 0.5, goods: 0.25, arms: 0.25 },
        mine: { gold: 0.4, gems: 0.6 }, hold: { gold: 0.35, gems: 0.3, arms: 0.3, royal: 0.05 }, glade: { gems: 0.4, books: 0.35, royal: 0.15, arms: 0.1 }, monastery: { books: 0.5, gold: 0.2, royal: 0.2, gems: 0.1 },
        shrine: { books: 0.4, gold: 0.3, royal: 0.3 }, ruin: { gems: 0.3, arms: 0.3, books: 0.2, royal: 0.2 }, warren: { gold: 0.5, arms: 0.3, goods: 0.2 }, tower: { books: 0.6, gems: 0.3, royal: 0.1 }, rivalLair: { gold: 0.4, gems: 0.3, royal: 0.15, arms: 0.15 }, battlefield: { arms: 0.8, gold: 0.2 },
      }[L.type] || { gold: 0.6, goods: 0.4 };
      let remaining = wealth;
      for (const cat in profile) {
        const share = wealth * profile[cat];
        if (cat === 'gold') { out.gold += Math.round(share); remaining -= share; continue; }
        const defs = HB.LOOT[cat]; if (!defs) continue;
        let left = share; let guard = 0;
        while (left > 30 && guard++ < 8) {
          const fit = defs.filter(d => d[2] <= left * 1.5);
          if (!fit.length) break;
          const it = hoard.makeItem(rng.pick(fit), rng, L.name, year);
          it.value = Math.min(it.value, Math.round(left)); if (it.value < 20) break;
          out.items.push(it); left -= it.value;
        }
        out.gold += Math.round(Math.max(0, left) * 0.5);
      }
      return out;
    },
    /** move cargo into the hoard; returns summary */
    deposit(state) {
      const before = HB.stats.compute(state);
      const c = state.cargo;
      const gold = c.gold, items = c.items.slice();
      state.hoard.gold += gold; c.gold = 0;
      for (const it of items) { it.year = state.time.year; state.hoard.items.push(it); if (it.named) state.counters.artifactsFound++; }
      c.items.length = 0;
      let rumors = 0;
      for (const it of items) { if (it.rumorRadius) rumors += HB.world.rumor(state, state.world.home.x + (HB.game.rng.next() - 0.5) * 30, state.world.home.y + (HB.game.rng.next() - 0.5) * 30, it.rumorRadius); if (it.effect && it.effect.rumorOnDeposit) rumors += HB.world.rumor(state, state.world.home.x, state.world.home.y, it.effect.rumorOnDeposit); }
      HB.stats.recompute(state);
      const after = state.dragon.stats;
      const diff = HB.stats.diff(before, after);
      return { gold, items, diff, rumors, value: gold + items.reduce((a, b) => a + b.value, 0) };
    },
    /** spend gold from the hoard (never from cargo); returns false if insufficient */
    spend(state, amount) { if (state.hoard.gold < amount) return false; state.hoard.gold -= amount; HB.stats.recompute(state); return true; },
    removeItem(state, itemId) { const i = state.hoard.items.findIndex(it => it.id === itemId); if (i < 0) return null; const it = state.hoard.items.splice(i, 1)[0]; HB.stats.recompute(state); return it; },
    addToHoard(state, item) { state.hoard.items.push(item); HB.stats.recompute(state); },
    cargoWeight(state) { return HB.game.cargoWeight(state); },
    canCarry(state, weight) { return HB.game.cargoWeight(state) + weight <= state.dragon.stats.capacity + 1e-6; },
    addCargo(state, loot) { state.cargo.gold += loot.gold || 0; for (const it of loot.items || []) state.cargo.items.push(it); },
    /** drop the heaviest cargo to shed `weight` — returns dropped list */
    dropCargo(state, weight) {
      const dropped = []; let shed = 0;
      state.cargo.items.sort((a, b) => b.weight / Math.max(1, b.value) - a.weight / Math.max(1, a.value));
      while (shed < weight && state.cargo.items.length) { const it = state.cargo.items.shift(); dropped.push(it); shed += it.weight; }
      if (shed < weight && state.cargo.gold > 0) { const g = Math.min(state.cargo.gold, Math.ceil((weight - shed) * 100)); state.cargo.gold -= g; shed += g / 100; dropped.push({ name: `${g} gold`, value: g, gold: g }); }
      return dropped;
    },
    itemLabel(it) { return it.named ? it.name : HB.fmt.cap(it.name); },
    catName(cat) { return HB.CATEGORIES[cat] ? HB.CATEGORIES[cat].name : cat; },
  };
})();
