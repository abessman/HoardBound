/* Runtime world helpers: coordinates, knowledge (fog), gating, queries. Works headless. */
(function () {
  const HB = globalThis.HB;
  const T = () => HB.TERRAIN;

  HB.TIER_NAMES = ['hatchling', 'young dragon', 'adult dragon', 'ancient dragon'];
  HB.TIER_VISION = [2.6, 4.5, 7, 11];

  const world = HB.world = {
    /** create knowledge arrays for a world */
    newKnowledge(W) {
      const N = W.w * W.h;
      return { revealed: new Uint8Array(N), rumor: new Uint8Array(N), subSeen: new Uint8Array(W.subregions.length), regionSeen: new Uint8Array(W.regions.length), subRevealedCount: new Int32Array(W.subregions.length), regionRevealedCount: new Int32Array(W.regions.length) };
    },
    idx(W, x, y) { return y * W.w + x; },
    inBounds(W, x, y) { return x >= 0 && y >= 0 && x < W.w && y < W.h; },
    terrainAt(W, x, y) { x = Math.round(x); y = Math.round(y); return world.inBounds(W, x, y) ? W.terrain[y * W.w + x] : T().DEEP; },
    regionAt(W, x, y) { x = Math.round(x); y = Math.round(y); return world.inBounds(W, x, y) ? W.region[y * W.w + x] : -1; },
    subAt(W, x, y) { x = Math.round(x); y = Math.round(y); return world.inBounds(W, x, y) ? W.sub[y * W.w + x] : -1; },
    factionAt(W, x, y) { const s = world.subAt(W, x, y); return s >= 0 ? W.subregions[s].factionId : -1; },
    locationAt(W, x, y) { x = Math.round(x); y = Math.round(y); if (!world.inBounds(W, x, y)) return null; const id = W.locAt[y * W.w + x]; return id >= 0 ? W.locations[id] : null; },
    requiredTier(W, regionId) { return regionId < 0 ? 0 : W.regions[regionId].tier; },
    /** can a dragon of this tier (plus artifact bonus) enter the region */
    canEnterRegion(state, regionId) {
      if (regionId < 0) return true;
      const R = state.world.regions[regionId];
      const eff = state.dragon.tier + (state.dragon.stats ? (state.dragon.stats.gatePass || 0) : 0);
      return R.tier <= eff;
    },
    isRevealed(state, x, y) { x = Math.round(x); y = Math.round(y); const W = state.world; return world.inBounds(W, x, y) && state.know.revealed[y * W.w + x] === 1; },
    /** Reveal a circle. Returns { cells:[idx], subs:[ids newly discovered], regions:[ids newly discovered], locations:[ids newly seen] } */
    reveal(state, cx, cy, radius) {
      const W = state.world, K = state.know;
      const res = { cells: [], subs: [], regions: [], locations: [], blocked: false };
      const x0 = Math.max(0, Math.floor(cx - radius)), x1 = Math.min(W.w - 1, Math.ceil(cx + radius));
      const y0 = Math.max(0, Math.floor(cy - radius)), y1 = Math.min(W.h - 1, Math.ceil(cy + radius));
      const r2 = radius * radius;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy > r2) continue;
        const i = y * W.w + x;
        if (K.revealed[i]) continue;
        const rid = W.region[i];
        if (!world.canEnterRegion(state, rid)) { res.blocked = true; continue; }
        K.revealed[i] = 1; res.cells.push(i);
        const s = W.sub[i];
        if (s >= 0) { K.subRevealedCount[s]++; if (!K.subSeen[s]) { K.subSeen[s] = 1; res.subs.push(s); } }
        if (rid >= 0) { K.regionRevealedCount[rid]++; if (!K.regionSeen[rid] && K.regionRevealedCount[rid] >= Math.max(10, W.regions[rid].landCells * 0.06)) { K.regionSeen[rid] = 1; res.regions.push(rid); } }
        const lid = W.locAt[i];
        if (lid >= 0) { const L = W.locations[lid]; if (!L.knowledge.seen) { L.knowledge.seen = true; res.locations.push(lid); } }
      }
      return res;
    },
    /** mark cells as rumoured (faint sketch) */
    rumor(state, cx, cy, radius) {
      const W = state.world, K = state.know;
      const x0 = Math.max(0, Math.floor(cx - radius)), x1 = Math.min(W.w - 1, Math.ceil(cx + radius));
      const y0 = Math.max(0, Math.floor(cy - radius)), y1 = Math.min(W.h - 1, Math.ceil(cy + radius));
      let n = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > radius * radius) continue;
        const i = y * W.w + x; if (!K.revealed[i] && !K.rumor[i]) { K.rumor[i] = 1; n++; }
      }
      return n;
    },
    knownFraction(state, subId) { const S = state.world.subregions[subId]; return S.landCells ? state.know.subRevealedCount[subId] / S.landCells : 0; },
    regionKnownFraction(state, rid) { const R = state.world.regions[rid]; return R.landCells ? state.know.regionRevealedCount[rid] / R.landCells : 0; },
    /** locations within radius (euclid), optionally filtered */
    locationsNear(W, x, y, r, pred) {
      const out = [];
      for (const L of W.locations) { if (pred && !pred(L)) continue; const d = Math.hypot(L.x - x, L.y - y); if (d <= r) out.push({ L, d }); }
      out.sort((a, b) => a.d - b.d);
      return out;
    },
    nearest(W, x, y, pred) { let best = null, bd = Infinity; for (const L of W.locations) { if (pred && !pred(L)) continue; const d = Math.hypot(L.x - x, L.y - y); if (d < bd) { bd = d; best = L; } } return best ? { L: best, d: bd } : null; },
    /** stamina cost multiplier sampled along a straight flight */
    flightCostFactor(W, x0, y0, x1, y1) {
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      let sum = 0;
      for (let s = 0; s <= steps; s++) { const t = s / steps; sum += HB.FLIGHT_COST[world.terrainAt(W, HB.lerp(x0, x1, t), HB.lerp(y0, y1, t))]; }
      return sum / (steps + 1);
    },
    /** does a straight flight cross a region the dragon cannot enter? returns first blocked point or null */
    flightBlockedAt(state, x0, y0, x1, y1) {
      const W = state.world;
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
      for (let s = 0; s <= steps; s++) { const t = s / steps; const x = HB.lerp(x0, x1, t), y = HB.lerp(y0, y1, t); const rid = world.regionAt(W, x, y); if (!world.canEnterRegion(state, rid)) return { x, y, regionId: rid, t }; }
      return null;
    },
    terrainName(t) { return HB.TERRAIN_NAMES[t]; },
    factionName(W, fid) { return fid >= 0 ? W.factions[fid].name : 'no realm'; },
    locTypeName(L) {
      const names = { farm: 'farmstead', village: 'village', town: 'town', city: L && L.tier >= 4 ? 'great city' : 'city', castle: 'castle', camp: L && L.camp ? (L.camp === 'goblin' ? 'goblin warband' : L.camp === 'hunter' ? "hunters' camp" : L.camp === 'military' ? 'military camp' : 'bandit camp') : 'camp', mine: 'mine', hold: 'dwarven hold', glade: 'elven glade', monastery: 'monastery', shrine: 'shrine', ruin: 'ruin', warren: 'goblin warren', tower: 'tower', lair: 'your lair', rivalLair: "dragon's lair", battlefield: 'battlefield' };
      return names[L.type] || L.type;
    },
    seasonName(day) { return ['Spring', 'Summer', 'Autumn', 'Winter'][Math.floor(((day % 360) / 90)) % 4]; },
    cellsAlong(x0, y0, x1, y1) { const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); const out = []; for (let s = 0; s <= steps; s++) { const t = s / steps; out.push([Math.round(HB.lerp(x0, x1, t)), Math.round(HB.lerp(y0, y1, t))]); } return out; },
  };
})();
