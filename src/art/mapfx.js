/* Map effects: watercolour on the parchment. HB.mapWash (0.12) paints your territory; HB.mapReveal (0.13) uncovers
 * newly revealed land with a thin wash that bleeds outward. Both are view-only (they read knowledge and territory, never
 * write state), world-anchored (callers pass world positions and the camera), independent of the map's symbol art, and
 * bounded for the iPad (LIMITS). Asset contract: docs/map-art/WASH.md. Preview: docs/map-art/WASH_PREVIEW.md. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  const LIMITS = { washHz: 20, blooms: 6, washSliceMs: 6 };
  // seconds: a territory wash fading in under reduced motion
  const TIME = { washFade: 0.3 };
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  const fx = HB.mapFx = {
    LIMITS, TIME,
    /** null: follow Settings → Reduce motion; true/false: an override (the preview's toggle, ?reducedmotion=1) */
    reducedOverride: null,
    reduced() { return fx.reducedOverride !== null ? fx.reducedOverride : !!(HB.settings && HB.settings.reduceMotion); },
    stats: { ms: 0 },
  };

  // =====================================================================================================
  // Watercolour influence
  // A layer paints territory sources ({ x, y, r, side, ph, key } in cells: the lair and the places that serve you)
  // over the land a mask allows, as translucent blooms: kind green/gold, cruel rust/charcoal, neutral sepia. When the
  // sources change, new or grown ones spread as blooms (in their bloom order) from their source.
  // =====================================================================================================
  const DEFAULT_COLOURS = { benevolent: [[110, 140, 58], [196, 160, 58]], tyrannical: [[176, 48, 16], [44, 36, 32]], neutral: [[128, 104, 70], [96, 74, 48]] };
  /** each path's [primary, secondary] colour: the pack's style.wash, else the defaults (0.10 packs' single colours count) */
  const colours = () => {
    const MA = HB.mapAssets, st = MA && MA.style && MA.style.wash, C = JSON.parse(JSON.stringify(DEFAULT_COLOURS));
    if (st) for (const k of ['benevolent', 'tyrannical', 'neutral']) if (Array.isArray(st[k]) && Array.isArray(st[k][0]) && Array.isArray(st[k][1])) C[k] = st[k];
    const old = MA && MA.packStyle && MA.packStyle.wash;
    if (old) { if (old.kind && !old.benevolent) C.benevolent[0] = old.kind; if (old.cruel && !old.tyrannical) C.tyrannical[0] = old.cruel; if (old.reach && !old.neutral) C.neutral[0] = old.reach; }
    return C;
  };

  class WashLayer {
    constructor(o = {}) { this.res = o.res || 6; this.sources = null; this.canvas = null; this.spread = []; this.job = null; this.lastJob = null; this.lastCompose = -1; this.fadeT0 = -1; this.prev = null; this.seed = o.seed || 'wash'; }
    /** new sources (or a new mask): rebuild the painting; changed sources bloom outward from now */
    update(sources, o) {
      const now = o.now, W = o.w, H = o.h, maskFn = o.mask, nz = this.noise || (this.noise = new HB.Noise2D(new HB.RNG('wash:' + this.seed)));
      const prev = this.sources ? new Map(this.sources.map(s => [s.key, s])) : null;
      const next = sources.map(s => Object.assign({}, s, { key: s.key || `${s.x},${s.y}` })), nextMap = new Map(next.map(s => [s.key, s]));
      // land lost or recoloured: the old painting fades out under the new one (a pure gain needs no cross-fade)
      const lost = prev && [...prev.values()].some(o => { const s = nextMap.get(o.key); return !s || s.r < o.r - 0.25 || Math.sign(Math.round(s.side * 4)) !== Math.sign(Math.round(o.side * 4)); });
      this.sources = next;
      const reduced = fx.reduced();
      // which sources spread, from where (r0), starting when
      const spread = []; let stagger = 0;
      for (const s of this.sources) {
        const old = prev ? prev.get(s.key) : null;
        let r0 = null;
        if (o.bloomIn || !prev || !old) r0 = 0;
        else if (s.r > old.r + 0.25) r0 = old.r;
        else if (Math.sign(Math.round(s.side * 4)) !== Math.sign(Math.round(old.side * 4))) r0 = 0;
        if (r0 === null || reduced || spread.length >= LIMITS.blooms) continue;
        s.r0 = r0; s.start = stagger; s.dur = s.lair ? 1.9 : 1.4; stagger += 0.22; // seconds after the painting is ready
        const B = HB.mapAssets && HB.mapAssets.bloomData ? HB.mapAssets.bloomData(s.key) : null; s.bloom = B;
        spread.push(s);
      }
      if (!this.sources.length) { if (this.canvas && lost) this.snapshot(now); this.canvas = null; this.job = null; this.spread = []; return; }
      // bounds over the sources (cells), clipped to the world
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const s of this.sources) { const R = s.r * 1.3 + 1; x0 = Math.min(x0, s.x - R); y0 = Math.min(y0, s.y - R); x1 = Math.max(x1, s.x + R); y1 = Math.max(y1, s.y + R); }
      x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
      const RES = this.res, cw = Math.max(1, (x1 - x0) * RES), ch = Math.max(1, (y1 - y0) * RES);
      const C = colours(), T = { benevolent: HB.mapAssets && HB.mapAssets.washData ? HB.mapAssets.washData('benevolent') : null, tyrannical: HB.mapAssets && HB.mapAssets.washData ? HB.mapAssets.washData('tyrannical') : null, neutral: HB.mapAssets && HB.mapAssets.washData ? HB.mapAssets.washData('neutral') : null };
      const tex = (t, arr, fxw, fyw) => { const n = t.n, u = ((fxw / t.cellsPerTile) % 1 + 1) % 1, v = ((fyw / t.cellsPerTile) % 1 + 1) % 1; return arr[((v * n) | 0) * n + ((u * n) | 0)] / 255; };
      // land the territory may cover, sampled smoothly
      const mw = x1 - x0 + 3, mask = new Float32Array(mw * (y1 - y0 + 3));
      for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) if (x >= 0 && y >= 0 && x < W && y < H && maskFn(x, y)) mask[(y - y0 + 1) * mw + (x - x0 + 1)] = 1;
      const target = new Uint8ClampedArray(cw * ch * 4), arrival = new Float32Array(cw * ch).fill(-1);
      // painted a few rows per frame (draw() continues it within LIMITS.washSliceMs); the old painting shows until done
      const row = (py) => {
        const fy = y0 + (py + 0.5) / RES, gy = fy - 0.5 - y0 + 1, iy = Math.floor(gy), ty = gy - iy;
        for (let px = 0; px < cw; px++) {
          const fxw = x0 + (px + 0.5) / RES, gx = fxw - 0.5 - x0 + 1, ix = Math.floor(gx), tx = gx - ix;
          const m = ((mask[iy * mw + ix] || 0) * (1 - tx) + (mask[iy * mw + ix + 1] || 0) * tx) * (1 - ty) + ((mask[(iy + 1) * mw + ix] || 0) * (1 - tx) + (mask[(iy + 1) * mw + ix + 1] || 0) * tx) * ty;
          if (m <= 0.02) continue;
          let v = 0, sw = 0, ss = 0, staticV = 0, arr = Infinity;
          for (const s of this.sources) {
            const dx = fxw - s.x, dy = fy - s.y, R = s.r * 1.3; if (dx > R || dx < -R || dy > R || dy < -R) continue;
            const d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx), ph = s.ph || [0, 0, 0];
            const rr = Math.max(0.5, s.r * (1 + 0.14 * Math.sin(3 * ang + ph[0]) + 0.08 * Math.sin(5 * ang + ph[1]) + 0.05 * Math.sin(9 * ang + ph[2])));
            const t = 1 - d / rr; if (t <= 0) continue;
            if (t > v) v = t; sw += t; ss += s.side * t;
            if (s.start === undefined || !spread.includes(s)) { staticV = Math.max(staticV, t); continue; }
            // when this source's bloom reaches the pixel: its bloom mask's order, else distance with fingering noise
            let ord;
            const B = s.bloom;
            if (B) { const span = B.span * s.r, u = (B.flip ? -dx : dx) / span + 0.5, w = dy / span + 0.5; if (u >= 0 && u < 1 && w >= 0 && w < 1) { const k = ((w * B.n) | 0) * B.n + ((u * B.n) | 0); if (B.alpha[k] > 0) ord = B.ord[k] / 255; } }
            if (ord === undefined) ord = HB.clamp(d / rr * 0.85 + nz.at(fxw * 0.6 + 7.7, fy * 0.6 + 3.1) * 0.22, 0, 1);
            if (s.r0 > 0) { const inner = s.r0 / s.r; if (d / rr < inner) { staticV = Math.max(staticV, t); continue; } ord = HB.clamp((d / rr - inner) / Math.max(0.05, 1 - inner) + nz.at(fxw * 0.6, fy * 0.6) * 0.15, 0, 1); }
            arr = Math.min(arr, s.start + ord * s.dur);
          }
          const f = v * Math.min(1, m * 1.6); if (f <= 0) continue;
          const n1 = nz.at(fxw * 0.32, fy * 0.32), n2 = nz.at(fxw * 1.5 + 40.3, fy * 1.5 + 17.7);
          const e = f + n1 * 0.13 + n2 * 0.06 - 0.04; if (e <= 0) continue;
          const side = sw > 0 ? ss / sw : 0, path = side > 0.15 ? 'benevolent' : side < -0.15 ? 'tyrannical' : 'neutral', pal = C[path], Tx = T[path];
          const k = Math.min(1, Math.abs(side) / 0.6), N = C.neutral[0];
          const grain = nz.at(fxw * 7.1 + 91.1, fy * 7.1 + 3.3), bloomN = nz.at(fxw * 0.7 + 12.9, fy * 0.7 + 55.1);
          const cov = Tx ? tex(Tx, Tx.cov, fxw, fy) : 0.6 + 0.4 * (n1 * 0.5 + 0.5), pool = Tx && Tx.pool ? tex(Tx, Tx.pool, fxw, fy) : Math.max(0, bloomN) * 0.5;
          // without a hue mask: slow noise, pushed apart so the second colour gathers in distinct blooms
          const hn = nz.at(fxw * 0.2 + 31, fy * 0.2 + 9) + 0.35 * nz.at(fxw * 0.55 + 3, fy * 0.55 + 71);
          const hue = Tx && Tx.hue ? tex(Tx, Tx.hue, fxw, fy) : smooth(-0.05, 0.45, hn) * 0.85;
          const rim = Math.pow(Math.max(0, 1 - e / 0.16), 1.6);
          // pigment: the path's two colours mixed by the hue mask (gold blooms in a kind wash, charcoal edges in a cruel one)
          // cruel: rust, with charcoal gathering at the drying edges and in the pools; kind: green with gold blooms
          const mixC = path === 'tyrannical' ? Math.min(1, hue * 0.22 + rim * 0.7 + pool * 0.12) : hue, dark = 1 - rim * 0.3 - pool * 0.15;
          const base = [pal[0][0] + (pal[1][0] - pal[0][0]) * mixC, pal[0][1] + (pal[1][1] - pal[0][1]) * mixC, pal[0][2] + (pal[1][2] - pal[0][2]) * mixC];
          const o = (py * cw + px) * 4;
          target[o] = (N[0] + (base[0] - N[0]) * k) * dark; target[o + 1] = (N[1] + (base[1] - N[1]) * k) * dark; target[o + 2] = (N[2] + (base[2] - N[2]) * k) * dark;
          let a = ((0.11 + 0.15 * Math.min(1, f * 1.5)) * (0.55 + 0.6 * cov) * (0.86 + 0.28 * (grain * 0.5 + 0.5)) + rim * 0.22 + pool * 0.08) * (path === 'tyrannical' ? 1.3 : 1);
          target[o + 3] = Math.round(HB.clamp(a * Math.min(1, e / 0.04), 0, 0.45) * 255);
          arrival[py * cw + px] = staticV > 0 || arr === Infinity ? -1 : arr;
        }
      };
      this.job = { row, py: 0, ch, cw, target, arrival, spread, lost: !!lost, reduced, rect: { x0, y0, x1, y1, res: RES }, ms: 0, frames: 0 };
    }
    /** paint more rows of the pending picture, for at most budget ms; swap it in when complete */
    step(now, budget) {
      const J = this.job, t0 = performance.now();
      while (J.py < J.ch) { J.row(J.py++); if (performance.now() - t0 > budget) break; }
      J.ms += performance.now() - t0; J.frames++;
      if (J.py < J.ch) return;
      this.job = null;
      if (J.lost && this.canvas) this.snapshot(now);
      for (const s of J.spread) s.start += now;
      for (let i = 0; i < J.arrival.length; i++) if (J.arrival[i] >= 0) J.arrival[i] += now;
      if (!this.canvas || this.canvas.width !== J.cw || this.canvas.height !== J.ch) { const c = document.createElement('canvas'); c.width = J.cw; c.height = J.ch; this.canvas = c; }
      this.ctx = this.canvas.getContext('2d'); this.img = this.ctx.createImageData(J.cw, J.ch); this.target = J.target; this.arrival = J.arrival;
      this.rect = J.rect; this.lastCompose = -1; this.spread = J.spread;
      this.endT = J.spread.length ? Math.max(...J.spread.map(s => s.start + s.dur)) + 0.6 : -1;
      if (J.reduced) this.fadeT0 = now;
      this.lastJob = { ms: +J.ms.toFixed(1), frames: J.frames, px: J.cw * J.ch };
      this.compose(now, true);
    }
    /** keep the painting on screen as it is, to fade out under the new one (land lost or recoloured) */
    snapshot(now) { const c = document.createElement('canvas'); c.width = this.canvas.width; c.height = this.canvas.height; c.getContext('2d').drawImage(this.canvas, 0, 0); this.prev = { canvas: c, rect: this.rect, t0: now }; }
    /** write the visible part of the painting: everything already there, and blooms as far as they have spread */
    compose(now, full) {
      const D = this.img.data, Tg = this.target, Ar = this.arrival, n = Ar.length;
      for (let i = 0; i < n; i++) {
        const j = i * 4, ar = Ar[i];
        if (ar < 0) { if (full) { D[j] = Tg[j]; D[j + 1] = Tg[j + 1]; D[j + 2] = Tg[j + 2]; D[j + 3] = Tg[j + 3]; } continue; }
        const vis = smooth(ar, ar + 0.3, now), wet = now >= ar ? Math.max(0, 1 - (now - ar) / 0.6) : 0;
        D[j] = Tg[j] * (1 - wet * 0.2); D[j + 1] = Tg[j + 1] * (1 - wet * 0.2); D[j + 2] = Tg[j + 2] * (1 - wet * 0.2);
        D[j + 3] = Math.min(255, Tg[j + 3] * vis + 30 * wet * vis);
      }
      this.ctx.putImageData(this.img, 0, 0); this.lastCompose = now;
    }
    /** true while blooming or fading */
    active(now) { return !!this.job || now < this.endT || (this.prev && now - this.prev.t0 < 0.6) || (this.fadeT0 >= 0 && now - this.fadeT0 < TIME.washFade); }
    draw(ctx, worldToScreen, now) {
      if (this.prev) {
        const t = (now - this.prev.t0) / 0.6;
        if (t >= 1) this.prev = null;
        else { const R = this.prev.rect, a = worldToScreen(R.x0, R.y0), b = worldToScreen(R.x1, R.y1); ctx.save(); ctx.globalAlpha = (1 - t) * 0.9; ctx.imageSmoothingEnabled = true; ctx.drawImage(this.prev.canvas, a.x, a.y, b.x - a.x, b.y - a.y); ctx.restore(); }
      }
      if (this.job) this.step(now, LIMITS.washSliceMs);
      if (!this.canvas) return;
      if (now < this.endT && now - this.lastCompose >= 1 / LIMITS.washHz) { const t0 = performance.now(); this.compose(now, false); fx.stats.ms = performance.now() - t0; }
      const R = this.rect, a = worldToScreen(R.x0, R.y0), b = worldToScreen(R.x1, R.y1);
      ctx.save(); ctx.imageSmoothingEnabled = true;
      if (this.fadeT0 >= 0) ctx.globalAlpha = smooth(this.fadeT0, this.fadeT0 + TIME.washFade, now);
      ctx.drawImage(this.canvas, a.x, a.y, b.x - a.x, b.y - a.y); ctx.restore();
    }
  }
  HB.mapWash = { Layer: WashLayer, DEFAULT_COLOURS, colours };

  // =====================================================================================================
  // Reveal wash (0.13): newly revealed land is uncovered by a thin watercolour wash that bleeds outward from the
  // dragon: the blank paper over it dissolves along a soft, irregular, speckled edge, and a faint warm wash lingers
  // at the wet edge, then dries away. Works over any map art (it is a mask over the map, not part of the symbols).
  // Cells are world cells; the layer draws the paper still covering them and the wet tint; the caller skips its own
  // fog fill for cells the layer reports as revealing.
  // =====================================================================================================
  const REVEAL = { dur: 1.0, tail: 0.75, delayPerCell: 0.08, maxDelay: 0.7, res: 8, tint: [140, 98, 52], tintA: 0.26 };
  /** a seamless 128 px noise texture (16 cells at 8 px per cell): broad blobs, finer grain and a speckle, 0–1 */
  const revealNoise = (seed) => {
    const N = 128, out = new Float32Array(N * N), h = (x, y, s) => { let v = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1013904223); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967296; };
    const octave = (n, s) => (x, y) => { const gx = x / N * n, gy = y / N * n, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), v = (a, b) => h(((ix + a) % n + n) % n, ((iy + b) % n + n) % n, s);
      return (v(0, 0) * (1 - sx) + v(1, 0) * sx) * (1 - sy) + (v(0, 1) * (1 - sx) + v(1, 1) * sx) * sy; };
    const A = octave(10, seed), B = octave(32, seed + 1);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) out[y * N + x] = 0.55 * A(x, y) + 0.27 * B(x, y) + 0.18 * h(x, y, seed + 2);
    return out;
  };
  class RevealLayer {
    constructor(o = {}) { this.cells = new Map(); this.noise = revealNoise(HB.hash32('reveal:' + (o.seed || ''))); this.mask = null; this.tintC = null; this.cover = null; }
    /** cells just revealed (indices into a w-wide grid), spreading from (fx, fy) in cells */
    add(cells, w, now, fx, fy) {
      const reduced = fx === undefined || HB.mapFx.reduced();
      for (const i of cells) {
        if (this.cells.has(i)) continue;
        const x = i % w, y = (i / w) | 0, d = fx === undefined ? 0 : Math.hypot(x + 0.5 - fx, y + 0.5 - fy);
        this.cells.set(i, { t0: now + (reduced ? 0 : Math.min(REVEAL.maxDelay, d * REVEAL.delayPerCell)), reduced });
      }
      this.w = w;
    }
    /** how far a cell is uncovered: 0 (paper) … 1 (land shown); the tint lingers until (dur + tail) */
    progress(i, now) { const c = this.cells.get(i); if (!c) return 1; return HB.clamp((now - c.t0) / (c.reduced ? 0.3 : REVEAL.dur), 0, 1); }
    revealing(i) { return this.cells.has(i); }
    active() { return this.cells.size > 0; }
    /** draw the paper still covering revealing cells and their wet tint. known(i): 1 if a cell not in the layer is
     *  revealed land, 0 if it is still under the fog. paper(ctx, x, y, w, h) fills screen px with blank paper */
    /** forget cells whose wash has dried */
    prune(now) { for (const [i, c] of this.cells) if (now - c.t0 > (c.reduced ? 0.3 : REVEAL.dur + REVEAL.tail)) this.cells.delete(i); }
    draw(ctx, now, w2s, known, paper) {
      this.prune(now);
      if (!this.cells.size) return;
      const w = this.w; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const i of this.cells.keys()) { const x = i % w, y = (i / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      x0 -= 1; y0 -= 1; x1 += 1; y1 += 1;
      const R = REVEAL.res, gw = (x1 - x0 + 1) * R, gh = (y1 - y0 + 1) * R, N = 128, NZ = this.noise;
      // how far each cell is uncovered, then smoothly between cell centres
      const cw = x1 - x0 + 1, ch = y1 - y0 + 1, P = new Float32Array(cw * ch), Tn = new Float32Array(cw * ch);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const k = (y - y0) * cw + (x - x0), i = y * w + x, c = x >= 0 && y >= 0 && x < w ? this.cells.get(i) : null;
        // revealing: its progress (past 1 while the tint dries); revealed earlier: 2; still under the fog: NaN (the fog
        // pass draws those, and a revealing cell must not inherit their paper, or it would pop off at the end)
        if (c) { const u = (now - c.t0) / (c.reduced ? 0.3 : REVEAL.dur); P[k] = c.reduced ? HB.clamp(u, 0, 1) * 1.5 : u; Tn[k] = c.reduced ? 0 : 1; }
        else { P[k] = x >= 0 && y >= 0 && x < w && known(i) ? 2 : NaN; Tn[k] = 0; }
      }
      const at = (A, fx, fy, own) => { const gx = HB.clamp(fx - 0.5, 0, cw - 1), gy = HB.clamp(fy - 0.5, 0, ch - 1), ix = Math.min(cw - 2, Math.floor(gx)), iy = Math.min(ch - 2, Math.floor(gy)), tx = gx - ix, ty = gy - iy, s = (a, b) => { const v = A[(iy + b) * cw + ix + a]; return v === v ? v : own; };
        return (s(0, 0) * (1 - tx) + s(1, 0) * tx) * (1 - ty) + (s(0, 1) * (1 - tx) + s(1, 1) * tx) * ty; };
      if (!this.mask || this.mask.width < gw || this.mask.height < gh) {
        const mk = () => { const c = document.createElement('canvas'); c.width = Math.max(gw, 32); c.height = Math.max(gh, 32); return c; };
        this.mask = mk(); this.tintC = mk(); this.mctx = this.mask.getContext('2d'); this.tctx = this.tintC.getContext('2d');
      }
      const mi = this.mctx.createImageData(gw, gh), ti = this.tctx.createImageData(gw, gh), M = mi.data, Ti = ti.data, [tr, tg, tb] = REVEAL.tint;
      for (let py = 0; py < gh; py++) for (let px = 0; px < gw; px++) {
        const fx = (px + 0.5) / R, fy = (py + 0.5) / R, ko = Math.floor(fy) * cw + Math.floor(fx), own = P[ko];
        if (own !== own) continue; // under the fog: left to the fog pass
        const p = own === 2 ? 2 : at(P, fx, fy, own), wx = x0 * R + px, wy = y0 * R + py;
        const n = NZ[((wy % N + N) % N) * N + ((wx % N + N) % N)], tn = at(Tn, fx, fy, 0);
        // the paper dissolves where the wash has reached: pixels go in the order of the noise, so the edge is irregular
        const th = 0.12 + 0.72 * n, cover = 1 - HB.clamp((p - th) / 0.08 + 0.5, 0, 1);
        const o = (py * gw + px) * 4;
        M[o] = M[o + 1] = M[o + 2] = 255; M[o + 3] = cover * 255;
        // the wet edge: a thin warm wash just behind the front, a little stronger right at it, drying away
        const dp = p - th;
        if (tn > 0.01 && dp > 0) { const a = REVEAL.tintA * tn * Math.max(0, 1 - dp / 0.75) * (0.75 + 0.25 * Math.max(0, 1 - dp / 0.1)); Ti[o] = tr; Ti[o + 1] = tg; Ti[o + 2] = tb; Ti[o + 3] = a * 255; }
      }
      this.mctx.clearRect(0, 0, this.mask.width, this.mask.height); this.mctx.putImageData(mi, 0, 0);
      this.tctx.clearRect(0, 0, this.tintC.width, this.tintC.height); this.tctx.putImageData(ti, 0, 0);
      const a = w2s(x0, y0), b = w2s(x1 + 1, y1 + 1), bw = b.x - a.x, bh = b.y - a.y;
      ctx.save(); ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.tintC, 0, 0, gw, gh, a.x, a.y, bw, bh);
      // the paper still covering: blank paper masked by the dissolve, only over the visible part of the screen
      const sx0 = Math.max(0, Math.floor(a.x)), sy0 = Math.max(0, Math.floor(a.y)), sx1 = Math.min(HB.W, Math.ceil(b.x)), sy1 = Math.min(HB.H, Math.ceil(b.y));
      if (sx1 > sx0 && sy1 > sy0) {
        const vw = sx1 - sx0, vh = sy1 - sy0;
        if (!this.cover || this.cover.width < vw || this.cover.height < vh) { this.cover = document.createElement('canvas'); this.cover.width = Math.max(vw, 64); this.cover.height = Math.max(vh, 64); this.cctx = this.cover.getContext('2d'); }
        const g = this.cctx; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, this.cover.width, this.cover.height);
        g.translate(-sx0, -sy0); paper(g, sx0, sy0, vw, vh);
        g.globalCompositeOperation = 'destination-in'; g.imageSmoothingEnabled = true; g.drawImage(this.mask, 0, 0, gw, gh, a.x, a.y, bw, bh); g.restore();
        ctx.drawImage(this.cover, 0, 0, vw, vh, sx0, sy0, vw, vh);
      }
      ctx.restore();
    }
  }
  HB.mapReveal = { Layer: RevealLayer, REVEAL };
})();
