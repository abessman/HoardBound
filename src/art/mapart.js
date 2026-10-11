/* Hand-drawn cartography glyphs: ink strokes on parchment in the style of a Tolkien map. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  const INK = '#2b1a0e';
  const INK_SOFT = 'rgba(43,26,14,0.65)';
  const FILL = '#f0e3c3';
  const FILL_DARK = '#d9c89d';
  const SNOW = '#faf6ee';
  const FOREST_WASH = 'rgba(70,120,60,0.20)';
  const WATER_INK = 'rgba(48,78,118,0.78)';

  const J = (rng, a) => (rng.next() - 0.5) * 2 * a;

  function wobblyLine(ctx, pts, rng, amp = 0.6) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      const jx = i === 0 || i === pts.length - 1 ? 0 : J(rng, amp), jy = i === 0 || i === pts.length - 1 ? 0 : J(rng, amp);
      if (i === 0) ctx.moveTo(x + jx, y + jy); else ctx.lineTo(x + jx, y + jy);
    }
  }
  function stroke(ctx, w = 1.2, color = INK) { ctx.lineWidth = w * (HB.mapart.lineScale || 1); ctx.strokeStyle = color; ctx.stroke(); }

  const A = HB.mapart = {
    INK, INK_SOFT, FILL, WATER_INK,
    lineScale: 1,
    setup(ctx) { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.fillStyle = FILL; },

    /** mountain peak with base centred at (x,y) */
    mountain(ctx, x, y, w, h, rng, opts = {}) {
      const apexX = x + J(rng, w * 0.12), apexY = y - h;
      const lx = x - w / 2, rx = x + w / 2;
      const lm = [lx + w * 0.22 + J(rng, w * 0.05), y - h * (0.38 + J(rng, 0.1))];
      const rm = [rx - w * 0.25 + J(rng, w * 0.05), y - h * (0.42 + J(rng, 0.1))];
      ctx.beginPath();
      ctx.moveTo(lx, y);
      ctx.lineTo(lm[0], lm[1]);
      ctx.lineTo(lm[0] + w * 0.08, lm[1] - h * 0.08);
      ctx.lineTo(apexX, apexY);
      ctx.lineTo(rm[0] - w * 0.06, rm[1] - h * 0.06);
      ctx.lineTo(rm[0], rm[1]);
      ctx.lineTo(rx, y);
      ctx.closePath();
      ctx.fillStyle = FILL; ctx.fill();
      // right-side shade hatching
      ctx.save(); ctx.clip();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.globalAlpha *= 0.75;
      const n = Math.max(2, Math.round(h / 3.2));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const sy = apexY + (y - apexY) * t;
        const sx = apexX + (rx - apexX) * t;
        ctx.beginPath(); ctx.moveTo(apexX + (sx - apexX) * 0.15, sy - (y - apexY) * 0.02); ctx.lineTo(sx + 1, sy + 1); ctx.stroke();
      }
      ctx.restore();
      if (opts.snow) { ctx.beginPath(); ctx.moveTo(apexX, apexY); ctx.lineTo(apexX - w * 0.14, apexY + h * 0.28); ctx.lineTo(apexX - w * 0.04, apexY + h * 0.22); ctx.lineTo(apexX + w * 0.05, apexY + h * 0.3); ctx.lineTo(apexX + w * 0.16, apexY + h * 0.26); ctx.closePath(); ctx.fillStyle = SNOW; ctx.fill(); }
      ctx.beginPath();
      ctx.moveTo(lx, y); ctx.lineTo(lm[0], lm[1]); ctx.lineTo(lm[0] + w * 0.08, lm[1] - h * 0.08); ctx.lineTo(apexX, apexY); ctx.lineTo(rm[0] - w * 0.06, rm[1] - h * 0.06); ctx.lineTo(rm[0], rm[1]); ctx.lineTo(rx, y);
      stroke(ctx, opts.big ? 1.5 : 1.2);
      // ridge line from apex down-left
      ctx.beginPath(); ctx.moveTo(apexX, apexY); ctx.lineTo(apexX - w * 0.12, apexY + h * 0.45); ctx.lineTo(apexX - w * 0.05, apexY + h * 0.7); stroke(ctx, 0.8, INK_SOFT);
    },
    hill(ctx, x, y, w, h, rng) {
      ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x + J(rng, w * 0.1), y - h * 2, x + w / 2, y);
      ctx.fillStyle = FILL; ctx.fill(); stroke(ctx, 1.1);
      ctx.beginPath(); for (let i = 0; i < 2; i++) { const t = 0.55 + i * 0.18; ctx.moveTo(x + w * (t - 0.5) * 0.9, y - h * (1 - t) * 1.6); ctx.lineTo(x + w * (t - 0.5) + 1, y - 0.5); } stroke(ctx, 0.8, INK_SOFT);
    },
    treeRound(ctx, x, y, s, rng) {
      const r = s * (0.9 + rng.next() * 0.3);
      ctx.beginPath();
      const bumps = 5;
      for (let i = 0; i <= bumps; i++) {
        const a0 = Math.PI + (i / bumps) * Math.PI * 2 * 0.98;
        const px = x + Math.cos(a0) * r, py = y - r * 0.9 + Math.sin(a0) * r * 0.85;
        if (i === 0) ctx.moveTo(px, py); else { const am = a0 - Math.PI / bumps; ctx.quadraticCurveTo(x + Math.cos(am) * r * 1.35, y - r * 0.9 + Math.sin(am) * r * 1.2, px, py); }
      }
      ctx.closePath();
      ctx.fillStyle = FOREST_WASH; ctx.fill(); ctx.fillStyle = 'rgba(240,227,195,0.55)'; ctx.fill();
      stroke(ctx, 1);
      ctx.beginPath(); ctx.moveTo(x, y - r * 0.2); ctx.lineTo(x, y + r * 0.6); stroke(ctx, 1.1);
      ctx.beginPath(); ctx.moveTo(x + r * 0.25, y - r * 0.4); ctx.lineTo(x + r * 0.55, y - r * 0.15); stroke(ctx, 0.7, INK_SOFT);
    },
    treePine(ctx, x, y, s, rng) {
      const h = s * (2.2 + rng.next() * 0.6), w = s * 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y - h);
      ctx.lineTo(x + w * 0.35, y - h * 0.62); ctx.lineTo(x + w * 0.2, y - h * 0.62);
      ctx.lineTo(x + w * 0.45, y - h * 0.3); ctx.lineTo(x + w * 0.28, y - h * 0.3);
      ctx.lineTo(x + w * 0.55, y);
      ctx.lineTo(x - w * 0.55, y);
      ctx.lineTo(x - w * 0.28, y - h * 0.3); ctx.lineTo(x - w * 0.45, y - h * 0.3);
      ctx.lineTo(x - w * 0.2, y - h * 0.62); ctx.lineTo(x - w * 0.35, y - h * 0.62);
      ctx.closePath();
      ctx.fillStyle = FOREST_WASH; ctx.fill(); ctx.fillStyle = 'rgba(240,227,195,0.5)'; ctx.fill();
      stroke(ctx, 1);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + s * 0.6); stroke(ctx, 1.1);
    },
    swampTuft(ctx, x, y, s, rng) {
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) { ctx.moveTo(x, y); ctx.lineTo(x + i * s * 0.6 + J(rng, 0.5), y - s * (1.1 + Math.abs(i) * -0.3)); }
      stroke(ctx, 0.9);
      ctx.beginPath(); ctx.moveTo(x - s * 1.4, y + 0.5); ctx.lineTo(x - s * 0.5, y + 0.5); ctx.moveTo(x + s * 0.6, y + 1); ctx.lineTo(x + s * 1.6, y + 1); stroke(ctx, 0.8, WATER_INK);
    },
    grassTuft(ctx, x, y, s, rng) {
      ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x - s * 0.2, y - s); ctx.moveTo(x, y); ctx.lineTo(x + s * 0.15, y - s * 1.2); ctx.moveTo(x + s * 0.5, y); ctx.lineTo(x + s * 0.6, y - s * 0.8);
      stroke(ctx, 0.8, INK_SOFT);
    },
    dune(ctx, x, y, s, rng) { ctx.beginPath(); ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x - s * 0.3, y - s * 0.6, x + s * 0.5, y - s * 0.1); stroke(ctx, 0.8, INK_SOFT); },
    snowDots(ctx, x, y, s, rng) { ctx.fillStyle = INK_SOFT; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + J(rng, s), y + J(rng, s * 0.6), 0.7, 0, Math.PI * 2); ctx.fill(); } },
    wave(ctx, x, y, len, rng, alpha = 0.8) {
      ctx.beginPath();
      const n = Math.max(2, Math.round(len / 6));
      ctx.moveTo(x, y);
      for (let i = 1; i <= n; i++) { const px = x + (len * i) / n; ctx.quadraticCurveTo(x + (len * (i - 0.5)) / n, y + (i % 2 ? -1.6 : 1.6), px, y); }
      ctx.save(); ctx.globalAlpha *= alpha; stroke(ctx, 0.9, WATER_INK); ctx.restore();
    },
    /** cloud puff: scalloped blob. opts: {fill, outline(bool), alpha} */
    cloud(ctx, x, y, r, rng, opts = {}) {
      const bumps = 7 + rng.int(3);
      ctx.beginPath();
      for (let i = 0; i <= bumps; i++) {
        const a = (i / bumps) * Math.PI * 2;
        const rr = r * (0.8 + rng.next() * 0.35);
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.75;
        if (i === 0) ctx.moveTo(px, py); else { const am = a - Math.PI / bumps; ctx.quadraticCurveTo(x + Math.cos(am) * rr * 1.35, y + Math.sin(am) * rr * 1.05, px, py); }
      }
      ctx.closePath();
      ctx.fillStyle = opts.fill || '#e9dfc4'; ctx.fill();
      if (opts.outline) { ctx.save(); ctx.globalAlpha *= (opts.alpha === undefined ? 0.7 : opts.alpha); stroke(ctx, 1.1, opts.ink || INK); ctx.restore(); }
    },
    lightning(ctx, x, y, s, rng) {
      ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x - s * 0.3, y - s * 0.2); ctx.lineTo(x + s * 0.2, y - s * 0.1); ctx.lineTo(x - s * 0.15, y + s * 0.8);
      stroke(ctx, 1.2, '#4a3a2a');
    },

    // ---------- buildings & places (base at y, centred x, size s ~ 1 unit = 10px at base scale)
    house(ctx, x, y, s, rng, opts = {}) {
      const w = s * (opts.w || 1.3), h = s * (opts.h || 0.9), rh = s * 0.75;
      ctx.beginPath(); ctx.rect(x - w / 2, y - h, w, h); ctx.fillStyle = opts.fill || FILL; ctx.fill(); stroke(ctx, 1);
      ctx.beginPath(); ctx.moveTo(x - w / 2 - s * 0.12, y - h); ctx.lineTo(x + J(rng, 0.3), y - h - rh); ctx.lineTo(x + w / 2 + s * 0.12, y - h); ctx.closePath(); ctx.fillStyle = FILL_DARK; ctx.fill(); stroke(ctx, 1);
      // door
      ctx.beginPath(); ctx.rect(x - s * 0.14, y - h * 0.55, s * 0.28, h * 0.55); ctx.fillStyle = INK; ctx.fill();
      if (opts.chimney) { ctx.beginPath(); ctx.rect(x + w * 0.22, y - h - rh * 0.9, s * 0.18, rh * 0.5); ctx.fillStyle = FILL; ctx.fill(); stroke(ctx, 0.9); }
    },
    towerGlyph(ctx, x, y, s, rng, opts = {}) {
      const w = s * (opts.w || 0.7), h = s * (opts.h || 2);
      ctx.beginPath(); ctx.rect(x - w / 2, y - h, w, h); ctx.fillStyle = FILL; ctx.fill(); stroke(ctx, 1);
      if (opts.cone) { ctx.beginPath(); ctx.moveTo(x - w / 2 - s * 0.1, y - h); ctx.lineTo(x, y - h - s * 0.9); ctx.lineTo(x + w / 2 + s * 0.1, y - h); ctx.closePath(); ctx.fillStyle = FILL_DARK; ctx.fill(); stroke(ctx, 1); }
      else { // battlements
        ctx.beginPath(); const n = 3; const bw = w / (n * 2 - 1);
        for (let i = 0; i < n; i++) ctx.rect(x - w / 2 + i * bw * 2, y - h - s * 0.22, bw, s * 0.22);
        ctx.fillStyle = FILL; ctx.fill(); stroke(ctx, 0.9);
      }
      if (opts.flag) { ctx.beginPath(); ctx.moveTo(x, y - h - s * (opts.cone ? 0.9 : 0.22)); ctx.lineTo(x, y - h - s * (opts.cone ? 1.6 : 0.95)); stroke(ctx, 0.9); ctx.beginPath(); const fy = y - h - s * (opts.cone ? 1.6 : 0.95); ctx.moveTo(x, fy); ctx.lineTo(x + s * 0.55, fy + s * 0.18); ctx.lineTo(x, fy + s * 0.36); ctx.closePath(); ctx.fillStyle = opts.flagColor || '#8f2b1f'; ctx.fill(); }
      // window
      ctx.beginPath(); ctx.rect(x - s * 0.08, y - h * 0.6, s * 0.16, s * 0.28); ctx.fillStyle = INK; ctx.fill();
    },
    settlement(ctx, L, x, y, s, rng, opts = {}) {
      A.setup(ctx);
      const state = L.state;
      const faded = state === 'abandoned' || state === 'ruin';
      ctx.save();
      if (faded) ctx.globalAlpha *= 0.6;
      switch (L.type) {
        case 'farm':
          A.house(ctx, x, y, s * 0.9, rng, { chimney: true });
          // field furrows
          ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(x + s * 0.9, y - s * 0.1 - i * s * 0.25); ctx.lineTo(x + s * 1.9, y - s * 0.1 - i * s * 0.25); } stroke(ctx, 0.7, INK_SOFT);
          break;
        case 'village':
          A.house(ctx, x - s * 0.8, y, s * 0.85, rng); A.house(ctx, x + s * 0.7, y + s * 0.1, s * 0.8, rng, { chimney: true }); A.house(ctx, x, y - s * 0.55, s * 0.75, rng);
          break;
        case 'town':
          A.house(ctx, x - s * 1.2, y, s * 0.85, rng); A.house(ctx, x + s * 1.1, y, s * 0.85, rng, { chimney: true });
          A.house(ctx, x - s * 0.5, y - s * 0.6, s * 0.8, rng); A.house(ctx, x + s * 0.5, y - s * 0.65, s * 0.8, rng);
          A.towerGlyph(ctx, x, y, s * 0.9, rng, { cone: true, h: 2.1, w: 0.6 });
          break;
        case 'city': {
          const big = L.tier >= 4;
          const ww = s * (big ? 4.2 : 3.4);
          // wall
          ctx.beginPath(); ctx.rect(x - ww / 2, y - s * 0.75, ww, s * 0.75); ctx.fillStyle = FILL_DARK; ctx.fill(); stroke(ctx, 1.1);
          ctx.beginPath(); const n = big ? 9 : 7; const bw = ww / (n * 2 - 1); for (let i = 0; i < n; i++) ctx.rect(x - ww / 2 + i * bw * 2, y - s * 0.95, bw, s * 0.2); ctx.fillStyle = FILL_DARK; ctx.fill(); stroke(ctx, 0.8);
          // gate
          ctx.beginPath(); ctx.moveTo(x - s * 0.22, y); ctx.lineTo(x - s * 0.22, y - s * 0.35); ctx.arc(x, y - s * 0.35, s * 0.22, Math.PI, 0); ctx.lineTo(x + s * 0.22, y); ctx.fillStyle = INK; ctx.fill();
          // inner buildings
          A.house(ctx, x - s * 1.1, y - s * 0.75, s * 0.75, rng); A.house(ctx, x + s * 1.0, y - s * 0.75, s * 0.75, rng, { chimney: true }); A.house(ctx, x - s * 0.1, y - s * 0.95, s * 0.7, rng);
          A.towerGlyph(ctx, x + s * 0.35, y - s * 0.7, s * 0.9, rng, { cone: true, h: 2.2, w: 0.55, flag: true, flagColor: opts.flagColor });
          if (big) { A.towerGlyph(ctx, x - s * 1.7, y - s * 0.7, s * 0.8, rng, { h: 1.6, w: 0.6 }); A.towerGlyph(ctx, x + s * 1.75, y - s * 0.7, s * 0.8, rng, { h: 1.6, w: 0.6 }); }
          break;
        }
        case 'castle':
          ctx.beginPath(); ctx.rect(x - s * 1.3, y - s * 0.9, s * 2.6, s * 0.9); ctx.fillStyle = FILL_DARK; ctx.fill(); stroke(ctx, 1.1);
          A.towerGlyph(ctx, x - s * 1.1, y, s, rng, { h: 1.7, w: 0.65 }); A.towerGlyph(ctx, x + s * 1.1, y, s, rng, { h: 1.7, w: 0.65 });
          A.towerGlyph(ctx, x, y - s * 0.3, s * 1.1, rng, { h: 2.3, w: 0.85, flag: true, flagColor: opts.flagColor });
          ctx.beginPath(); ctx.moveTo(x - s * 0.18, y); ctx.lineTo(x - s * 0.18, y - s * 0.3); ctx.arc(x, y - s * 0.3, s * 0.18, Math.PI, 0); ctx.lineTo(x + s * 0.18, y); ctx.fillStyle = INK; ctx.fill();
          break;
        case 'camp': {
          const tent = (tx, ty, ts) => { ctx.beginPath(); ctx.moveTo(tx - ts, ty); ctx.lineTo(tx, ty - ts * 1.3); ctx.lineTo(tx + ts, ty); ctx.closePath(); ctx.fillStyle = FILL; ctx.fill(); stroke(ctx, 1); ctx.beginPath(); ctx.moveTo(tx, ty - ts * 1.3); ctx.lineTo(tx, ty); stroke(ctx, 0.8); };
          tent(x - s * 0.9, y, s * 0.7); tent(x + s * 0.8, y + s * 0.05, s * 0.75); if (L.camp !== 'hunter') tent(x, y - s * 0.5, s * 0.55);
          // fire
          ctx.beginPath(); ctx.moveTo(x - s * 0.25, y + s * 0.35); ctx.lineTo(x + s * 0.25, y + s * 0.5); ctx.moveTo(x + s * 0.25, y + s * 0.35); ctx.lineTo(x - s * 0.25, y + s * 0.5); stroke(ctx, 0.9);
          ctx.beginPath(); ctx.moveTo(x - s * 0.12, y + s * 0.4); ctx.quadraticCurveTo(x - s * 0.2, y + s * 0.05, x, y - s * 0.05); ctx.quadraticCurveTo(x + s * 0.2, y + s * 0.1, x + s * 0.12, y + s * 0.4); ctx.fillStyle = '#c9541e'; ctx.fill(); stroke(ctx, 0.7);
          if (L.camp === 'goblin') { ctx.beginPath(); ctx.moveTo(x + s * 1.6, y); ctx.lineTo(x + s * 1.6, y - s * 1.4); stroke(ctx, 0.9); ctx.beginPath(); ctx.arc(x + s * 1.6, y - s * 1.55, s * 0.22, 0, Math.PI * 2); ctx.fillStyle = FILL; ctx.fill(); stroke(ctx, 0.8); }
          if (L.camp === 'hunter') { ctx.beginPath(); ctx.moveTo(x - s * 1.8, y); ctx.lineTo(x - s * 1.8, y - s * 1.2); ctx.lineTo(x - s * 1.2, y - s * 0.9); stroke(ctx, 0.9); }
          break;
        }
        case 'mine':
          ctx.beginPath(); ctx.moveTo(x - s * 0.9, y); ctx.lineTo(x - s * 0.9, y - s * 0.5); ctx.arc(x, y - s * 0.5, s * 0.9, Math.PI, 0); ctx.lineTo(x + s * 0.9, y); ctx.closePath(); ctx.fillStyle = FILL_DARK; ctx.fill(); stroke(ctx, 1.1);
          ctx.beginPath(); ctx.moveTo(x - s * 0.45, y); ctx.lineTo(x - s * 0.45, y - s * 0.4); ctx.arc(x, y - s * 0.4, s * 0.45, Math.PI, 0); ctx.lineTo(x + s * 0.45, y); ctx.fillStyle = INK; ctx.fill();
          // pick
          ctx.beginPath(); ctx.moveTo(x + s * 0.9, y - s * 1.3); ctx.lineTo(x + s * 1.6, y - s * 0.3); stroke(ctx, 1); ctx.beginPath(); ctx.moveTo(x + s * 0.7, y - s * 1.1); ctx.quadraticCurveTo(x + s * 1.1, y - s * 1.6, x + s * 1.4, y - s * 1.35); stroke(ctx, 1.2);
          break;
        case 'hold':
          A.mountain(ctx, x, y, s * 3.6, s * 2.6, rng, { big: true });
          ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x - s * 0.5, y - s * 0.7); ctx.arc(x, y - s * 0.7, s * 0.5, Math.PI, 0); ctx.lineTo(x + s * 0.5, y); ctx.fillStyle = INK; ctx.fill();
          ctx.beginPath(); ctx.rect(x - s * 0.8, y - s * 1.1, s * 0.2, s * 1.1); ctx.rect(x + s * 0.6, y - s * 1.1, s * 0.2, s * 1.1); ctx.fillStyle = FILL; ctx.fill(); stroke(ctx, 0.9);
          break;
        case 'glade':
          for (const [dx, hh] of [[-1.1, 2.6], [0, 3.2], [1.1, 2.5]]) { ctx.beginPath(); ctx.moveTo(x + dx * s, y); ctx.lineTo(x + dx * s, y - hh * s); stroke(ctx, 1.1); A.treeRound(ctx, x + dx * s, y - hh * s + s * 0.8, s * 0.7, rng); }
          ctx.beginPath(); ctx.arc(x, y - s * 1.1, s * 0.22, 0, Math.PI * 2); ctx.fillStyle = '#e9c45a'; ctx.fill(); stroke(ctx, 0.7);
          break;
        case 'monastery':
          A.house(ctx, x + s * 0.4, y, s * 1.1, rng, { w: 1.6, h: 0.9 });
          A.towerGlyph(ctx, x - s * 0.9, y, s * 0.9, rng, { cone: true, h: 2.2, w: 0.6 });
          ctx.beginPath(); ctx.arc(x - s * 0.9, y - s * 1.4, s * 0.14, 0, Math.PI * 2); ctx.fillStyle = FILL; ctx.fill(); stroke(ctx, 0.7);
          break;
        case 'shrine':
          ctx.beginPath(); ctx.rect(x - s * 0.5, y - s * 0.9, s, s * 0.9); ctx.fillStyle = FILL_DARK; ctx.fill(); stroke(ctx, 1);
          ctx.beginPath(); ctx.moveTo(x - s * 0.65, y - s * 0.9); ctx.lineTo(x + s * 0.65, y - s * 0.9); stroke(ctx, 1.1);
          A.star(ctx, x, y - s * 1.35, s * 0.35, rng);
          break;
        case 'ruin':
          ctx.beginPath(); ctx.rect(x - s * 1.0, y - s * 1.1, s * 0.3, s * 1.1); ctx.rect(x - s * 0.1, y - s * 0.7, s * 0.3, s * 0.7); ctx.rect(x + s * 0.7, y - s * 1.5, s * 0.3, s * 1.5); ctx.fillStyle = FILL_DARK; ctx.fill(); stroke(ctx, 1);
          ctx.beginPath(); ctx.moveTo(x - s * 1.2, y - s * 1.1); ctx.lineTo(x - s * 0.5, y - s * 1.1); ctx.moveTo(x + s * 0.5, y - s * 1.5); ctx.lineTo(x + s * 1.2, y - s * 1.5); stroke(ctx, 1);
          ctx.beginPath(); for (let i = 0; i < 4; i++) { const rx = x + J(rng, s * 1.4), ry = y - rng.next() * s * 0.3; ctx.moveTo(rx, ry); ctx.lineTo(rx + s * 0.25, ry); } stroke(ctx, 1);
          break;
        case 'warren':
          ctx.beginPath(); ctx.moveTo(x - s * 1.2, y); ctx.quadraticCurveTo(x, y - s * 1.9, x + s * 1.2, y); ctx.fillStyle = FILL_DARK; ctx.fill(); stroke(ctx, 1.1);
          ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.quadraticCurveTo(x, y - s * 1.0, x + s * 0.5, y); ctx.fillStyle = INK; ctx.fill();
          ctx.beginPath(); ctx.moveTo(x + s * 1.3, y); ctx.lineTo(x + s * 1.3, y - s * 1.5); stroke(ctx, 0.9); ctx.beginPath(); ctx.arc(x + s * 1.3, y - s * 1.65, s * 0.22, 0, Math.PI * 2); ctx.fillStyle = FILL; ctx.fill(); stroke(ctx, 0.8);
          break;
        case 'tower':
          A.towerGlyph(ctx, x, y, s * 1.1, rng, { cone: true, h: 3, w: 0.6 });
          ctx.beginPath(); ctx.arc(x, y - s * 2.2, s * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#e9c45a'; ctx.fill();
          break;
        case 'lair':
          A.hill(ctx, x, y, s * 3.2, s * 1.1, rng);
          ctx.beginPath(); ctx.moveTo(x - s * 0.6, y); ctx.lineTo(x - s * 0.6, y - s * 0.6); ctx.arc(x, y - s * 0.6, s * 0.6, Math.PI, 0); ctx.lineTo(x + s * 0.6, y); ctx.fillStyle = INK; ctx.fill();
          break;
        case 'rivalLair':
          A.mountain(ctx, x, y, s * 3.4, s * 2.6, rng, { big: true });
          ctx.beginPath(); ctx.moveTo(x - s * 0.6, y); ctx.lineTo(x - s * 0.6, y - s * 0.6); ctx.arc(x, y - s * 0.6, s * 0.6, Math.PI, 0); ctx.lineTo(x + s * 0.6, y); ctx.fillStyle = INK; ctx.fill();
          ctx.beginPath(); for (let i = 0; i < 3; i++) ctx.arc(x + s * 0.3 + i * s * 0.25, y - s * 2.8 - i * s * 0.45, s * (0.18 + i * 0.1), 0, Math.PI * 2); stroke(ctx, 0.8, INK_SOFT);
          ctx.beginPath(); ctx.moveTo(x - s * 1.5, y + s * 0.3); ctx.lineTo(x - s * 1.0, y + s * 0.3); ctx.moveTo(x - s * 1.25, y + s * 0.05); ctx.lineTo(x - s * 1.25, y + s * 0.55); stroke(ctx, 0.9);
          break;
        case 'battlefield':
          A.crossedSwords(ctx, x, y - s * 0.6, s * 1.1);
          break;
        default:
          A.house(ctx, x, y, s, rng);
      }
      ctx.restore();
      if (state === 'burned') {
        ctx.save(); ctx.globalAlpha *= 0.85;
        ctx.beginPath(); for (let i = 0; i < 3; i++) { const sx = x - s + i * s; ctx.moveTo(sx, y - s * 1.2); ctx.quadraticCurveTo(sx + s * 0.4, y - s * 1.9, sx - s * 0.1, y - s * 2.5); ctx.quadraticCurveTo(sx + s * 0.3, y - s * 3, sx + s * 0.1, y - s * 3.4); } stroke(ctx, 1.1, '#4a3a2a');
        ctx.beginPath(); for (let i = 0; i < 5; i++) { ctx.moveTo(x - s * 1.4 + i * s * 0.7, y + s * 0.2); ctx.lineTo(x - s * 1.0 + i * s * 0.7, y - s * 0.4); } stroke(ctx, 1.4, '#1a1010');
        ctx.restore();
      }
      if (state === 'besieged') { A.crossedSwords(ctx, x + s * 2.2, y - s * 0.5, s * 0.8); }
    },
    star(ctx, x, y, r, rng) {
      ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? r * 0.45 : r; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); ctx.fillStyle = '#e9c45a'; ctx.fill(); stroke(ctx, 0.7);
    },
    crossedSwords(ctx, x, y, s) {
      ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s); ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s); stroke(ctx, 1.6, '#7a2418');
      ctx.beginPath(); ctx.moveTo(x - s * 0.55, y - s * 0.85); ctx.lineTo(x - s * 0.85, y - s * 0.55); ctx.moveTo(x + s * 0.55, y - s * 0.85); ctx.lineTo(x + s * 0.85, y - s * 0.55); stroke(ctx, 1.4, '#7a2418');
    },
    // ---------- moving pieces
    wagon(ctx, x, y, s, color) {
      ctx.beginPath(); ctx.rect(x - s * 0.8, y - s * 0.9, s * 1.6, s * 0.7); ctx.fillStyle = FILL; ctx.fill(); stroke(ctx, 1);
      ctx.beginPath(); ctx.moveTo(x - s * 0.8, y - s * 0.9); ctx.quadraticCurveTo(x, y - s * 1.5, x + s * 0.8, y - s * 0.9); ctx.fillStyle = color || FILL_DARK; ctx.fill(); stroke(ctx, 1);
      ctx.beginPath(); ctx.arc(x - s * 0.45, y - s * 0.1, s * 0.25, 0, Math.PI * 2); ctx.moveTo(x + s * 0.7, y - s * 0.1); ctx.arc(x + s * 0.45, y - s * 0.1, s * 0.25, 0, Math.PI * 2); ctx.fillStyle = FILL; ctx.fill(); stroke(ctx, 1);
      ctx.beginPath(); ctx.moveTo(x + s * 0.8, y - s * 0.6); ctx.lineTo(x + s * 1.5, y - s * 0.5); stroke(ctx, 0.9);
    },
    banner(ctx, x, y, s, color) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - s * 2.2); stroke(ctx, 1.1);
      ctx.beginPath(); ctx.moveTo(x, y - s * 2.2); ctx.lineTo(x + s * 1.2, y - s * 1.85); ctx.lineTo(x, y - s * 1.5); ctx.closePath(); ctx.fillStyle = color || '#8f2b1f'; ctx.fill(); stroke(ctx, 0.9);
      // spears
      ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(x + i * s * 0.5 - s * 0.6, y); ctx.lineTo(x + i * s * 0.5 - s * 0.6, y - s * 1.1); } stroke(ctx, 0.8);
    },
    walker(ctx, x, y, s, color) {
      ctx.beginPath(); ctx.arc(x, y - s * 1.5, s * 0.35, 0, Math.PI * 2); ctx.fillStyle = FILL; ctx.fill(); stroke(ctx, 1);
      ctx.beginPath(); ctx.moveTo(x, y - s * 1.15); ctx.lineTo(x, y - s * 0.4); ctx.lineTo(x - s * 0.35, y); ctx.moveTo(x, y - s * 0.4); ctx.lineTo(x + s * 0.35, y); ctx.moveTo(x - s * 0.4, y - s * 0.9); ctx.lineTo(x + s * 0.45, y - s * 0.75); stroke(ctx, 1.1, color || INK);
      ctx.beginPath(); ctx.moveTo(x + s * 0.45, y - s * 1.7); ctx.lineTo(x + s * 0.45, y + s * 0.1); stroke(ctx, 0.9);
    },
    dragonMark(ctx, x, y, s, color) {
      ctx.beginPath(); ctx.moveTo(x - s * 1.4, y - s * 0.3); ctx.quadraticCurveTo(x - s * 0.6, y - s * 1.2, x, y - s * 0.2); ctx.quadraticCurveTo(x + s * 0.6, y - s * 1.2, x + s * 1.4, y - s * 0.3); ctx.quadraticCurveTo(x + s * 0.7, y - s * 0.2, x + s * 0.5, y + s * 0.3); ctx.lineTo(x, y + s * 0.1); ctx.lineTo(x - s * 0.5, y + s * 0.3); ctx.quadraticCurveTo(x - s * 0.7, y - s * 0.2, x - s * 1.4, y - s * 0.3); ctx.closePath(); ctx.fillStyle = color || '#3a2a2a'; ctx.fill(); stroke(ctx, 0.8);
    },
    compassRose(ctx, x, y, r) {
      ctx.save(); A.setup(ctx);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); stroke(ctx, 1.2);
      ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, Math.PI * 2); stroke(ctx, 0.8);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 - Math.PI / 2, len = i % 2 ? r * 0.5 : r * 0.95, w = i % 2 ? r * 0.08 : r * 0.14;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.lineTo(x + Math.cos(a + Math.PI / 2) * w, y + Math.sin(a + Math.PI / 2) * w); ctx.lineTo(x + Math.cos(a - Math.PI / 2) * w, y + Math.sin(a - Math.PI / 2) * w); ctx.closePath();
        ctx.fillStyle = i % 2 ? FILL : INK; ctx.fill(); stroke(ctx, 0.9);
      }
      HB.text.draw(ctx, 'N', x, y - r - 6, { size: r * 0.42, family: 'sc', align: 'center' });
      ctx.restore();
    },
  };
})();
