/* Debug-only review scenes (not part of the player flow). */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  class DragonSheetScene {
    constructor(opts = {}) { this.opaque = true; this.t = 0; this.opts = opts; }
    update(dt) { this.t += dt; if (HB.input.pressed('cancel')) HB.scenes.pop(this); }
    draw(ctx) {
      HB.parchment.fill(ctx, 0, 0, HB.W, HB.H);
      const poses = ['fly', 'fly', 'fly', 'fly', 'idle', 'land', 'breathe', 'bite', 'roar', 'grab', 'sleep', 'hurt'];
      const frames = [0, 1, 2, 3, 0, 0, 1, 0, 0, 0, 0, 0];
      const variants = this.opts.variants || [
        { tier: 0, breed: 'red', alignment: 0, mutations: [] },
        { tier: 1, breed: 'green', alignment: 60, mutations: ['runeMarks'] },
        { tier: 2, breed: 'black', alignment: -80, mutations: ['stonePlates', 'emberGlow'], scars: 3 },
        { tier: 3, breed: 'gold', alignment: 40, mutations: ['crest', 'crystals', 'goldenSheen', 'clawBlades'] },
      ];
      const scale = this.opts.scale || 2.2;
      let y = 60;
      const rowH = [70, 95, 140, 200];
      variants.forEach((v, vi) => {
        HB.text.draw(ctx, `tier ${v.tier} · ${v.breed} · alignment ${v.alignment} · ${(v.mutations || []).join(', ') || 'no mutations'}`, 20, y - 30, { size: 13, color: HB.palette.inkSoft });
        let x = 70;
        poses.forEach((p, i) => {
          const s = HB.dragonArt.sprite(v, p, frames[i]);
          const sc = scale * (1 - v.tier * 0.12);
          HB.dragonArt.draw(ctx, v, p, frames[i], x, y + rowH[vi] / 2, sc, 1);
          if (vi === 0) HB.text.draw(ctx, p + (p === 'fly' ? frames[i] : ''), x, y - 8, { size: 11, align: 'center', color: HB.palette.inkSoft });
          x += 100;
        });
        y += rowH[vi] + 40;
      });
      // animated flight at large scale
      const v = variants[Math.floor(this.t / 3) % variants.length];
      const f = HB.dragonArt.frameAt(v, 'fly', this.t, 4, 8);
      HB.dragonArt.draw(ctx, v, 'fly', f, HB.W - 180, 140 + Math.sin(this.t * 6) * 4, 4 - v.tier * 0.6, 1);
      HB.text.draw(ctx, 'Esc to leave', HB.W - 30, HB.H - 20, { size: 12, align: 'right', color: HB.palette.inkSoft });
    }
  }
  HB.DragonSheetScene = DragonSheetScene;
  HB.debug = HB.debug || {};
  HB.debug.gotoGame = function (name, params) {
    if (name === 'dragons') HB.scenes.push(new DragonSheetScene());
    // ?scene=lair[&preset=adult-kind|none][&tier=3][&view=rooms][&sleep=1]: the lair of a test campaign (the pixel editor opens it)
    if (name === 'lair') {
      const state = HB.game.newCampaign({ seed: params.get('seed') || 'ember-quill-42', name: 'Vorthax', breed: params.get('breed') || 'red' });
      state.flags.test = true;
      if (params.get('preset') !== 'none') HB.presets.apply(state, params.get('preset') || 'adult-kind');
      if (params.get('tier')) state.dragon.tier = HB.clamp(+params.get('tier'), 0, 3); // to look at the ancient's art
      HB.flow.enterWorld(state, false);
      if (params.get('sleep')) state.phase = 'sleeping';
      HB.scenes.push(new HB.LairScene(state, { view: params.get('view') === 'rooms' ? 'rooms' : 'hoard' }));
    }
  };
})();
