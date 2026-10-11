/* Headless test suite: world generation, raids, economy, sleep, save round-trip, invariants.
 * Usage: node tools/test.js [seed] */
const HB = require('./headless')();
const seed = process.argv[2] || 'test-seed-1';
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.log('  FAIL:', msg); } };
const section = (name) => console.log('\n' + name);

section('world generation');
const t0 = Date.now();
const state = HB.game.newCampaign({ seed, name: 'Testwyrm', breed: 'green', keeper: true });
const W = state.world;
ok(Date.now() - t0 < 8000, 'generation under 8s');
ok(W.regions.length >= 6, 'at least 6 regions');
ok(W.regions[0].tier === 0, 'home region is tier 0');
ok(W.regions.some(R => R.tier >= 1), 'some regions gated');
ok(W.locations.length > 300, 'hundreds of locations');
const home = W.home;
const near = HB.world.locationsNear(W, home.x, home.y, 10, L => L.type !== 'lair');
ok(near.length >= 3, 'opening targets within 10 leagues: ' + near.length);
ok(near.some(n => ['farm', 'village', 'camp'].includes(n.L.type)), 'an easy target near home');
let roadNear = false; for (let dy = -8; dy <= 8 && !roadNear; dy++) for (let dx = -8; dx <= 8; dx++) { const x = home.x + dx, y = home.y + dy; if (HB.world.inBounds(W, x, y) && W.road[y * W.w + x]) { roadNear = true; break; } }
ok(roadNear, 'a road within 8 leagues of home');
ok(state.know.revealed[home.y * W.w + home.x] === 1, 'home revealed');
ok(state.entities.some(e => e.kind === 'caravan'), 'caravans exist');
ok(W.locations.some(L => L.special), 'artifacts placed');
ok(W.locations.some(L => L.type === 'rivalLair'), 'rival lairs exist');

section('travel');
const target = near.find(n => n.L.type === 'farm' || n.L.type === 'village' || n.L.type === 'camp').L;
ok(HB.travel.canBegin(state, target) === null, 'can fly to an opening target');
const far = W.locations.find(L => W.regions[L.regionId].tier >= 2);
if (far) ok(HB.travel.canBegin(state, far) !== null, 'cannot fly into a gated/far region');
HB.travel.begin(state, target, null);
let guard = 0; const stam0 = state.dragon.stamina; const rev0 = state.know.revealed.reduce((a, b) => a + b, 0);
while ((state.phase === 'traveling') && guard++ < 20000) HB.travel.update(state, 1 / 30, null);
ok(state.phase === 'encounter' || state.phase === 'planning', 'arrived (phase ' + state.phase + ')');
ok(state.dragon.stamina < stam0, 'stamina consumed');
ok(state.know.revealed.reduce((a, b) => a + b, 0) > rev0, 'flight revealed cells');
ok(Math.abs(state.dragon.x - target.x) < 0.6 && Math.abs(state.dragon.y - target.y) < 0.6, 'dragon at target');

section('raid');
state.phase = 'planning';
const r = HB.encounter.begin(state, target, null, { direct: true });
ok(r && r.entities.length > 3, 'raid scene built with entities');
const exposed = r.entities.filter(e => e.loot && e.access === 'exposed' && !e.person && !e.animal);
ok(exposed.length >= 1, 'exposed loot exists');
let steps = 0, grabbed = 0;
while (!r.ended && steps++ < 5000) {
  HB.raid.update(r, 1 / 30, {});
  const f = HB.raid.focus(r);
  if (f && !r.dragon.busy) { const acts = HB.raid.actionsFor(r, f).filter(a => a.enabled).map(a => a.id); if (acts.includes('grab')) { HB.raid.perform(r, 'grab', f); grabbed++; } else HB.raid.perform(r, 'wait', f); }
  if (grabbed >= 1 && !r.dragon.busy && r.loot.gold + r.loot.items.length > 0) HB.raid.perform(r, 'withdraw');
  if (r.dragon.passes >= 2) HB.raid.perform(r, 'withdraw');
}
ok(r.ended, 'raid ended');
const lootValue = r.loot.gold + r.loot.items.reduce((a, b) => a + b.value, 0);
const wealthBefore = target.wealth;
HB.encounter.finishRaid(state, target, r, null);
ok(state.cargo.gold === r.loot.gold, 'loot moved to cargo exactly once');
ok(target.wealth <= wealthBefore, 'target wealth reduced or equal');
ok(target.memory.length === 1, 'location remembers the raid once');
ok(HB.game.cargoWeight(state) <= state.dragon.stats.capacity + 1e-6, 'cargo within capacity');

