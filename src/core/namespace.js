/* HoardBound — global namespace.
 * Every file attaches to HB. Logic files must not touch the DOM at load time so Node can load them
 * for headless simulation (tools/headless-test.js). */
(function () {
  const root = typeof globalThis !== 'undefined' ? globalThis : window;
  const HB = root.HB = root.HB || {};
  // Bump on every update pushed (see CHANGELOG.md): minor for a feature update, patch for fixes and tweaks.
  HB.VERSION = '0.33.0';
  HB.VERSION_DATE = '2026-10-15';
  HB.W = 1280;            // virtual resolution
  HB.H = 720;
  HB.PX_W = 320;          // pixel-scene buffer
  HB.PX_H = 180;
  HB.PX_SCALE = 4;
  HB.isBrowser = typeof document !== 'undefined';
  HB.root = root;
  /** the game, the pixel editor and the editor's previews each keep one tab ('hb-game', 'hb-editor', 'hb-preview'):
   *  open url in the tab called name, or bring that tab forward as it is (reload: load url there anyway).
   *  The tab found or opened, or null when the browser blocked it. */
  HB.openTab = function (url, name, reload) {
    const abs = new URL(url, location.href).href; let w = null;
    try { w = window.open(reload ? abs : '', name); } catch (e) { return null; }
    if (!w) return null;
    if (!reload) { let blank = false; try { blank = !w.location.href || w.location.href === 'about:blank'; } catch (e) { /* another site: leave it */ } if (blank) w.location.href = abs; }
    try { w.focus(); } catch (e) { /* the browser decides */ }
    return w;
  };
})();
