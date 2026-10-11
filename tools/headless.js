/* Load the game's logic modules into a Node context (no DOM) for simulation tests.
 * Usage: const HB = require('./headless')(); */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const LOGIC_FILES = [
  'src/core/namespace.js', 'src/core/rng.js', 'src/core/math.js', 'src/core/noise.js', 'src/art/palette.js', 'src/core/settings.js',
  'src/data/names.js',
  'src/world/worldgen.js',
  // later modules are appended here as they are written (world/state/game logic)
  'src/world/world.js', 'src/data/treasures.js', 'src/data/upgrades.js', 'src/data/encounters.js', 'src/data/events.js',
  'src/game/stats.js', 'src/game/hoard.js', 'src/game/state.js', 'src/game/travel.js', 'src/game/raid/raid.js', 'src/game/raid/templates.js',
  'src/game/lair.js', 'src/game/ransom.js', 'src/game/tribute.js', 'src/game/factions.js', 'src/game/worldsim.js', 'src/game/sleep.js', 'src/game/keeper.js', 'src/game/events.js', 'src/game/history.js', 'src/core/save.js',
];

module.exports = function load(opts = {}) {
  const root = path.resolve(__dirname, '..');
  const sandbox = { console, performance: { now: () => Date.now() }, Date, Math, JSON, Set, Map, Uint8Array, Int16Array, Int32Array, Float32Array, Float64Array, setTimeout, clearTimeout, localStorage: fakeStorage() };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of LOGIC_FILES) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) { if (opts.verbose) console.log('skip', f); continue; }
    const code = fs.readFileSync(p, 'utf8');
    vm.runInContext(code, sandbox, { filename: f });
  }
  return sandbox.HB;
};

function fakeStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), key: i => [...m.keys()][i], get length() { return m.size; } };
}
