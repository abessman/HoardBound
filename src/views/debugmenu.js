/* Debug tools screen (Menu → Debug tools): toggles and one-off actions from src/game/cheats.js, for testing. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  class DebugMenuScene {
    constructor(state) { this.state = state; this.opaque = false; this.ui = new HB.ui.UI(); this.msg = ''; }
    enter() { this.build(); }
    build() {
      const ui = this.ui, st = this.state, C = HB.cheats;
      ui.clear();
      const w = 920, h = 640, x = (HB.W - w) / 2, y = (HB.H - h) / 2;
      Object.assign(this, { x, y, w, h });
      // toggles: left column, each with its description under it
      C.TOGGLES.forEach((t, i) => {
        const on = C.on(st, t.id);
        ui.add(new HB.ui.Button({ x: x + 28, y: y + 80 + i * 80, w: 380, h: 40, label: `${t.label}: ${on ? 'ON' : 'off'}`, size: 16, primary: on, align: 'left', tooltip: t.desc, onClick: () => { C.toggle(st, t.id); this.msg = `${t.label} ${C.on(st, t.id) ? 'on' : 'off'}.`; this.build(); } }));
      });
      // actions: two columns on the right
      C.ACTIONS.forEach((a, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        ui.add(new HB.ui.Button({ x: x + 440 + col * 232, y: y + 80 + row * 50, w: 222, h: 40, label: a.label, size: 14, tooltip: a.desc, onClick: () => { this.msg = C.run(st, a.id) || 'Done.'; this.afterAction(); } }));
      });
      ui.add(new HB.ui.Button({ x: x + w / 2 - 110, y: y + h - 58, w: 220, h: 42, label: 'Close', primary: true, size: 16, hotkey: 'cancel', hotkeyLabel: 'Esc', onClick: () => HB.scenes.pop(this) }));
      ui.onCancel = () => HB.scenes.pop(this);
    }
    /** the map redraws its territory and fog; the struggle card shows if it just began */
    afterAction() {
      const map = HB.flow && HB.flow.map;
      if (map) { map.chunks.clear(); map.chunkOrder.length = 0; map._domSig = null; map.overlay = null; if (map.syncDomain) map.syncDomain(); }
      if (HB.save) HB.save.autosave(this.state);
    }
    update(dt) { this.ui.update(dt); }
    draw(ctx) {
      const st = this.state, P = HB.palette, C = HB.cheats, { x, y, w, h } = this;
      ctx.fillStyle = 'rgba(15,8,4,0.55)'; ctx.fillRect(0, 0, HB.W, HB.H);
      HB.parchment.panel(ctx, x, y, w, h, { title: 'Debug Tools', tone: 'light' });
      HB.text.draw(ctx, 'Toggles (saved with this campaign)', x + 28, y + 66, { size: 14, family: 'sc', color: P.inkSoft });
      HB.text.draw(ctx, 'Do it now', x + 440, y + 66, { size: 14, family: 'sc', color: P.inkSoft });
      C.TOGGLES.forEach((t, i) => HB.text.paragraph(ctx, t.desc, x + 32, y + 124 + i * 80, 376, { size: 13, italic: true, color: P.inkSoft, lineHeight: 15, maxLines: 2 }));
      const d = st.dragon;
      const info = `${HB.TIERS[d.tier].name}, ${HB.game.ageString(st)} · hoard strength ${HB.fmt.int(HB.stats.hoardEnergy(st))} · benevolence ${Math.round(d.alignment)} · ${HB.game.dateString(st)}`;
      HB.text.draw(ctx, info, x + w / 2, y + h - 100, { size: 13, align: 'center', color: P.inkSoft, maxWidth: w - 60 });
      if (this.msg) HB.text.paragraph(ctx, this.msg, x + 40, y + h - 88, w - 80, { size: 14, align: 'center', color: P.good, maxLines: 2, lineHeight: 16 });
      this.ui.draw(ctx);
    }
  }
  HB.DebugMenuScene = DebugMenuScene;
})();
