/* HoardBound — global namespace.
 * Every file attaches to HB. Logic files must not touch the DOM at load time so Node can load them
 * for headless simulation (tools/headless-test.js). */
(function () {
  const root = typeof globalThis !== 'undefined' ? globalThis : window;
  const HB = root.HB = root.HB || {};
  // Bump on every update pushed (see CHANGELOG.md): minor for a feature update, patch for fixes and tweaks.
  HB.VERSION = '0.16.0';
  HB.VERSION_DATE = '2026-10-12';
  HB.W = 1280;            // virtual resolution
  HB.H = 720;
  HB.PX_W = 320;          // pixel-scene buffer
  HB.PX_H = 180;
  HB.PX_SCALE = 4;
  HB.isBrowser = typeof document !== 'undefined';
  HB.root = root;
})();
