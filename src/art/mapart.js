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
  let P = null; // the procedural drawings (set at the end); compositions inside this file call these, never the art-pack wrappers

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

    /** mountain peak with base centred at (x,y); opts.pennant: a gold pennant on the summit (a legendary peak) */
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
      if (opts.pennant) { const fy = apexY - h * 0.24; ctx.beginPath(); ctx.moveTo(apexX, apexY); ctx.lineTo(apexX, fy); stroke(ctx, 1); ctx.beginPath(); ctx.moveTo(apexX, fy); ctx.lineTo(apexX + w * 0.16, fy + h * 0.05); ctx.lineTo(apexX, fy + h * 0.1); ctx.closePath(); ctx.fillStyle = '#c9a53a'; ctx.fill(); stroke(ctx, 0.9); }
    },
    /** a legendary peak, base centred at (x,y), about three cells across: two shoulders and a great summit with a gold
     *  pennant, made of the current mountains (a pack's art when it has some, so it matches the range around it) */
    landmarkPeak(ctx, x, y, w, h, rng, key = 'legend') {
      A.mountain(ctx, x - w * 0.29, y - h * 0.03, w * 0.46, h * 0.58, rng, { snow: true, key: key + ':l' });
      A.mountain(ctx, x + w * 0.3, y - h * 0.01, w * 0.42, h * 0.5, rng, { snow: true, key: key + ':r' });
      A.mountain(ctx, x, y, w * 0.62, h, rng, { snow: true, big: true, pennant: true, key: key + ':m' });
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
      P.setup(ctx);
      const state = L.state;
      const faded = state === 'abandoned' || state === 'ruin';
      ctx.save();
      if (faded) ctx.globalAlpha *= 0.6;
      switch (L.type) {
        case 'farm':
          P.house(ctx, x, y, s * 0.9, rng, { chimney: true });
          // field furrows
          ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(x + s * 0.9, y - s * 0.1 - i * s * 0.25); ctx.lineTo(x + s * 1.9, y - s * 0.1 - i * s * 0.25); } stroke(ctx, 0.7, INK_SOFT);
          break;
        case 'village':
          P.house(ctx, x - s * 0.8, y, s * 0.85, rng); P.house(ctx, x + s * 0.7, y + s * 0.1, s * 0.8, rng, { chimney: true }); P.house(ctx, x, y - s * 0.55, s * 0.75, rng);
          break;
        case 'town':
          P.house(ctx, x - s * 1.2, y, s * 0.85, rng); P.house(ctx, x + s * 1.1, y, s * 0.85, rng, { chimney: true });
          P.house(ctx, x - s * 0.5, y - s * 0.6, s * 0.8, rng); P.house(ctx, x + s * 0.5, y - s * 0.65, s * 0.8, rng);
          P.towerGlyph(ctx, x, y, s * 0.9, rng, { cone: true, h: 2.1, w: 0.6 });
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
          P.house(ctx, x - s * 1.1, y - s * 0.75, s * 0.75, rng); P.house(ctx, x + s * 1.0, y - s * 0.75, s * 0.75, rng, { chimney: true }); P.house(ctx, x - s * 0.1, y - s * 0.95, s * 0.7, rng);
          P.towerGlyph(ctx, x + s * 0.35, y - s * 0.7, s * 0.9, rng, { cone: true, h: 2.2, w: 0.55, flag: true, flagColor: opts.flagColor });
          if (big) { P.towerGlyph(ctx, x - s * 1.7, y - s * 0.7, s * 0.8, rng, { h: 1.6, w: 0.6 }); P.towerGlyph(ctx, x + s * 1.75, y - s * 0.7, s * 0.8, rng, { h: 1.6, w: 0.6 }); }
          break;
        }
        case 'castle':
          ctx.beginPath(); ctx.rect(x - s * 1.3, y - s * 0.9, s * 2.6, s * 0.9); ctx.fillStyle = FILL_DARK; ctx.fill(); stroke(ctx, 1.1);
          P.towerGlyph(ctx, x - s * 1.1, y, s, rng, { h: 1.7, w: 0.65 }); P.towerGlyph(ctx, x + s * 1.1, y, s, rng, { h: 1.7, w: 0.65 });
          P.towerGlyph(ctx, x, y - s * 0.3, s * 1.1, rng, { h: 2.3, w: 0.85, flag: true, flagColor: opts.flagColor });
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
          P.mountain(ctx, x, y, s * 3.6, s * 2.6, rng, { big: true });
          ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x - s * 0.5, y - s * 0.7); ctx.arc(x, y - s * 0.7, s * 0.5, Math.PI, 0); ctx.lineTo(x + s * 0.5, y); ctx.fillStyle = INK; ctx.fill();
          ctx.beginPath(); ctx.rect(x - s * 0.8, y - s * 1.1, s * 0.2, s * 1.1); ctx.rect(x + s * 0.6, y - s * 1.1, s * 0.2, s * 1.1); ctx.fillStyle = FILL; ctx.fill(); stroke(ctx, 0.9);
          break;
        case 'glade':
          for (const [dx, hh] of [[-1.1, 2.6], [0, 3.2], [1.1, 2.5]]) { ctx.beginPath(); ctx.moveTo(x + dx * s, y); ctx.lineTo(x + dx * s, y - hh * s); stroke(ctx, 1.1); P.treeRound(ctx, x + dx * s, y - hh * s + s * 0.8, s * 0.7, rng); }
          ctx.beginPath(); ctx.arc(x, y - s * 1.1, s * 0.22, 0, Math.PI * 2); ctx.fillStyle = '#e9c45a'; ctx.fill(); stroke(ctx, 0.7);
          break;
        case 'monastery':
          P.house(ctx, x + s * 0.4, y, s * 1.1, rng, { w: 1.6, h: 0.9 });
          P.towerGlyph(ctx, x - s * 0.9, y, s * 0.9, rng, { cone: true, h: 2.2, w: 0.6 });
          ctx.beginPath(); ctx.arc(x - s * 0.9, y - s * 1.4, s * 0.14, 0, Math.PI * 2); ctx.fillStyle = FILL; ctx.fill(); stroke(ctx, 0.7);
          break;
        case 'shrine':
          ctx.beginPath(); ctx.rect(x - s * 0.5, y - s * 0.9, s, s * 0.9); ctx.fillStyle = FILL_DARK; ctx.fill(); stroke(ctx, 1);
          ctx.beginPath(); ctx.moveTo(x - s * 0.65, y - s * 0.9); ctx.lineTo(x + s * 0.65, y - s * 0.9); stroke(ctx, 1.1);
          P.star(ctx, x, y - s * 1.35, s * 0.35, rng);
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
          P.towerGlyph(ctx, x, y, s * 1.1, rng, { cone: true, h: 3, w: 0.6 });
          ctx.beginPath(); ctx.arc(x, y - s * 2.2, s * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#e9c45a'; ctx.fill();
          break;
        case 'lair':
          P.hill(ctx, x, y, s * 3.2, s * 1.1, rng);
          ctx.beginPath(); ctx.moveTo(x - s * 0.6, y); ctx.lineTo(x - s * 0.6, y - s * 0.6); ctx.arc(x, y - s * 0.6, s * 0.6, Math.PI, 0); ctx.lineTo(x + s * 0.6, y); ctx.fillStyle = INK; ctx.fill();
          break;
        case 'rivalLair':
          P.mountain(ctx, x, y, s * 3.4, s * 2.6, rng, { big: true });
          ctx.beginPath(); ctx.moveTo(x - s * 0.6, y); ctx.lineTo(x - s * 0.6, y - s * 0.6); ctx.arc(x, y - s * 0.6, s * 0.6, Math.PI, 0); ctx.lineTo(x + s * 0.6, y); ctx.fillStyle = INK; ctx.fill();
          ctx.beginPath(); for (let i = 0; i < 3; i++) ctx.arc(x + s * 0.3 + i * s * 0.25, y - s * 2.8 - i * s * 0.45, s * (0.18 + i * 0.1), 0, Math.PI * 2); stroke(ctx, 0.8, INK_SOFT);
          ctx.beginPath(); ctx.moveTo(x - s * 1.5, y + s * 0.3); ctx.lineTo(x - s * 1.0, y + s * 0.3); ctx.moveTo(x - s * 1.25, y + s * 0.05); ctx.lineTo(x - s * 1.25, y + s * 0.55); stroke(ctx, 0.9);
          break;
        case 'battlefield':
          P.crossedSwords(ctx, x, y - s * 0.6, s * 1.1);
          break;
        // ---- the great struggle
        case 'fortress': {
          const tw = (tx, th, tw2) => { ctx.beginPath(); ctx.moveTo(tx - tw2, y); ctx.lineTo(tx - tw2 * 0.8, y - th); ctx.lineTo(tx - tw2 * 1.1, y - th); ctx.lineTo(tx, y - th - s * 1.1); ctx.lineTo(tx + tw2 * 1.1, y - th); ctx.lineTo(tx + tw2 * 0.8, y - th); ctx.lineTo(tx + tw2, y); ctx.closePath(); ctx.fillStyle = '#4a3a34'; ctx.fill(); stroke(ctx, 1.2, '#1a1010'); };
          ctx.beginPath(); ctx.moveTo(x - s * 2.2, y); ctx.lineTo(x - s * 2.0, y - s * 0.9); ctx.lineTo(x - s * 1.6, y - s * 0.6); ctx.lineTo(x - s * 1.1, y - s * 1.0); ctx.lineTo(x + s * 1.1, y - s * 1.0); ctx.lineTo(x + s * 1.6, y - s * 0.6); ctx.lineTo(x + s * 2.0, y - s * 0.9); ctx.lineTo(x + s * 2.2, y); ctx.closePath(); ctx.fillStyle = '#5a4a40'; ctx.fill(); stroke(ctx, 1.1, '#1a1010');
          tw(x - s * 1.4, s * 1.8, s * 0.4); tw(x + s * 1.4, s * 1.8, s * 0.4); tw(x, s * 2.8, s * 0.55);
          ctx.beginPath(); ctx.rect(x - s * 0.1, y - s * 2.0, s * 0.2, s * 0.3); ctx.fillStyle = '#d9542a'; ctx.fill();
          break;
        }
        case 'stronghold':
          if (L.lieutenant === 'sorcerer') {
            ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x - s * 0.3, y - s * 3.2); ctx.lineTo(x, y - s * 3.8); ctx.lineTo(x + s * 0.3, y - s * 3.2); ctx.lineTo(x + s * 0.5, y); ctx.closePath(); ctx.fillStyle = '#2e2a38'; ctx.fill(); stroke(ctx, 1.1, '#100c18');
            ctx.beginPath(); ctx.arc(x, y - s * 3.3, s * 0.18, 0, Math.PI * 2); ctx.fillStyle = '#9a6ad0'; ctx.fill();
          } else if (L.lieutenant === 'blightmother') {
            P.swampTuft(ctx, x - s * 1.2, y + s * 0.2, s * 0.5, rng); P.swampTuft(ctx, x + s * 1.3, y + s * 0.3, s * 0.5, rng);
            P.house(ctx, x, y, s * 0.8, rng, { fill: '#9a8a6a' }); P.treeBare(ctx, x + s * 1.0, y, s * 0.7, rng);
          } else {
            const tent = (tx, ts) => { ctx.beginPath(); ctx.moveTo(tx - ts, y); ctx.lineTo(tx, y - ts * 1.3); ctx.lineTo(tx + ts, y); ctx.closePath(); ctx.fillStyle = '#8a7a5a'; ctx.fill(); stroke(ctx, 1); };
            tent(x - s * 1.1, s * 0.7); tent(x + s * 0.9, s * 0.75); tent(x - s * 0.1, s * 0.9);
            ctx.beginPath(); ctx.moveTo(x + s * 1.9, y); ctx.lineTo(x + s * 1.9, y - s * 2.2); stroke(ctx, 1.1);
            ctx.beginPath(); ctx.moveTo(x + s * 1.9, y - s * 2.2); ctx.lineTo(x + s * 3.0, y - s * 1.9); ctx.lineTo(x + s * 1.9, y - s * 1.6); ctx.closePath(); ctx.fillStyle = '#5a1810'; ctx.fill(); stroke(ctx, 0.8);
          }
          break;
        case 'sanctuary':
          for (const [dx, hh] of [[-1.4, 1.2], [-0.6, 1.5], [0.6, 1.5], [1.4, 1.2]]) { ctx.beginPath(); ctx.rect(x + dx * s - s * 0.18, y - hh * s, s * 0.36, hh * s); ctx.fillStyle = FILL_DARK; ctx.fill(); stroke(ctx, 0.9); }
          ctx.beginPath(); ctx.rect(x - s * 0.45, y - s * 0.45, s * 0.9, s * 0.45); ctx.fillStyle = FILL; ctx.fill(); stroke(ctx, 0.9);
          if (L.state !== 'ruin') { ctx.beginPath(); ctx.moveTo(x, y - s * 1.5); ctx.lineTo(x + s * 0.3, y - s * 0.95); ctx.lineTo(x, y - s * 0.45); ctx.lineTo(x - s * 0.3, y - s * 0.95); ctx.closePath(); ctx.fillStyle = '#7ac08a'; ctx.fill(); stroke(ctx, 0.8); }
          break;
        default:
          P.house(ctx, x, y, s, rng);
      }
      ctx.restore();
      P.stateOverlay(ctx, L, x, y, s);
    },
    /** smoke and char over a burned place, swords beside a besieged one (also drawn over art-pack art that lacks the state) */
    stateOverlay(ctx, L, x, y, s, only) {
      const state = L.state;
      if (state === 'burned' && only !== 'besieged') {
        ctx.save(); ctx.globalAlpha *= 0.85;
        ctx.beginPath(); for (let i = 0; i < 3; i++) { const sx = x - s + i * s; ctx.moveTo(sx, y - s * 1.2); ctx.quadraticCurveTo(sx + s * 0.4, y - s * 1.9, sx - s * 0.1, y - s * 2.5); ctx.quadraticCurveTo(sx + s * 0.3, y - s * 3, sx + s * 0.1, y - s * 3.4); } stroke(ctx, 1.1, '#4a3a2a');
        ctx.beginPath(); for (let i = 0; i < 5; i++) { ctx.moveTo(x - s * 1.4 + i * s * 0.7, y + s * 0.2); ctx.lineTo(x - s * 1.0 + i * s * 0.7, y - s * 0.4); } stroke(ctx, 1.4, '#1a1010');
        ctx.restore();
      }
      if (state === 'besieged') A.crossedSwords(ctx, x + s * 2.2, y - s * 0.5, s * 0.8); // map.marker.crossedSwords if a pack has it
    },
    star(ctx, x, y, r, rng) {
      ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? r * 0.45 : r; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); ctx.fillStyle = '#e9c45a'; ctx.fill(); stroke(ctx, 0.7);
    },
    crossedSwords(ctx, x, y, s) {
      ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s); ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s); stroke(ctx, 1.6, '#7a2418');
      ctx.beginPath(); ctx.moveTo(x - s * 0.55, y - s * 0.85); ctx.lineTo(x - s * 0.85, y - s * 0.55); ctx.moveTo(x + s * 0.55, y - s * 0.85); ctx.lineTo(x + s * 0.85, y - s * 0.55); stroke(ctx, 1.4, '#7a2418');
    },
    // ---------- the dragon's domain: blighted and flourishing variants of the land, the settlement at the hill
    /** a dead tree: trunk and bare branches (tyranny's edge) */
    treeBare(ctx, x, y, s, rng) {
      const h = s * (1.9 + rng.next() * 0.5);
      ctx.beginPath(); ctx.moveTo(x, y + s * 0.5); ctx.lineTo(x + J(rng, s * 0.1), y - h);
      for (let i = 0; i < 3; i++) { const t = 0.35 + i * 0.2, by = y - h * t, side = i % 2 ? 1 : -1; ctx.moveTo(x, by); ctx.lineTo(x + side * s * (0.5 + rng.next() * 0.3), by - s * (0.45 + rng.next() * 0.3)); }
      stroke(ctx, 1);
    },
    /** a burned husk: charred stump with a broken limb (deep in a tyrant's land) */
    treeBurned(ctx, x, y, s, rng) {
      const h = s * (1.1 + rng.next() * 0.5);
      ctx.beginPath(); ctx.moveTo(x - s * 0.18, y + s * 0.5); ctx.lineTo(x - s * 0.12, y - h); ctx.lineTo(x + s * 0.05, y - h * 0.8); ctx.lineTo(x + s * 0.16, y - h * 1.05); ctx.lineTo(x + s * 0.2, y + s * 0.5); ctx.closePath();
      ctx.fillStyle = '#3a2a22'; ctx.fill(); stroke(ctx, 0.9, '#1a1010');
      ctx.beginPath(); ctx.moveTo(x, y - h * 0.55); ctx.lineTo(x + s * 0.55, y - h * 0.85); stroke(ctx, 0.9, '#1a1010');
    },
    /** mountains drawn as jagged teeth with ash-dark hatching: a stylised corruption, not new geography */
    mountainJagged(ctx, x, y, w, h, rng, opts = {}) {
      const n = 3 + (rng.next() < 0.5 ? 1 : 0), lx = x - w / 2, pts = [[lx, y]];
      for (let i = 0; i < n; i++) { const t0 = (i + 0.5) / n; const tall = i === Math.floor(n / 2) ? 1 : 0.55 + rng.next() * 0.3; pts.push([lx + w * (t0 - 0.5 / n * 0.6), y - h * tall * 0.35], [lx + w * t0 + J(rng, w * 0.03), y - h * tall], [lx + w * (t0 + 0.5 / n * 0.6), y - h * tall * 0.4]); }
      pts.push([x + w / 2, y]);
      ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath();
      ctx.fillStyle = opts.deep ? '#8a7a68' : '#b8a68a'; ctx.fill();
      ctx.save(); ctx.clip(); ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 0.9; ctx.globalAlpha *= opts.deep ? 0.8 : 0.6;
      for (let k = 0; k < Math.round(w / 2.6); k++) { const hx = lx + k * 2.6; ctx.beginPath(); ctx.moveTo(hx, y); ctx.lineTo(hx + h * 0.5, y - h); ctx.stroke(); }
      ctx.restore();
      ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); stroke(ctx, opts.big ? 1.5 : 1.3, '#1a1010');
    },
    /** scattered ash */
    ash(ctx, x, y, s, rng) { ctx.fillStyle = 'rgba(40,26,20,0.55)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + J(rng, s), y + J(rng, s * 0.6), 0.6 + rng.next() * 0.6, 0, Math.PI * 2); ctx.fill(); } },
    /** a cultivated field: a small patch of furrows (a protector's land) */
    field(ctx, x, y, s, rng) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(J(rng, 0.25));
      ctx.beginPath(); ctx.rect(-s, -s * 0.45, s * 2, s * 0.9); ctx.fillStyle = 'rgba(176,150,60,0.18)'; ctx.fill(); stroke(ctx, 0.7, INK_SOFT);
      ctx.beginPath(); for (let i = 1; i < 4; i++) { const fy = -s * 0.45 + i * s * 0.225; ctx.moveTo(-s * 0.9, fy); ctx.lineTo(s * 0.9, fy); } stroke(ctx, 0.6, INK_SOFT);
      ctx.restore();
    },
    /** a small gold fleck in a flourishing grove: restrained colour */
    blossom(ctx, x, y, s) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.9, s * 0.18), 0, Math.PI * 2); ctx.fillStyle = '#d9b44a'; ctx.fill(); },
    /** a pennant beside a settlement showing what it is to you */
    pennant(ctx, x, y, s, color, mark) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - s * 2.1); stroke(ctx, 1);
      ctx.beginPath(); ctx.moveTo(x, y - s * 2.1); ctx.lineTo(x + s * 1.3, y - s * 1.8); ctx.lineTo(x + s * 0.9, y - s * 1.6); ctx.lineTo(x + s * 1.3, y - s * 1.4); ctx.lineTo(x, y - s * 1.3); ctx.closePath();
      ctx.fillStyle = color; ctx.fill(); stroke(ctx, 0.8);
      if (mark === 'sun') { ctx.beginPath(); ctx.arc(x + s * 0.45, y - s * 1.72, s * 0.17, 0, Math.PI * 2); ctx.fillStyle = '#f3e3a0'; ctx.fill(); }
      if (mark === 'eye') { ctx.beginPath(); ctx.ellipse(x + s * 0.45, y - s * 1.72, s * 0.22, s * 0.1, 0, 0, Math.PI * 2); ctx.fillStyle = '#d9542a'; ctx.fill(); }
    },
    /** the settlement at the foot of the dragon's hill, drawn beside the lair glyph */
    homeSettlement(ctx, x, y, s, stage, path, rng) {
      P.setup(ctx);
      const dark = path === 'tyrannical';
      const tent = (tx, ty, ts) => { ctx.beginPath(); ctx.moveTo(tx - ts, ty); ctx.lineTo(tx, ty - ts * 1.2); ctx.lineTo(tx + ts, ty); ctx.closePath(); ctx.fillStyle = dark ? '#c9b48c' : FILL; ctx.fill(); stroke(ctx, 0.9); };
      const darkTower = (tx, ty, ts, hh) => { ctx.beginPath(); ctx.moveTo(tx - ts * 0.4, ty); ctx.lineTo(tx - ts * 0.3, ty - ts * hh); ctx.lineTo(tx - ts * 0.45, ty - ts * hh); ctx.lineTo(tx, ty - ts * (hh + 0.9)); ctx.lineTo(tx + ts * 0.45, ty - ts * hh); ctx.lineTo(tx + ts * 0.3, ty - ts * hh); ctx.lineTo(tx + ts * 0.4, ty); ctx.closePath(); ctx.fillStyle = '#4a3a34'; ctx.fill(); stroke(ctx, 1, '#1a1010'); ctx.beginPath(); ctx.rect(tx - ts * 0.08, ty - ts * hh * 0.6, ts * 0.16, ts * 0.22); ctx.fillStyle = '#d9542a'; ctx.fill(); };
      const smoke = (sx, sy, ss) => { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + ss * 0.4, sy - ss * 0.7, sx - ss * 0.1, sy - ss * 1.3); ctx.quadraticCurveTo(sx + ss * 0.3, sy - ss * 1.8, sx + ss * 0.1, sy - ss * 2.2); stroke(ctx, 1, 'rgba(60,44,36,0.7)'); };
      const wallArc = (r, col) => { ctx.beginPath(); ctx.arc(x, y + s * 0.2, r, Math.PI * 1.05, Math.PI * 1.95); stroke(ctx, 1.3, col || INK); };
      if (!dark) {
        // pilgrims' camps → a village with fields → a walled town → a castle and sanctuary
        if (stage >= 2) { P.field(ctx, x - s * 2.6, y + s * 0.8, s * 0.8, rng); P.field(ctx, x + s * 2.4, y + s * 0.9, s * 0.8, rng); }
        if (stage === 1) { tent(x - s * 0.9, y + s * 0.2, s * 0.55); P.house(ctx, x + s * 0.8, y + s * 0.3, s * 0.6, rng, { chimney: true }); }
        if (stage >= 2) { P.house(ctx, x - s * 1.3, y + s * 0.2, s * 0.65, rng); P.house(ctx, x + s * 1.2, y + s * 0.25, s * 0.65, rng, { chimney: true }); P.house(ctx, x, y + s * 0.5, s * 0.6, rng); }
        if (stage >= 3) { wallArc(s * 2.4); P.towerGlyph(ctx, x - s * 2.1, y + s * 0.3, s * 0.65, rng, { cone: true, h: 1.8, w: 0.6 }); P.house(ctx, x + s * 2.0, y + s * 0.4, s * 0.6, rng); }
        if (stage >= 4) { P.towerGlyph(ctx, x + s * 2.6, y + s * 0.1, s * 0.85, rng, { h: 2.4, w: 0.8, flag: true, flagColor: '#c9a23a' }); P.star(ctx, x - s * 2.1, y - s * 1.9, s * 0.35, rng); }
      } else {
        // a coerced camp → a palisade with watchtowers → a citadel with furnaces → a dark stronghold
        if (stage === 1) { tent(x - s * 1.0, y + s * 0.3, s * 0.55); tent(x + s * 0.9, y + s * 0.35, s * 0.5); ctx.beginPath(); for (let i = 0; i < 7; i++) { const px = x - s * 1.8 + i * s * 0.6; ctx.moveTo(px, y + s * 0.8); ctx.lineTo(px, y + s * 0.15); } stroke(ctx, 1); }
        if (stage >= 2) { ctx.beginPath(); for (let i = 0; i < 11; i++) { const px = x - s * 2.6 + i * s * 0.52; ctx.moveTo(px, y + s * 0.9); ctx.lineTo(px, y + s * 0.1); ctx.lineTo(px + s * 0.12, y - s * 0.05); } stroke(ctx, 1); tent(x - s * 1.2, y + s * 0.4, s * 0.5); tent(x + s * 1.3, y + s * 0.45, s * 0.5); P.towerGlyph(ctx, x - s * 2.6, y + s * 0.9, s * 0.6, rng, { h: 2, w: 0.55 }); }
        if (stage >= 3) { darkTower(x + s * 2.3, y + s * 0.8, s * 0.9, 2.2); smoke(x + s * 2.3, y - s * 1.6, s); darkTower(x - s * 0.2, y + s * 0.8, s * 0.7, 1.6); smoke(x - s * 0.2, y - s * 0.8, s * 0.8); }
        if (stage >= 4) { darkTower(x - s * 2.0, y + s * 0.8, s * 1.1, 2.8); darkTower(x + s * 3.2, y + s * 0.8, s * 0.8, 2); ctx.beginPath(); ctx.moveTo(x - s * 3.2, y + s * 0.9); ctx.lineTo(x + s * 3.8, y + s * 0.9); stroke(ctx, 1.6, '#1a1010'); }
      }
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
      ctx.save(); P.setup(ctx);
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
    /** a seal over a place; (x, y) is the seal's centre. kind: 'story' (red, !), 'locked' (red, ?: a crag or sealed door),
     *  'shadow' (purple with a crown: the Hollow King's places), 'crystal' (green with a crystal: a sanctuary) */
    seal(ctx, x, y, r, kind) {
      const crystal = kind === 'crystal', shadow = kind === 'shadow';
      ctx.save();
      ctx.fillStyle = crystal ? '#3f6d3a' : shadow ? '#3a1e48' : '#8f2b1f'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      if (crystal || shadow) {
        ctx.strokeStyle = crystal ? '#d9c66a' : '#c9541e'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#f6ecd2'; ctx.beginPath();
        if (crystal) { ctx.moveTo(x, y - r * 0.6); ctx.lineTo(x + r * 0.4, y); ctx.lineTo(x, y + r * 0.6); ctx.lineTo(x - r * 0.4, y); }
        else { const yb = y + r * 0.4, w = r * 0.6; ctx.moveTo(x - w, yb); ctx.lineTo(x - w, yb - r * 0.6); ctx.lineTo(x - w * 0.4, yb - r * 0.3); ctx.lineTo(x, yb - r * 0.8); ctx.lineTo(x + w * 0.4, yb - r * 0.3); ctx.lineTo(x + w, yb - r * 0.6); ctx.lineTo(x + w, yb); }
        ctx.closePath(); ctx.fill();
      } else HB.text.draw(ctx, kind === 'locked' ? '?' : '!', x, y + r * 0.55, { size: Math.max(11, r * 1.5), family: 'sc', align: 'center', color: '#f6ecd2' });
      ctx.restore();
    },
    /** red crossed swords over a place under outlaw attack; (x, y) is the centre */
    threatMark(ctx, x, y, s) {
      ctx.save(); ctx.translate(x, y);
      ctx.strokeStyle = '#8f2b1f'; ctx.lineWidth = Math.max(1.5, s * 0.18); ctx.lineCap = 'round';
      for (const sgn of [1, -1]) { ctx.beginPath(); ctx.moveTo(-s * 0.7 * sgn, s * 0.7); ctx.lineTo(s * 0.7 * sgn, -s * 0.7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * 0.7 * sgn + s * 0.25, s * 0.7 - s * 0.05 * sgn); ctx.lineTo(-s * 0.7 * sgn + s * 0.05, s * 0.45); ctx.stroke(); }
      ctx.restore();
    },
    /** a dotted ring with a question mark: a place known only by rumour; (x, y) is its base */
    rumorMark(ctx, x, y, s) {
      ctx.save(); ctx.strokeStyle = HB.palette.ink; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(x, y - s * 0.6, s * 0.9, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      HB.text.draw(ctx, '?', x, y - s * 0.6 + s * 0.45, { size: s * 1.4, align: 'center', color: HB.palette.ink });
      ctx.restore();
    },
    /** Default map dragon: retain the existing pixel sprite when no illustrated marker is selected. */
    dragonMarker(ctx, x, y, s, o = {}) {
      const spec = o.spec || { tier: 0, breed: 'red', alignment: 0, mutations: [], scars: 0 };
      HB.dragonArt.draw(ctx, spec, o.pose || (o.flying ? 'fly' : 'idle'), o.frame || 0, x, y, o.scale || s / 7, o.flipX ? -1 : 1);
    },
    /** a small faction flag, drawn over art-pack settlement art at its attach.flag point */
    flag(ctx, x, y, s, color) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - s * 0.8); stroke(ctx, 0.9);
      ctx.beginPath(); ctx.moveTo(x, y - s * 0.8); ctx.lineTo(x + s * 0.55, y - s * 0.62); ctx.lineTo(x, y - s * 0.44); ctx.closePath(); ctx.fillStyle = color || '#8f2b1f'; ctx.fill(); stroke(ctx, 0.7);
    },
  };

  // ---------- art packs (src/art/mapassets.js, ids in src/data/mapspec.js)
  // Every public glyph first asks HB.mapAssets for external art and draws procedurally when there is none.
  // Compositions inside this file (a castle's towers, a hold's mountain) always use the procedural versions (P).
  P = A.proc = {};
  for (const k in A) if (typeof A[k] === 'function') P[k] = A[k];
  const MA = () => HB.mapAssets;
  const wrap = (name, req) => {
    A[name] = function () {
      const m = MA();
      if (m && m.entries.size) { const q = req.apply(null, arguments); if (q && A.tone) q.tone = A.tone; const p = q && m.draw(arguments[0], q.ids, q.x, q.y, q.param, q); if (p) { if (q.after) q.after(p); return; } }
      return P[name].apply(A, arguments);
    };
  };
  const simple = (name, id) => wrap(name, (ctx, x, y, s, rng, key) => ({ ids: [id], x, y, param: s, key }));
  const MTN = 'map.terrain.mountain';
  // a legendary peak's summit drawn with a pack's mountain art still gets its gold pennant on top
  const tops = new WeakMap(); // per variant: where its summit is (first row with ink), as fractions of its box
  const summit = (v) => {
    let t = tops.get(v); if (t) return t; t = { x: 0.5, y: 0 };
    try {
      const c = document.createElement('canvas'); c.width = v.sw; c.height = v.sh; const g = c.getContext('2d');
      g.drawImage(v.img, v.rect[0], v.rect[1], v.sw, v.sh, 0, 0, v.sw, v.sh); const d = g.getImageData(0, 0, v.sw, v.sh).data;
      row: for (let y = 0; y < v.sh; y++) { let n = 0, sx = 0; for (let x = 0; x < v.sw; x++) if (d[(y * v.sw + x) * 4 + 3] > 60) { n++; sx += x; } if (n) { t = { x: (sx / n + 0.5) / v.sw, y: y / v.sh }; break row; } }
    } catch (e) { /* a picture from file:// cannot be read back: the box's top centre */ }
    tops.set(v, t); return t;
  };
  const pennantAfter = (ctx, x, h) => (p) => {
    if (!p.dh) return;
    const t = summit(p.v); let ax = p.dx + t.x * p.dw; if (p.flip) ax = 2 * x - ax;
    P.flag(ctx, ax, p.dy + t.y * p.dh + 1, h * 0.2, '#c9a53a');
  };
  wrap('mountain', (ctx, x, y, w, h, rng, o = {}) => ({ ids: o.big ? [MTN + '.peak', MTN + '.snow', MTN] : o.small ? (o.snow ? [MTN + '.small.snow', MTN + '.small', MTN + '.snow', MTN] : [MTN + '.small', MTN]) : o.snow ? [MTN + '.snow', MTN] : [MTN], x, y, param: w, paramY: h, key: o.key, after: o.pennant ? pennantAfter(ctx, x, h) : null }));
  wrap('landmarkPeak', (ctx, x, y, w, h, rng, key) => ({ ids: ['map.landmark.peak'], x, y, param: w, paramY: h, key }));
  // a pack without the tyrant's mountains uses its own mountain (in the evil tone when it has one) rather than the ink
  wrap('mountainJagged', (ctx, x, y, w, h, rng, o = {}) => ({ ids: o.deep ? ['map.terrain.mountain.jagged.deep', 'map.terrain.mountain.jagged', MTN] : ['map.terrain.mountain.jagged', MTN], x, y, param: w, paramY: h, key: o.key }));
  wrap('hill', (ctx, x, y, w, h, rng, key) => ({ ids: ['map.terrain.hill'], x, y, param: w, paramY: h, key }));
  simple('treeRound', 'map.terrain.tree.round'); simple('treePine', 'map.terrain.tree.pine');
  simple('treeBare', 'map.terrain.tree.bare'); simple('treeBurned', 'map.terrain.tree.burned');
  simple('grassTuft', 'map.terrain.grass'); simple('swampTuft', 'map.terrain.swamp'); simple('dune', 'map.terrain.dune'); simple('snowDots', 'map.terrain.snow');
  simple('field', 'map.terrain.field'); simple('ash', 'map.terrain.ash');
  wrap('blossom', (ctx, x, y, s, key) => ({ ids: ['map.terrain.blossom'], x, y, param: s, key }));
  wrap('wave', (ctx, x, y, len, rng, alpha, key) => ({ ids: ['map.terrain.wave'], x, y, param: len, key }));
  wrap('cloud', (ctx, x, y, r, rng, o = {}) => ({ ids: o.storm ? ['map.fog.cloud.storm', 'map.fog.cloud'] : ['map.fog.cloud'], x, y, param: r, key: o.key, cloud: o }));
  wrap('lightning', (ctx, x, y, s, rng, key) => ({ ids: ['map.fog.lightning'], x, y, param: s, key }));
  wrap('homeSettlement', (ctx, x, y, s, stage, path) => ({ ids: [`map.home.${path}.${stage}`], x, y, param: s, key: 'home' }));
  wrap('pennant', (ctx, x, y, s, color, mark, status) => status ? { ids: [`map.marker.pennant.${status}`], x, y, param: s, key: status, tint: color, mark } : null);
  wrap('crossedSwords', (ctx, x, y, s) => ({ ids: ['map.marker.crossedSwords'], x, y, param: s, key: 'swords' }));
  wrap('wagon', (ctx, x, y, s, color, key) => ({ ids: color ? ['map.marker.wagon.rich', 'map.marker.wagon'] : ['map.marker.wagon'], x, y, param: s, key, tint: color }));
  wrap('banner', (ctx, x, y, s, color, key) => ({ ids: ['map.marker.banner'], x, y, param: s, key, tint: color }));
  wrap('walker', (ctx, x, y, s, color, key) => ({ ids: color ? ['map.marker.walker.hunter', 'map.marker.walker'] : ['map.marker.walker'], x, y, param: s, key }));
  wrap('dragonMarker', (ctx, x, y, s, o = {}) => ({ ids: [o.flying ? 'map.marker.dragon.flying' : 'map.marker.dragon.resting', 'map.marker.dragon'], x, y, param: s, key: o.key, inkTint: o.inkTint, flipX: o.flipX }));
  wrap('compassRose', (ctx, x, y, r) => ({ ids: ['map.decoration.compass'], x, y, param: r, key: 'compass' }));
  wrap('seal', (ctx, x, y, r, kind, key) => ({ ids: kind === 'locked' ? ['map.marker.seal.story.locked', 'map.marker.seal.story'] : [`map.marker.seal.${kind}`], x, y, param: r, key }));
  wrap('threatMark', (ctx, x, y, s, key) => ({ ids: ['map.marker.threat'], x, y, param: s, key }));
  wrap('rumorMark', (ctx, x, y, s, key) => ({ ids: ['map.marker.rumor'], x, y, param: s, key }));
  // places: the most specific art wins (sub-kind and state, sub-kind, state, kind); a missing state is still shown
  // (faded for ruins, smoke and char for burned), besieged swords are always drawn, and a faction flag goes at attach.flag
  A.settlement = function (ctx, L, x, y, s, rng, opts = {}) {
    const m = MA();
    if (m && m.entries.size) {
      const { ids, state } = m.placeIds(L), r = m.resolve(ids, 'loc' + L.id);
      if (r) {
        const hasState = state && r.id.endsWith('.' + state);
        ctx.save(); if (state === 'ruin' && !hasState) ctx.globalAlpha *= 0.6;
        const d = m.drawResolved(ctx, r, x, y, s, { key: 'loc' + L.id, tint: opts.flagColor });
        ctx.restore();
        if (r.v.attach && Array.isArray(r.v.attach.flag) && opts.flagColor) { const fx = d.flip ? 2 * x - (d.dx + r.v.attach.flag[0] * d.sx) : d.dx + r.v.attach.flag[0] * d.sx; P.setup(ctx); P.flag(ctx, state ? x + s * 1.5 : fx, state ? y : d.dy + r.v.attach.flag[1] * d.sy, s, opts.flagColor); }
        if (state === 'burned' && r.v.treatment && HB.mapInk) HB.mapInk.smoke(ctx, x, y, s);
        P.stateOverlay(ctx, L, x, y, s, state === 'burned' && hasState ? 'besieged' : undefined);
        return;
      }
    }
    return P.settlement(ctx, L, x, y, s, rng, opts);
  };
})();