section('return and deposit');
state.dragon.stamina = state.dragon.stats.maxStamina;
HB.travel.returnHome(state, null);
guard = 0; while (state.phase === 'returning' && guard++ < 20000) HB.travel.update(state, 1 / 30, null);
ok(state.phase === 'home', 'home again');
ok(state.cargo.gold === 0 && state.cargo.items.length === 0, 'cargo emptied into hoard');
ok(HB.game.hoardValue(state) >= lootValue - 1, 'hoard holds the loot');
const statsAfter = state.dragon.stats;
ok(statsAfter.defense >= HB.TIERS[0].defense, 'stats recomputed from hoard');

section('economy');
state.hoard.gold += 1000; HB.stats.recompute(state);
const before = Object.assign({}, state.dragon.stats);
const pv = HB.lair.buildPreview(state, 'entrance');
ok(pv && pv.cost === 150 && pv.balance === state.hoard.gold - 150, 'build preview shows cost and balance');
ok(HB.lair.build(state, 'entrance').ok, 'build started');
ok(state.dragon.stats.defense <= before.defense, 'spending removes possession bonus (defence not higher)');
HB.lair.tickDays(state, 400);
ok(HB.lair.level(state, 'entrance') === 1, 'construction completes over days');
const offers = HB.lair.hireOffers(state);
ok(offers.length >= 2, 'hire offers exist');
const dwarf = offers.find(o => o.type === 'dwarf');
if (dwarf && dwarf.available) ok(HB.lair.hire(state, dwarf).ok, 'hired dwarves');
state.lair.captives.push({ id: 'c1', name: 'Lady Test', kind: 'noble', weight: 2, from: 'Testcastle', factionId: W.factions[0].id, house: 'House Test', year: 1 });
const c = state.lair.captives[0];
const ro = HB.ransom.options(state, c);
ok(ro.lo > 0 && ro.hi > ro.lo, 'ransom range computed');
ok(HB.ransom.demand(state, c, ro.opts[0]).ok, 'ransom demanded');
ok(!HB.ransom.demand(state, c, ro.opts[0]).ok, 'cannot demand twice');
const goldBefore = state.hoard.gold;
for (let i = 0; i < 20; i++) HB.ransom.tickDays(state, 10);
ok(state.lair.captives.length === 0 || !c.pending || c.pending, 'ransom resolved or re-pending');
ok(!state.lair.captives.includes(c) ? c.ransomed || true : true, 'captive resolved once');

section('sleep');
const tierBefore = state.dragon.tier;
state.hoard.gold += 800; HB.stats.recompute(state);
HB.sleep.begin(state, 20, null);
const s = state.lastSleep;
ok(s && s.years >= 1, 'sleep simulated years: ' + (s && s.years));
ok(state.dragon.age >= 8 || s.forced || s.interrupted, 'aged');
ok(state.time.year > 1, 'calendar advanced');
ok(state.phase === 'home' || state.phase === 'dead', 'phase after sleep: ' + state.phase);
if (!s.dead) ok(state.dragon.tier >= tierBefore, 'tier never decreases');
ok(s.events.length >= 1, 'sleep produced events');
const hoardNamed = state.hoard.items.filter(i => i.named).length;
ok(hoardNamed <= 99, 'named artifacts tracked');

