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
    // map art: ?mappack=<name> for this visit (none = hand-drawn), else the Settings choice; images load in the background
    if (HB.mapAssets) HB.mapAssets.use(params.get('mappack') || HB.settings.mapPack || 'none');
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
    else if (name === 'map') {
      const state = HB.game.newCampaign({ seed: (params && params.get('seed')) || 'ember-quill-42', name: 'Vorthax', breed: (params && params.get('breed')) || 'red' });
      state.flags.test = true; // started from the URL: autosaves go to the 'test' slot, never over a real campaign
      const preset = params && params.get('preset');
      if (preset && HB.presets) HB.presets.apply(state, preset); // e.g. ?scene=map&preset=adult-kind
      HB.flow.enterWorld(state, false);
    }
    else if (name === 'mappreview') HB.debug.mapPreview(params);
    else if (HB.debug.gotoGame) HB.debug.gotoGame(name, params);
  };
  /** the map-art preview scene (docs/map-art/REPLACING.md): index.html?scene=mappreview[&mappack=sample][&chunks=1]
   *  [&cam=x,y,zoom]. Fixed seed and camera, every domain state near home, the dragon circling; saves to the 'test' slot. */
  HB.debug.mapPreview = function (params) {
    const state = HB.game.newCampaign({ seed: (params && params.get('seed')) || 'ember-quill-42', name: 'Vorthax', breed: 'red' });
    state.flags.test = true;
    HB.presets.preview(state);
    HB.flow.enterWorld(state, false);
    const map = HB.flow.map, H = state.world.home, cam = ((params && params.get('cam')) || '').split(',').map(Number);
    if (cam.length === 3 && cam.every(isFinite)) Object.assign(map.cam, { x: cam[0], y: cam[1], zoom: cam[2] });
    else Object.assign(map.cam, { x: H.x + 3.5, y: H.y - 2.5, zoom: 1.35 });
    map.showcase = { x: H.x + 0.5, y: H.y + 0.5, r: 5 }; // the dragon circles home (drawn only; the campaign does not move)
    map.showChunkEdges = !!(params && params.get('chunks'));
    return state;
  };
  /** quick campaign for tests: HB.debug.quick(seed) */
  HB.debug.quick = function (seed, opts = {}) { const state = HB.game.newCampaign(Object.assign({ seed: seed || 'ember-quill-42', name: 'Vorthax', breed: 'red' }, opts)); HB.flow.enterWorld(state, false); return state; };

  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
})();
