/* Parchment textures, inked panels and decorative frames. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  const parchment = HB.parchment = {
    tile: null, pattern: null, darkPattern: null,
    init() {
      const rng = new HB.RNG('parchment');
      const noise = new HB.Noise2D(rng);
      const S = 512;
      const make = (base, dark, light, grain) => {
        const c = document.createElement('canvas'); c.width = S; c.height = S;
        const ctx = c.getContext('2d');
        const img = ctx.createImageData(S, S);
        const d = img.data;
        const b = HB.px.hexToRgb(base), dk = HB.px.hexToRgb(dark), lt = HB.px.hexToRgb(light);
        const f = (x, y) => noise.fbm(x / 90, y / 90, 4, 2.1, 0.55) * 0.7 + noise.fbm(x / 23 + 50, y / 23 + 50, 3) * 0.3;
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          // seamless tiling: blend four offset samples weighted by position (standard tileable-noise trick)
          const wx = x / S, wy = y / S;
          const n = (f(x, y) * (1 - wx) * (1 - wy) + f(x - S, y) * wx * (1 - wy) + f(x - S, y - S) * wx * wy + f(x, y - S) * (1 - wx) * wy);
          const g = (rng.next() - 0.5) * grain;
          const t = HB.clamp(0.5 + n * 0.55, 0, 1);
          const i = (y * S + x) * 4;
          const col = t < 0.5 ? mix(dk, b, t * 2) : mix(b, lt, (t - 0.5) * 2);
          d[i] = HB.clamp(col[0] + g, 0, 255); d[i + 1] = HB.clamp(col[1] + g, 0, 255); d[i + 2] = HB.clamp(col[2] + g, 0, 255); d[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        // fibres
        ctx.strokeStyle = 'rgba(90,60,30,0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 260; i++) {
          const x = rng.next() * S, y = rng.next() * S, len = 6 + rng.next() * 30, a = rng.next() * Math.PI;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
        }
        // specks
        for (let i = 0; i < 400; i++) {
          ctx.fillStyle = `rgba(70,40,20,${0.05 + rng.next() * 0.12})`;
          ctx.fillRect(rng.next() * S, rng.next() * S, 1 + rng.next() * 1.5, 1 + rng.next() * 1.5);
        }
        return c;
      };
      parchment.tile = make('#e3d1a6', '#c8b07c', '#f2e5c4', 14);
      parchment.darkTile = make('#cdb784', '#ad9360', '#e0cc9c', 12);
      parchment.lightTile = make('#efe2c0', '#d9c69a', '#faf1d8', 10);
      const ctx = HB.app.ctx;
      parchment.pattern = ctx.createPattern(parchment.tile, 'repeat');
      parchment.darkPattern = ctx.createPattern(parchment.darkTile, 'repeat');
      parchment.lightPattern = ctx.createPattern(parchment.lightTile, 'repeat');
    },
    /** fill a rect with parchment ('base'|'dark'|'light') */
    fill(ctx, x, y, w, h, tone = 'base') {
      ctx.save();
      ctx.fillStyle = tone === 'dark' ? parchment.darkPattern : tone === 'light' ? parchment.lightPattern : parchment.pattern;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    },
    /** vignette darkening on the edges of a rect */
    vignette(ctx, x, y, w, h, strength = 0.25) {
      ctx.save();
      const g = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.35, x + w / 2, y + h / 2, Math.max(w, h) * 0.75);
      g.addColorStop(0, 'rgba(80,50,20,0)');
      g.addColorStop(1, `rgba(80,50,20,${strength})`);
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ctx.restore();
    },
    /** inked double border with corner ornaments */
    border(ctx, x, y, w, h, opts = {}) {
      const ink = opts.color || HB.palette.ink;
      ctx.save();
      ctx.strokeStyle = ink;
      ctx.lineWidth = opts.width || 2;
      ctx.lineJoin = 'round';
      roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, opts.radius || 3); ctx.stroke();
      if (!opts.single) {
        ctx.lineWidth = 1;
        ctx.globalAlpha *= 0.75;
        roundRect(ctx, x + 5.5, y + 5.5, w - 11, h - 11, 2); ctx.stroke();
        // corner flourishes
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.2;
        const f = opts.flourish === undefined ? 9 : opts.flourish;
        if (f > 0) {
          const corners = [[x + 5.5, y + 5.5, 1, 1], [x + w - 5.5, y + 5.5, -1, 1], [x + 5.5, y + h - 5.5, 1, -1], [x + w - 5.5, y + h - 5.5, -1, -1]];
          for (const [cx, cy, sx, sy] of corners) {
            ctx.beginPath();
            ctx.moveTo(cx + sx * f, cy);
            ctx.quadraticCurveTo(cx + sx * f * 0.4, cy + sy * f * 0.4, cx, cy + sy * f);
            ctx.stroke();
            ctx.beginPath(); ctx.arc(cx + sx * f * 0.55, cy + sy * f * 0.55, 1.6, 0, Math.PI * 2); ctx.fillStyle = ink; ctx.fill();
          }
        }
      }
      ctx.restore();
    },
    /** full panel: shadow, parchment, vignette, border, optional title banner. */
    panel(ctx, x, y, w, h, opts = {}) {
      ctx.save();
      if (opts.shadow !== false) {
        ctx.fillStyle = 'rgba(20,10,5,0.45)';
        roundRect(ctx, x + 5, y + 7, w, h, 4); ctx.fill();
      }
      ctx.save();
      roundRect(ctx, x, y, w, h, 4); ctx.clip();
      parchment.fill(ctx, x, y, w, h, opts.tone || 'base');
      parchment.vignette(ctx, x, y, w, h, opts.vignette === undefined ? 0.22 : opts.vignette);
      if (opts.stains !== false) stains(ctx, x, y, w, h, opts.stainSeed || (x * 7 + y * 13 + w));
      ctx.restore();
      parchment.border(ctx, x, y, w, h, opts);
      if (opts.title) {
        const size = opts.titleSize || 22;
        const tw = HB.text.width(opts.title, size, { family: 'sc' }) + 36;
        const tx = x + w / 2;
        ctx.save();
        // banner tab
        ctx.fillStyle = HB.palette.parchmentLight;
        roundRect(ctx, tx - tw / 2, y - size * 0.75, tw, size * 1.5, 3); ctx.fill();
        ctx.strokeStyle = HB.palette.ink; ctx.lineWidth = 1.5; ctx.stroke();
        HB.text.draw(ctx, opts.title, tx, y + size * 0.42, { size, family: 'sc', align: 'center', color: HB.palette.ink });
        ctx.restore();
      }
      ctx.restore();
    },
    /** small plaque used for buttons / tags */
    plaque(ctx, x, y, w, h, opts = {}) {
      ctx.save();
      roundRect(ctx, x, y, w, h, opts.radius || 3);
      ctx.fillStyle = opts.fill || 'rgba(255,246,222,0.55)';
      ctx.fill();
      ctx.strokeStyle = opts.color || HB.palette.ink;
      ctx.lineWidth = opts.width || 1.5;
      ctx.stroke();
      ctx.restore();
    },
    /** a horizontal ink rule with a centre ornament */
    rule(ctx, x, y, w, opts = {}) {
      ctx.save();
      ctx.strokeStyle = opts.color || HB.palette.ink; ctx.lineWidth = 1; ctx.globalAlpha *= opts.alpha || 0.8;
      ctx.beginPath(); ctx.moveTo(x, y + 0.5); ctx.lineTo(x + w, y + 0.5); ctx.stroke();
      if (opts.ornament !== false) {
        ctx.fillStyle = opts.color || HB.palette.ink;
        ctx.beginPath(); ctx.moveTo(x + w / 2, y - 3); ctx.lineTo(x + w / 2 + 4, y + 0.5); ctx.lineTo(x + w / 2, y + 4); ctx.lineTo(x + w / 2 - 4, y + 0.5); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },
    roundRect,
  };

  function stains(ctx, x, y, w, h, seed) {
    const rng = new HB.RNG(seed);
    const n = 1 + rng.int(3);
    for (let i = 0; i < n; i++) {
      const sx = x + rng.next() * w, sy = y + rng.next() * h, r = 20 + rng.next() * Math.min(w, h) * 0.3;
      const g = ctx.createRadialGradient(sx, sy, r * 0.2, sx, sy, r);
      g.addColorStop(0, 'rgba(120,80,30,0.0)');
      g.addColorStop(0.8, `rgba(120,80,30,${0.04 + rng.next() * 0.06})`);
      g.addColorStop(1, 'rgba(120,80,30,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
})();