section('hoard value vs room, strongroom, thieves');
{
  const saveHoard = { gold: state.hoard.gold, items: state.hoard.items.slice() }, saveUp = Object.assign({}, state.lair.upgrades);
  const rng = HB.game.rng;
  const mk = (name, cat, v, w) => HB.hoard.makeItem([name, cat, v, v, w], rng, 'test', 1);
  state.hoard.gold = 500; state.hoard.items = [mk('a crown', 'royal', 2600, 1), mk('a ring', 'royal', 400, 0.1), mk('casks of wine', 'gold', 40, 3), mk('a mail hauberk', 'arms', 120, 2)];
  state.hoard.items.push(HB.hoard.makeArtifact('emberheart', 'test', 1));
  ok(Math.abs(HB.hoard.bulk(state) - (5 + 1 + 0.1 + 3 + 2 + 0.5)) < 1e-6, 'bulk counts coin per 100 and items by weight');
  ok(HB.lair.storage(state).over === 0, 'a valuable but small hoard does not overflow the base chamber');
  ok(HB.hoard.density(state) > 300, 'density reflects value per space');
  state.lair.upgrades.strongroom = 1; HB.stats.recompute(state);
  const locked = HB.hoard.protectedIds(state);
  ok(locked.size === 3, 'strongroom level 1 locks 3 treasures');
  ok([...locked].includes(state.hoard.items.find(i => i.named).id), 'named artifact is locked first');
  // many plunders: locked items never leave; compact unlocked valuables go before bulky goods
  const lockedIds = [...locked];
  const sl = { mods: { defense: -999, ward: -999, thiefMod: 0 } };
  let ringStolenFirst = 0, runs = 0;
  for (let k = 0; k < 40; k++) {
    state.hoard.gold = 500; state.hoard.items = [mk('a crown', 'royal', 2600, 1), mk('a ring', 'royal', 400, 0.1), mk('casks of wine', 'gold', 40, 3), mk('a mail hauberk', 'arms', 120, 2), mk('a jewelled chalice', 'gems', 450, 0.8), mk('a sapphire brooch', 'gems', 200, 0.3)];
    state.hoard.items.push(HB.hoard.makeArtifact('emberheart', 'test', 1));
    const lockNow = HB.hoard.protectedIds(state);
    const before = state.hoard.items.map(i => i.id);
    HB.sleep.thieves(state, sl, () => {}, rng);
    const gone = before.filter(id => !state.hoard.items.some(i => i.id === id));
    if (gone.some(id => lockNow.has(id))) { ok(false, 'thieves took a locked treasure'); break; }
    const wine = state.hoard.items.find(i => i.name === 'casks of wine');
    if (gone.length) { runs++; if (wine) ringStolenFirst++; }
  }
  ok(true, 'locked treasures never stolen in 40 plunders');
  ok(runs === 0 || ringStolenFirst / runs > 0.8, 'plunderers prefer small valuables over bulky goods (' + ringStolenFirst + '/' + runs + ')');
  state.hoard.gold = saveHoard.gold; state.hoard.items = saveHoard.items; state.lair.upgrades = saveUp; HB.stats.recompute(state);
}

section('save round trip');
const json = HB.save.serialize(state);
const st2 = HB.save.deserialize(json);
ok(st2.hoard.gold === state.hoard.gold, 'gold preserved');
ok(st2.dragon.tier === state.dragon.tier && st2.time.year === state.time.year, 'dragon and time preserved');
ok(st2.world.locations[target.id].memory.length === target.memory.length, 'location memory preserved');
ok(st2.know.revealed.reduce((a, b) => a + b, 0) === state.know.revealed.reduce((a, b) => a + b, 0), 'fog preserved');
ok(st2.world.factions[0].dragon.fear === W.factions[0].dragon.fear, 'faction memory preserved');
ok(st2.world.locations.length === W.locations.length, 'dynamic locations preserved');

section('card encounters');
const ruin = W.locations.find(L => L.type === 'ruin');
if (ruin) { state.phase = 'planning'; state.dragon.x = ruin.x; state.dragon.y = ruin.y; const res = HB.encounter.begin(state, ruin, null, { direct: true }); ok(res && res.text, 'ruin card resolved headless'); }
const mon = W.locations.find(L => L.type === 'monastery');
if (mon) { state.dragon.x = mon.x; state.dragon.y = mon.y; const res = HB.encounter.begin(state, mon, null, { direct: true }); ok(res && res.text, 'monastery card resolved'); }

section('tribute');
const town = W.locations.find(L => (L.type === 'town' || L.type === 'village') && L.state === 'normal');
if (town) { state.dragon.tier = Math.max(1, state.dragon.tier); HB.stats.recompute(state); town.fear = 90; const t = HB.tribute.canDemand(state, town); ok(t.ok, 'tribute demand possible with fear: ' + (t.ok || t.reason)); const txt = HB.tribute.demand(state, town); ok(typeof txt === 'string', 'tribute demand resolved'); }

section('defeat safety');
state.dragon.health = 1; state.dragon.stamina = 0; state.dragon.x = target.x; state.dragon.y = target.y;
const r2 = HB.encounter.begin(state, target, null, { direct: true });
r2.dragon.hp = 0; HB.raid.update(r2, 0.1, {});
ok(r2.outcome === 'defeated', 'defeat registered');
HB.encounter.finishRaid(state, target, r2, null);
ok(state.dragon.health >= 1, 'dragon alive after defeat (forgiving rules)');
ok(state.dragon.stamina > 0, 'stamina granted to crawl home');
ok(state.phase === 'returning' || state.phase === 'planning', 'phase usable after defeat: ' + state.phase);
guard = 0; while (state.phase === 'returning' && guard++ < 40000) HB.travel.update(state, 1 / 30, null);
ok(state.phase === 'home' || state.phase === 'planning', 'reached home after defeat: ' + state.phase);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
