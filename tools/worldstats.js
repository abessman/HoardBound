/* Quick world generation report. Usage: node tools/worldstats.js [seed] [size] */
const HB = require('./headless')();
const seed = process.argv[2] || 'ember-quill-42';
const size = Number(process.argv[3] || 200);
const t0 = Date.now();
const world = HB.worldgen.generate(seed, { size });
const ms = Date.now() - t0;
const N = world.w * world.h;
const tCounts = new Array(11).fill(0);
for (let i = 0; i < N; i++) tCounts[world.terrain[i]]++;
console.log(`seed=${seed} size=${size} gen=${ms}ms`, JSON.stringify(world.timings), 'roadEdges=' + world.roadEdges);
console.log('terrain:', HB.TERRAIN_NAMES.map((n, i) => `${n}=${(tCounts[i] / N * 100).toFixed(1)}%`).join(' '));
console.log(`regions=${world.regions.length} subregions=${world.subregions.length} rivers=${world.rivers.length} roads=${world.roads.length} locations=${world.locations.length}`);
console.log('regions:', world.regions.map(R => `${R.id}:${R.name} [tier ${R.tier}${R.isle ? ' isle' : ''} ${R.flavour} land=${R.landCells} subs=${world.subregions.filter(S => S.regionId === R.id).length}]`).join('\n  '));
console.log('factions:', world.factions.map(f => `${f.name} (${f.kind}/${f.culture}) subs=${f.subregions.length} cap=${f.capitalId !== null ? world.locations[f.capitalId].name : 'none'}`).join('\n  '));
const byType = {}; for (const L of world.locations) byType[L.type] = (byType[L.type] || 0) + 1;
console.log('locations by type:', JSON.stringify(byType));
const home = world.home;
console.log(`home at ${home.x},${home.y} terrain=${HB.TERRAIN_NAMES[world.terrain[home.cell]]} sub="${world.subregions[home.subId].name}" region="${world.regions[0].name}"`);
const near = world.locations.filter(L => L.id !== home.locId).map(L => ({ L, d: Math.hypot(L.x - home.x, L.y - home.y) })).sort((a, b) => a.d - b.d).slice(0, 10);
console.log('nearest:', near.map(n => `${n.L.type}:${n.L.name} d=${n.d.toFixed(1)} wealth=${n.L.wealth} def=${n.L.defense} faction=${n.L.factionId >= 0 ? world.factions[n.L.factionId].name : 'wild'}`).join('\n  '));
let roadNear = Infinity; for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) if (world.road[y * world.w + x]) roadNear = Math.min(roadNear, Math.hypot(x - home.x, y - home.y));
console.log('nearest road cell:', roadNear.toFixed(1));
// ascii preview
if (process.argv.includes('--ascii')) {
  const chars = ['~', '.', ' ', 'f', 'p', 'h', 'M', 'A', 's', 'd', '*'];
  for (let y = 0; y < world.h; y += 2) {
    let row = '';
    for (let x = 0; x < world.w; x += 1) {
      const i = y * world.w + x;
      const loc = world.locAt[i];
      if (x === home.x && y === home.y) row += '@';
      else if (loc >= 0) row += 'o';
      else if (world.road[i]) row += '=';
      else if (world.river[i]) row += 'r';
      else row += chars[world.terrain[i]];
    }
    console.log(row);
  }
}
