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
   *  [&cam=x,y,zoom | &cam=~dx,dy,zoom]. Fixed seed and camera, every domain state near home, the dragon circling; saves to the 'test' slot. */
  HB.debug.mapPreview = function (params) {
    const state = HB.game.newCampaign({ seed: (params && params.get('seed')) || 'ember-quill-42', name: 'Vorthax', breed: 'red' });
    state.flags.test = true;
    const picks = HB.presets.preview(state);
    HB.flow.enterWorld(state, false);
    // &cam=x,y,zoom (cells), or &cam=~dx,dy,zoom relative to the lair
    const camArg = (params && params.get('cam')) || '', rel = camArg.startsWith('~'), cam = camArg.replace(/^~/, '').split(',').map(Number);
    const map = HB.flow.map, H = state.world.home;
    if (cam.length === 3 && cam.every(isFinite)) Object.assign(map.cam, { x: cam[0] + (rel ? H.x + 0.5 : 0), y: cam[1] + (rel ? H.y + 0.5 : 0), zoom: cam[2] });
    else {
      // frame the lair and every place the preview set up (the same view every time for a given seed)
      const pts = [H].concat(Object.values(picks).filter(Boolean)), xs = pts.map(p => p.x), ys = pts.map(p => p.y);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      Object.assign(map.cam, { x: (x0 + x1) / 2 + 0.5, y: (y0 + y1) / 2 + 0.5, zoom: HB.clamp(Math.min(HB.W / ((x1 - x0 + 8) * 22), HB.H / ((y1 - y0 + 7) * 22)), 0.9, 1.6) });
    }
    map.showcase = { x: H.x + 0.5, y: H.y + 0.5, r: 5 }; // the dragon circles home (drawn only; the campaign does not move)
    map.showChunkEdges = !!(params && params.get('chunks'));
    return state;
  };
  /** quick campaign for tests: HB.debug.quick(seed) */
  HB.debug.quick = function (seed, opts = {}) { const state = HB.game.newCampaign(Object.assign({ seed: seed || 'ember-quill-42', name: 'Vorthax', breed: 'red' }, opts)); HB.flow.enterWorld(state, false); return state; };

  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
})();
