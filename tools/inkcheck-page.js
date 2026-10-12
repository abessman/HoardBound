/* Page-side helpers for `node tools/mapart-export.mjs --only=ink`, loaded into index.html?scene=inkpreview.
 * Freezes the preview's clock so the exporter steps it frame by frame (60 steps a second, each one also drawn),
 * checks the knowledge rules on every frame, and measures what the ink and the wash cost. View-only, like the scene. */
(function () {
  const sc = HB.scenes.top(), up = sc.update.bind(sc), S = sc.sheet;
  sc.update = () => {};
  const canvas2d = () => { const c = document.createElement('canvas'); c.width = HB.W; c.height = HB.H; return c.getContext('2d'); };
  const octx = canvas2d();
  // the browser queues canvas commands and rasterises them when the canvas is shown; this one never is, so read a
  // pixel each frame to make the timing include the rasterising (otherwise it lands, batched, on a random later call)
  const flush = () => octx.getImageData(0, 0, 1, 1);
  const q = (a, p) => { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); return +b[Math.min(b.length - 1, Math.floor(b.length * p))].toFixed(2); };
  // time the expensive parts where they happen
  const T = { prepare: [], compose: [], washUpdate: [], washSlice: [], washCompose: [], jobs: [] };
  const timed = (obj, name, into) => { const f = obj[name]; obj[name] = function () { const t0 = performance.now(); const r = f.apply(this, arguments); into.push(performance.now() - t0); return r; }; };
  timed(HB.mapInk, 'prepare', T.prepare); timed(HB.mapInk, 'compose', T.compose);
  timed(HB.mapWash.Layer.prototype, 'update', T.washUpdate); timed(HB.mapWash.Layer.prototype, 'step', T.washSlice); timed(HB.mapWash.Layer.prototype, 'compose', T.washCompose);
  { const P = HB.mapWash.Layer.prototype, st = P.step; P.step = function () { const had = this.job; const r = st.apply(this, arguments); if (had && !this.job && this.lastJob) T.jobs.push(this.lastJob); return r; }; }
  const L = { violations: [], drawMs: [], busyMs: [], fade: [], pools: new Set(), maxPools: 0, firstPoolT: null };
  const fadeStart = new Map();
  const I = window.INKCHECK = {
    sc, T, L,
    storage: () => JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])),
    mountain: () => sc.features[0], village: () => sc.features.find(f => f.place), trees: () => sc.features.filter(f => !f.place && f !== sc.features[0]),
    snapshot() { return { t: +sc.t.toFixed(3), states: { mountain: I.mountain().state, trees: I.trees().map(f => f.state), village: I.village().state }, pools: HB.mapInk.pools.length, washActive: sc.wash.active(sc.t) }; },
    fly() { sc.dragon.tx = I.village().x + 6.5; },
    flyBack() { sc.dragon.tx = sc.features[0].x - 5; },
    /** step the scene n seconds; every frame is drawn and checked */
    run(sec, until) {
      for (let i = 0, n = Math.round(sec * 60); i < n; i++) {
        const before = sc.features.map(f => f.state);
        up(1 / 60);
        const t0 = performance.now(); sc.draw(octx); flush(); const ms = performance.now() - t0;
        L.drawMs.push(ms); if (sc.stats.busy || sc.stats.pools || sc.stats.washActive) L.busyMs.push(ms);
        for (const P of HB.mapInk.pools) { L.pools.add(P); if (L.firstPoolT === null) L.firstPoolT = sc.t; }
        L.maxPools = Math.max(L.maxPools, HB.mapInk.pools.length);
        sc.features.forEach((f, k) => {
          const rev = !!sc.revealed[f.cy * S.W + f.cx], st = f.state, was = before[k];
          if (f.place && st === 'sketch') L.violations.push(`${sc.t.toFixed(2)}: the village was sketched before discovery`);
          if ((st === 'revealing' || st === 'fading' || st === 'drawn') && !rev) L.violations.push(`${sc.t.toFixed(2)}: ${f.key} drawn before its cell was revealed`);
          if (st === 'sketch' && (rev || !sc.nearRevealed(f.cx, f.cy))) L.violations.push(`${sc.t.toFixed(2)}: ${f.key} sketched outside the band`);
          if (was === 'drawn' && st !== 'drawn') L.violations.push(`${sc.t.toFixed(2)}: ${f.key} was drawn and became ${st}`);
          if (st === 'fading' && was !== 'fading') fadeStart.set(f, sc.t);
          if (st === 'drawn' && was === 'fading') L.fade.push(+(sc.t - fadeStart.get(f)).toFixed(3));
        });
        if (until && until()) break;
      }
      return I.snapshot();
    },
    runUntil(test, maxSec) { return I.run(maxSec, test); },
    untilPool() { const n = L.pools.size; return I.runUntil(() => L.pools.size > n, 8); },
    /** effects drawn with the camera moved: world-anchored layers must move exactly with the land */
    anchorCheck() {
      const cam0 = Object.assign({}, sc.cam);
      const grab = (cam, parts) => {
        Object.assign(sc.cam, cam); const g = canvas2d(), w2s = (x, y) => sc.worldToScreen(x, y);
        const so = (f) => { const p = sc.worldToScreen(f.x, f.y); return { x: p.x, y: p.y, s: HB.mapInk.scaleOf(f, sc.cam.zoom) }; };
        if (parts.includes('wash')) sc.wash.draw(g, w2s, sc.t);
        if (parts.includes('ink')) { for (const f of sc.features.slice().sort((a, b) => a.y - b.y)) { const p = so(f); HB.mapInk.drawFeature(g, f, p.x, p.y, p.s, sc.t); } HB.mapInk.drawPools(g, sc.t, w2s, sc.cam.zoom, so); }
        const d = g.getImageData(0, 0, HB.W, HB.H).data, z = 22 * sc.cam.zoom; let sx = 0, sy = 0, sa = 0;
        for (let y = 0; y < HB.H; y += 2) for (let x = 0; x < HB.W; x += 2) { const a = d[(y * HB.W + x) * 4 + 3]; if (a) { sx += x * a; sy += y * a; sa += a; } }
        const world = sa ? { x: sc.cam.x + (sx / sa - HB.W / 2) / z, y: sc.cam.y + (sy / sa - HB.H / 2) / z } : null;
        Object.assign(sc.cam, cam0);
        return { d, world, alpha: sa };
      };
      const z = 22 * cam0.zoom, shift = Math.round(2 * z), out = { zoom: cam0.zoom, panPx: shift, pools: HB.mapInk.pools.length, animating: sc.features.filter(f => f.state === 'revealing').length };
      const A = grab(cam0, ['wash', 'ink']), B = grab(Object.assign({}, cam0, { x: cam0.x + 2 }), ['wash', 'ink']);
      let diff = 0, n = 0;
      for (let y = 0; y < HB.H; y++) for (let x = shift; x < HB.W; x++) { const a = (y * HB.W + x) * 4, b = (y * HB.W + x - shift) * 4; if (A.d[a + 3] || B.d[b + 3]) { n++; diff += (Math.abs(A.d[a] - B.d[b]) + Math.abs(A.d[a + 1] - B.d[b + 1]) + Math.abs(A.d[a + 2] - B.d[b + 2]) + Math.abs(A.d[a + 3] - B.d[b + 3])) / 4; } }
      out.panMeanDiff = n ? +(diff / n).toFixed(3) : null; out.panPixels = n;
      for (const part of ['wash', 'ink']) {
        const a = grab(cam0, [part]).world, b = grab(Object.assign({}, cam0, { zoom: 1.5 }), [part]).world;
        out[part + 'CentroidShiftCells'] = a && b ? +Math.hypot(a.x - b.x, a.y - b.y).toFixed(3) : null;
      }
      return out;
    },
    /** share of the wash's pixels within r cells of (x, y) that are painted */
    coverage(x, y, r) {
      const W = sc.wash, R = W.rect; if (!W.canvas) return 0;
      const d = W.ctx.getImageData(0, 0, W.canvas.width, W.canvas.height).data; let on = 0, all = 0;
      for (let py = 0; py < W.canvas.height; py++) for (let px = 0; px < W.canvas.width; px++) {
        const wx = R.x0 + (px + 0.5) / R.res, wy = R.y0 + (py + 0.5) / R.res; if (Math.hypot(wx - x, wy - y) > r) continue;
        all++; if (d[(py * W.canvas.width + px) * 4 + 3] > 10) on++;
      }
      return all ? +(on / all).toFixed(3) : 0;
    },
    /** the wash's average colour (alpha-weighted over painted pixels) */
    colour() {
      const W = sc.wash, d = W.ctx.getImageData(0, 0, W.canvas.width, W.canvas.height).data; let r = 0, g = 0, b = 0, a = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 20) { r += d[i] * d[i + 3]; g += d[i + 1] * d[i + 3]; b += d[i + 2] * d[i + 3]; a += d[i + 3]; }
      return a ? [Math.round(r / a), Math.round(g / a), Math.round(b / a)] : null;
    },
    lair: () => sc.sources.find(s => s.lair),
    /** the iPad budget: 40 features discovered in one step; at most 24 animate, and what a frame of them costs */
    capCheck() {
      const saved = HB.mapInk.pools; HB.mapInk.pools = [];
      const base = I.trees()[0], list = [];
      for (let k = 0; k < 40; k++) list.push(Object.assign({}, base, { key: 'cap' + k, state: 'sketch', buf: null, x: base.x + (k % 8) * 0.6, y: base.y + Math.floor(k / 8) * 0.6 }));
      const p0 = T.prepare.length, t0 = performance.now();
      HB.mapInk.reveal(list, { x: base.x, y: base.y + 3, r: 0.5, allActive: list }, sc.t);
      const prepMs = performance.now() - t0, revealing = list.filter(f => f.state === 'revealing').length, fading = list.filter(f => f.state === 'fading').length;
      const frames = [];
      for (let t = sc.t; t < sc.t + 2.6; t += 1 / 60) {
        const a = performance.now(); octx.clearRect(0, 0, HB.W, HB.H);
        for (const f of list) { const p = sc.worldToScreen(f.x, f.y); HB.mapInk.drawFeature(octx, f, p.x, p.y, HB.mapInk.scaleOf(f, sc.cam.zoom), t); }
        HB.mapInk.drawPools(octx, t, (x, y) => sc.worldToScreen(x, y), sc.cam.zoom, (f) => { const p = sc.worldToScreen(f.x, f.y); return { x: p.x, y: p.y, s: HB.mapInk.scaleOf(f, sc.cam.zoom) }; });
        flush(); frames.push(performance.now() - a);
      }
      const bytes = list.reduce((s, f) => s + (f.buf ? f.buf.w * f.buf.h * (4 * 3 + 4 + 2 + 2) : 0), 0);
      HB.mapInk.pools = saved;
      return { discovered: 40, revealing, fading, drawnAfter: list.filter(f => f.state === 'drawn').length, prepareMsTotal: +prepMs.toFixed(1), prepareMsEach: +(prepMs / (T.prepare.length - p0)).toFixed(2), firstFrameMs: +frames[0].toFixed(2), frameMedianMs: q(frames, 0.5), frameP90Ms: q(frames, 0.9), frameMaxMs: q(frames, 1), slowFrames: frames.map((ms, i) => [i, +ms.toFixed(1)]).filter(x => x[1] > 8), bufferKB: Math.round(bytes / 1024), maxBufferPx: Math.max(...list.map(f => Math.max(f.buf.w, f.buf.h))) };
    },
    perf() {
      return { frameDrawMedianMs: q(L.drawMs, 0.5), busyFrameMedianMs: q(L.busyMs, 0.5), busyFrameP90Ms: q(L.busyMs, 0.9), busyFrameMaxMs: q(L.busyMs, 1), busyFrames: L.busyMs.length,
        prepareMedianMs: q(T.prepare, 0.5), prepareMaxMs: q(T.prepare, 1), prepares: T.prepare.length, inkComposeMedianMs: q(T.compose, 0.5), inkComposeMaxMs: q(T.compose, 1), inkComposes: T.compose.length,
        washUpdateMedianMs: q(T.washUpdate, 0.5), washUpdateMaxMs: q(T.washUpdate, 1), washSliceMedianMs: q(T.washSlice, 0.5), washSliceMaxMs: q(T.washSlice, 1),
        washRepaints: T.jobs.length, washRepaintTotalMsMedian: q(T.jobs.map(j => j.ms), 0.5), washRepaintFramesMax: Math.max(0, ...T.jobs.map(j => j.frames)), washComposeMedianMs: q(T.washCompose, 0.5), washComposeMaxMs: q(T.washCompose, 1), washComposes: T.washCompose.length,
        washCanvasPx: sc.wash.canvas ? `${sc.wash.canvas.width}×${sc.wash.canvas.height}` : null };
    },
  };
  I.storage0 = I.storage();
})();
