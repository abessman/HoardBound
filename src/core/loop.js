/* App bootstrap: canvas scaling, frame loop, scene stack. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  const app = HB.app = {
    canvas: null, ctx: null, dpr: 1, scale: 1, time: 0, frame: 0, fps: 60, running: false, lastT: 0, paused: false,
    init(canvas) {
      app.canvas = canvas;
      app.ctx = canvas.getContext('2d', { alpha: false });
      app.resize();
      window.addEventListener('resize', app.resize);
      document.addEventListener('visibilitychange', () => { if (document.hidden) app.lastT = 0; });
    },
    resize() {
      const c = app.canvas;
      const vw = window.innerWidth, vh = window.innerHeight;
      const s = Math.min(vw / HB.W, vh / HB.H);
      const cw = Math.floor(HB.W * s), ch = Math.floor(HB.H * s);
      app.dpr = Math.min(2, window.devicePixelRatio || 1);
      c.style.width = cw + 'px'; c.style.height = ch + 'px';
      c.width = Math.round(cw * app.dpr); c.height = Math.round(ch * app.dpr);
      app.scale = c.width / HB.W;
      app.ctx.setTransform(app.scale, 0, 0, app.scale, 0, 0);
    },
    start() {
      if (app.running) return;
      app.running = true;
      const step = (t) => {
        if (!app.running) return;
        let dt = app.lastT ? (t - app.lastT) / 1000 : 1 / 60;
        app.lastT = t;
        dt = Math.min(dt, 0.1);               // cap frame spikes (backgrounded tab)
        app.fps = app.fps * 0.95 + (1 / Math.max(dt, 1e-3)) * 0.05;
        app.time += dt; app.frame++;
        try {
          HB.input.beginFrame(dt);
          HB.scenes.update(dt);
          HB.scenes.draw(app.ctx);
          HB.input.endFrame();
        } catch (err) {
          console.error(err);
          HB.app.lastError = err;
          drawErrorOverlay(app.ctx, err);
          HB.input.endFrame();
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
  };

  function drawErrorOverlay(ctx, err) {
    ctx.save(); ctx.setTransform(app.scale, 0, 0, app.scale, 0, 0);
    ctx.fillStyle = 'rgba(60,10,10,0.85)'; ctx.fillRect(20, HB.H - 120, HB.W - 40, 100);
    ctx.fillStyle = '#fff'; ctx.font = '14px monospace';
    ctx.fillText('Error: ' + (err && err.message), 30, HB.H - 95);
    const st = String(err && err.stack || '').split('\n').slice(1, 4);
    st.forEach((s, i) => ctx.fillText(s.trim().slice(0, 150), 30, HB.H - 75 + i * 18));
    ctx.restore();
  }

  /* Scene stack. A scene: { enter(), exit(), update(dt), draw(ctx), opaque, ui } */
  const scenes = HB.scenes = {
    stack: [],
    push(s) { scenes.stack.push(s); if (s.enter) s.enter(); return s; },
    pop(expected) {
      if (expected && scenes.top() !== expected) { const i = scenes.stack.indexOf(expected); if (i >= 0) { scenes.stack.splice(i, 1); if (expected.exit) expected.exit(); } return; }
      const s = scenes.stack.pop(); if (s && s.exit) s.exit(); return s;
    },
    replace(s) { while (scenes.stack.length) scenes.pop(); return scenes.push(s); },
    popTo(s) { while (scenes.stack.length && scenes.top() !== s) scenes.pop(); },
    top() { return scenes.stack[scenes.stack.length - 1]; },
    has(s) { return scenes.stack.includes(s); },
    find(pred) { return scenes.stack.find(pred); },
    update(dt) {
      const top = scenes.top();
      if (!top) return;
      // underlying scenes receive passive updates (animations) when not opaque-covered
      for (let i = 0; i < scenes.stack.length - 1; i++) { const s = scenes.stack[i]; if (s.passiveUpdate) s.passiveUpdate(dt); }
      if (top.update) top.update(dt);
    },
    draw(ctx) {
      // find the lowest scene that must be drawn (first opaque from top)
      let start = scenes.stack.length - 1;
      while (start > 0 && !scenes.stack[start].opaque) start--;
      ctx.save();
      ctx.fillStyle = '#120a06'; ctx.fillRect(0, 0, HB.W, HB.H);
      for (let i = start; i < scenes.stack.length; i++) { const s = scenes.stack[i]; if (s.draw) s.draw(ctx); }
      ctx.restore();
      if (HB.debugOverlay) HB.debugOverlay(ctx);
    },
  };
})();
