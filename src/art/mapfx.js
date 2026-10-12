/* Map effects (0.12): ink discovery (HB.mapInk) and watercolour influence (HB.mapWash). Both are view-only (they read
 * knowledge and territory, never write state), world-anchored (callers pass world positions and the camera), art-pack
 * aware (masks from HB.mapAssets, procedural fallbacks) and bounded for the iPad (LIMITS).
 * Asset contract: docs/map-art/INK_AND_WASH.md. Isolated preview: docs/map-art/INK_PREVIEW.md (?scene=inkpreview). */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  const LIMITS = { features: 24, buffer: 160, pools: 4, washHz: 20, blooms: 6, sketchBand: 3, washSliceMs: 6 };
  const INK = [36, 22, 12], SKETCH = [76, 62, 46];
  // seconds: the pool grows, holds, drains; rivulets run to each feature; the ink runs through it; colour dries behind
  const TIME = { pool: 0.3, hold: 0.15, drain: 0.6, rivulet: 0.35, travel: 0.3, inkTerrain: 0.9, inkPlace: 1.1, dry: 0.35, fade: 0.25, washFade: 0.3 };
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const hashf = (x, y, s) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1013904223); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const newCtx = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c.getContext('2d', { willReadFrequently: true }); };

  const fx = HB.mapFx = {
    LIMITS, TIME,
    /** null: follow Settings → Reduce motion; true/false: an override (the preview's toggle, ?reducedmotion=1) */
    reducedOverride: null,
    reduced() { return fx.reducedOverride !== null ? fx.reducedOverride : !!(HB.settings && HB.settings.reduceMotion); },
    stats: { composed: 0, pixels: 0, ms: 0 },
  };

  // =====================================================================================================
  // Ink discovery
  // A feature is one map symbol in world cells: { key, place, ids (art-pack id chain), param, paramY, proc(ctx, x, y, s),
  // x, y (anchor in cells) }. proc draws the hand-drawn version at anchor (x, y) with its size parameter times s.
  // States: hidden → sketch (near what you know: first strokes only) → revealing (pool, rivulet, ink, dry) → drawn.
  // =====================================================================================================
  const ink = HB.mapInk = {
    pools: [],
    /** render a feature into its work buffer (2 px per logical px) and derive or read its ink and order masks */
    prepare(f) {
      const MA = HB.mapAssets, r = MA && MA.entries.size ? MA.resolve(f.ids, f.key) : null;
      let S = 2, out = null;
      for (let pass = 0; pass < 2; pass++) {
        const W = 420, H = 420, AX = 210, AY = 300, g = newCtx(W, H);
        g.setTransform(S, 0, 0, S, AX, AY); HB.mapart.setup(g);
        let d = null;
        if (r) d = MA.drawResolved(g, r, 0, 0, f.param, { key: f.key, paramY: f.paramY });
        else f.proc(g, 0, 0, 1);
        const full = g.getImageData(0, 0, W, H).data;
        let x0 = W, y0 = H, x1 = -1, y1 = -1;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (full[(y * W + x) * 4 + 3] > 6) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 < 0) { x0 = AX - 2; y0 = AY - 2; x1 = AX + 2; y1 = AY + 2; }
        x0 = Math.max(0, x0 - 3); y0 = Math.max(0, y0 - 3); x1 = Math.min(W - 1, x1 + 3); y1 = Math.min(H - 1, y1 + 3);
        const w = x1 - x0 + 1, h = y1 - y0 + 1;
        if (Math.max(w, h) > LIMITS.buffer && pass === 0) { S = S * LIMITS.buffer / Math.max(w, h); continue; }
        const art = new Uint8ClampedArray(w * h * 4);
        for (let y = 0; y < h; y++) art.set(full.subarray(((y + y0) * W + x0) * 4, ((y + y0) * W + x0 + w) * 4), y * w * 4);
        out = { w, h, ax: AX - x0, ay: AY - y0, S, art, r, d, crop: [x0, y0, W, H, AX, AY] };
        break;
      }
      // masks: the pack's (pixel-aligned with the art), else derived from the art's dark line work
      const n = out.w * out.h, inkA = new Float32Array(n), ordMask = new Int16Array(n).fill(-1);
      const masks = r ? MA.featureMasks(r.v) : { ink: null, order: null, entry: null };
      const maskPixels = (img) => {
        const [x0, y0, W, H, AX, AY] = out.crop, g = newCtx(W, H), v = r.v, d = out.d;
        g.setTransform(out.S, 0, 0, out.S, AX, AY); g.imageSmoothingEnabled = v.sampling !== 'pixel';
        if (d.flip) { g.scale(-1, 1); }
        g.drawImage(img, v.rect[0], v.rect[1], v.sw, v.sh, d.dx, d.dy, d.dw, d.dh);
        return g.getImageData(x0, y0, out.w, out.h).data;
      };
      if (masks.ink) {
        const m = maskPixels(masks.ink), opaque = MA.pixels(masks.ink, masks.ink.naturalWidth, masks.ink.naturalHeight).opaque;
        // alpha is ink; an opaque file is read by luminance instead (black = ink)
        for (let i = 0; i < n; i++) inkA[i] = opaque ? (m[i * 4 + 3] ? (255 - (m[i * 4] + m[i * 4 + 1] + m[i * 4 + 2]) / 3) / 255 : 0) : m[i * 4 + 3] / 255;
      } else {
        for (let i = 0; i < n; i++) { const a = out.art[i * 4 + 3] / 255; if (!a) continue; const lum = (out.art[i * 4] + out.art[i * 4 + 1] + out.art[i * 4 + 2]) / 3; inkA[i] = a * Math.min(1, Math.max(0.15, (200 - lum) / 120)); }
      }
      if (masks.order) { const m = maskPixels(masks.order); for (let i = 0; i < n; i++) if (m[i * 4 + 3] > 0) ordMask[i] = Math.round((m[i * 4] + m[i * 4 + 1] + m[i * 4 + 2]) / 3); }
      const entry = masks.entry && r ? (() => { const d = out.d, v = r.v, sx = d.dw / v.sw, sy = d.dh / v.sh; let ex = d.dx + masks.entry[0] * sx; if (d.flip) ex = -ex; return [ex * out.S + out.ax, (d.dy + masks.entry[1] * sy) * out.S + out.ay]; })() : null;
      const canvas = newCtx(out.w, out.h).canvas;
      f.buf = Object.assign(out, { ink: inkA, ordMask, entry, canvas, img: canvas.getContext('2d').createImageData(out.w, out.h), order: null, usedPackMasks: { ink: !!masks.ink, order: !!masks.order }, rev: MA ? MA.revision : 0 });
      ink.computeOrder(f, entry || [out.ax, out.ay]);
      ink.buildSketch(f);
      return f;
    },
    /** order of appearance (0–255): the pack's reveal mask where it has one, else ink flowing from the entry point
     *  through the line work (0–200), then fills by straight distance (200–255) */
    computeOrder(f, entryPt) {
      const b = f.buf, w = b.w, h = b.h, n = w * h, I = b.ink, A = b.art, dist = new Float32Array(n).fill(Infinity);
      // start from the ink pixel nearest the entry point
      let start = -1, best = Infinity;
      for (let i = 0; i < n; i++) if (I[i] > 0.12) { const dx = (i % w) - entryPt[0], dy = ((i / w) | 0) - entryPt[1], d = dx * dx + dy * dy; if (d < best) { best = d; start = i; } }
      let maxD = 1;
      if (start >= 0) {
        const q = new Int32Array(n); let qh = 0, qt = 0; q[qt++] = start; dist[start] = 0;
        // breadth-first through the ink (no allocation per pixel: this runs for every feature discovered)
        const visit = (j, d) => { if (j >= 0 && j < n && dist[j] === Infinity && I[j] > 0.12) { dist[j] = d; q[qt++] = j; } };
        while (qh < qt) { const i = q[qh++], x = i % w, d = dist[i] + 1; if (d > maxD) maxD = d; if (x > 0) visit(i - 1, d); if (x < w - 1) visit(i + 1, d); visit(i - w, d); visit(i + w, d); }
      }
      const sx = start >= 0 ? start % w : entryPt[0], sy = start >= 0 ? (start / w) | 0 : entryPt[1], maxE = Math.hypot(w, h);
      const order = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        if (b.ordMask[i] >= 0) { order[i] = b.ordMask[i]; continue; }
        if (dist[i] < Infinity) order[i] = Math.round(dist[i] / maxD * 200);
        else if (A[i * 4 + 3] > 0 || I[i] > 0) order[i] = Math.min(255, 200 + Math.round(55 * Math.hypot((i % w) - sx, ((i / w) | 0) - sy) / maxE));
        else order[i] = 255;
      }
      b.order = order; b.entryPx = [sx, sy];
    },
    /** the faint pre-discovery sketch, broken up by a fixed noise: with a pack reveal mask its first strokes
     *  (order ≤ 107); without one the strongest line work (ink ≥ 0.6), so the outline is recognisable */
    buildSketch(f) {
      const b = f.buf, g = newCtx(b.w, b.h), img = g.createImageData(b.w, b.h), D = img.data, seed = HB.hash32('sketch:' + f.key), packOrder = b.usedPackMasks.order;
      for (let i = 0; i < b.w * b.h; i++) {
        if (packOrder ? (b.order[i] > 107 || b.ink[i] < 0.15) : b.ink[i] < 0.6) continue;
        const x = i % b.w, y = (i / b.w) | 0; if (hashf(x >> 1, y >> 1, seed) < 0.4 || hashf(x >> 3, y >> 3, seed + 1) < 0.18) continue;
        D[i * 4] = SKETCH[0]; D[i * 4 + 1] = SKETCH[1]; D[i * 4 + 2] = SKETCH[2]; D[i * 4 + 3] = Math.round(255 * 0.5 * Math.min(1, b.ink[i]));
      }
      g.putImageData(img, 0, 0); b.sketch = g.canvas;
    },
    /** screen scale of a feature (screen px per logical px): terrain follows the zoom; places grow more slowly */
    scaleOf(f, zoom) { return f.place ? HB.clamp(Math.sqrt(zoom), 0.4, 1.2) : zoom; },
    /** one frame of a feature's reveal: wet ink runs ahead through the line work in order, colour dries behind it */
    compose(f, tInk) {
      const b = f.buf, dur = f.place ? TIME.inkPlace : TIME.inkTerrain, p = tInk / dur, q = (tInk - TIME.dry) / dur;
      const D = b.img.data, A = b.art, I = b.ink, O = b.order, n = b.w * b.h, band = 0.06;
      for (let i = 0; i < n; i++) {
        const a = A[i * 4 + 3] / 255, k = I[i], j = i * 4;
        if (a <= 0 && k <= 0) { D[j + 3] = 0; continue; }
        const o = O[i] / 255, wet = smooth(o - band, o, p), dry = smooth(o - band * 2, o, q);
        const inkA = k * wet * (1 - dry * 0.9), artA = a * dry, outA = Math.max(inkA, artA);
        if (outA <= 0.004) { D[j + 3] = 0; continue; }
        const share = inkA / (inkA + artA + 1e-6);
        D[j] = A[j] + (INK[0] - A[j]) * share; D[j + 1] = A[j + 1] + (INK[1] - A[j + 1]) * share; D[j + 2] = A[j + 2] + (INK[2] - A[j + 2]) * share;
        D[j + 3] = Math.round(outA * 255);
      }
      b.canvas.getContext('2d').putImageData(b.img, 0, 0);
      fx.stats.composed++; fx.stats.pixels += n;
    },
    /** features just discovered: one ink pool near them drains into each (reduced motion: they fade in) */
    reveal(features, pool, now) {
      const live = features.filter(f => f.state !== 'drawn' && f.state !== 'revealing' && f.state !== 'fading');
      if (!live.length) return null;
      for (const f of live) if (!f.buf || f.buf.rev !== (HB.mapAssets ? HB.mapAssets.revision : 0)) ink.prepare(f);
      const animating = (fs) => fs.filter(f => f.state === 'revealing');
      if (fx.reduced() || ink.pools.length >= LIMITS.pools) { for (const f of live) { f.state = 'fading'; f.t0 = now; } return null; }
      // discoveries a moment apart and close together share one pool (the dragon reveals a little at a time)
      const recent = ink.pools.find(Q => now - Q.t0 < 0.45 && Math.hypot(Q.x - pool.x, Q.y - pool.y) < 4);
      const P = recent || { x: pool.x, y: pool.y, t0: now, r: pool.r || 0.42, seed: HB.hash32(`pool:${pool.x},${pool.y}`), targets: [] };
      const age = now - P.t0;
      const cap = Math.max(0, LIMITS.features - (pool.allActive ? animating(pool.allActive).length : 0));
      live.forEach((f, k) => {
        if (k >= cap) { f.state = 'fading'; f.t0 = now; return; }
        const dist = Math.hypot(f.x - P.x, f.y - P.y), travel = Math.min(0.55, TIME.travel + dist * 0.04) + Math.max(0, age - TIME.rivulet + 0.1);
        // the ink enters each feature on the side facing the pool (pack reveal masks keep their own order)
        const dirx = (P.x - f.x) * 22 * f.buf.S, diry = (P.y - f.y) * 22 * f.buf.S;
        if (!f.buf.entry) ink.computeOrder(f, [f.buf.ax + dirx, f.buf.ay + diry]);
        f.state = 'revealing'; f.t0 = P.t0 + TIME.rivulet + travel; f.pool = P;
        P.targets.push({ f, arrive: TIME.rivulet + travel, bend: (hashf(k + P.targets.length, P.seed, 7) - 0.5) * 0.6 });
      });
      if (!recent) ink.pools.push(P);
      return P;
    },
    /** draw a feature at its screen anchor (sx, sy) and scale; returns true while it is still animating */
    drawFeature(ctx, f, sx, sy, scale, now) {
      if (f.state === 'hidden' || !f.state) return false;
      if (!f.buf || (f.state !== 'drawn' && f.buf.rev !== (HB.mapAssets ? HB.mapAssets.revision : 0))) ink.prepare(f);
      const b = f.buf, s = scale / b.S, bx = sx - b.ax * s, by = sy - b.ay * s;
      ctx.save(); ctx.imageSmoothingEnabled = true;
      let busy = false;
      if (f.state === 'sketch') ctx.drawImage(b.sketch, bx, by, b.w * s, b.h * s);
      else if (f.state === 'fading') {
        const t = smooth(0, TIME.fade, now - f.t0);
        ctx.globalAlpha = 1 - t; ctx.drawImage(b.sketch, bx, by, b.w * s, b.h * s);
        ctx.globalAlpha = t; ink.drawCrisp(ctx, f, sx, sy, scale);
        if (t >= 1) f.state = 'drawn'; else busy = true;
      } else if (f.state === 'revealing') {
        const tInk = now - f.t0, dur = f.place ? TIME.inkPlace : TIME.inkTerrain;
        // terrain keeps its sketch until the ink has run through it; places were never sketched
        if (!f.place) { ctx.globalAlpha = Math.max(0, 1 - Math.max(0, tInk) / dur * 1.3); ctx.drawImage(b.sketch, bx, by, b.w * s, b.h * s); ctx.globalAlpha = 1; }
        if (tInk > 0) {
          const end = dur + TIME.dry + 0.15;
          if (tInk >= end) { f.state = 'drawn'; ink.drawCrisp(ctx, f, sx, sy, scale); }
          else {
            ink.compose(f, tInk); ctx.drawImage(b.canvas, bx, by, b.w * s, b.h * s);
            // the last moment hands over to the crisp drawing
            const hand = smooth(end - 0.2, end, tInk); if (hand > 0) { ctx.globalAlpha = hand; ink.drawCrisp(ctx, f, sx, sy, scale); }
            busy = true;
          }
        } else busy = true;
      } else ink.drawCrisp(ctx, f, sx, sy, scale);
      ctx.restore();
      return busy;
    },
    /** the finished feature at screen resolution: the pack's art, else the hand-drawn version */
    drawCrisp(ctx, f, sx, sy, scale) {
      const MA = HB.mapAssets, r = MA && MA.entries.size ? MA.resolve(f.ids, f.key) : null;
      HB.mapart.setup(ctx);
      if (r) MA.drawResolved(ctx, r, sx, sy, f.param * scale, { key: f.key, paramY: f.paramY !== undefined ? f.paramY * scale : undefined });
      else f.proc(ctx, sx, sy, scale);
    },
    /** pools and rivulets; screenOf(f) gives a feature's screen anchor and scale: { x, y, s } */
    drawPools(ctx, now, worldToScreen, zoom, screenOf) {
      const z = 22 * zoom;
      ink.pools = ink.pools.filter(P => now - P.t0 < TIME.pool + TIME.hold + TIME.drain + 1.2);
      for (const P of ink.pools) {
        const t = now - P.t0, c = worldToScreen(P.x, P.y);
        const grow = smooth(0, TIME.pool, t), drain = 1 - smooth(TIME.pool + TIME.hold, TIME.pool + TIME.hold + TIME.drain, t), rr = P.r * z * grow * (0.25 + 0.75 * drain);
        ctx.save();
        // rivulets: thin lines of ink running from the pool into each feature's entry point
        for (const T of P.targets) {
          const sc = screenOf(T.f); if (!sc || !T.f.buf) continue;
          const b = T.f.buf, s = sc.s / b.S, ex = sc.x + (b.entryPx[0] - b.ax) * s, ey = sc.y + (b.entryPx[1] - b.ay) * s;
          const u = smooth(TIME.rivulet, T.arrive, t), fade = 1 - smooth(T.arrive + 0.25, T.arrive + 0.7, t);
          if (u <= 0 || fade <= 0) continue;
          const mx = (c.x + ex) / 2 - (ey - c.y) * T.bend, my = (c.y + ey) / 2 + (ex - c.x) * T.bend;
          ctx.strokeStyle = `rgba(${INK[0]},${INK[1]},${INK[2]},${0.85 * fade})`; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(c.x, c.y);
          const steps = 14; for (let k = 1; k <= steps * u; k++) { const v = k / steps, x = (1 - v) * (1 - v) * c.x + 2 * (1 - v) * v * mx + v * v * ex, y = (1 - v) * (1 - v) * c.y + 2 * (1 - v) * v * my + v * v * ey; ctx.lineWidth = Math.max(0.8, z * 0.05 * (1 - v * 0.6)); ctx.lineTo(x, y); }
          ctx.stroke();
        }
        if (rr > 0.3) {
          // the pool: a small round drop of wet ink, a darker drying rim, a glint of light on its surface
          ctx.beginPath();
          for (let k = 0; k <= 24; k++) { const a = k / 24 * Math.PI * 2, wob = 1 + 0.1 * Math.sin(3 * a + P.seed % 7) + 0.06 * Math.sin(7 * a + (P.seed >> 3) % 5); const x = c.x + Math.cos(a) * rr * wob, y = c.y + Math.sin(a) * rr * wob * 0.82; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
          ctx.closePath();
          const gr = ctx.createRadialGradient(c.x - rr * 0.2, c.y - rr * 0.2, rr * 0.1, c.x, c.y, rr * 1.1);
          gr.addColorStop(0, `rgba(${INK[0] + 30},${INK[1] + 20},${INK[2] + 12},0.82)`); gr.addColorStop(0.75, `rgba(${INK[0]},${INK[1]},${INK[2]},0.88)`); gr.addColorStop(1, 'rgba(14,8,3,0.95)');
          ctx.fillStyle = gr; ctx.fill();
          ctx.lineWidth = Math.max(0.8, rr * 0.12); ctx.strokeStyle = 'rgba(14,8,3,0.6)'; ctx.stroke();
          ctx.fillStyle = 'rgba(255,244,220,0.32)'; ctx.beginPath(); ctx.ellipse(c.x - rr * 0.32, c.y - rr * 0.3, rr * 0.22, rr * 0.1, -0.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      return ink.pools.length > 0;
    },
    /** what a feature should be, from knowledge: drawn if its cell is revealed, sketch if within the band, else hidden.
     *  Places are never sketched. Call on knowledge change; reveal() then animates the newly revealed ones */
    stateFromKnowledge(f, revealed, nearRevealed) { if (revealed) return 'drawn'; if (!f.place && nearRevealed) return 'sketch'; return 'hidden'; },
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
})();
