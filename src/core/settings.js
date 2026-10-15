/* Player settings persisted in localStorage. */
(function () {
  const HB = globalThis.HB;
  const DEFAULTS = {
    sound: true,
    volume: 0.6,
    keeper: true,            // optional Keeper episodes during sleep
    deathMode: 'legend',     // 'legend' | 'mythic'
    hints: true,             // tutorial hints
    travelSpeed: 1,          // default travel speed multiplier
    reduceMotion: false,
    showGrid: false,
    mapPack: 'illuminated',  // map art pack in assets/map/packs/<name>/ ('none' = the original ink drawing)
    mapLight: 'day',         // time of day on the map: 'day' | 'dusk' | 'night' (a preview of the map's lights)
    artSource: 'github',     // drawings from the pixel editor: 'github' (the site's files) | 'local' (saved locally in this browser)
  };
  const settings = HB.settings = Object.assign({}, DEFAULTS);
  settings.load = function () {
    try {
      const raw = HB.isBrowser && localStorage.getItem('hoardbound.settings');
      if (raw) Object.assign(settings, JSON.parse(raw));
    } catch (e) { /* ignore */ }
    return settings;
  };
  settings.save = function () {
    try {
      const o = {};
      for (const k in DEFAULTS) o[k] = settings[k];
      if (HB.isBrowser) localStorage.setItem('hoardbound.settings', JSON.stringify(o));
    } catch (e) { /* ignore */ }
  };
  settings.reset = function () { Object.assign(settings, DEFAULTS); settings.save(); };
  settings.DEFAULTS = DEFAULTS;
})();
