/* Fonts and text drawing. Bundled IM Fell English (OFL) with serif fallback. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  const families = {
    body: '"IM Fell English", "Palatino Linotype", Georgia, serif',
    sc: '"IM Fell English SC", "Palatino Linotype", Georgia, serif',
    mono: '"Courier New", monospace',
  };

  const text = HB.text = {
    families,
    ready: false,
    wrapCache: new Map(),
    font(size, opts = {}) {
      const fam = families[opts.family || 'body'];
      return `${opts.italic ? 'italic ' : ''}${opts.weight ? opts.weight + ' ' : ''}${Math.round(size)}px ${fam}`;
    },
    async load() {
      const defs = [
        ['IM Fell English', 'assets/fonts/IMFellEnglish-Regular.woff', { style: 'normal' }],
        ['IM Fell English', 'assets/fonts/IMFellEnglish-Italic.woff', { style: 'italic' }],
        ['IM Fell English SC', 'assets/fonts/IMFellEnglishSC-Regular.woff', { style: 'normal' }],
      ];
      const loads = defs.map(([fam, url, desc]) => {
        try {
          const ff = new FontFace(fam, `url(${url})`, desc);
          return ff.load().then(f => { document.fonts.add(f); }).catch(() => null);
        } catch (e) { return Promise.resolve(null); }
      });
      const timeout = new Promise(res => setTimeout(res, 2500));
      await Promise.race([Promise.all(loads), timeout]);
      text.ready = true;
      text.wrapCache.clear();
    },
    /** Draw a line of text. opts: size, family, italic, color, align ('left'|'center'|'right'), baseline, shadow, spacing, alpha, maxWidth */
    draw(ctx, str, x, y, opts = {}) {
      if (str === undefined || str === null) return 0;
      str = String(str);
      const size = opts.size || 18;
      ctx.save();
      ctx.font = text.font(size, opts);
      ctx.textBaseline = opts.baseline || 'alphabetic';
      ctx.fillStyle = opts.color || HB.palette.ink;
      if (opts.alpha !== undefined) ctx.globalAlpha *= opts.alpha;
      const spacing = opts.spacing || 0;
      let width = text.measure(ctx, str, spacing);
      if (opts.maxWidth && width > opts.maxWidth) {
        // shrink to fit
        const scale = opts.maxWidth / width;
        ctx.font = text.font(size * scale, opts);
        width = text.measure(ctx, str, spacing);
      }
      let sx = x;
      if (opts.align === 'center') sx = x - width / 2;
      else if (opts.align === 'right') sx = x - width;
      if (opts.shadow) {
        ctx.save();
        ctx.fillStyle = typeof opts.shadow === 'string' ? opts.shadow : 'rgba(0,0,0,0.35)';
        drawRun(ctx, str, sx + 1, y + 1, spacing);
        ctx.restore();
      }
      if (opts.stroke) { ctx.lineWidth = opts.strokeWidth || 3; ctx.strokeStyle = opts.stroke; ctx.lineJoin = 'round'; strokeRun(ctx, str, sx, y, spacing); }
      drawRun(ctx, str, sx, y, spacing);
      ctx.restore();
      return width;
    },
    measure(ctx, str, spacing = 0) {
      if (!spacing) return ctx.measureText(str).width;
      let w = 0;
      for (const ch of str) w += ctx.measureText(ch).width + spacing;
      return w - spacing;
    },
    width(str, size, opts = {}) {
      const ctx = HB.app.ctx; ctx.save(); ctx.font = text.font(size, opts);
      const w = text.measure(ctx, String(str), opts.spacing || 0); ctx.restore(); return w;
    },
    /** word wrap -> array of lines */
    wrap(ctx, str, maxWidth, size, opts = {}) {
      const key = `${str}|${maxWidth}|${size}|${opts.family || ''}|${opts.italic ? 1 : 0}`;
      const cached = text.wrapCache.get(key);
      if (cached) return cached;
      ctx.save(); ctx.font = text.font(size, opts);
      const lines = [];
      for (const para of String(str).split('\n')) {
        const words = para.split(' ');
        let line = '';
        for (const w of words) {
          const test = line ? line + ' ' + w : w;
          if (ctx.measureText(test).width <= maxWidth || !line) line = test;
          else { lines.push(line); line = w; }
        }
        lines.push(line);
      }
      ctx.restore();
      if (text.wrapCache.size > 2000) text.wrapCache.clear();
      text.wrapCache.set(key, lines);
      return lines;
    },
    /** draw wrapped paragraph; returns height used */
    paragraph(ctx, str, x, y, maxWidth, opts = {}) {
      const size = opts.size || 16;
      const lh = opts.lineHeight || size * 1.3;
      const lines = text.wrap(ctx, str, maxWidth, size, opts);
      let yy = y;
      const maxLines = opts.maxLines || 999;
      for (let i = 0; i < lines.length && i < maxLines; i++) {
        let ln = lines[i];
        if (i === maxLines - 1 && lines.length > maxLines) ln = ln.replace(/\s*\S*$/, '') + '…';
        text.draw(ctx, ln, opts.align === 'center' ? x + maxWidth / 2 : x, yy + size, Object.assign({}, opts, { maxWidth: undefined }));
        yy += lh;
      }
      return Math.min(lines.length, maxLines) * lh;
    },
    /** height a paragraph would use */
    paragraphHeight(ctx, str, maxWidth, opts = {}) {
      const size = opts.size || 16; const lh = opts.lineHeight || size * 1.3;
      return text.wrap(ctx, str, maxWidth, size, opts).length * lh;
    },
  };

  function drawRun(ctx, str, x, y, spacing) {
    if (!spacing) { ctx.fillText(str, x, y); return; }
    let cx = x;
    for (const ch of str) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + spacing; }
  }
  function strokeRun(ctx, str, x, y, spacing) {
    if (!spacing) { ctx.strokeText(str, x, y); return; }
    let cx = x;
    for (const ch of str) { ctx.strokeText(ch, cx, y); cx += ctx.measureText(ch).width + spacing; }
  }
})();
