/* Illustrated decision card: pixel illustration, text, choices, outcome. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  class CardScene {
    constructor(o) {
      this.o = Object.assign({ title: '', illustration: 'generic', text: '', choices: [], onClose: null, width: 760 }, o);
      this.opaque = false; this.ui = new HB.ui.UI(); this.t = 0; this.result = null; this.illuT = 0;
      this.w = this.o.width; this.x = (HB.W - this.w) / 2;
      this.illuW = this.w - 40; this.illuH = 200;
    }
    enter() {
      const ctx = HB.app.ctx;
      this.textH = HB.text.paragraphHeight(ctx, this.o.text, this.w - 60, { size: 17 });
      this.layout();
    }
    layout() {
      this.ui.clear();
      const o = this.o;
      const chH = this.result ? 0 : o.choices.length * 58;
      this.h = 60 + this.illuH + 16 + this.textH + 20 + chH + (this.result ? HB.text.paragraphHeight(HB.app.ctx, this.result, this.w - 60, { size: 17 }) + 70 : 0) + 24;
      this.y = (HB.H - this.h) / 2;
      let y = this.y + 60 + this.illuH + 16 + this.textH + 20;
      if (!this.result) {
        o.choices.forEach((c, i) => {
          const b = new HB.ui.Button({ x: this.x + 30, y, w: this.w - 60, h: 48, label: c.label, size: 17, align: 'left', hotkey: `action${i + 1}`, hotkeyLabel: `${i + 1}`, disabled: !!c.disabled, disabledReason: c.disabledReason || 'Not possible now', tooltip: c.desc || '', onClick: () => this.choose(c) });
          b.desc = c.desc;
          const origDraw = b.draw.bind(b);
          b.draw = (ctx, ui) => { origDraw(ctx, ui); if (b.desc) HB.text.draw(ctx, b.desc, b.x + b.w - 14, b.y + b.h / 2 + 5, { size: 13, italic: true, align: 'right', color: HB.palette.inkSoft, maxWidth: b.w * 0.5 }); };
          this.ui.add(b); y += 58;
        });
        this.ui.focusFirst();
      } else {
        y += HB.text.paragraphHeight(HB.app.ctx, this.result, this.w - 60, { size: 17 }) + 16;
        this.ui.add(new HB.ui.Button({ x: this.x + this.w / 2 - 100, y, w: 200, h: 42, label: 'Continue', primary: true, onClick: () => this.close() }));
        this.ui.focusFirst();
      }
    }
    choose(c) {
      let r = null;
      try { r = c.onChoose ? c.onChoose() : null; } catch (e) { console.error(e); r = 'Something went wrong.'; }
      if (r === false) return; // choice handled elsewhere (e.g. pushes its own scene)
      this.result = typeof r === 'string' ? r : (r && r.text) || 'Done.';
      this.layout();
    }
    close() { HB.scenes.pop(this); if (this.o.onClose) this.o.onClose(this.result); }
    update(dt) { this.t += dt; this.illuT += dt; this.ui.update(dt); }
    draw(ctx) {
      ctx.fillStyle = 'rgba(15,8,4,0.55)'; ctx.fillRect(0, 0, HB.W, HB.H);
      HB.parchment.panel(ctx, this.x, this.y, this.w, this.h, { title: this.o.title, tone: 'light' });
      // illustration frame
      const ix = this.x + 20, iy = this.y + 44;
      ctx.save(); ctx.fillStyle = '#1a1016'; ctx.fillRect(ix, iy, this.illuW, this.illuH);
      ctx.beginPath(); ctx.rect(ix, iy, this.illuW, this.illuH); ctx.clip();
      if (HB.illustrations) HB.illustrations.draw(ctx, this.o.illustration, ix, iy, this.illuW, this.illuH, this.illuT, this.o.illuData);
      ctx.restore();
      ctx.strokeStyle = HB.palette.ink; ctx.lineWidth = 2; ctx.strokeRect(ix + 0.5, iy + 0.5, this.illuW - 1, this.illuH - 1);
      let y = iy + this.illuH + 16;
      HB.text.paragraph(ctx, this.o.text, this.x + 30, y, this.w - 60, { size: 17 });
      y += this.textH + 20;
      if (this.result) { HB.parchment.rule(ctx, this.x + 30, y - 4, this.w - 60); HB.text.paragraph(ctx, this.result, this.x + 30, y + 8, this.w - 60, { size: 17, italic: true }); }
      this.ui.draw(ctx);
    }
  }
  HB.CardScene = CardScene;
})();
