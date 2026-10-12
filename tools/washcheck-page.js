/* Page-side helpers for `node tools/mapart-export.mjs --only=wash`, loaded into index.html?scene=washpreview.
 * Freezes the preview's clock so the exporter steps it frame by frame (60 steps a second, each one drawn), checks the
 * knowledge rules on every frame, and measures what the reveal wash and the territory wash cost. */
(function () {
  const sc = HB.scenes.top(), up = sc.update.bind(sc), S = sc.sheet, RW = () => sc.reveal;
  sc.update = () => {};
  const canvas2d = () => { const c = document.createElement('canvas'); c.width = HB.W; c.height = HB.H; return c.getContext('2d'); };
  const octx = canvas2d(), flush = () => octx.getImageData(0, 0, 1, 1); // make the timing include the rasterising
  const q = (a, p) => { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); return +b[Math.min(b.length - 1, Math.floor(b.length * p))].toFixed(2); };
  const T = { reveal: [], washUpdate: [], washSlice: [], washCompose: [] };
  const timed = (obj, name, into) => { const f = obj[name]; obj[name] = function () { const t0 = performance.now(); const r = f.apply(this, arguments); into.push(performance.now() - t0); return r; }; };
  timed(HB.mapReveal.Layer.prototype, 'draw', T.reveal);
  timed(HB.mapWash.Layer.prototype, 'update', T.washUpdate); timed(HB.mapWash.Layer.prototype, 'step', T.washSlice); timed(HB.mapWash.Layer.prototype, 'compose', T.washCompose);
  const L = { violations: [], drawMs: [], busyMs: [], maxCells: 0, steps: [] };
  const I = window.WASHCHECK = {
    sc, T, L,
    storage: () => JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])),
    shownKeys: () => sc.features.filter(f => sc.shown(f)).map(f => f.key),
    fly() { sc.dragon.tx = 28 + S.OX; },
    /** step n seconds of game time; every frame is drawn and the knowledge rules checked */
    run(sec, until) {
      for (let i = 0, n = Math.round(sec * 60); i < n; i++) {
        const before = new Set(RW().cells.keys());
        up(1 / 60 / sc.speed);
        // a reveal step: the cells it added, with their start times and distance from the dragon
        const added = [...RW().cells.keys()].filter(k => !before.has(k));
        if (added.length > 3) L.steps.push(added.map(k => { const c = RW().cells.get(k), x = k % S.W, y = (k / S.W) | 0; return [Math.hypot(x + 0.5 - sc.dragon.x, y + 0.5 - sc.dragon.y), c.t0 - sc.t]; }));
        const t0 = performance.now(); sc.draw(octx); flush(); const ms = performance.now() - t0;
        L.drawMs.push(ms); if (RW().active()) L.busyMs.push(ms);
        L.maxCells = Math.max(L.maxCells, RW().cells.size);
        for (const f of sc.features) { const i = f.cy * S.W + f.cx; if (sc.shown(f) && !sc.revealed[i]) L.violations.push(`${sc.t.toFixed(2)}: ${f.key} drawn under the fog`); }
        const v = sc.features.find(f => f.place); if (!sc.revealed[v.cy * S.W + v.cx] && sc.shown(v)) L.violations.push(`${sc.t.toFixed(2)}: the village shown before discovery`);
        if (until && until()) break;
      }
      return { t: +sc.t.toFixed(2), cells: RW().cells.size, shown: I.shownKeys(), fogLeft: [...sc.revealed].reduce((n, r, i) => n + (r && sc.fog[i] > 0 ? 1 : 0), 0) };
    },
    /** the cover mask of one revealing cell (its 8×8 pixels), to tell a dissolving edge from a uniform fade */
    cellMask() {
      const R = RW(); if (!R.cells.size || !R.mask) return null;
      // the revealing cell closest to half uncovered
      let best = null, bd = 9; for (const k of R.cells.keys()) { const p = R.progress(k, sc.t); if (Math.abs(p - 0.5) < bd) { bd = Math.abs(p - 0.5); best = k; } }
      let x0 = Infinity, y0 = Infinity; for (const k of R.cells.keys()) { x0 = Math.min(x0, k % S.W); y0 = Math.min(y0, (k / S.W) | 0); } x0 -= 1; y0 -= 1;
      const res = HB.mapReveal.REVEAL.res, cx = (best % S.W - x0) * res, cy = (((best / S.W) | 0) - y0) * res;
      const d = R.mctx.getImageData(cx, cy, res, res).data, a = []; for (let i = 3; i < d.length; i += 4) a.push(d[i]);
      const mean = a.reduce((s, v) => s + v, 0) / a.length, sd = Math.sqrt(a.reduce((s, v) => s + (v - mean) * (v - mean), 0) / a.length);
      const tint = R.tctx.getImageData(cx, cy, res, res).data; let tsum = 0; for (let i = 3; i < tint.length; i += 4) tsum += tint[i];
      return { progress: +R.progress(best, sc.t).toFixed(2), mean: Math.round(mean), sd: Math.round(sd), uncovered: a.filter(v => v < 40).length, covered: a.filter(v => v > 215).length, px: a.length, tint: Math.round(tsum / a.length) };
    },
    /** the reveal layer drawn with the camera moved two cells: it must move exactly with the land */
    anchorCheck() {
      const cam0 = Object.assign({}, sc.cam), grab = (cam) => { Object.assign(sc.cam, cam); const g = canvas2d(); g.fillStyle = '#808080'; g.fillRect(0, 0, HB.W, HB.H); RW().draw(g, sc.t, (x, y) => sc.worldToScreen(x, y), (i) => sc.revealed[i] && !RW().revealing(i), (c, x, y, w, h) => { c.fillStyle = '#f0e0c0'; c.fillRect(x, y, w, h); }); Object.assign(sc.cam, cam0); return g.getImageData(0, 0, HB.W, HB.H).data; };
      const shift = Math.round(2 * 22 * cam0.zoom), A = grab(cam0), B = grab(Object.assign({}, cam0, { x: cam0.x + 2 }));
      let diff = 0, n = 0;
      for (let y = 0; y < HB.H; y++) for (let x = shift; x < HB.W; x++) { const a = (y * HB.W + x) * 4, b = (y * HB.W + x - shift) * 4; if (A[a] !== 128 || B[b] !== 128) { n++; diff += (Math.abs(A[a] - B[b]) + Math.abs(A[a + 1] - B[b + 1]) + Math.abs(A[a + 2] - B[b + 2])) / 3; } }
      return { panPx: shift, pixels: n, meanDiff: n ? +(diff / n).toFixed(3) : null, cells: RW().cells.size };
    },
    coverage(x, y, r) {
      const W = sc.wash, R = W.rect; if (!W.canvas) return 0;
      const d = W.ctx.getImageData(0, 0, W.canvas.width, W.canvas.height).data; let on = 0, all = 0;
      for (let py = 0; py < W.canvas.height; py++) for (let px = 0; px < W.canvas.width; px++) { const wx = R.x0 + (px + 0.5) / R.res, wy = R.y0 + (py + 0.5) / R.res; if (Math.hypot(wx - x, wy - y) > r) continue; all++; if (d[(py * W.canvas.width + px) * 4 + 3] > 10) on++; }
      return all ? +(on / all).toFixed(3) : 0;
    },
    colour() {
      const W = sc.wash, d = W.ctx.getImageData(0, 0, W.canvas.width, W.canvas.height).data; let r = 0, g = 0, b = 0, a = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 20) { r += d[i] * d[i + 3]; g += d[i + 1] * d[i + 3]; b += d[i + 2] * d[i + 3]; a += d[i + 3]; }
      return a ? [Math.round(r / a), Math.round(g / a), Math.round(b / a)] : null;
    },
    lair: () => sc.sources.find(s => s.lair),
    perf() {
      return { frameMedianMs: q(L.drawMs, 0.5), revealFrameMedianMs: q(L.busyMs, 0.5), revealFrameP90Ms: q(L.busyMs, 0.9), revealFrameMaxMs: q(L.busyMs, 1), revealFrames: L.busyMs.length,
        revealLayerMedianMs: q(T.reveal, 0.5), revealLayerMaxMs: q(T.reveal, 1), maxRevealingCells: L.maxCells,
        washUpdateMedianMs: q(T.washUpdate, 0.5), washSliceMaxMs: q(T.washSlice, 1), washComposeMedianMs: q(T.washCompose, 0.5) };
    },
  };
  I.storage0 = I.storage();
})();
