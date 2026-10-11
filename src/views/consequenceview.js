/* What changed: a short, plain summary after every encounter. Says what happened without judging it. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  class ConsequenceScene {
    constructor(state, summary, map) {
      this.state = state; this.s = summary; this.map = map;
      this.opaque = false; this.ui = new HB.ui.UI(); this.t = 0;
      this.w = 680; this.x = (HB.W - this.w) / 2;
    }
    enter() {
      const ctx = HB.app.ctx, st = this.state, s = this.s, tw = this.w - 84;
      // shrink the type until it fits on screen
      for (this.size = 16; this.size >= 13; this.size--) {
        this.headH = HB.text.paragraphHeight(ctx, s.headline, this.w - 60, { size: this.size + 5, family: 'sc' });
        this.lineHs = s.lines.map(l => HB.text.paragraphHeight(ctx, l.text, tw, { size: this.size }));
        this.nextH = s.next ? HB.text.paragraphHeight(ctx, 'Next: ' + s.next, this.w - 60, { size: this.size, italic: true }) : 0;
        this.h = 54 + this.headH + 14 + this.lineHs.reduce((a, b) => a + b + 6, 0) + 12 + this.nextH + 24 + 54;
        if (this.h <= HB.H - 30) break;
      }
      this.y = Math.max(15, (HB.H - this.h) / 2);
      const away = st.phase === 'planning' && Math.hypot(st.dragon.x - st.world.home.x, st.dragon.y - st.world.home.y) > 0.5;
      const carrying = st.cargo.gold > 0 || st.cargo.items.length > 0 || st.cargo.captives.length > 0;
      const by = this.y + this.h - 52;
      const close = () => HB.scenes.pop(this);
      if (away) {
        this.ui.add(new HB.ui.Button({ x: this.x + this.w / 2 - 210, y: by, w: 200, h: 38, label: 'Fly home', primary: carrying, size: 16, tooltip: carrying ? 'Store what you carry: only treasure at home makes you stronger.' : 'Return to the lair.', onClick: () => { close(); HB.travel.returnHome(st, this.map); } }));
        this.ui.add(new HB.ui.Button({ x: this.x + this.w / 2 + 10, y: by, w: 200, h: 38, label: 'Stay on the map', primary: !carrying, size: 16, hotkey: 'cancel', onClick: close }));
      } else this.ui.add(new HB.ui.Button({ x: this.x + this.w / 2 - 100, y: by, w: 200, h: 38, label: 'Continue', primary: true, size: 16, onClick: close }));
      this.ui.focusFirst();
      this.ui.onCancel = close;
    }
    update(dt) { this.t += dt; this.ui.update(dt); }
    draw(ctx) {
      const s = this.s, P = HB.palette, x = this.x, w = this.w, size = this.size;
      ctx.fillStyle = 'rgba(15,8,4,0.5)'; ctx.fillRect(0, 0, HB.W, HB.H);
      const k = HB.ease.outBack(Math.min(1, this.t * 4));
      ctx.save(); ctx.translate(HB.W / 2, HB.H / 2); ctx.scale(0.92 + 0.08 * k, 0.92 + 0.08 * k); ctx.translate(-HB.W / 2, -HB.H / 2);
      HB.parchment.panel(ctx, x, this.y, w, this.h, { title: s.title, tone: 'light' });
      let y = this.y + 50;
      HB.text.paragraph(ctx, s.headline, x + 30, y, w - 60, { size: size + 5, family: 'sc' });
      y += this.headH + 6;
      HB.parchment.rule(ctx, x + 30, y, w - 60, { ornament: false });
      y += 12;
      s.lines.forEach((l, i) => {
        const col = l.tone === 'good' ? P.good : l.tone === 'bad' ? P.bad : l.tone === 'warn' ? P.warn : P.ink;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + 40, y + size * 0.62, 3.2, 0, Math.PI * 2); ctx.fill();
        HB.text.paragraph(ctx, l.text, x + 54, y, w - 84, { size, color: col });
        y += this.lineHs[i] + 6;
      });
      if (s.next) { y += 6; HB.parchment.rule(ctx, x + 30, y, w - 60, { ornament: false }); y += 10; HB.text.paragraph(ctx, 'Next: ' + s.next, x + 30, y, w - 60, { size, italic: true, color: P.inkSoft }); }
      this.ui.draw(ctx);
      ctx.restore();
    }
  }
  HB.ConsequenceScene = ConsequenceScene;
})();
