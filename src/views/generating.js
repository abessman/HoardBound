/* "Drawing the world" transition + campaign start flow. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  class GeneratingScene {
    constructor(opts) { this.opts = opts; this.opaque = true; this.t = 0; this.started = false; this.done = false; this.error = null; }
    update(dt) {
      this.t += dt;
      if (!this.started && this.t > 0.15) {
        this.started = true;
        setTimeout(() => {
          try {
            const state = HB.game.newCampaign(this.opts);
            HB.flow.enterWorld(state, true);
          } catch (e) { console.error(e); this.error = e; }
        }, 30);
      }
    }
    draw(ctx) {
      HB.parchment.fill(ctx, 0, 0, HB.W, HB.H, 'dark');
      HB.parchment.vignette(ctx, 0, 0, HB.W, HB.H, 0.5);
      HB.text.draw(ctx, 'Drawing the world…', HB.W / 2, HB.H / 2 - 10, { size: 40, family: 'sc', align: 'center', spacing: 4 });
      HB.text.draw(ctx, 'Mountains rise, rivers find the sea, kingdoms quarrel over the vales between.', HB.W / 2, HB.H / 2 + 26, { size: 16, italic: true, align: 'center', color: HB.palette.inkSoft });
      if (this.error) HB.text.draw(ctx, 'Something went wrong: ' + this.error.message, HB.W / 2, HB.H / 2 + 70, { size: 14, align: 'center', color: HB.palette.bad });
    }
  }
  HB.GeneratingScene = GeneratingScene;

  HB.flow = HB.flow || {};
  HB.flow.startCampaign = function (opts) { HB.scenes.replace(new GeneratingScene(opts)); };
  /** push the map for a (new or loaded) campaign */
  HB.flow.enterWorld = function (state, isNew) {
    const map = new HB.MapScene(state);
    HB.flow.map = map;
    HB.scenes.replace(map);
    if (isNew && HB.IntroScene) HB.scenes.push(new HB.IntroScene(state));
  };
})();
