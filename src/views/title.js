/* Title screen. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  class TitleScene {
    constructor() { this.opaque = true; this.ui = new HB.ui.UI(); this.t = 0; }
    enter() {
      this.ui.clear();
      const cx = HB.W / 2, bw = 280, bh = 44;
      let y = 392;
      const add = (label, onClick, opts = {}) => { const b = this.ui.add(new HB.ui.Button(Object.assign({ x: cx - bw / 2, y, w: bw, h: bh, label, size: 20, onClick }, opts))); y += bh + 12; return b; };
      add('New World', () => HB.scenes.push(new HB.NewGameScene()), { primary: true });
      const hasSave = HB.save && HB.save.hasAny();
      add('Continue', () => HB.save && HB.save.continueLatest(), { disabled: !hasSave, disabledReason: 'No saved worlds yet. Begin a new world.' });
      add('Load World', () => HB.save && HB.save.openLoadMenu(), { disabled: !hasSave, disabledReason: 'No saved worlds yet.' });
      add('Settings', () => HB.scenes.push(new HB.SettingsScene()));
      add('Pixel Editor', () => HB.openEditor(), { size: 17, tooltip: 'Draw the game’s pixel art (the dragon, the lair, raid sprites, map symbols) and save it to the game.' });
      this.ui.focusFirst();
    }
    update(dt) { this.t += dt; this.ui.update(dt); }
    draw(ctx) {
      const p = HB.palette;
      HB.parchment.fill(ctx, 0, 0, HB.W, HB.H);
      HB.parchment.vignette(ctx, 0, 0, HB.W, HB.H, 0.5);
      HB.parchment.border(ctx, 14, 14, HB.W - 28, HB.H - 28, { width: 2.5, flourish: 16 });
      // faint compass + map lines decoration
      ctx.save(); ctx.globalAlpha = 0.18;
      drawCompass(ctx, HB.W - 150, 150, 70);
      ctx.restore();
      // dragon
      drawInkDragon(ctx, HB.W / 2, 215, 1, this.t);
      // title
      HB.text.draw(ctx, 'HoardBound', HB.W / 2, 330, { size: 92, family: 'display', align: 'center', color: p.ink, spacing: 6, shadow: 'rgba(90,60,20,0.35)' });
      HB.text.draw(ctx, 'A dragon’s life, told in treasure', HB.W / 2, 364, { size: 22, italic: true, align: 'center', color: p.inkSoft });
      this.ui.draw(ctx);
      HB.text.draw(ctx, `Version ${HB.VERSION}`, 40, HB.H - 48, { size: 18, family: 'sc', color: p.ink });
      HB.text.draw(ctx, HB.VERSION_DATE + (HB.settings.artSource === 'local' ? ' · showing your local drawings (Settings)' : ''), 40, HB.H - 28, { size: 13, italic: true, color: p.inkSoft });
      const hint = HB.input.usingGamepad() ? 'Stick to move · A select · B back' : 'Arrows / mouse to choose · Enter to select · Esc back';
      HB.text.draw(ctx, hint, HB.W - 40, HB.H - 28, { size: 13, align: 'right', color: p.inkSoft });
    }
  }
  HB.TitleScene = TitleScene;

  function drawCompass(ctx, cx, cy, r) {
    ctx.save(); ctx.strokeStyle = HB.palette.ink; ctx.fillStyle = HB.palette.ink; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, len = i % 2 ? r * 0.55 : r * 0.95, w = i % 2 ? r * 0.08 : r * 0.14;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      ctx.lineTo(cx + Math.cos(a + Math.PI / 2) * w, cy + Math.sin(a + Math.PI / 2) * w);
      ctx.lineTo(cx + Math.cos(a - Math.PI / 2) * w, cy + Math.sin(a - Math.PI / 2) * w); ctx.closePath();
      if (i % 2 === 0) ctx.fill(); else ctx.stroke();
    }
    HB.text.draw(ctx, 'N', cx, cy - r - 8, { size: 18, family: 'sc', align: 'center' });
    ctx.restore();
  }

  /** Decorative cartographic ink dragon (used on the title; the pixel dragon lives in the game). */
  function drawInkDragon(ctx, cx, cy, s, t) {
    const p = HB.palette;
    const flap = Math.sin(t * 2.2) * 0.5 + 0.5;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    ctx.lineWidth = 2.4; ctx.strokeStyle = p.ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(190,160,110,0.55)';
    // wings
    const wing = (dir) => {
      ctx.save(); ctx.scale(dir, 1);
      const lift = -40 - flap * 55;
      ctx.beginPath();
      ctx.moveTo(10, -10);
      ctx.quadraticCurveTo(70, lift - 40, 170, lift - 10);
      ctx.quadraticCurveTo(150, lift + 20, 140, lift + 45);
      ctx.quadraticCurveTo(110, lift + 35, 95, lift + 60);
      ctx.quadraticCurveTo(70, lift + 45, 50, lift + 70);
      ctx.quadraticCurveTo(30, lift + 40, 10, 10);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // fingers
      ctx.lineWidth = 1.4;
      for (const [fx, fy] of [[140, lift + 45], [95, lift + 60], [50, lift + 70]]) { ctx.beginPath(); ctx.moveTo(15, -5); ctx.lineTo(fx, fy); ctx.stroke(); }
      ctx.restore();
    };
    wing(1); wing(-1);
    // body + tail
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-10, -18); ctx.quadraticCurveTo(-30, 10, -10, 40); ctx.quadraticCurveTo(10, 60, 60, 55); ctx.quadraticCurveTo(110, 50, 130, 20);
    ctx.quadraticCurveTo(110, 60, 55, 68); ctx.quadraticCurveTo(0, 72, -22, 38); ctx.quadraticCurveTo(-40, 10, -22, -24); ctx.closePath(); ctx.fill(); ctx.stroke();
    // tail tip
    ctx.beginPath(); ctx.moveTo(130, 20); ctx.lineTo(148, 8); ctx.lineTo(140, 28); ctx.lineTo(152, 30); ctx.closePath(); ctx.fill(); ctx.stroke();
    // neck + head
    ctx.beginPath(); ctx.moveTo(-10, -18); ctx.quadraticCurveTo(-12, -55, -40, -70); ctx.lineTo(-74, -66); ctx.lineTo(-62, -58); ctx.lineTo(-74, -50); ctx.lineTo(-44, -46); ctx.quadraticCurveTo(-30, -30, -22, -24); ctx.closePath(); ctx.fill(); ctx.stroke();
    // horn, eye
    ctx.beginPath(); ctx.moveTo(-44, -70); ctx.lineTo(-40, -90); ctx.lineTo(-34, -70); ctx.stroke();
    ctx.fillStyle = p.ink; ctx.beginPath(); ctx.arc(-50, -62, 2.4, 0, Math.PI * 2); ctx.fill();
    // legs
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 55); ctx.lineTo(-6, 78); ctx.lineTo(-14, 84); ctx.moveTo(-6, 78); ctx.lineTo(2, 86); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(45, 62); ctx.lineTo(48, 84); ctx.lineTo(40, 90); ctx.moveTo(48, 84); ctx.lineTo(58, 90); ctx.stroke();
    // belly hatching
    ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
    for (let i = 0; i < 9; i++) { const x = -8 + i * 14; ctx.beginPath(); ctx.moveTo(x, 50 + Math.sin(i) * 4); ctx.lineTo(x + 5, 64 - i * 0.6); ctx.stroke(); }
    // smoke puffs from nostril
    ctx.globalAlpha = 0.35; ctx.strokeStyle = p.inkSoft;
    for (let i = 0; i < 3; i++) { const k = (t * 0.6 + i * 0.33) % 1; ctx.beginPath(); ctx.arc(-80 - k * 30, -62 - k * 40, 3 + k * 7, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  HB.drawInkDragon = drawInkDragon;
})();
