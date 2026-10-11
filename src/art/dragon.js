/* Composable pixel dragon: four size tiers, poses, breed palettes, alignment shifts and earned mutations.
 * Everything is drawn procedurally at low resolution from an anatomy description so layers can be replaced
 * later by sprite-sheet overrides (ids: dragon.<tier>.<pose>.<frame>). */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;
  const px = HB.px;

  const SIZES = [16, 26, 42, 66];   // body length in pixels per tier

  function breedPalette(breed, alignment) {
    const P = HB.px_palette;
    const b = { red: ['#c8402e', '#e8724e', '#862416', '#e9c27a'], green: ['#4f9a4a', '#7ec46a', '#2d6a2e', '#d8d08a'], black: ['#3a3646', '#5d5872', '#1b1922', '#7d7898'], gold: ['#d8a73a', '#f1cf6c', '#9a7120', '#f8e8b4'], blue: ['#3c6fb8', '#6c9ddd', '#244a86', '#b7d6ea'] }[breed] || ['#c8402e', '#e8724e', '#862416', '#e9c27a'];
    let [base, light, dark, belly] = b;
    const a = HB.clamp(alignment / 100, -1, 1);
    if (a < 0) { const t = -a * 0.55; base = px.mix(base, '#2a1418', t); light = px.mix(light, '#5a2a2a', t * 0.8); dark = px.mix(dark, '#120808', t); belly = px.mix(belly, '#6a4040', t * 0.7); }
    else if (a > 0) { const t = a * 0.45; base = px.mix(base, '#f3dc9a', t * 0.6); light = px.mix(light, '#fff4cc', t); dark = px.mix(dark, '#b08a40', t * 0.5); belly = px.mix(belly, '#fff8e0', t); }
    const eye = a < -0.3 ? '#ff3b2a' : a > 0.3 ? '#9fe3ff' : '#f7e36a';
    const membrane = px.mix(dark, base, 0.35);
    return { base, light, dark, belly, eye, membrane, outline: P.outline, horn: px.mix('#e8dcc0', dark, 0.3), claw: '#e8dcc0' };
  }

  /** spec: {tier, breed, alignment, mutations:[], scars, element}. pose: fly|idle|land|sleep|breathe|bite|roar|grab|hurt. */
  function render(spec, pose = 'fly', frame = 0) {
    const tier = HB.clamp(spec.tier | 0, 0, 3);
    const L = SIZES[tier];
    const W = Math.round(L * 1.7), H = Math.round(L * 1.35);
    const c = px.create(W, H);
    const g = c.ctx;
    const pal = breedPalette(spec.breed, spec.alignment || 0);
    const muts = new Set(spec.mutations || []);
    const t = frame;
    // anatomy in units of L, origin at body centre
    const ox = W * 0.47, oy = H * 0.55;
    const U = (fx, fy) => [ox + fx * L, oy + fy * L];
    const flying = pose === 'fly' || pose === 'grab' || pose === 'hurt' || pose === 'breathe' && spec.airborne !== false;
    const sleeping = pose === 'sleep';
    const wingAngle = pose === 'fly' || pose === 'grab' || pose === 'breathe' || pose === 'hurt' ? [1, 0.45, -0.6, 0.2][t % 4] : sleeping ? -0.05 : pose === 'roar' ? 0.9 : 0.15;
    const bob = flying ? [0, -0.02, 0.03, 0.0][t % 4] : sleeping ? [0, 0.015][t % 2] : [0, 0.01][t % 2];
    const bodyR = { x: 0.26, y: 0.145 };
    const [bx, by] = U(0, bob);
    const r = (v) => Math.round(v);

    // ----- far wing
    const drawWing = (far) => {
      const [rx, ry] = U(0.06, -0.06 + bob);
      const wa = wingAngle;
      const span = 0.62, sweep = -0.18;
      const tip = [rx + sweep * L, ry - wa * span * L];
      const mid1 = [rx - 0.38 * L, ry - wa * 0.42 * L];
      const mid2 = [rx - 0.58 * L, ry - wa * 0.16 * L];
      const back = [rx - 0.28 * L, ry + (wa > 0 ? 0.04 : -0.02) * L];
      const col = far ? px.mix(pal.membrane, '#000', 0.25) : pal.membrane;
      const edge = far ? px.mix(pal.dark, '#000', 0.2) : pal.dark;
      g.fillStyle = col;
      g.beginPath(); g.moveTo(rx, ry); g.lineTo(tip[0], tip[1]); g.lineTo(mid1[0], mid1[1]); g.lineTo(mid2[0], mid2[1]); g.lineTo(back[0], back[1]); g.closePath(); g.fill();
      // scalloped trailing edge cut-outs (draw background-coloured notches): skip, keep silhouette clean
      // fingers
      for (const p of [tip, mid1, mid2]) px.line(g, rx, ry, p[0], p[1], edge, 1);
      if (muts.has('runeMarks') && !far) { g.fillStyle = '#7fe6ff'; for (let i = 0; i < 3 + tier; i++) { const k = (i + 1) / (4 + tier); g.fillRect(r(HB.lerp(rx, mid1[0], k) - 0.5), r(HB.lerp(ry, mid1[1], k)), 1 + (tier > 1 ? 1 : 0), 1); } }
      if (muts.has('frost') && !far) { g.fillStyle = '#dff6ff'; g.fillRect(r(tip[0]), r(tip[1]), 1, 1); }
    };
    if (!sleeping) drawWing(true);

    // ----- tail
    const tailWave = flying ? Math.sin(t * 1.6) * 0.06 : 0.02;
    const tailPts = sleeping
      ? [{ x: bx - 0.22 * L, y: by + 0.05 * L, r: 0.07 * L }, { x: bx - 0.45 * L, y: by + 0.12 * L, r: 0.05 * L }, { x: bx - 0.3 * L, y: by + 0.22 * L, r: 0.035 * L }, { x: bx + 0.1 * L, y: by + 0.24 * L, r: 0.02 * L }]
      : [{ x: bx - 0.22 * L, y: by + 0.03 * L, r: 0.075 * L }, { x: bx - 0.48 * L, y: by + (0.02 + tailWave) * L, r: 0.05 * L }, { x: bx - 0.66 * L, y: by - (0.06 - tailWave * 2) * L, r: 0.028 * L }, { x: bx - 0.78 * L, y: by - (0.14 - tailWave * 3) * L, r: 0.015 * L }];
    px.taper(g, tailPts, pal.base);
    // tail spade
    const tp = tailPts[tailPts.length - 1];
    g.fillStyle = pal.dark; g.beginPath(); g.moveTo(tp.x + 0.02 * L, tp.y + 0.02 * L); g.lineTo(tp.x - 0.09 * L, tp.y - 0.06 * L); g.lineTo(tp.x - 0.03 * L, tp.y + 0.07 * L); g.closePath(); g.fill();

    // ----- hind leg (far) and legs
    const legCol = px.mix(pal.base, pal.dark, 0.35);
    const drawLeg = (fx, fy, standing, far) => {
      const [lx, ly] = U(fx, fy + bob);
      const col = far ? px.mix(legCol, '#000', 0.25) : legCol;
      if (standing) { px.taper(g, [{ x: lx, y: ly, r: 0.05 * L }, { x: lx - 0.02 * L, y: ly + 0.14 * L, r: 0.035 * L }, { x: lx + 0.01 * L, y: ly + 0.26 * L, r: 0.03 * L }], col); px.line(g, lx - 0.06 * L, ly + 0.27 * L, lx + 0.08 * L, ly + 0.27 * L, pal.claw, Math.max(1, L * 0.03)); }
      else { px.taper(g, [{ x: lx, y: ly, r: 0.05 * L }, { x: lx - 0.08 * L, y: ly + 0.1 * L, r: 0.035 * L }, { x: lx - 0.12 * L, y: ly + 0.16 * L, r: 0.025 * L }], col); px.line(g, lx - 0.16 * L, ly + 0.17 * L, lx - 0.1 * L, ly + 0.17 * L, pal.claw, 1); }
    };
    const standing = !flying && !sleeping;
    if (!sleeping) { drawLeg(-0.12, 0.1, standing, true); drawLeg(0.16, 0.1, standing, true); }

    // ----- body
    px.ellipse(g, bx, by, bodyR.x * L, bodyR.y * L, pal.base);
    px.ellipse(g, bx + 0.02 * L, by + 0.06 * L, bodyR.x * L * 0.8, bodyR.y * L * 0.55, pal.belly);
    // belly plates
    g.fillStyle = px.mix(pal.belly, pal.dark, 0.3);
    for (let i = -2; i <= 2; i++) g.fillRect(r(bx + i * 0.07 * L), r(by + 0.12 * L), 1, 1);

    // ----- near legs
    if (!sleeping) { drawLeg(-0.08, 0.12, standing, false); drawLeg(0.2, 0.12, standing, false); }

    // ----- neck and head
    const headUp = pose === 'roar' ? 0.42 : sleeping ? 0.0 : pose === 'bite' ? 0.12 : pose === 'grab' ? 0.14 : 0.3;
    const headFwd = pose === 'bite' ? 0.58 : sleeping ? 0.3 : 0.46;
    const [nx0, ny0] = U(0.2, -0.04 + bob);
    const [hx, hy] = sleeping ? U(0.28, 0.1 + bob) : U(headFwd, -headUp + bob);
    px.taper(g, [{ x: nx0, y: ny0, r: 0.085 * L }, { x: HB.lerp(nx0, hx, 0.5), y: HB.lerp(ny0, hy, 0.4), r: 0.07 * L }, { x: hx, y: hy, r: 0.06 * L }], pal.base);
    const headR = 0.11 * L;
    px.ellipse(g, hx, hy, headR, headR * 0.8, pal.base);
    // snout / jaw
    const open = pose === 'breathe' || pose === 'roar' || pose === 'bite' ? 1 : 0;
    px.ellipse(g, hx + 0.1 * L, hy + 0.02 * L - open * 0.01 * L, 0.09 * L, 0.055 * L, pal.base);
    if (open) { g.fillStyle = pal.dark; g.beginPath(); g.moveTo(hx + 0.03 * L, hy + 0.05 * L); g.lineTo(hx + 0.19 * L, hy + 0.04 * L); g.lineTo(hx + 0.12 * L, hy + 0.12 * L); g.closePath(); g.fill(); px.ellipse(g, hx + 0.08 * L, hy + 0.1 * L, 0.07 * L, 0.03 * L, pal.base); }
    else px.line(g, hx + 0.05 * L, hy + 0.05 * L, hx + 0.17 * L, hy + 0.045 * L, pal.dark, 1);
    // nostril
    g.fillStyle = pal.dark; g.fillRect(r(hx + 0.16 * L), r(hy + 0.0 * L), 1, 1);
    // eye
    const ew = Math.max(1, Math.round(L * 0.035));
    if (sleeping) px.line(g, hx + 0.0 * L, hy - 0.02 * L, hx + 0.05 * L, hy - 0.02 * L, pal.dark, 1);
    else { g.fillStyle = pal.eye; g.fillRect(r(hx + 0.01 * L), r(hy - 0.04 * L), ew, ew); g.fillStyle = pal.outline; g.fillRect(r(hx + 0.01 * L + ew - 1), r(hy - 0.04 * L), 1, 1); }
    // horns
    const hornLen = (0.1 + tier * 0.03) * L;
    const hornCol = muts.has('crest') ? '#e9c45a' : pal.horn;
    px.line(g, hx - 0.06 * L, hy - 0.06 * L, hx - 0.06 * L - hornLen * 0.7, hy - 0.06 * L - hornLen, hornCol, Math.max(1, L * 0.03));
    if (tier >= 1 || spec.alignment < -30) px.line(g, hx - 0.0 * L, hy - 0.08 * L, hx - 0.03 * L - hornLen * 0.5, hy - 0.08 * L - hornLen * 0.8, hornCol, Math.max(1, L * 0.025));
    if (muts.has('crest')) { for (let i = 0; i < 3; i++) px.line(g, hx - 0.03 * L + i * 0.04 * L, hy - 0.09 * L, hx - 0.02 * L + i * 0.045 * L, hy - 0.09 * L - hornLen * (0.5 + 0.2 * (i === 1)), '#f1cf6c', 1); }
    // near wing
    if (!sleeping) drawWing(false);

    // ----- spines along back
    const spineN = 3 + tier * 2 + (spec.alignment < -40 ? 2 : 0);
    g.fillStyle = spec.alignment < -40 ? '#3a1818' : pal.dark;
    for (let i = 0; i < spineN; i++) {
      const k = i / (spineN - 1);
      const sx = HB.lerp(bx + 0.22 * L, bx - 0.45 * L, k), sy = HB.lerp(by - bodyR.y * L, by - 0.02 * L, k * k);
      const h = Math.max(1, Math.round(L * (0.04 + (spec.alignment < -40 ? 0.03 : 0)) * (1 - k * 0.5)));
      g.fillRect(r(sx), r(sy - h), 1, h);
    }

    // ----- mutations drawn over the body
    if (muts.has('stonePlates')) { g.fillStyle = '#8d8a90'; for (let i = 0; i < 4 + tier * 2; i++) { const k = (i + 0.5) / (4 + tier * 2); const sx = HB.lerp(bx + 0.2 * L, bx - 0.2 * L, k), sy = by - bodyR.y * L * 0.6 + (i % 2) * 2; g.fillRect(r(sx), r(sy), Math.max(2, r(L * 0.06)), Math.max(1, r(L * 0.035))); } g.fillStyle = '#b9b6ba'; g.fillRect(r(bx), r(by - bodyR.y * L * 0.6), 1, 1); }
    if (muts.has('crystals')) { for (let i = 0; i < 3 + tier; i++) { const sx = bx + (0.12 - i * 0.09) * L, sy = by - bodyR.y * L * 0.9; const h = Math.max(2, r(L * 0.07)); g.fillStyle = '#4fb0d8'; g.fillRect(r(sx), r(sy - h), Math.max(1, r(L * 0.03)), h); g.fillStyle = '#bff0ff'; g.fillRect(r(sx), r(sy - h), 1, 1); } }
    if (muts.has('emberGlow')) { g.fillStyle = '#ff8a2a'; px.ellipse(g, bx + 0.12 * L, by + 0.02 * L, 0.07 * L, 0.05 * L, '#ff8a2a'); g.fillStyle = '#ffd34a'; g.fillRect(r(bx + 0.12 * L), r(by + 0.01 * L), Math.max(1, r(L * 0.03)), 1); if (!sleeping) { g.fillStyle = '#ffd34a'; g.fillRect(r(hx + 0.14 * L), r(hy + 0.03 * L), 1, 1); } }
    if (muts.has('goldenSheen')) { g.fillStyle = '#fff2b0'; for (let i = 0; i < 3 + tier; i++) g.fillRect(r(bx - 0.15 * L + i * 0.08 * L), r(by - bodyR.y * L * 0.45 + (i % 2)), 1, 1); }
    if (muts.has('clawBlades')) { g.fillStyle = '#d8dde6'; g.fillRect(r(bx + 0.1 * L), r(by + 0.26 * L), Math.max(2, r(L * 0.05)), 1); g.fillRect(r(bx - 0.15 * L), r(by + 0.26 * L), Math.max(2, r(L * 0.05)), 1); }
    if (muts.has('frost')) { g.fillStyle = '#dff6ff'; for (let i = 0; i < 2 + tier; i++) g.fillRect(r(bx - 0.3 * L + i * 0.1 * L), r(by - bodyR.y * L - 1 - (i % 2)), 1, 2); }
    if (spec.scars > 0) { g.fillStyle = px.mix(pal.dark, '#5a1a1a', 0.5); for (let i = 0; i < Math.min(6, spec.scars); i++) { const sx = bx - 0.1 * L + i * 0.07 * L, sy = by - 0.02 * L + (i % 3) * 2; g.fillRect(r(sx), r(sy), 1, Math.max(2, r(L * 0.05))); } }
    if (pose === 'hurt') { // flash
      const img = g.getImageData(0, 0, W, H); const d = img.data; for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { d[i] = 255; d[i + 1] = 240; d[i + 2] = 230; } g.putImageData(img, 0, 0);
    }
    const out = px.outline(c, pal.outline);
    out.anchorX = Math.round(ox) + 1; out.anchorY = Math.round(oy) + 1;
    out.bodyLength = L;
    return out;
  }

  const dragonArt = HB.dragonArt = {
    SIZES,
    breedPalette,
    specOf(state) {
      const d = state.dragon;
      return { tier: d.tier, breed: d.breed, alignment: d.alignment, mutations: dragonArt.mutationsOf(state), scars: d.scars, element: d.stats ? d.stats.breathElement : 'fire' };
    },
    /** derive visible mutations from artifacts, treasure categories and history */
    mutationsOf(state) {
      const m = new Set(state.dragon.mutations || []);
      for (const it of state.hoard.items) if (it.mutation) m.add(it.mutation);
      if (HB.stats) {
        const t = HB.stats.categoryTotals(state);
        if (t.gold > 2500) m.add('goldenSheen');
        if (t.gems > 1800) m.add('crystals');
        if (t.arms > 1500) m.add('clawBlades');
        if (t.books > 1200) m.add('runeMarks');
        if (t.royal > 2500) m.add('crest');
      }
      return [...m];
    },
    specKey(spec) { return `${spec.tier}|${spec.breed}|${Math.round((spec.alignment || 0) / 10)}|${(spec.mutations || []).slice().sort().join(',')}|${spec.scars || 0}`; },
    /** cached sprite (canvas with anchorX/anchorY) */
    sprite(spec, pose = 'fly', frame = 0) {
      const key = `dragon|${dragonArt.specKey(spec)}|${pose}|${frame}`;
      let c = HB.sprites.cache.get(key);
      if (c) return c;
      const ov = HB.sprites.overrides.get(`dragon.${spec.tier}.${pose}.${frame}`);
      if (ov) { c = px.create(ov.w, ov.h); c.ctx.drawImage(ov.image, ov.x, ov.y, ov.w, ov.h, 0, 0, ov.w, ov.h); c.anchorX = ov.ax || ov.w / 2; c.anchorY = ov.ay || ov.h / 2; }
      else c = render(Object.assign({}, spec, { alignment: Math.round((spec.alignment || 0) / 10) * 10 }), pose, frame);
      HB.sprites.cache.set(key, c);
      return c;
    },
    /** draw at (x,y) = anchor position in screen space, scale, facing (1 right, -1 left) */
    draw(ctx, spec, pose, frame, x, y, scale, facing = 1, alpha = 1) {
      const s = dragonArt.sprite(spec, pose, frame);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (alpha !== 1) ctx.globalAlpha *= alpha;
      ctx.translate(x, y);
      if (facing < 0) ctx.scale(-1, 1);
      ctx.drawImage(s, -s.anchorX * scale, -s.anchorY * scale, s.width * scale, s.height * scale);
      ctx.restore();
      return s;
    },
    /** flame sprite for breath: length in px at 1x; element colours */
    flame(length, element = 'fire', frame = 0) {
      const key = `flame|${length}|${element}|${frame}`;
      let c = HB.sprites.cache.get(key); if (c) return c;
      const h = Math.max(4, Math.round(length * 0.45));
      c = px.create(length + 2, h + 2); const g = c.ctx;
      const cols = element === 'frost' ? ['#bfefff', '#7fd0ff', '#ffffff'] : element === 'acid' ? ['#7ee04a', '#3f9a2a', '#eaffb0'] : element === 'lightning' ? ['#c9b6ff', '#8f6bff', '#ffffff'] : ['#ff8a2a', '#e2642a', '#ffd34a'];
      const rng = new HB.RNG(frame * 7 + length);
      for (let x = 0; x < length; x++) {
        const k = x / length;
        const r = (0.25 + 0.75 * Math.sin(k * Math.PI)) * h / 2 * (1 + (rng.next() - 0.5) * 0.3);
        const cy = h / 2 + 1 + Math.sin(k * 9 + frame) * (k * 1.5);
        px.ellipse(g, x + 1, cy, 1, r, cols[0]);
        if (k < 0.7) px.ellipse(g, x + 1, cy, 1, r * 0.55, cols[1]);
        if (k < 0.5) px.ellipse(g, x + 1, cy, 1, r * 0.25, cols[2]);
      }
      HB.sprites.cache.set(key, c);
      return c;
    },
  };
})();
