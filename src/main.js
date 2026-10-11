/* Boot. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  HB.flow = HB.flow || {};

  async function boot() {
    const canvas = document.getElementById('game');
    HB.app.init(canvas);
    HB.input.bind(canvas);
    HB.settings.load();
    HB.parchment.init();
    const params = new URLSearchParams(location.search);
    HB.debugMode = params.has('debug');
    await HB.text.load();
    if (location.protocol !== 'file:') await HB.sprites.loadOverrides();
    if (HB.audio) HB.audio.init();
    HB.scenes.push(new HB.TitleScene());
    const auto = params.get('scene');
    if (auto && HB.debug && HB.debug.goto) HB.debug.goto(auto, params);
    HB.app.start();
    HB.ready = true;
  }

  HB.debug = HB.debug || {};
  const prevGoto = HB.debug.gotoGame;
  HB.debug.goto = function (name, params) {
    if (name === 'newgame') HB.scenes.push(new HB.NewGameScene());
    else if (name === 'settings') HB.scenes.push(new HB.SettingsScene());
    else if (name === 'map') { const state = HB.game.newCampaign({ seed: (params && params.get('seed')) || 'ember-quill-42', name: 'Vorthax', breed: (params && params.get('breed')) || 'red' }); HB.flow.enterWorld(state, false); }
    else if (HB.debug.gotoGame) HB.debug.gotoGame(name, params);
  };
  /** quick campaign for tests: HB.debug.quick(seed) */
  HB.debug.quick = function (seed, opts = {}) { const state = HB.game.newCampaign(Object.assign({ seed: seed || 'ember-quill-42', name: 'Vorthax', breed: 'red' }, opts)); HB.flow.enterWorld(state, false); return state; };

  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
})();
