/* Seeded world generation: terrain, rivers, regions, subregions, factions, locations, roads, names.
 * Pure data; no DOM. Deterministic for a given seed and size. */
(function () {
  const HB = globalThis.HB;

  const T = HB.TERRAIN = { DEEP: 0, WATER: 1, PLAINS: 2, FOREST: 3, PINE: 4, HILLS: 5, MOUNTAINS: 6, PEAKS: 7, SWAMP: 8, DESERT: 9, SNOW: 10 };
  HB.TERRAIN_NAMES = ['deep sea', 'water', 'plains', 'forest', 'pine forest', 'hills', 'mountains', 'high peaks', 'marsh', 'desert', 'snowfield'];
  HB.TERRAIN_COST = [60, 14, 1, 1.6, 1.8, 2.2, 7, 24, 3, 1.5, 2.2];      // ground movement (roads, borders)
  HB.FLIGHT_COST = [1.35, 1.2, 1, 1.05, 1.1, 1.2, 1.6, 2.2, 1.1, 1.3, 1.3]; // stamina multiplier when flying over
  const isLand = (t) => t >= T.PLAINS;
  HB.isLand = isLand;

  // ---------- helpers ----------
  class MinHeap {
    constructor(cap) { this.keys = new Float64Array(cap); this.vals = new Int32Array(cap); this.n = 0; }
    push(k, v) {
      if (this.n >= this.keys.length) { const nk = new Float64Array(this.keys.length * 2), nv = new Int32Array(this.vals.length * 2); nk.set(this.keys); nv.set(this.vals); this.keys = nk; this.vals = nv; }
      let i = this.n++; this.keys[i] = k; this.vals[i] = v;
      while (i > 0) { const p = (i - 1) >> 1; if (this.keys[p] <= this.keys[i]) break; this.swap(p, i); i = p; }
    }
    pop() {
      const k = this.keys[0], v = this.vals[0];
      this.n--;
      if (this.n > 0) {
        this.keys[0] = this.keys[this.n]; this.vals[0] = this.vals[this.n];
        let i = 0;
        for (; ;) {
          const l = 2 * i + 1, r = l + 1; let m = i;
          if (l < this.n && this.keys[l] < this.keys[m]) m = l;
          if (r < this.n && this.keys[r] < this.keys[m]) m = r;
          if (m === i) break; this.swap(m, i); i = m;
        }
      }
      return { k, v };
    }
    swap(a, b) { const tk = this.keys[a], tv = this.vals[a]; this.keys[a] = this.keys[b]; this.vals[a] = this.vals[b]; this.keys[b] = tk; this.vals[b] = tv; }
    get size() { return this.n; }
  }
  HB.MinHeap = MinHeap;

  const DX8 = [1, -1, 0, 0, 1, 1, -1, -1], DY8 = [0, 0, 1, -1, 1, -1, 1, -1], DC8 = [1, 1, 1, 1, 1.414, 1.414, 1.414, 1.414];
  const DX4 = [1, -1, 0, 0], DY4 = [0, 0, 1, -1];

  /** multi-source Dijkstra over the grid. costFn(idx, fromIdx) returns per-cell entry cost (Infinity = blocked). */
  function dijkstra(w, h, sources, costFn, maxCost = Infinity) {
    const N = w * h;
    // Float64: a Float32 distance array rounds stored values and causes endless re-relaxation ping-pong
    const dist = new Float64Array(N).fill(Infinity);
    const owner = new Int16Array(N).fill(-1);
    const heap = new MinHeap(N);
    sources.forEach((s, i) => { dist[s.idx] = 0; owner[s.idx] = s.id !== undefined ? s.id : i; heap.push(0, s.idx); });
    while (heap.size) {
      const { k, v } = heap.pop();
      if (k > dist[v]) continue;
      const x = v % w, y = (v / w) | 0;
      for (let d = 0; d < 8; d++) {
        const nx = x + DX8[d], ny = y + DY8[d];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        const c = costFn(ni, v);
        if (c === Infinity) continue;
        const nd = k + c * DC8[d];
        if (nd < dist[ni] && nd <= maxCost) { dist[ni] = nd; owner[ni] = owner[v]; heap.push(nd, ni); }
      }
    }
    return { dist, owner };
  }

  /** A* path on the grid between two cells; returns array of idx or null.
   * Search is confined to a bounding box around the endpoints (pad cells) and buffers are reused via a stamp. */
  const astarBuf = { N: 0, g: null, prev: null, stamp: null, gen: 0 };
  function astar(w, h, from, to, costFn, maxNodes = 60000, pad = 14) {
    const N = w * h;
    if (astarBuf.N !== N) { astarBuf.N = N; astarBuf.g = new Float64Array(N); astarBuf.prev = new Int32Array(N); astarBuf.stamp = new Int32Array(N); astarBuf.gen = 0; }
    const gen = ++astarBuf.gen; const g = astarBuf.g, prev = astarBuf.prev, stamp = astarBuf.stamp;
    if (gen > 2000000000) { stamp.fill(0); astarBuf.gen = 1; }
    const CLOSED = -gen;
    const heap = new MinHeap(2048);
    const tx = to % w, ty = (to / w) | 0, fx = from % w, fy = (from / w) | 0;
    const x0 = Math.max(0, Math.min(fx, tx) - pad), x1 = Math.min(w - 1, Math.max(fx, tx) + pad), y0 = Math.max(0, Math.min(fy, ty) - pad), y1 = Math.min(h - 1, Math.max(fy, ty) + pad);
    const hfn = (x, y) => { const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    g[from] = 0; prev[from] = -1; stamp[from] = gen; heap.push(hfn(fx, fy), from);
    let expanded = 0;
    while (heap.size) {
      const { v } = heap.pop();
      if (stamp[v] === CLOSED) continue;
      stamp[v] = CLOSED;
      if (v === to) {
        const path = []; let c = v; while (c !== -1) { path.push(c); c = prev[c]; } return path.reverse();
      }
      if (++expanded > maxNodes) return null;
      const x = v % w, y = (v / w) | 0;
      for (let d = 0; d < 8; d++) {
        const nx = x + DX8[d], ny = y + DY8[d];
        if (nx < x0 || ny < y0 || nx > x1 || ny > y1) continue;
        const ni = ny * w + nx;
        if (stamp[ni] === CLOSED) continue;
        const c = costFn(ni, v);
        if (c === Infinity) continue;
        const ng = g[v] + c * DC8[d];
        if (stamp[ni] !== gen || ng < g[ni]) { g[ni] = ng; prev[ni] = v; stamp[ni] = gen; heap.push(ng + hfn(nx, ny), ni); }
      }
    }
    return null;
  }
  HB.gridAstar = astar;
  HB.gridDijkstra = dijkstra;

  // ---------- generation ----------
  HB.worldgen = {
    generate(seed, opts = {}) {
      const t0 = Date.now();
      const size = opts.size || 200;
      const w = size, h = size, N = w * h;
      const rng = new HB.RNG('world:' + seed);
      HB.names.reset();
      const world = { seed, w, h, version: 1, timings: {} };
      let tPhase = Date.now();
      const mark = (name) => { const now = Date.now(); world.timings[name] = now - tPhase; tPhase = now; if (opts.verbose) console.log('worldgen:', name, world.timings[name] + 'ms'); };

      // --- terrain fields
      const noiseE = new HB.Noise2D(rng.fork('elev')), noiseR = new HB.Noise2D(rng.fork('ridge')), noiseM = new HB.Noise2D(rng.fork('moist')), noiseT = new HB.Noise2D(rng.fork('temp')), noiseC = new HB.Noise2D(rng.fork('coast'));
      const elev = new Float32Array(N), moist = new Float32Array(N), temp = new Float32Array(N);
      const cx = w / 2, cy = h / 2;
      // islands: a few bumps outside the main coast
      const isles = [];
      const isleCount = 2 + rng.int(4);
      for (let i = 0; i < isleCount; i++) { const a = rng.next() * Math.PI * 2, r = 0.80 + rng.next() * 0.14; isles.push({ x: cx + Math.cos(a) * r * cx, y: cy + Math.sin(a) * r * cy, r: 6 + rng.next() * 9, s: 0.45 + rng.next() * 0.35 }); }
      const scale = size / 200;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const nx = x / scale, ny = y / scale;
        const base = noiseE.fbm(nx / 46, ny / 46, 5, 2.0, 0.5);
        const ridge = noiseR.ridged(nx / 34, ny / 34, 4);
        let e = 0.1 + base * 0.8 + ridge * ridge * 0.95;
        // continent mask with ragged edge
        const dxn = (x - cx) / cx, dyn = (y - cy) / cy;
        const d = Math.sqrt(dxn * dxn + dyn * dyn) * (1 + 0.3 * noiseC.fbm(nx / 40, ny / 40, 3) + 0.12 * noiseC.fbm(nx / 12 + 40, ny / 12, 2));
        e -= HB.smoothstep(0.68, 1.05, d) * 1.4;
        for (const il of isles) { const dd = Math.hypot(x - il.x, y - il.y) / (il.r * scale); if (dd < 1.6) e += il.s * Math.exp(-dd * dd * 1.4); }
        elev[i] = e;
        moist[i] = HB.clamp(0.5 + noiseM.fbm(nx / 38 + 100, ny / 38, 4) * 0.7, 0, 1);
        const lat = y / h; // 0 north (cold) .. 1 south (hot)
        temp[i] = HB.clamp(0.12 + lat * 0.85 + noiseT.fbm(nx / 50 + 7, ny / 50 + 3, 3) * 0.18 - Math.max(0, e) * 0.55, 0, 1);
      }
      // classify
      const terrain = new Uint8Array(N);
      for (let i = 0; i < N; i++) {
        const e = elev[i], m = moist[i], t = temp[i];
        let tt;
        if (e < -0.22) tt = T.DEEP;
        else if (e < 0) tt = T.WATER;
        else if (e > 0.78) tt = T.PEAKS;
        else if (e > 0.58) tt = T.MOUNTAINS;
        else if (t < 0.16) tt = T.SNOW;
        else if (e > 0.40) tt = T.HILLS;
        else if (t > 0.80 && m < 0.36) tt = T.DESERT;
        else if (e < 0.07 && m > 0.6) tt = T.SWAMP;
        else if (m > 0.5 && t < 0.42) tt = T.PINE;
        else if (m > 0.48) tt = T.FOREST;
        else tt = T.PLAINS;
        terrain[i] = tt;
      }
      // remove tiny lakes/ponds (water cells with >=7 land neighbours) and tiny islets (single land cells in water)
      for (let pass = 0; pass < 2; pass++) for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x; let land = 0;
        for (let d = 0; d < 8; d++) if (isLand(terrain[i + DY8[d] * w + DX8[d]])) land++;
        if (!isLand(terrain[i]) && land >= 7) terrain[i] = T.PLAINS;
        else if (isLand(terrain[i]) && land <= 1) terrain[i] = T.WATER;
      }
      world.elev = elev; world.moist = moist; world.temp = temp; world.terrain = terrain;
      mark('terrain');

      // --- coast distance for water (0 land, 1..6 water distance to land)
      const coastDist = new Uint8Array(N);
      {
        const q = []; const seen = new Uint8Array(N);
        for (let i = 0; i < N; i++) if (isLand(terrain[i])) { seen[i] = 1; q.push(i); }
        let head = 0;
        while (head < q.length) {
          const v = q[head++]; const x = v % w, y = (v / w) | 0; const dv = coastDist[v];
          if (dv >= 7) continue;
          for (let d = 0; d < 4; d++) { const nx = x + DX4[d], ny = y + DY4[d]; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const ni = ny * w + nx; if (seen[ni]) continue; seen[ni] = 1; coastDist[ni] = dv + 1; q.push(ni); }
        }
      }
      world.coastDist = coastDist;

      // --- rivers
      const river = new Uint8Array(N);
      const rivers = [];
      {
        const srcCount = Math.round(N / 620);
        const tries = srcCount * 30; let made = 0;
        for (let t = 0; t < tries && made < srcCount; t++) {
          const x = rng.int(w), y = rng.int(h), i = y * w + x;
          const tt = terrain[i];
          if (!(tt === T.HILLS || tt === T.MOUNTAINS) || moist[i] < 0.42 || river[i]) continue;
          const cells = [i]; const visited = new Set([i]); let cur = i; let ok = false;
          for (let step = 0; step < 400; step++) {
            const cxp = cur % w, cyp = (cur / w) | 0;
            let best = -1, bestE = elev[cur] + 0.02;
            for (let d = 0; d < 8; d++) {
              const nx = cxp + DX8[d], ny = cyp + DY8[d];
              if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
              const ni = ny * w + nx;
              if (visited.has(ni)) continue;
              const e = elev[ni] + (d >= 4 ? 0.004 : 0) + rng.next() * 0.01;
              if (e < bestE) { bestE = e; best = ni; }
            }
            if (best === -1) break;
            cur = best; visited.add(cur); cells.push(cur);
            if (!isLand(terrain[cur])) { ok = true; break; }
            if (river[cur]) { ok = true; break; } // joins an existing river
          }
          if (ok && cells.length >= 6) {
            for (let k = 0; k < cells.length; k++) { const c = cells[k]; if (isLand(terrain[c])) river[c] = Math.min(3, Math.max(river[c], 1 + (k > 25 ? 1 : 0) + (k > 70 ? 1 : 0))); }
            rivers.push({ cells: cells.map(c => [c % w, (c / w) | 0]), name: null });
            made++;
          }
        }
        // swamps along slow lowland rivers
        for (let i = 0; i < N; i++) if (river[i] && terrain[i] === T.PLAINS && elev[i] < 0.05 && moist[i] > 0.55) terrain[i] = T.SWAMP;
      }
      world.river = river; world.rivers = rivers;
      mark('rivers');

      // --- regions
      const landIdx = []; for (let i = 0; i < N; i++) if (isLand(terrain[i])) landIdx.push(i);
      const landCount = landIdx.length;
      const regionCount = HB.clamp(Math.round(landCount / 2100), 6, 16);
      // home seed near the centre on hills if possible
      let homeSeed = -1;
      {
        let best = -1, bestScore = -Infinity;
        for (let t = 0; t < 4000; t++) {
          const i = landIdx[rng.int(landCount)]; const x = i % w, y = (i / w) | 0;
          const dc = Math.hypot(x - cx, y - cy) / (size / 2);
          if (dc > 0.4) continue;
          const score = (terrain[i] === T.HILLS ? 1.2 : terrain[i] === T.PLAINS || terrain[i] === T.FOREST ? 0.8 : 0) - dc + rng.next() * 0.3;
          if (score > bestScore) { bestScore = score; best = i; }
        }
        homeSeed = best === -1 ? landIdx[landCount >> 1] : best;
      }
      const regionSeeds = [homeSeed];
      const groundCost = (i) => HB.TERRAIN_COST[terrain[i]] + (river[i] ? 2 : 0);
      // farthest-point sampling by ground distance
      {
        let field = dijkstra(w, h, [{ idx: homeSeed, id: 0 }], groundCost);
        for (let r = 1; r < regionCount; r++) {
          let best = -1, bestD = -1;
          for (let k = 0; k < landCount; k += 3) { const i = landIdx[k]; const d = field.dist[i] * (0.8 + rng.next() * 0.4); if (d > bestD && d !== Infinity) { bestD = d; best = i; } }
          if (best === -1) break;
          regionSeeds.push(best);
          const f2 = dijkstra(w, h, [{ idx: best, id: r }], groundCost);
          for (let i = 0; i < N; i++) if (f2.dist[i] < field.dist[i]) { field.dist[i] = f2.dist[i]; }
        }
      }
      const regField = dijkstra(w, h, regionSeeds.map((idx, id) => ({ idx, id })), groundCost);
      const region = regField.owner;
      const regions = regionSeeds.map((idx, id) => ({ id, seedX: idx % w, seedY: (idx / w) | 0, cells: 0, landCells: 0, cx: 0, cy: 0, counts: new Array(11).fill(0), neighbors: new Set(), coastal: 0, tier: 3, isle: false, name: '', flavour: 'plain', factionId: -1, culture: 'westron' }));
      for (let i = 0; i < N; i++) {
        const r = region[i]; if (r < 0) continue; const R = regions[r];
        R.cells++; if (isLand(terrain[i])) { R.landCells++; R.cx += i % w; R.cy += (i / w) | 0; R.counts[terrain[i]]++; }
      }
      for (const R of regions) { if (R.landCells) { R.cx /= R.landCells; R.cy /= R.landCells; } }
      // adjacency (land-land)
      for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
        const i = y * w + x; if (!isLand(terrain[i])) continue;
        for (const ni of [i + 1, i + w]) { if (!isLand(terrain[ni])) continue; const a = region[i], b = region[ni]; if (a !== b && a >= 0 && b >= 0) { regions[a].neighbors.add(b); regions[b].neighbors.add(a); } }
      }
      // tiers by land ring from home
      {
        const ring = new Array(regions.length).fill(-1); ring[0] = 0; const q = [0];
        while (q.length) { const r = q.shift(); for (const n of regions[r].neighbors) if (ring[n] === -1) { ring[n] = ring[r] + 1; q.push(n); } }
        for (const R of regions) { R.ring = ring[R.id]; R.isle = ring[R.id] === -1; R.tier = R.isle ? 3 : ring[R.id] === 0 ? 0 : ring[R.id] === 1 ? 1 : ring[R.id] <= 3 ? 2 : 3; R.neighbors = [...R.neighbors]; }
      }
      world.region = region; world.regions = regions;
      mark('regions');

      // --- subregions
      const sub = new Int16Array(N).fill(-1);
      const subregions = [];
      for (const R of regions) {
        const cellsOf = []; for (let i = 0; i < N; i++) if (region[i] === R.id && isLand(terrain[i])) cellsOf.push(i);
        if (!cellsOf.length) continue;
        const count = HB.clamp(Math.round(cellsOf.length / 52), 1, 60);
        const seeds = [cellsOf[rng.int(cellsOf.length)]];
        const cost = (i) => region[i] === R.id && isLand(terrain[i]) ? HB.TERRAIN_COST[terrain[i]] : Infinity;
        // farthest-point sampling by euclidean distance (cheap); the final assignment uses ground cost
        const minD = new Float32Array(cellsOf.length).fill(Infinity);
        const updateMin = (seedIdx) => { const sx = seedIdx % w, sy = (seedIdx / w) | 0; for (let k = 0; k < cellsOf.length; k++) { const i = cellsOf[k]; const d = HB.dist2(i % w, (i / w) | 0, sx, sy); if (d < minD[k]) minD[k] = d; } };
        updateMin(seeds[0]);
        for (let s = 1; s < count; s++) {
          let best = -1, bestD = -1;
          for (let k = 0; k < cellsOf.length; k++) { const d = minD[k] * (0.8 + rng.next() * 0.4); if (d > bestD) { bestD = d; best = k; } }
          if (best === -1) break;
          seeds.push(cellsOf[best]); updateMin(cellsOf[best]);
        }
        const base = subregions.length;
        const sf = dijkstra(w, h, seeds.map((idx, id) => ({ idx, id })), cost);
        for (const i of cellsOf) if (sf.owner[i] >= 0) sub[i] = base + sf.owner[i];
        seeds.forEach((idx, k) => subregions.push({ id: base + k, regionId: R.id, seedX: idx % w, seedY: (idx / w) | 0, landCells: 0, cx: 0, cy: 0, counts: new Array(11).fill(0), riverCells: 0, coastCells: 0, neighbors: new Set(), factionId: -1, name: '', flavour: 'plain', locations: [], wild: false }));
        // assign unassigned land cells of this region (isolated bits) to nearest seed by euclid
        for (const i of cellsOf) if (sub[i] < 0) { let b = 0, bd = Infinity; const x = i % w, y = (i / w) | 0; seeds.forEach((s, k) => { const d = HB.dist2(x, y, s % w, (s / w) | 0); if (d < bd) { bd = d; b = k; } }); sub[i] = base + b; }
      }
      for (let i = 0; i < N; i++) {
        const s = sub[i]; if (s < 0) continue; const S = subregions[s];
        S.landCells++; S.cx += i % w; S.cy += (i / w) | 0; S.counts[terrain[i]]++; if (river[i]) S.riverCells++;
        const x = i % w, y = (i / w) | 0;
        for (let d = 0; d < 4; d++) { const nx = x + DX4[d], ny = y + DY4[d]; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; if (!isLand(terrain[ny * w + nx])) { S.coastCells++; break; } }
      }
      for (const S of subregions) { S.cx /= Math.max(1, S.landCells); S.cy /= Math.max(1, S.landCells); S.flavour = flavourOf(S.counts, S.landCells, S.coastCells, S.riverCells, regions[S.regionId].isle); }
      for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
        const i = y * w + x; if (sub[i] < 0) continue;
        for (const ni of [i + 1, i + w]) { const a = sub[i], b = sub[ni]; if (b >= 0 && a !== b) { subregions[a].neighbors.add(b); subregions[b].neighbors.add(a); } }
      }
      for (const S of subregions) S.neighbors = [...S.neighbors];
      for (const R of regions) R.flavour = flavourOf(R.counts, R.landCells, R.coastal, 0, R.isle);
      world.sub = sub; world.subregions = subregions;
      mark('subregions');

      // --- factions
      const factions = [];
      const homeRegion = regions[0];
      const subOfCell = (i) => subregions[sub[i]];
      const humanCount = HB.clamp(3 + Math.round(regions.length / 4), 4, 7);
      const capitals = []; // subregion ids
      const pickCapital = (pred, weightFn) => {
        let best = -1, bestS = -Infinity;
        for (const S of subregions) {
          if (S.factionId >= 0 || capitals.includes(S.id) || !pred(S)) continue;
          let minD = Infinity; for (const c of capitals) { const C = subregions[c]; minD = Math.min(minD, HB.dist(S.cx, S.cy, C.cx, C.cy)); }
          const score = weightFn(S) + Math.min(minD, 60) * 0.08 + rng.next() * 1.5;
          if (score > bestS) { bestS = score; best = S.id; }
        }
        return best;
      };
      const lowland = (S) => (S.counts[T.PLAINS] + S.counts[T.FOREST] + S.counts[T.HILLS]) / Math.max(1, S.landCells);
      const mountainy = (S) => (S.counts[T.MOUNTAINS] + S.counts[T.PEAKS] + S.counts[T.HILLS] * 0.5) / Math.max(1, S.landCells);
      const woody = (S) => (S.counts[T.FOREST] + S.counts[T.PINE]) / Math.max(1, S.landCells);
      const swampy = (S) => (S.counts[T.SWAMP] + S.counts[T.MOUNTAINS] * 0.5 + S.counts[T.DESERT] * 0.5 + S.counts[T.SNOW] * 0.4) / Math.max(1, S.landCells);
      const addFaction = (kind, capSub, cultureHint) => {
        if (capSub < 0) return null;
        const S = subregions[capSub];
        const R = regions[S.regionId];
        let culture = cultureHint;
        if (kind === 'human') { const lat = S.cy / h; culture = lat < 0.3 ? 'northern' : lat > 0.68 ? 'southern' : 'westron'; }
        const f = { id: factions.length, kind, culture, capitalSub: capSub, capitalId: null, name: '', subregions: [], color: null, ruler: null, rulerSince: 0, treasury: 0, relations: {}, dragon: { fear: 0, hostility: 0, trust: 0, known: false }, learned: { escorts: 0, vaults: 0, rescue: 0, hunters: 0, wards: 0 }, atWar: [], history: [], maxSize: kind === 'human' ? 18 + rng.int(18) : kind === 'dwarf' ? 5 + rng.int(5) : kind === 'elf' ? 7 + rng.int(7) : 5 + rng.int(7), homeTier: R.tier };
        f.name = HB.names.realm(rng, culture);
        f.ruler = { name: HB.names.person(rng, culture, false), title: kind === 'human' ? (rng.chance(0.5) ? 'King' : 'Queen') : kind === 'dwarf' ? 'King under the Mountain' : kind === 'elf' ? 'Lord' : 'Warlord', house: kind === 'human' ? HB.names.house(rng, culture) : '' };
        capitals.push(capSub);
        factions.push(f);
        return f;
      };
      // humans: first kingdom should touch the home region's neighbourhood so the opening has civilisation
      addFaction('human', pickCapital(S => S.regionId !== 0 ? regions[S.regionId].neighbors.includes(0) || S.regionId === 0 : true, S => lowland(S) * 3 + (S.riverCells > 0 ? 1 : 0) + (S.coastCells > 0 ? 0.6 : 0) - (Math.hypot(S.cx - homeRegion.cx, S.cy - homeRegion.cy) < 12 ? 3 : 0)));
      for (let k = 1; k < humanCount; k++) addFaction('human', pickCapital(S => lowland(S) > 0.5 && !regions[S.regionId].isle, S => lowland(S) * 3 + (S.riverCells > 0 ? 1 : 0) + (S.coastCells > 0 ? 0.6 : 0) + regions[S.regionId].tier * 0.3));
      for (let k = 0; k < 2; k++) addFaction('dwarf', pickCapital(S => mountainy(S) > 0.35, S => mountainy(S) * 4), 'dwarf');
      for (let k = 0; k < 2; k++) addFaction('elf', pickCapital(S => woody(S) > 0.45, S => woody(S) * 4 + regions[S.regionId].tier * 0.5), 'elf');
      for (let k = 0; k < 2; k++) addFaction('goblin', pickCapital(S => swampy(S) > 0.3, S => swampy(S) * 4 + regions[S.regionId].tier * 0.4), 'goblin');
      // claim subregions: multi-source BFS over subregion graph with per-kind costs
      {
        const pref = { human: S => 1 + mountainy(S) * 2.5 + swampy(S) * 1.5, dwarf: S => 1 + (1 - mountainy(S)) * 3, elf: S => 1 + (1 - woody(S)) * 3, goblin: S => 1 + (1 - swampy(S)) * 2 };
        // wilderness pockets: the home subregion and its neighbours stay wild; plus random pockets
        const homeSub = subOfCell(homeSeed).id;
        const wildSet = new Set([homeSub, ...subregions[homeSub].neighbors]);
        for (const S of subregions) if (rng.chance(0.12)) wildSet.add(S.id);
        for (const c of capitals) wildSet.delete(c);
        for (const S of subregions) S.wild = wildSet.has(S.id);
        const heap = new MinHeap(subregions.length * 4);
        const best = new Float64Array(subregions.length).fill(Infinity);
        factions.forEach(f => { best[f.capitalSub] = 0; heap.push(0, f.capitalSub * 64 + f.id); });
        while (heap.size) {
          const { k, v } = heap.pop(); const sid = (v / 64) | 0, fid = v % 64;
          const S = subregions[sid], f = factions[fid];
          if (S.factionId >= 0 || k > best[sid]) continue;
          if (f.subregions.length >= f.maxSize) continue;
          S.factionId = fid; f.subregions.push(sid);
          for (const n of S.neighbors) {
            const Sn = subregions[n]; if (Sn.factionId >= 0 || Sn.wild) continue;
            if (regions[Sn.regionId].isle !== regions[S.regionId].isle) continue;
            const c = k + pref[f.kind](Sn) * (1 + rng.next() * 0.4);
            if (c < best[n]) { best[n] = c; heap.push(c, n * 64 + fid); }
          }
        }
      }
      // region dominant faction + culture + names
      for (const R of regions) {
        const tally = {}; let bestF = -1, bestN = 0;
        for (const S of subregions) if (S.regionId === R.id && S.factionId >= 0) { tally[S.factionId] = (tally[S.factionId] || 0) + S.landCells; if (tally[S.factionId] > bestN) { bestN = tally[S.factionId]; bestF = S.factionId; } }
        R.factionId = bestF; R.culture = bestF >= 0 ? factions[bestF].culture : (R.cy / h < 0.3 ? 'northern' : R.cy / h > 0.68 ? 'southern' : 'westron');
        R.name = HB.names.region(rng, R.flavour, R.culture);
      }
      for (const S of subregions) {
        const culture = S.factionId >= 0 ? factions[S.factionId].culture : regions[S.regionId].culture;
        S.culture = culture;
        S.name = HB.names.subregion(rng, S.flavour, culture);
      }
      rivers.sort((a, b) => b.cells.length - a.cells.length);
      rivers.slice(0, Math.min(12, rivers.length)).forEach(r => { const c = r.cells[Math.floor(r.cells.length / 2)]; const s = sub[c[1] * w + c[0]]; r.name = HB.names.river(rng, s >= 0 ? subregions[s].culture : 'westron'); });
      world.factions = factions;
      mark('factions');

      // --- locations
      const locations = [];
      const occupied = new Uint8Array(N); // location exclusion
      const locAt = new Int32Array(N).fill(-1);
      const addLoc = (type, idx, props) => {
        const x = idx % w, y = (idx / w) | 0;
        const S = subregions[sub[idx]];
        const loc = Object.assign({ id: locations.length, type, name: '', x, y, cell: idx, subId: S ? S.id : -1, regionId: region[idx], factionId: S && S.factionId >= 0 ? S.factionId : -1, tier: 0, pop: 0, wealth: 0, wealthMax: 0, defense: 0, defenseBase: 0, state: 'normal', special: null, ruler: null, memory: [], fear: 0, trust: 0, lastRaidYear: -999, knowledge: { seen: false, scoutedYear: -1, raided: false }, flags: {}, founded: 0, capital: false }, props);
        locations.push(loc); locAt[idx] = loc.id; if (S) S.locations.push(loc.id);
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h) occupied[ny * w + nx] = 1; }
        return loc;
      };
      const cellsBySub = subregions.map(() => []);
      for (let i = 0; i < N; i++) if (sub[i] >= 0) cellsBySub[sub[i]].push(i);
      const pickCell = (S, scoreFn, tries = 60) => {
        const cells = cellsBySub[S.id]; if (!cells.length) return -1;
        let best = -1, bestS = -Infinity;
        for (let t = 0; t < tries; t++) { const i = cells[rng.int(cells.length)]; if (occupied[i]) continue; const s = scoreFn(i, terrain[i]); if (s > bestS) { bestS = s; best = i; } }
        return bestS > -Infinity ? best : -1;
      };
      const nearWater = (i) => { const x = i % w, y = (i / w) | 0; for (let d = 0; d < 8; d++) { const nx = x + DX8[d], ny = y + DY8[d]; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const ni = ny * w + nx; if (!isLand(terrain[ni]) || river[ni]) return true; } return !!river[i]; };
      const settleScore = (i, t) => (t === T.PLAINS ? 2 : t === T.FOREST ? 1.2 : t === T.HILLS ? 1 : t === T.PINE ? 0.8 : t === T.DESERT ? 0.3 : t === T.SWAMP ? 0.2 : t === T.SNOW ? 0.3 : -5) + (nearWater(i) ? 1.2 : 0) + rng.next() * 0.5;
      const regionTierOf = (S) => regions[S.regionId].tier;
      const makeRuler = (culture) => ({ name: HB.names.person(rng, culture, false), title: HB.names.title(rng, culture), house: HB.names.house(rng, culture), since: 0 });
      const settlementProps = (tier, culture, tierBoost) => {
        const defs = [
          { type: 'farm', pop: [12, 40], wealth: [40, 120], def: [2, 8] },
          { type: 'village', pop: [120, 450], wealth: [160, 420], def: [10, 22] },
          { type: 'town', pop: [1200, 3500], wealth: [600, 1600], def: [26, 42] },
          { type: 'city', pop: [8000, 22000], wealth: [2400, 6500], def: [48, 66] },
          { type: 'city', pop: [25000, 60000], wealth: [8000, 16000], def: [62, 80] },
        ][tier];
        const mult = 1 + tierBoost * 0.25;
        return { type: defs.type, tier, pop: Math.round(rng.between(defs.pop[0], defs.pop[1]) * mult), wealth: Math.round(rng.between(defs.wealth[0], defs.wealth[1]) * mult), defense: Math.round(rng.between(defs.def[0], defs.def[1]) * (1 + tierBoost * 0.1)) };
      };
      for (const S of subregions) {
        const f = S.factionId >= 0 ? factions[S.factionId] : null;
        const kind = f ? f.kind : 'wild';
        const culture = S.culture;
        const rt = regionTierOf(S);
        const isCapital = f && f.capitalSub === S.id;
        if (kind === 'human') {
          const n = HB.clamp(Math.round(S.landCells / 20) + (isCapital ? 1 : 0), 1, 5);
          for (let k = 0; k < n; k++) {
            const i = pickCell(S, settleScore); if (i < 0) break;
            let tier = isCapital && k === 0 ? (rt >= 1 && rng.chance(0.5) ? 4 : 3) : rng.weighted([{ w: 50, v: 0 }, { w: 32, v: 1 }, { w: 14, v: 2 }, { w: 4, v: 3 }]).v;
            const sp = settlementProps(tier, culture, rt);
            const loc = addLoc(sp.type, i, { tier, pop: sp.pop, wealth: sp.wealth, wealthMax: sp.wealth * 1.5, defense: sp.defense, defenseBase: sp.defense, capital: isCapital && k === 0 });
            loc.name = tier === 0 ? HB.names.person(rng, culture, false).split(' ')[0] + "'s " + rng.pick(['Farm', 'Steading', 'Croft', 'Holding']) : HB.names.place(rng, culture);
            if (tier >= 2) loc.ruler = makeRuler(culture);
            if (loc.capital) { f.capitalId = loc.id; loc.ruler = { name: f.ruler.name, title: f.ruler.title, house: f.ruler.house, since: 0 }; }
          }
          if (rng.chance(0.38) || (isCapital && rng.chance(0.6))) {
            const i = pickCell(S, (i, t) => (t === T.HILLS ? 2 : t === T.MOUNTAINS ? 1 : t === T.PLAINS ? 0.6 : t === T.FOREST ? 0.4 : -3) + rng.next());
            if (i >= 0) { const loc = addLoc('castle', i, { tier: 2, pop: Math.round(rng.between(80, 300)), wealth: Math.round(rng.between(700, 2400) * (1 + rt * 0.3)), defense: Math.round(rng.between(48, 72) * (1 + rt * 0.08)), ruler: makeRuler(culture) }); loc.wealthMax = loc.wealth * 1.3; loc.defenseBase = loc.defense; loc.name = rng.pick(['Castle ', 'Keep of ', 'Fort ', 'Castle ']) + HB.names.place(rng, culture); }
          }
          if (rng.chance(0.15)) addMonastery(S, culture, rt);
          if ((S.counts[T.HILLS] + S.counts[T.MOUNTAINS]) > 6 && rng.chance(0.4)) addMine(S, culture, rt);
        } else if (kind === 'dwarf') {
          if (isCapital) { const i = pickCell(S, (i, t) => (t === T.MOUNTAINS ? 3 : t === T.HILLS ? 1.5 : t === T.PEAKS ? 1 : -4) + rng.next()); if (i >= 0) { const loc = addLoc('hold', i, { tier: 3, pop: Math.round(rng.between(3000, 9000)), wealth: Math.round(rng.between(6000, 14000) * (1 + rt * 0.3)), defense: Math.round(rng.between(72, 90)), capital: true, ruler: { name: f.ruler.name, title: f.ruler.title, house: '', since: 0 } }); loc.wealthMax = loc.wealth * 1.4; loc.defenseBase = loc.defense; loc.name = f.name; f.capitalId = loc.id; } }
          else if (rng.chance(0.5)) { const i = pickCell(S, (i, t) => (t === T.MOUNTAINS ? 2 : t === T.HILLS ? 2 : -3) + rng.next()); if (i >= 0) { const loc = addLoc('hold', i, { tier: 2, pop: Math.round(rng.between(600, 2500)), wealth: Math.round(rng.between(2000, 5000) * (1 + rt * 0.3)), defense: Math.round(rng.between(55, 75)), ruler: makeRuler('dwarf') }); loc.wealthMax = loc.wealth * 1.4; loc.defenseBase = loc.defense; loc.name = HB.names.place(rng, 'dwarf'); } }
          const mines = 1 + rng.int(2); for (let k = 0; k < mines; k++) addMine(S, 'dwarf', rt);
        } else if (kind === 'elf') {
          const i = pickCell(S, (i, t) => (t === T.FOREST ? 3 : t === T.PINE ? 2 : -3) + rng.next());
          if (i >= 0) { const loc = addLoc('glade', i, { tier: isCapital ? 3 : 1 + rng.int(2), pop: Math.round(rng.between(300, 2000)), wealth: Math.round(rng.between(1500, 4500) * (1 + rt * 0.3)), defense: Math.round(rng.between(42, 64)), capital: isCapital, ruler: isCapital ? { name: f.ruler.name, title: f.ruler.title, house: '', since: 0 } : makeRuler('elf') }); loc.wealthMax = loc.wealth * 1.2; loc.defenseBase = loc.defense; loc.name = isCapital ? f.name : HB.names.place(rng, 'elf'); if (isCapital) f.capitalId = loc.id; }
          if (rng.chance(0.25)) addRuin(S, rt, true);
        } else if (kind === 'goblin') {
          const i = pickCell(S, (i, t) => (t === T.SWAMP ? 2 : t === T.MOUNTAINS ? 2 : t === T.HILLS ? 1.5 : t === T.DESERT ? 1 : -2) + rng.next());
          if (i >= 0) { const loc = addLoc('warren', i, { tier: isCapital ? 2 : 1, pop: Math.round(rng.between(300, 1500)), wealth: Math.round(rng.between(150, 600) * (1 + rt * 0.3)), defense: Math.round(rng.between(22, 44)), capital: isCapital, ruler: isCapital ? { name: f.ruler.name, title: f.ruler.title, house: '', since: 0 } : makeRuler('goblin') }); loc.wealthMax = loc.wealth * 1.3; loc.defenseBase = loc.defense; loc.name = isCapital ? f.name : HB.names.place(rng, 'goblin'); if (isCapital) f.capitalId = loc.id; }
          const camps = rng.int(3); for (let k = 0; k < camps; k++) addCamp(S, 'goblin', 'goblin', rt);
        } else { // wild
          if (rng.chance(0.42)) addCamp(S, 'bandit', culture, rt);
          if (rng.chance(0.18)) addCamp(S, 'hunter', culture, rt);
          if (rng.chance(0.28)) { const i = pickCell(S, settleScore); if (i >= 0) { const tier = rng.chance(0.7) ? 0 : 1; const sp = settlementProps(tier, culture, rt); const loc = addLoc(sp.type, i, { tier, pop: sp.pop, wealth: sp.wealth, wealthMax: sp.wealth * 1.5, defense: sp.defense, defenseBase: sp.defense }); loc.name = tier === 0 ? HB.names.person(rng, culture, false).split(' ')[0] + "'s " + rng.pick(['Farm', 'Steading', 'Croft']) : HB.names.place(rng, culture); } }
          if (rng.chance(0.3)) addRuin(S, rt, false);
          if (rng.chance(0.2)) addMonastery(S, culture, rt);
          if (rng.chance(0.1)) addTower(S, culture, rt);
        }
        if (rt >= 1 && rng.chance(0.18)) addRuin(S, rt, false);
      }
      function addMonastery(S, culture, rt) {
        const i = pickCell(S, (i, t) => (t === T.HILLS ? 2 : t === T.FOREST ? 1.5 : t === T.MOUNTAINS ? 1 : t === T.PLAINS ? 0.6 : -2) + rng.next()); if (i < 0) return;
        const shrine = rng.chance(0.4);
        const loc = addLoc(shrine ? 'shrine' : 'monastery', i, { tier: 1, pop: shrine ? 6 : Math.round(rng.between(20, 80)), wealth: Math.round(rng.between(shrine ? 150 : 400, shrine ? 500 : 1300) * (1 + rt * 0.3)), defense: Math.round(rng.between(8, 26)) });
        loc.wealthMax = loc.wealth * 1.2; loc.defenseBase = loc.defense; loc.name = (shrine ? 'Shrine of ' : rng.pick(['Abbey of ', 'Priory of ', 'Cloister of '])) + HB.names.place(rng, culture);
      }
      function addMine(S, culture, rt) {
        const i = pickCell(S, (i, t) => (t === T.HILLS ? 2 : t === T.MOUNTAINS ? 2.2 : -3) + rng.next()); if (i < 0) return;
        const loc = addLoc('mine', i, { tier: 1, pop: Math.round(rng.between(40, 160)), wealth: Math.round(rng.between(300, 900) * (1 + rt * 0.35)), defense: Math.round(rng.between(10, 24)) });
        loc.wealthMax = loc.wealth * 1.5; loc.defenseBase = loc.defense; loc.name = HB.names.place(rng, culture) + rng.pick([' Mine', ' Delving', ' Diggings', ' Mine']);
      }
      function addCamp(S, kindOf, culture, rt) {
        const i = pickCell(S, (i, t) => (t === T.FOREST ? 2 : t === T.HILLS ? 1.8 : t === T.PINE ? 1.5 : t === T.PLAINS ? 0.8 : t === T.SWAMP ? (kindOf === 'goblin' ? 2 : 0.2) : t === T.MOUNTAINS ? 1 : -2) + rng.next()); if (i < 0) return;
        const loc = addLoc('camp', i, { camp: kindOf, tier: 0, pop: Math.round(rng.between(8, 40)), wealth: Math.round(rng.between(60, 320) * (1 + rt * 0.3)), defense: Math.round(rng.between(kindOf === 'hunter' ? 18 : 10, kindOf === 'hunter' ? 34 : 28)), ruler: { name: HB.names.person(rng, culture, false), title: kindOf === 'goblin' ? 'Boss' : kindOf === 'hunter' ? 'Huntmaster' : 'Captain', house: '', since: 0 } });
        loc.wealthMax = loc.wealth * 1.3; loc.defenseBase = loc.defense;
        loc.name = kindOf === 'goblin' ? loc.ruler.name + "'s Warband" : kindOf === 'hunter' ? rng.pick(["Hunters' Camp", 'Trappers’ Camp', 'Hunting Lodge']) + ' of ' + loc.ruler.name.split(' ')[0] : rng.pick(['Bandit Camp of ', 'Outlaws of ', 'Camp of ']) + loc.ruler.name;
      }
      function addRuin(S, rt, elvish) {
        const i = pickCell(S, (i, t) => (t === T.HILLS ? 1.5 : t === T.FOREST ? 1.5 : t === T.PLAINS ? 1 : t === T.SWAMP ? 1.2 : t === T.DESERT ? 1.5 : t === T.MOUNTAINS ? 1 : -2) + rng.next()); if (i < 0) return;
        const loc = addLoc('ruin', i, { tier: 0, pop: 0, wealth: Math.round(rng.between(200, 1600) * (1 + rt * 0.5)), defense: Math.round(rng.between(14, 48)), ancient: true });
        loc.wealthMax = loc.wealth; loc.defenseBase = loc.defense; loc.name = rng.pick(['Ruins of ', 'The Fallen Halls of ', 'Old ', 'Ruins of ']) + HB.names.place(rng, elvish ? 'elf' : rng.pick(['southern', 'elf', 'westron']));
      }
      function addTower(S, culture, rt) {
        const i = pickCell(S, (i, t) => (t === T.HILLS ? 2 : t === T.PLAINS ? 1 : t === T.MOUNTAINS ? 1.5 : -2) + rng.next()); if (i < 0) return;
        const loc = addLoc('tower', i, { tier: 1, pop: 4, wealth: Math.round(rng.between(500, 1500) * (1 + rt * 0.4)), defense: Math.round(rng.between(30, 60)), ruler: { name: HB.names.person(rng, culture, false), title: rng.pick(['the Sage', 'the Wizard', 'the Astrologer']), house: '', since: 0 } });
        loc.wealthMax = loc.wealth; loc.defenseBase = loc.defense; loc.name = rng.pick(['Tower of ', 'Spire of ', 'The Watch of ']) + loc.ruler.name.split(' ')[0];
      }
      // rival dragon lairs in far mountains
      {
        const cands = subregions.filter(S => regionTierOf(S) >= 2 && mountainy(S) > 0.3);
        rng.shuffle(cands);
        const n = Math.min(cands.length, 2 + rng.int(3));
        for (let k = 0; k < n; k++) {
          const S = cands[k]; const i = pickCell(S, (i, t) => (t === T.MOUNTAINS ? 3 : t === T.PEAKS ? 2 : t === T.HILLS ? 1 : -3) + rng.next()); if (i < 0) continue;
          const dname = HB.names.dragon(rng);
          const ancient = k === 0;
          const loc = addLoc('rivalLair', i, { tier: ancient ? 3 : 2, pop: 1, wealth: Math.round(rng.between(ancient ? 30000 : 9000, ancient ? 60000 : 24000)), defense: ancient ? 100 : Math.round(rng.between(78, 92)), ruler: { name: dname, title: ancient ? 'the Elder Wyrm' : 'the Wyrm', house: '', since: 0 }, dragon: { name: dname, tier: ancient ? 3 : 2, breed: rng.pick(['red', 'green', 'black', 'gold', 'blue']), age: ancient ? 400 + rng.int(300) : 60 + rng.int(120) } });
          loc.wealthMax = loc.wealth * 1.5; loc.defenseBase = loc.defense; loc.name = (ancient ? 'The Lair of ' : 'Lair of ') + dname;
        }
      }

      mark('locations');
      // --- home cave
      const home = chooseHome();
      mark('home');
      function chooseHome() {
        const cellsOfHome = []; for (let i = 0; i < N; i++) if (region[i] === 0 && isLand(terrain[i])) cellsOfHome.push(i);
        const locDist = (i, pred) => { let best = Infinity; const x = i % w, y = (i / w) | 0; for (const L of locations) if (pred(L)) best = Math.min(best, Math.hypot(L.x - x, L.y - y)); return best; };
        let best = -1, bestS = -Infinity;
        for (let t = 0; t < 1500; t++) {
          const i = cellsOfHome[rng.int(cellsOfHome.length)];
          const tt = terrain[i]; if (!(tt === T.HILLS || tt === T.MOUNTAINS)) continue;
          if (occupied[i]) continue;
          const dSettle = locDist(i, L => (L.type === 'farm' || L.type === 'village') && L.factionId >= 0);
          const dCamp = locDist(i, L => L.type === 'camp');
          const dCastle = locDist(i, L => L.type === 'castle');
          const dBig = locDist(i, L => L.type === 'city' || L.type === 'hold' || L.type === 'glade' || L.type === 'warren' || L.type === 'rivalLair');
          const dAny = locDist(i, () => true);
          let s = 0;
          s += dSettle >= 4 && dSettle <= 9 ? 3 : -Math.abs(dSettle - 6) * 0.3;
          s += dCamp >= 3 && dCamp <= 10 ? 2 : -0.5;
          s += dCastle >= 8 && dCastle <= 20 ? 2 : -0.5;
          s += dBig < 10 ? -4 : 0;
          s += dAny < 3 ? -10 : 0;
          s += tt === T.HILLS ? 1 : 0.3;
          s += rng.next() * 0.6;
          if (s > bestS) { bestS = s; best = i; }
        }
        const i = best;
        const x = i % w, y = (i / w) | 0;
        // guarantees
        const need = (pred, maker) => { let d = Infinity; for (const L of locations) if (pred(L)) d = Math.min(d, Math.hypot(L.x - x, L.y - y)); if (d > 10) maker(); };
        const nearCell = (minR, maxR, ok) => { for (let t = 0; t < 400; t++) { const a = rng.next() * Math.PI * 2, r = rng.range(minR, maxR); const nx = Math.round(x + Math.cos(a) * r), ny = Math.round(y + Math.sin(a) * r); if (nx < 1 || ny < 1 || nx >= w - 1 || ny >= h - 1) continue; const ni = ny * w + nx; if (!isLand(terrain[ni]) || occupied[ni] || region[ni] !== 0) continue; if (ok && !ok(terrain[ni])) continue; return ni; } return -1; };
        need(L => L.type === 'camp', () => { const ni = nearCell(4, 8); if (ni >= 0) { const loc = addLoc('camp', ni, { camp: 'bandit', tier: 0, pop: 14, wealth: 140, wealthMax: 200, defense: 14, defenseBase: 14, ruler: { name: HB.names.person(rng, 'westron'), title: 'Captain', house: '', since: 0 } }); loc.name = 'Outlaws of ' + loc.ruler.name; } });
        need(L => (L.type === 'farm' || L.type === 'village'), () => { const ni = nearCell(4, 8, t => t === T.PLAINS || t === T.FOREST || t === T.HILLS); if (ni >= 0) { const S = subregions[sub[ni]]; const culture = S.culture; const loc = addLoc('village', ni, { tier: 1, pop: 220, wealth: 260, wealthMax: 400, defense: 14, defenseBase: 14 }); loc.name = HB.names.place(rng, culture); loc.factionId = factions[0].id; } });
        need(L => L.type === 'castle', () => { const ni = nearCell(9, 16, t => t === T.HILLS || t === T.PLAINS || t === T.FOREST); if (ni >= 0) { const S = subregions[sub[ni]]; const culture = S.culture; const loc = addLoc('castle', ni, { tier: 2, pop: 150, wealth: 1100, wealthMax: 1500, defense: 52, defenseBase: 52, ruler: makeRuler(culture) }); loc.name = 'Castle ' + HB.names.place(rng, culture); loc.factionId = factions[0].id; } });
        const lair = addLoc('lair', i, { tier: 0, pop: 1, wealth: 0, defense: 0, name: 'Your Lair', player: true });
        lair.knowledge.seen = true;
        return { x, y, cell: i, regionId: 0, subId: sub[i], locId: lair.id };
      }
      world.home = home;

      // --- roads
      const road = new Uint8Array(N);
      const roads = [];
      {
        const nodes = locations.filter(L => ['village', 'town', 'city', 'castle', 'hold', 'glade', 'mine', 'monastery', 'warren', 'tower'].includes(L.type));
        const farms = locations.filter(L => L.type === 'farm');
        const edges = [];
        for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
          const A = nodes[a], B = nodes[b];
          const d = Math.hypot(A.x - B.x, A.y - B.y);
          if (d > 34) continue;
          const sameF = A.factionId === B.factionId;
          const kindOK = sameF || (A.factionId >= 0 && B.factionId >= 0 && A.tier >= 2 && B.tier >= 2) || A.factionId < 0 || B.factionId < 0;
          if (!kindOK) continue;
          edges.push({ a: A.id, b: B.id, d: d * (sameF ? 1 : 1.6) });
        }
        edges.sort((e1, e2) => e1.d - e2.d);
        // Kruskal MST + extra short edges
        const parent = new Map(); const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
        for (const n of nodes) parent.set(n.id, n.id);
        const chosen = [];
        const degree = new Map();
        for (const e of edges) {
          const ra = find(e.a), rb = find(e.b);
          if (ra !== rb) { parent.set(ra, rb); chosen.push(e); degree.set(e.a, (degree.get(e.a) || 0) + 1); degree.set(e.b, (degree.get(e.b) || 0) + 1); }
          else if (e.d < 16 && (degree.get(e.a) || 0) < 3 && (degree.get(e.b) || 0) < 3 && rng.chance(0.35)) { chosen.push(e); degree.set(e.a, (degree.get(e.a) || 0) + 1); degree.set(e.b, (degree.get(e.b) || 0) + 1); }
        }
        // farm lanes to nearest node within 7
        for (const F of farms) { let best = null, bd = 7; for (const n of nodes) { const d = Math.hypot(F.x - n.x, F.y - n.y); if (d < bd) { bd = d; best = n; } } if (best) chosen.push({ a: F.id, b: best.id, d: bd, lane: true }); }
        const roadCost = (i) => { const t = terrain[i]; if (t === T.DEEP) return Infinity; if (t === T.WATER) return 40; let c = HB.TERRAIN_COST[t]; if (road[i]) c *= 0.55; if (river[i]) c += 4; return c; };
        world.roadEdges = chosen.length;
        for (const e of chosen) {
          const A = locations[e.a], B = locations[e.b];
          const path = astar(w, h, A.cell, B.cell, roadCost, 9000, 12);
          if (!path) continue;
          for (const c of path) if (isLand(terrain[c])) road[c] = Math.max(road[c], e.lane ? 1 : 2);
          roads.push({ a: e.a, b: e.b, cells: path.map(c => [c % w, (c / w) | 0]), lane: !!e.lane });
        }
      }
      world.road = road; world.roads = roads;
      mark('roads');
      world.locations = locations;
      world.genLocationCount = locations.length; // places added later (battlefields) are saved with their position
      world.locAt = locAt;

      // --- derived helpers for later systems
      world.genMs = Date.now() - t0;
      for (const R of regions) { delete R.counts; }
      for (const S of subregions) { delete S.counts; }
      return world;
    },
  };

  function flavourOf(counts, land, coast, riverCells, isle) {
    if (!land) return 'coast';
    if (isle) return 'isle';
    const f = (t) => counts[t] / land;
    if (f(T.PEAKS) + f(T.MOUNTAINS) > 0.4) return 'mountain';
    if (f(T.SNOW) > 0.4) return 'snow';
    if (f(T.DESERT) > 0.4) return 'desert';
    if (f(T.SWAMP) > 0.3) return 'swamp';
    if (f(T.FOREST) + f(T.PINE) > 0.45) return 'wood';
    if (coast / land > 0.18) return 'coast';
    if (f(T.HILLS) > 0.35) return 'fells';
    if (riverCells > 0 && f(T.HILLS) + f(T.MOUNTAINS) > 0.2) return 'vale';
    if (f(T.PLAINS) > 0.5 && counts[T.FOREST] < land * 0.2) return 'plain';
    return 'moor';
  }
})();
