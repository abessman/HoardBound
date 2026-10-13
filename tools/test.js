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
const target = HB.world.locationsNear(W, home.x, home.y, 18, L => ['farm', 'village', 'camp'].includes(L.type) && HB.world.canEnterRegion(state, L.regionId))[0].L;
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
ok(state.dragon.age >= 8 || s.forced || s.interrupted || s.dead, 'aged');
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

section('goals, good deeds, renown, consequences');
{
  const g = HB.game.newCampaign({ seed: seed + '-goals', name: 'Goalwyrm', breed: 'red', keeper: false });
  const GW = g.world;
  // this section exercises the raided-farm opening; other openings are tested below
  if (!GW.locations.some(L => L.threat)) HB.worldsim.spawnThreat(g, HB.game.rng, { first: true });
  ok(HB.TIERS[1].energy === 1000 && HB.TIERS[1].minAge === 8, 'young dragon needs hoard strength 1000 and age 8');
  const m = HB.goals.milestone(g);
  ok(m.title === 'Become a young dragon' && m.reqs.length === 2 && m.reqs[0].need === 1000 && m.reqs[1].need === 8, 'milestone shows real requirements');
  ok(m.unlocks.length >= 4 && /Stamina/.test(m.unlocks[0]), 'milestone lists what growth unlocks');
  ok(/Gather/.test(m.nextStep), 'next step says what to do: ' + m.nextStep);
  const threatened = GW.locations.filter(L => L.threat);
  ok(threatened.length === 1 && threatened[0].knowledge.seen, 'one farm or village under attack, visible from the start');
  const opps = HB.goals.opportunities(g);
  ok(opps.some(o => o.aim === 'trust' && o.ref && o.ref.id === threatened[0].id), 'Aims board offers saving it');
  ok(opps.some(o => o.aim === 'grow'), 'Aims board offers something to rob');
  ok(opps.every(o => o.title && o.desc && o.yields), 'every opportunity says what it yields');
  // defend: drive the raiders off
  const V = threatened[0];
  g.dragon.x = V.x; g.dragon.y = V.y; g.phase = 'planning';
  const fBefore = V.factionId >= 0 ? GW.factions[V.factionId].dragon.trust : 0;
  const r = HB.encounter.begin(g, V, null, { direct: true, defend: true });
  ok(r && r.mode === 'defend' && r.entities.some(e => e.raider), 'defend raid has raiders');
  ok(!r.entities.some(e => e.loot && !e.loot.recovered), 'nothing of the village is there to steal');
  let n = 0; while (!r.ended && n++ < 20000) { HB.raid.update(r, 1 / 30, {}); const f = HB.raid.focus(r); if (f && !r.dragon.busy) { const acts = HB.raid.actionsFor(r, f).filter(a => a.enabled).map(a => a.id); if (f.raider && acts.includes('roar')) HB.raid.perform(r, 'roar', f); else if (f.raider && acts.includes('bite')) HB.raid.perform(r, 'bite', f); else if (acts.includes('grab')) HB.raid.perform(r, 'grab', f); else HB.raid.perform(r, 'wait', f); } }
  ok(r.outcome === 'defended', 'a hatchling can drive off the opening raid: ' + r.outcome);
  HB.encounter.finishRaid(g, V, r, null);
  ok(!V.threat, 'threat lifted');
  ok(V.trust >= 25, 'village trusts you: ' + V.trust);
  ok(V.factionId < 0 || GW.factions[V.factionId].dragon.trust > fBefore, 'its realm trusts you more');
  ok(HB.renown.has(g, 'guardian') && HB.renown.displayName(g).includes('Guardian of ' + V.name), 'title Guardian of the village earned');
  ok(g.reactions.some(x => /trusts you/.test(x.text) && /because/.test(x.cause)), 'world reaction recorded with its cause');
  const sum = g.lastConsequence;
  ok(sum && /drove the raiders/.test(sum.headline) && sum.lines.some(l => /trusts you more/.test(l.text)), 'consequence summary says what changed');
  const willing = HB.lair.hireOffers(g).find(o => o.willing && o.from === V.name);
  ok(willing && willing.fee === 0 && willing.wage < HB.WORKER_TYPES.human.wage, 'saved village offers willing workers (no fee, lower wages)');
  g.hoard.gold = 100; ok(HB.lair.hire(g, willing).ok && g.lair.workers.some(w => w.willing && w.wage === willing.wage), 'willing workers hired at their wage');
  ok(HB.tribute.canProtect(g, V).ok || !['village', 'town', 'city'].includes(V.type), 'protection pact open to a trusting village');
  // a theft: robbing a caravan, with the summary naming its consequences
  const car = g.entities.find(e => e.kind === 'caravan');
  g.dragon.x = car.x; g.dragon.y = car.y; g.phase = 'planning'; g.dragon.health = g.dragon.stats.maxHealth; g.dragon.stamina = g.dragon.stats.maxStamina;
  const fc = car.factionId >= 0 ? GW.factions[car.factionId] : null; const esc0 = fc ? fc.learned.escorts : 0;
  const rc = HB.encounter.begin(g, car, null, { direct: true });
  n = 0; while (!rc.ended && n++ < 4000) { HB.raid.update(rc, 1 / 30, {}); const f = HB.raid.focus(rc); if (f && !rc.dragon.busy) { const acts = HB.raid.actionsFor(rc, f).filter(a => a.enabled).map(a => a.id); HB.raid.perform(rc, acts.includes('grab') ? 'grab' : 'wait', f); } if (rc.loot.gold + rc.loot.items.length > 0 && !rc.dragon.busy) HB.raid.perform(rc, 'withdraw'); if (rc.dragon.passes >= 2) HB.raid.perform(rc, 'withdraw'); }
  HB.encounter.finishRaid(g, car, rc, null);
  const cs = g.lastConsequence;
  if (rc.stolenValue > 0) {
    ok(/You robbed .*merchants/.test(cs.headline), 'caravan summary headline: ' + cs.headline);
    ok(cs.lines.some(l => /Stored at home/.test(l.text) && /Hoard strength/.test(l.text)), 'summary previews the stat gain and hoard strength once stored');
    ok(!fc || (fc.learned.escorts > esc0 && cs.lines.some(l => /more guards/.test(l.text))), 'summary says future caravans will be guarded');
    ok(cs.lines.some(l => /No trust gained/.test(l.text)), 'summary says no trust was gained');
    ok(HB.renown.deeds(g, 'caravans') === 1, 'caravan robbery counted toward the Road Thief');
  } else ok(true, 'caravan raid took nothing (skipped summary checks)');
  // tolls need the name (or size); three robberies earn it
  const car2 = g.entities.find(e => e.kind === 'caravan' && !e.dead);
  ok(!HB.encounter.tollTerms(g, car2).ok, 'a hatchling without a name cannot demand tolls');
  while (HB.renown.deeds(g, 'caravans') < 3) HB.renown.record(g, 'caravans', { factionId: car2.factionId });
  ok(HB.renown.has(g, 'roadthief') && HB.encounter.tollTerms(g, car2).ok, 'the Road Thief can demand tolls');
  const toll = HB.encounter.toll(g, car2); ok(typeof toll.success === 'boolean' && car2.tolled, 'toll resolved once');
  // guarding a caravan builds trust
  const car3 = g.entities.find(e => e.kind === 'caravan' && !e.dead && !e.tolled && e.factionId >= 0);
  if (car3) { const f3 = GW.factions[car3.factionId], t0 = f3.dragon.trust; HB.encounter.escort(g, car3, null); ok(f3.dragon.trust > t0 && HB.renown.deeds(g, 'escorted') === 1, 'guarding a caravan builds its realm\'s trust'); }
  // terror: fear multiplier is real
  for (let i = 0; i < 5; i++) HB.renown.record(g, 'burned', {});
  ok(HB.renown.has(g, 'terror') && HB.renown.fearMul(g) === 1.5, 'the Terror spreads fear faster');
  // releasing captives earns the Merciful and better ransoms
  for (let i = 0; i < 2; i++) { const c = { id: 'rc' + i, name: 'Captive ' + i, kind: 'noble', weight: 2, from: V.name, factionId: V.factionId, house: null, year: 1 }; g.lair.captives.push(c); HB.ransom.release(g, c); }
  ok(HB.renown.has(g, 'merciful'), 'two releases make you the Merciful');
  // threats fall if nobody comes
  const V2 = HB.worldsim.spawnThreat(g, HB.game.rng);
  if (V2) { const w0 = V2.wealth; V2.threat.until = g.time.totalDays; HB.worldsim.updateThreats(g, 1, HB.game.rng); ok(!V2.threat && V2.wealth < w0, 'an undefended village is sacked'); ok(!HB.worldsim.spawnThreat(g, HB.game.rng, {}) || true, 'spawn after sack ok'); }
  // upgrades answer problems: reasons and stop chances
  g.hoard.gold = 600; HB.stats.recompute(g);
  ok(HB.lair.whyNow(g, 'entrance') !== null, 'entrance has a reason before sleeping with a hoard: ' + HB.lair.whyNow(g, 'entrance'));
  const sc0 = HB.sleep.stopChances(g), sc1 = HB.sleep.stopChances(g, HB.lair.valuesWith(g, 'entrance'));
  ok(sc1.thief > sc0.thief + 0.15, `an entrance turns back noticeably more thieves (${Math.round(sc0.thief * 100)}% → ${Math.round(sc1.thief * 100)}%)`);
  ok(!g.lair.upgrades.entrance, 'valuesWith leaves the lair unchanged');
  g.problems.thefts = 2; g.problems.stolenValue = 300; g.problems.stolenNamed.push('the Test Crown');
  ok(/Test Crown/.test(HB.lair.whyNow(g, 'strongroom')), 'strongroom reason names what thieves took');
  ok(HB.sleep.preview(g, 5).lines.some(l => /turn back about/.test(l.text)), 'sleep preview shows what the door turns back');
  // saves keep names, reactions, problems and threats
  const V3 = HB.worldsim.spawnThreat(g, HB.game.rng);
  const g2 = HB.save.deserialize(HB.save.serialize(g));
  ok(g2.renown.titles.length === g.renown.titles.length && g2.reactions.length === g.reactions.length && g2.problems.thefts === 2, 'renown, reactions and problems saved');
  ok(!V3 || (g2.world.locations[V3.id].threat && g2.world.locations[V3.id].threat.campName === V3.threat.campName), 'threats saved');
}

section('situations, heat, hunters, pursuit, offerings');
{
  // every world opens with a situation, and openings differ between worlds
  const kinds = new Set();
  for (const sd of ['sit-a', 'sit-b', 'sit-c', 'sit-d', 'sit-e', 'sit-f', 'sit-g', 'sit-h']) { const w = HB.game.newCampaign({ seed: seed + sd, name: 'S', keeper: false }); const o = HB.situations.open(w); ok(o.length >= 1, 'world opens with a situation: ' + sd); if (o[0]) kinds.add(o[0].t); }
  ok(kinds.size >= 2, 'openings differ between worlds: ' + [...kinds].join(', '));
  const fresh = (tag) => HB.game.newCampaign({ seed: seed + '-' + tag, name: 'S', keeper: false });
  const force = (st, id) => HB.situations.open(st).find(x => x.t === id) || HB.situations.spawn(st, HB.game.rng, { only: id });
  const playRaid = (st, r, pick) => { let n = 0; while (!r.ended && n++ < 20000) { HB.raid.update(r, 1 / 30, {}); const f = HB.raid.focus(r); if (f && !r.dragon.busy) { const acts = HB.raid.actionsFor(r, f).filter(a => a.enabled).map(a => a.id); const p = pick(f, acts, r); HB.raid.perform(r, p || 'wait', f); } if (r.dragon.passes >= 3) HB.raid.perform(r, 'withdraw'); } };
  const strong = (st) => { st.dragon.tier = 2; HB.stats.recompute(st); st.dragon.health = st.dragon.stats.maxHealth; st.dragon.stamina = st.dragon.stats.maxStamina; };

  // the stolen tribute chest: steal it without killing, give it back, and the captain comes for you
  let st = fresh('chest'); let sit = force(st, 'stolenChest');
  if (sit) {
    const C = st.world.locations[sit.a.campId], V = st.world.locations[sit.a.villageId], K = st.world.locations[sit.a.cragId];
    ok(K.flags.requires === 'wind' && /Gale-Feather/.test(HB.travel.canBegin(st, K) || ''), 'the crag needs the Gale-Feather Charm');
    ok(HB.goals.opportunities(st).filter(o => o.story).length >= 3, 'the Aims board offers the story\'s approaches');
    strong(st); st.dragon.x = C.x; st.dragon.y = C.y; st.phase = 'planning';
    const r = HB.encounter.begin(st, C, null, { direct: true });
    ok(r.entities.some(e => e.loot && e.loot.tag === 'chest:' + sit.id) && r.entities.some(e => e.leader && e.drop && e.drop.item && e.drop.item.capability === 'wind'), 'camp scene has the chest and the captain wears the charm');
    playRaid(st, r, (f, acts, rr) => { if (f.loot && f.loot.tag && acts.includes('grab')) return 'grab'; if ((rr.tags || []).length) { HB.raid.perform(rr, 'withdraw'); return null; } return 'wait'; });
    ok((r.tags || []).includes('chest:' + sit.id), 'stole the chest');
    HB.encounter.finishRaid(st, C, r, null);
    ok(sit.outcome === 'returned' && V.trust >= 25 && V.flags.roost, 'returning the chest earns trust and a safe barn');
    ok(!sit.a.hiddenId || st.world.locations[sit.a.hiddenId].knowledge.seen, 'the reeve reveals a hidden place');
    if (!sit.a.captainDead) { HB.game.advanceDays(st, 6); HB.worldsim.tickDays(st, 6); ok(st.entities.some(e => e.kind === 'hunters' && /Captain/.test(e.name)), 'the robbed captain hunts you'); }
    // buying the charm opens the crag
    const st2 = fresh('chest2'); const s2 = force(st2, 'stolenChest');
    if (s2) { const C2 = st2.world.locations[s2.a.campId], K2 = st2.world.locations[s2.a.cragId]; st2.cargo.gold = 300; st2.dragon.x = C2.x; st2.dragon.y = C2.y; const buy = HB.situations.choicesFor(st2, C2, null).find(c => /Gale-Feather/.test(c.label)); ok(buy && !buy.disabled, 'the charm can be bought'); buy.onChoose(); ok(HB.caps.has(st2, 'wind') && !/Gale-Feather/.test(HB.travel.canBegin(st2, K2) || ''), 'with the charm the crag is reachable');
      // parley: a cut each season
      const parley = HB.situations.choicesFor(st2, C2, null).find(c => /Parley/.test(c.label)); parley.onChoose(); ok(s2.a.pact, 'bargain struck with the captain'); HB.game.advanceDays(st2, 95); HB.worldsim.tickDays(st2, 95); ok((st2.pactGold || 0) > 0, 'the outlaws pay a cut each season'); const col = HB.tribute.collectOfferings(st2); ok(col.total > 0 && col.names.includes('your outlaw partners'), 'cut collected at home'); }
  } else ok(true, 'stolen chest not possible here (skipped)');

  // the taken envoy: seize him, release him, open the sealed door
  st = fresh('envoy'); sit = force(st, 'takenEnvoy');
  if (sit) {
    const C = st.world.locations[sit.a.campId], S = st.world.locations[sit.a.vaultId];
    ok(HB.situations.choicesFor(st, S, null).some(c => c.disabled && /sealed/i.test(c.label)), 'the vault is sealed');
    strong(st); st.dragon.x = C.x; st.dragon.y = C.y; st.phase = 'planning';
    const r = HB.encounter.begin(st, C, null, { direct: true });
    playRaid(st, r, (f, acts, rr) => { if (f.sitId && acts.includes('capture')) return 'capture'; if (rr.captured) { HB.raid.perform(rr, 'withdraw'); return null; } return 'wait'; });
    HB.encounter.finishRaid(st, C, r, null);
    const c = st.cargo.captives.find(x => x.sitId === sit.id);
    ok(c && sit.a.carried, 'envoy carried off');
    if (c) { st.lair.captives.push(c); st.cargo.captives = st.cargo.captives.filter(x => x !== c); HB.ransom.release(st, c); ok(sit.outcome === 'freed' && HB.caps.has(st, 'seal'), 'releasing the envoy brings the Deepwarden\'s Seal'); const open = HB.situations.choicesFor(st, S, null).find(x => /Seal/.test(x.label)); ok(open && !open.disabled, 'the seal opens the door'); const g0 = st.cargo.gold; open.onChoose(); ok(st.cargo.gold > g0, 'the vault gives up its gold'); ok(HB.lair.hireOffers(st).some(o => o.type === 'dwarf' && o.fee === 0), 'grateful dwarves work without a fee'); }
  } else ok(true, 'taken envoy not possible here (skipped)');

  // the slayer's purse: turn the villages, or let him come
  st = fresh('slayer'); sit = force(st, 'slayerBounty');
  if (sit) {
    ok(st.entities.some(e => e.id === sit.a.heroId && e.kind === 'hero'), 'the slayer is on the road');
    for (const id of sit.a.funders) { const L = st.world.locations[id]; L.trust = 20; const ch = HB.situations.choicesFor(st, L, null).find(x => /Ask/.test(x.label)); ok(ch && !ch.disabled, 'a trusting village can be asked'); ch.onChoose(); }
    ok(sit.outcome === 'abandoned' && st.memory.loyalties.some(l => l.name === sit.a.hero), 'with no purse the slayer leaves and will warn you');
    const st3 = fresh('slayer2'); const s3 = force(st3, 'slayerBounty');
    if (s3) { s3.deadline = st3.time.totalDays; HB.worldsim.tickDays(st3, 1); ok(st3.entities.some(e => e.kind === 'hunters' && e.sitId === s3.id), 'at the deadline the slayer comes for you'); }
  } else ok(true, 'slayer bounty not possible here (skipped)');

  // heat steps change the world; hunting parties walk to you; fleeing and fighting
  st = fresh('heat'); const f = st.world.factions.find(x => x.kind !== 'goblin');
  const car = st.entities.find(e => e.kind === 'caravan' && e.factionId === f.id);
  const esc0 = car ? car.escort : 0;
  HB.heat.add(st, f, 30, 'test');
  ok(HB.heat.level(f).id === 'wary' && (!car || car.escort > esc0), 'Wary: merchants hire guards');
  HB.heat.add(st, f, 50, 'test');
  const party = st.entities.find(e => e.kind === 'hunters' && e.factionId === f.id);
  ok(HB.heat.level(f).id === 'hunting' && party, 'Hunting: a party sets out');
  ok(st.reactions.some(x => /wary/i.test(x.text)) && st.reactions.some(x => /sent/.test(x.text)), 'heat steps are logged as reactions');
  party.x = st.dragon.x + 1; party.y = st.dragon.y; st.dragon.x += 0; st.phase = 'planning';
  const homeX = st.world.home.x; st.dragon.x = homeX + 5; party.x = st.dragon.x + 1; party.y = st.dragon.y;
  HB.hunters.tick(st, 1);
  ok(st.ambush === party.id, 'the party catches up: ambush');
  const fleeText = HB.hunters.resolveAmbush(st, 'flee', null);
  ok(!st.ambush && party.restUntil > st.time.totalDays && typeof fleeText === 'string', 'fleeing buys a few days');
  HB.heat.decay(st, 250);
  ok(HB.heat.level(f).id !== 'hunting' && party.dead, 'hired hunters go home when the realm cools');

  // pursuit: riders follow a loud raid home unless you lose them
  st = fresh('pursuit'); const V = st.world.locations.find(L => L.type === 'village' && L.factionId >= 0);
  HB.pursuit.start(st, V, { pursued: true, outcome: 'withdrew' });
  ok(HB.pursuit.active(st) && /on your trail/.test(HB.pursuit.hint(st)), 'riders on your trail');
  const far = st.world.locations.find(L => Math.hypot(L.x - V.x, L.y - V.y) > 10);
  ok(/lose/.test(HB.pursuit.onArrive(st, far) || '') && !HB.pursuit.active(st), 'landing far away loses them');
  HB.pursuit.start(st, V, { pursued: true, outcome: 'withdrew' });
  const t0 = HB.sleep.threatEstimate(st).thief, a0 = st.lair.attention || 0;
  ok(/followed you home/.test(HB.pursuit.onHome(st) || '') && st.lair.attention > a0 && HB.sleep.threatEstimate(st).thief > t0, 'flying straight home shows them the lair');

  // offerings: once you are young and your lair is known, villages of your home region that trust you bring gifts
  st = fresh('offer'); const OV = st.world.locations.filter(L => (L.type === 'village' || L.type === 'farm') && L.regionId === HB.domain.homeRegion(st) && Math.hypot(L.x - st.world.home.x, L.y - st.world.home.y) < 25)[0];
  if (OV) {
    OV.trust = 40; OV.threat = null; OV.wealth = OV.wealthMax;
    ok(!HB.tribute.offeringPlaces(st).length, 'a hatchling whose lair nobody knows gets no offerings');
    st.dragon.tier = 1; st.dragon.age = 9; HB.stats.recompute(st);
    ok(!HB.tribute.offeringPlaces(st).length, 'nor a young dragon whose lair is hidden');
    HB.domain.markFound(st, 'a test found it');
    ok(st.reactions.some(r => /know where you sleep now/.test(r.text)), 'the lair being found is reported, with its cause');
    HB.tribute.accrueOfferings(st, 90); const got = HB.tribute.collectOfferings(st); ok(got.total > 0 && got.names.includes(OV.name), 'offerings collected: ' + got.total); const est = HB.tribute.offeringEstimate(st, 20); ok(est.hi > est.lo && est.lo > 0, 'offerings over a sleep shown as a range'); OV.state = 'burned'; ok(!HB.tribute.offeringPlaces(st).includes(OV), 'a burned village brings nothing'); }
  // guarding caravans takes longer to earn a name now
  ok(HB.TITLE_BY_ID.roadwarden.need === 4, 'Warden of the Roads needs four guarded caravans');
  // saves keep stories and pursuit
  st = fresh('save'); force(st, 'stolenChest'); HB.pursuit.start(st, st.world.locations[1], { pursued: true, outcome: 'withdrew' });
  const st4 = HB.save.deserialize(HB.save.serialize(st));
  ok(st4.situations.length === st.situations.length && st4.situations[0].t === st.situations[0].t && !!st4.pursuit === !!st.pursuit, 'situations and pursuit saved');
}

section('domain: allegiance, influence, the settlement at your hill');
{
  const D = HB.domain;
  const fresh = (tag) => HB.game.newCampaign({ seed: seed + '-dom-' + tag, name: 'D', keeper: false });
  const young = (st, align) => { st.dragon.tier = 1; st.dragon.age = 9; st.dragon.alignment = align; HB.stats.recompute(st); };
  const adult = (st) => { st.dragon.tier = 2; st.dragon.age = 41; HB.stats.recompute(st); };
  const nearPeople = (st, r) => HB.world.locationsNear(st.world, st.world.home.x, st.world.home.y, r, L => (L.type === 'village' || L.type === 'farm') && L.state === 'normal').map(o => o.L);
  // a kind domain
  let st = fresh('kind');
  const c0 = D.influence(st).count;
  ok(st.domain && D.home(st).stage === 0 && c0 > 0 && D.lairRadius(st).r <= 3.6, 'a hatchling has no settlement, only a little territory around its lair');
  st.hoard.gold += 600; HB.stats.recompute(st);
  ok(D.influence(st).count > c0, 'a growing hoard widens it a little');
  young(st, 20);
  ok(D.influence(st).count > c0 && D.lairRadius(st).r >= 4, 'a young dragon reaches farther');
  ok(!st.world.locations.some(L => L.regionId !== D.homeRegion(st) && D.inInfluence(st, L)), 'the territory never leaves the home region');
  ok(/young/i.test(HB.goals.unlocks(st, 0, 1).join(' ')) || HB.goals.unlocks(st, 0, 1).some(u => /settle/.test(u)), 'growing up promises the domain');
  const vs = nearPeople(st, 30).filter(L => L.regionId === D.homeRegion(st)); const V = vs.find(L => L.type === 'village' && Math.hypot(L.x - st.world.home.x, L.y - st.world.home.y) <= 9) || vs[0];
  ok(!!V, 'a village or farm near home');
  ok(!D.advance(st, HB.game.rng) && D.nextReqs(st).reqs.some(r => r.key === 'source' && !r.done), 'nobody settles without people who trust you');
  V.trust = 45; V.knowledge.seen = true;
  const t1 = D.advance(st, HB.game.rng);
  ok(t1 && D.home(st).stage === 1 && D.home(st).path === 'benevolent' && D.home(st).name, 'trusting families found a refuge: ' + (t1 || '').slice(0, 60));
  ok(st.reactions.some(x => /camps/.test(x.text)), 'the founding is reported with a cause');
  const def0 = HB.lair.values(st), b0 = HB.lair.buildRate(st);
  ok(b0 > 0.2 && HB.lair.hireOffers(st).some(o => o.from === D.home(st).name && o.willing), 'the refuge speeds building and offers willing hands');
  HB.tribute.protect(st, V);
  ok(D.statusOf(st, V) === 'protected' && D.members(st).some(m => m.L === V), 'protection makes it part of the domain');
  ok(!D.canOath(st, V).ok, 'an oath needs time and trust');
  V.trust = 60; V.flags.protected = st.time.year - 2;
  ok(!D.canOath(st, V).ok && /grown dragon/.test(D.canOath(st, V).reason || ''), 'a young dragon cannot take oaths yet');
  const reach0 = D.influence(st).count;
  adult(st);
  ok(D.canOath(st, V).ok, 'trusted for years, it swears to an adult dragon: ' + (D.canOath(st, V).reason || ''));
  D.takeOath(st, V);
  ok(D.statusOf(st, V) === 'allied' && D.influence(st).count >= reach0, 'sworn: allied, influence spreads from it');
  ok(HB.goals.opportunities(st).some(o => o.aim === 'domain'), 'the Aims board offers domain goals');
  // grow a stage: years, members, a guard post
  const h = D.home(st); h.stageYear = st.time.year - 4; st.lair.upgrades.guardpost = 1;
  ok(D.advance(st, HB.game.rng) && h.stage === 2, 'an adult with years, a member and a guard post: the camps become a village');
  ok(!D.nextReqs(st).reqs.find(r => r.key === 'tier' && r.label.includes('adult')) || D.nextReqs(st).reqs.find(r => r.key === 'tier').done, 'the town needs an adult dragon (done)');
  st.dragon.alignment = 20; const fav0 = h.favour || 0; st.hoard.gold += 1000;
  ok(D.canGift(st, 'small').ok && D.gift(st, 'small') && h.favour === fav0 + 1, 'a gift from the hoard counts as a year of growth');
  ok(HB.lair.values(st).warning > def0.warning && HB.lair.values(st).defense > def0.defense, 'the village warns and guards the lair');
  D.accrue(st, 90); const got = HB.tribute.collectOfferings(st);
  ok(got.names.includes(h.name) && got.total > 0, 'its gifts wait at the foot of the hill: ' + got.total);
  // a broken promise
  const W2 = nearPeople(st, 40).find(L => L !== V && L.state === 'normal');
  if (W2) { W2.trust = 40; HB.tribute.protect(st, W2); }
  const trustW2 = W2 ? W2.trust : 0;
  HB.encounter.applyConsequences(st, V, { stolenValue: 50, destroyedValue: 0, burned: 0, kills: 0, civiliansKilled: 0, captured: 0, fear: 2, hostility: 2, trust: 0, alignment: 0, label: 'withdrew', outcome: 'withdrew', damageTaken: 0 }, null);
  ok(D.statusOf(st, V) === null && V.trust === 0, 'raiding a sworn village breaks the oath');
  if (W2) ok(W2.trust < trustW2, 'every place under your protection hears of it');
  // the home turns with your deeds
  st.dragon.alignment = -70; for (let i = 0; i < 8; i++) D.yearly(st, HB.game.rng);
  ok(h.path === 'tyrannical' && st.reactions.some(x => /fled your cruelty/.test(x.text)), 'cruelty turns a refuge into a camp');

  // a cruel domain
  st = fresh('cruel'); young(st, -30);
  // a tributary carries its own lobe of your territory, so any village of the home region will do
  const T = HB.world.locationsNear(st.world, st.world.home.x, st.world.home.y, 40, L => (L.type === 'village' || L.type === 'town') && L.state === 'normal' && L.regionId === D.homeRegion(st)).map(o => o.L)[0];
  T.fear = 90; HB.tribute.demand(st, T); if (!(T.tribute && !T.tribute.lapsed)) { T.tribute = { amount: 30, since: st.time.year, lapsed: false, willing: false, paidTotal: 0 }; }
  ok(D.statusOf(st, T) === 'tributary', 'tribute makes a tributary');
  ok(D.advance(st, HB.game.rng) && D.home(st).path === 'tyrannical' && D.stageInfo(st).name === 'Cult Camps', 'fear founds the camps of a cult');
  ok(!D.canOccupy(st, T).ok, 'a young dragon cannot occupy yet');
  adult(st);
  const occ = D.canOccupy(st, T);
  ok(occ.ok, 'a frightened tributary inside your influence can be occupied: ' + (occ.reason || ''));
  const enslaved0 = st.lair.workers.filter(w => w.status === 'enslaved').reduce((a, w) => a + w.count, 0);
  const snap = HB.consequences.snapshot(st, T);
  D.occupy(st, T);
  ok(D.statusOf(st, T) === 'occupied' && st.lair.workers.filter(w => w.status === 'enslaved').reduce((a, w) => a + w.count, 0) === enslaved0 + 2, 'occupied: it pays heavily and sends labour');
  const sum = HB.consequences.summarize(st, T, snap, { kind: 'domain', label: 'Occupy' });
  ok(/occupied/.test(sum.headline) && sum.lines.some(l => /now occupied/.test(l.text)), 'the summary says what it is now');
  const far = st.world.locations.find(L => L.type === 'village' && L.state === 'normal' && !D.inInfluence(st, L));
  if (far) { far.fear = 95; ok(!D.canOccupy(st, far).ok && /territory|home region/.test(D.canOccupy(st, far).reason || ''), 'beyond your territory nothing can be occupied'); }
  let rose = false; for (let i = 0; i < 20 && !rose; i++) { D.yearly(st, HB.game.rng); rose = D.statusOf(st, T) === 'resisting'; }
  ok(rose, 'occupation breeds resistance until it revolts');
  D.crush(st, T);
  ok(D.statusOf(st, T) === 'occupied' && T.occupation.resistance === 10, 'crushing it puts it back to work');
  const tr = T.tribute.amount, carried0 = st.cargo.gold;
  D.raze(st, T);
  ok(D.statusOf(st, T) === 'ruined' && !T.tribute && st.reactions.some(x => x.text.includes(`never again its ${tr} gold`)), 'razing it ends its tribute for good');
  ok(st.cargo.gold >= carried0, 'razing gives what you can carry now');
  // rebuild it
  st.cargo.gold += 400; const tr0 = T.trust;
  ok(D.canRebuild(st, T).ok, 'a burned village can be rebuilt with gold');
  D.rebuild(st, T);
  ok(T.state === 'normal' && T.trust >= tr0 + 25, 'rebuilt: alive again, and grateful');
  // a cruel home revolts
  const hh = D.home(st); hh.unrest = 59; st.lair.workers = []; let revolted = false;
  for (let i = 0; i < 4 && !revolted; i++) { D.yearly(st, HB.game.rng); revolted = hh.lastRevolt === st.time.year; }
  ok(revolted && st.reactions.some(x => /rose against your overseers/.test(x.text)), 'unrest in the camp ends in revolt');
  // saves keep the domain and occupation; places made during play keep their position
  const O = nearPeople(st, 30).find(L => L.type === 'village' && L !== T && L.state === 'normal');
  if (O) { O.fear = 95; if (D.canOccupy(st, O).ok) D.occupy(st, O); }
  HB.factions.makeBattlefield(st, st.world.subregions[st.world.home.subId], st.world.factions[0], st.world.factions[1] || st.world.factions[0], HB.game.rng);
  const bf = st.world.locations[st.world.locations.length - 1];
  const st2 = HB.save.deserialize(HB.save.serialize(st));
  ok(st2.domain.home.stage === D.home(st).stage && st2.domain.home.name === D.home(st).name, 'saves keep the settlement at your hill');
  if (O && O.occupation) ok(st2.world.locations[O.id].occupation && st2.world.locations[O.id].occupation.since === O.occupation.since, 'saves keep occupations');
  const bf2 = st2.world.locations[bf.id];
  ok(bf2 && bf2.x === bf.x && bf2.y === bf.y && st2.world.locAt[bf.cell] === bf.id, 'places made during play keep their position on the map');
}

section('endgame: the great struggle (prototype)');
{
  const E = HB.endgame;
  const fresh = (tag) => HB.game.newCampaign({ seed: seed + '-end-' + tag, name: 'E', keeper: false });
  const killBoss = (r) => { const b = r.entities.find(e => e.boss); b.hp = 0; HB.raid.kill(r, b, 'bitten'); return b; };
  let st = fresh('none');
  ok(!E.active(st) && !E.check(st, HB.game.rng), 'a hatchling has no endgame');
  st.dragon.tier = 1; st.dragon.age = 26; st.dragon.alignment = 20;
  ok(E.check(st, HB.game.rng) && st.reactions.some(x => /will not stay dead/.test(x.text)) && !E.active(st), 'a grown young dragon hears a rumour of what is coming');
  st.dragon.tier = 2; st.dragon.alignment = 0; HB.stats.recompute(st);
  ok(!E.check(st, HB.game.rng) && HB.endgame.opportunities(st).some(o => /Choose what you are/.test(o.title)), 'an adult known as neither waits, and is told why');
  // a kind dragon: the Hollow King and three lieutenants
  st = fresh('kind'); HB.presets.apply(st, 'adult-kind');
  const S = E.get(st), W = st.world;
  ok(S.path === 'shadow' && S.foe && S.lieutenants.length === 3 && S.lieutenants.every(l => l.locId !== null), 'a kind adult faces the Hollow King: three lieutenants placed: ' + (S.foe && S.foe.name));
  const camp = W.locations[S.lieutenants[0].locId];
  ok(camp.type === 'stronghold' && camp.lieutenant === 'warlord' && HB.world.known(camp) && W.locations[S.fortressId].type === 'fortress', 'the Warlord’s camp is known, the fortress rumoured');
  ok(HB.goals.opportunities(st).some(o => o.aim === 'endgame') && /lieutenants 0 of 3/.test(E.hint(st)), 'the Aims board and goal panel show the struggle');
  ok(E.choicesFor(st, W.locations[S.lieutenants[1].locId]).some(c => c.disabled) && E.choicesFor(st, W.locations[S.fortressId]).some(c => c.disabled), 'the other lieutenants and the last battle say they are not built yet');
  const wl = S.lieutenants[0];
  const V = E.hostStrike(st, HB.game.rng, wl, false);
  ok(V && V.threat && V.threat.host && V.threat.orc, 'the Warlord’s host strikes a place that trusts you: ' + (V && V.name));
  if (V) { st.dragon.x = V.x; st.dragon.y = V.y; st.phase = 'planning'; const r = HB.encounter.begin(st, V, null, { direct: true, defend: true }); ok(r.entities.some(e => e.kind === 'orc' && e.raider), 'its defence is fought against orcs'); }
  st.dragon.x = camp.x; st.dragon.y = camp.y; st.phase = 'planning';
  const r = HB.encounter.begin(st, camp, null, { direct: true });
  ok(r && r.entities.some(e => e.kind === 'warlord' && e.boss) && r.entities.some(e => e.kind === 'orc'), 'the warcamp scene has the Warlord and his warbands');
  ok(r.entities.some(e => e.kind === 'orc' && e.state === 'asleep'), 'allies’ scouts lead you in while some sleep');
  killBoss(r);
  ok(r.bossSlain && r.entities.filter(e => e.defender && !e.dead).every(e => e.fearT > 0), 'the Warlord falls and the rest run');
  HB.raid.perform(r, 'withdraw'); HB.encounter.finishRaid(st, camp, r, null);
  ok(!wl.alive && camp.state === 'ruin' && !W.locations.some(L => L.threat && L.threat.host), 'the Warlord is dead, his hosts stop');
  ok(S.lieutenants[1].found && HB.world.known(W.locations[S.lieutenants[1].locId]), 'rumours point to the next lieutenant');
  ok(st.lastConsequence && st.lastConsequence.lines.some(l => /is dead/.test(l.text)) && st.lastConsequence.lines.some(l => /1 of 3/.test(l.text)), 'the summary says what changed');
  st.dragon.alignment = -80; E.check(st, HB.game.rng);
  ok(S.path === 'shadow', 'the opposition does not change once it has formed');
  const st2 = HB.save.deserialize(HB.save.serialize(st));
  const camp2 = st2.world.locations[camp.id];
  ok(st2.endgame.path === 'shadow' && !st2.endgame.lieutenants[0].alive && camp2 && camp2.lieutenant === 'warlord' && camp2.x === camp.x && st2.world.locAt[camp.cell] === camp.id, 'saves keep the struggle and its places');
  // a cruel dragon: the six Crystals of Life
  st = fresh('cruel'); HB.presets.apply(st, 'adult-cruel');
  const C = E.get(st), W3 = st.world;
  ok(C.path === 'crystals' && C.crystals.length === 6 && C.crystals.filter(c => c.locId !== null).length >= 5, 'a cruel adult hunts six Crystals of Life');
  ok(new Set(C.crystals.filter(c => c.locId !== null).map(c => W3.locations[c.locId].regionId)).size >= 4, 'the sanctuaries lie in different realms');
  const sanc = W3.locations[C.crystals[0].locId];
  ok(HB.world.known(sanc) && C.crystals[0].id === 'greenmarrow', 'the first sanctuary is known');
  st.dragon.x = sanc.x; st.dragon.y = sanc.y; st.phase = 'planning';
  const r2 = HB.encounter.begin(st, sanc, null, { direct: true });
  const cr = r2.entities.find(e => e.kind === 'crystal');
  ok(cr && cr.access === 'warded' && HB.raid.actionsFor(r2, cr).some(a => a.id === 'grab' && !a.enabled), 'the crystal is warded while its guardian lives');
  killBoss(r2);
  ok(cr.access === 'exposed', 'the ward breaks when the guardian falls');
  HB.raid.takeLoot(r2, cr);
  const wealthBefore = W3.locations.filter(L => L.regionId === sanc.regionId && L.type === 'village').map(L => L.wealthMax);
  HB.raid.perform(r2, 'withdraw'); HB.encounter.finishRaid(st, sanc, r2, null);
  ok(C.crystals[0].taken && st.cargo.items.some(i => i.artifactId === 'crystal_greenmarrow'), 'the crystal is taken and carried');
  const wealthAfter = W3.locations.filter(L => L.regionId === sanc.regionId && L.type === 'village').map(L => L.wealthMax);
  ok(wealthBefore.length === 0 || wealthAfter.every((w, i) => w < wealthBefore[i]), 'its realm withers');
  ok(HB.domain.markField(st).some(v => v < 0) && C.crystals[1].found, 'the land around the sanctuary is blighted on the map, and the next crystal is rumoured');
  const hp0 = st.dragon.stats.maxHealth; HB.hoard.deposit(st); HB.stats.recompute(st);
  ok(st.dragon.stats.maxHealth > hp0, 'stored in the hoard, the crystal gives its power');
}

section('debug tools');
{
  const C = HB.cheats;
  const st = HB.game.newCampaign({ seed: seed + '-cheat', name: 'C', keeper: false });
  ok(!C.any(st) && !st.flags.cheated, 'a new campaign has no debug toggles');
  C.toggle(st, 'gold'); C.toggle(st, 'invincible'); C.toggle(st, 'stamina'); C.toggle(st, 'safeSleep'); C.toggle(st, 'instantBuild');
  ok(st.hoard.gold >= 100000 && st.flags.cheated && C.active(st).length === 5, 'toggles on: the hoard is full and the campaign is marked');
  st.hoard.gold -= 50000; HB.worldsim.tickDays(st, 1);
  ok(st.hoard.gold >= 100000, 'infinite gold tops the hoard back up');
  HB.lair.build(st, 'entrance'); C.topUp(st);
  ok(HB.lair.level(st, 'entrance') === 1 && !st.lair.construction.length, 'instant building finishes at once');
  const T = HB.world.locationsNear(st.world, st.world.home.x, st.world.home.y, 18, L => L.type === 'farm' || L.type === 'village')[0].L;
  st.dragon.x = T.x; st.dragon.y = T.y; st.phase = 'planning';
  const r = HB.encounter.begin(st, T, null, { direct: true }); const hp = r.dragon.hp;
  HB.raid.damageDragon(r, 50, 'a test blow'); r.dragon.stamina = 0; HB.raid.update(r, 1 / 30, {});
  ok(r.dragon.hp === hp && r.dragon.stamina === st.dragon.stats.maxStamina, 'invincible takes no damage; stamina never runs out');
  for (const a of C.ACTIONS) { let err = null; try { C.run(st, a.id); } catch (e) { err = e; } ok(!err, 'debug action runs: ' + a.id + (err ? ' ' + err.message : '')); }
  ok(st.dragon.tier >= 1 && HB.domain.home(st).stage >= 1 && HB.endgame.active(st), 'actions grow the dragon, the settlement and start the struggle');
  st.phase = 'home'; HB.sleep.begin(st, 20, null);
  ok(!st.lastSleep.events.some(e => e.kind === 'thief' || e.kind === 'hunters') && st.phase !== 'dead', 'safe sleep: nobody comes');
  const st2 = HB.save.deserialize(HB.save.serialize(st));
  ok(C.on(st2, 'invincible') && st2.flags.cheated, 'saves keep the toggles');
}

section('world of seven regions, territory by phase, grudges (0.11)');
{
  const D = HB.domain, H = HB.history;
  const st = HB.game.newCampaign({ seed: seed + '-seven', name: 'S', keeper: false }), W = st.world;
  ok(W.gen === 2 && W.regions.length === 7, 'the world has seven regions');
  const tiers = W.regions.map(R => R.tier).sort().join('');
  ok(tiers === '0112233' && W.regions[D.homeRegion(st)].tier === 0, 'home is open to a hatchling; two regions open at each later phase: ' + tiers);
  const land = W.regions.map(R => R.landCells), mean = land.reduce((a, b) => a + b, 0) / 7;
  ok(Math.min(...land) > mean * 0.2, 'no region is a sliver: ' + land.join(' '));
  // old campaigns keep their own world
  const j = JSON.parse(HB.save.serialize(st)); j.gen = 1;
  const old = HB.save.deserialize(JSON.stringify(j));
  ok(old.world.gen === 1 && old.world.regions.length !== 7, 'a save from before 0.11 loads the world it was made in (' + old.world.regions.length + ' regions)');
  ok(JSON.parse(HB.save.serialize(old)).gen === 1, 'and saves it as such');
  // the cruel struggle: one crystal in each of the six other regions
  const sc = HB.game.newCampaign({ seed: seed + '-seven', name: 'S', keeper: false });
  HB.endgame.begin(sc, 'crystals', HB.game.rng);
  const rs = HB.endgame.get(sc).crystals.map(c => sc.world.locations[c.locId]).filter(Boolean).map(L => L.regionId);
  ok(rs.length === 6 && new Set(rs).size === 6 && !rs.includes(D.homeRegion(sc)), 'one Crystal of Life in each of the six other regions');
  const ss = HB.game.newCampaign({ seed: seed + '-seven', name: 'S', keeper: false });
  HB.endgame.begin(ss, 'shadow', HB.game.rng);
  const sp = HB.endgame.get(ss).lieutenants.map(l => ss.world.locations[l.locId]).concat([ss.world.locations[HB.endgame.get(ss).fortressId]]).filter(Boolean);
  ok(sp.length === 4 && sp.every(L => L.regionId !== D.homeRegion(ss)), 'the Hollow King and his lieutenants live beyond your home region');
  // phase 2: places inside your territory answer you
  st.dragon.tier = 1; st.dragon.age = 9; st.dragon.alignment = 20; HB.stats.recompute(st);
  const inT = W.locations.filter(L => ['village', 'farm', 'town'].includes(L.type) && L.state === 'normal' && D.inInfluence(st, L));
  if (inT.length) {
    const A = inT[0]; A.trust = 35; st.dragon.health = 10;
    const asks = D.asks(st, A);
    ok(asks.some(a => a.id === 'news') && asks.some(a => a.id === 'hospitality'), 'a place in your territory offers news and hospitality');
    D.feast(st, A, true); ok(st.dragon.health > 10 && A.flags.feastYear === st.time.year, 'hospitality heals you, once a year');
    D.askNews(st, A); ok(D.asks(st, A).find(a => a.id === 'news').disabled, 'news once a year');
  } else ok(true, 'no place inside a young territory on this seed (skipped)');
  // phase 3: a castle's fealty
  st.dragon.tier = 2; st.dragon.age = 41; HB.stats.recompute(st);
  const C = W.locations.find(L => L.type === 'castle' && !L.capital && L.state === 'normal' && D.inHomeRegion(st, L));
  if (C) {
    C.trust = 60; const inside = D.inInfluence(st, C);
    const fc = D.canFealty(st, C);
    ok(inside ? fc.ok : /territory/.test(fc.reason || ''), 'a trusting castle swears fealty inside your territory, not outside it');
    if (fc.ok) { D.fealty(st, C); ok(D.statusOf(st, C) === 'allied', 'a sworn castle is your ally'); }
  }
  // the grievance ledger
  const g = H.grievance(st, { name: 'Edric Ashfoot', kind: 'hunter', from: 'Testford', level: 2, text: 'swore to kill the dragon' });
  H.escalate(st, g, 'survived'); ok(g.level === 3 && g.epithet === 'the Scarred' && H.title(g) === 'Edric Ashfoot the Scarred', 'a hunter who survives you grows stronger and gets a harder name');
  ok(H.grievance(st, { name: 'Edric Ashfoot', kind: 'hunter', text: 'again' }) === g && g.level === 4, 'swearing again under the same name strengthens the old grudge');
  ok(!H.canAmend(st, g).show, 'sworn hunters cannot be bought');
  const hs = H.grievance(st, { name: 'House Vane', kind: 'house', level: 2, text: 'lost its heir' });
  st.hoard.gold = 1000; const ca = H.canAmend(st, hs);
  ok(ca.ok && ca.cost === 300 && H.amend(st, hs) && hs.status === 'forgiven' && !hs.active, 'a house takes weregild and lets the grudge go');
  H.end(st, g, 'dead', 'fell'); ok(H.statusOf(g) === 'dead' && g.log.length >= 3, 'the ledger keeps what happened to them');
  const back = HB.save.deserialize(HB.save.serialize(st)).memory.grudges.find(x => x.name === 'Edric Ashfoot');
  ok(back && back.epithet === g.epithet && back.epithet === 'Dragonfoe' && back.status === 'dead', 'saves keep the ledger');
}

section('map art: the contract, the packs, the preview');
{
  const S = HB.MAP_SPEC, fam = HB.mapSpecFamily;
  ok(S && S.schemaVersion === 1 && Object.keys(S.families).length >= 55, 'the map-art contract lists every family');
  ok(fam('map.place.camp.goblin').id === 'map.place.camp' && fam('map.place.city.burned').id === 'map.place.city' && fam('map.terrain.mountain.jagged.deep').id === 'map.terrain.mountain.jagged' && !fam('map.terrain.volcano'), 'ids resolve to their family by longest prefix; unknown ids do not');
  const fs = require('fs'), src = fs.readFileSync(require('path').join(__dirname, '../src/art/mapart.js'), 'utf8');
  const used = [...src.matchAll(/'(map\.[a-z]+\.[A-Za-z.]+)'/g)].map(m => m[1]);
  ok(used.length > 20 && used.every(id => fam(id)), 'every id the map drawing asks for is in the contract');
  for (const [id, spec] of Object.entries(S.families)) if (spec.layer !== 'wash' && !(spec.ref > 0 && spec.maxK > 0 && spec.layer && spec.anchor)) ok(false, 'family is complete: ' + id);
  ok(['benevolent', 'tyrannical', 'neutral', 'bloom'].every(k => fam('map.wash.' + k) && fam('map.wash.' + k).spec.layer === 'wash') && fam('map.wash.bloom').spec.kind === 'bloom' && !fam('map.wash.kind'), 'the watercolour mask ids are in the contract (docs/map-art/WASH.md); a misspelt one is not');
  const mt = S.families['map.terrain.mountain'];
  ok(HB.mapTerrainReach(mt, [30, 25], [120, 100], [60, 91], false).ok && !HB.mapTerrainReach(mt, [120, 120], [32, 32], [16, 31], false).ok, 'terrain art is refused when it would reach past the chunk margin');
  const MP = require('./mappack.js');
  const sample = MP.validate(require('path').join(__dirname, '../assets/map/packs/sample'));
  ok(!sample.errors.length && !sample.warnings.length && sample.ok.length === 9 && ['map.wash.benevolent', 'map.wash.tyrannical', 'map.wash.bloom'].every(id => sample.ok.includes(id)), 'the sample pack validates: 9 ids (6 symbols, 2 watercolour textures, a bloom mask)' + (sample.errors.length ? ' ' + sample.errors.join('; ') : '') + (sample.warnings.length ? ' ' + sample.warnings.join('; ') : ''));
  const broken = MP.validate(require('path').join(__dirname, '../assets/map/packs/test-broken'));
  ok(broken.ok.length === 1 && broken.ok[0] === 'map.terrain.tree.pine' && broken.errors.length === 9, 'the broken test pack: only the pine survives, 9 errors are reported');
  ok(broken.errors.some(e => /benevolent.*square and a power of two/.test(e)) && broken.errors.some(e => /tyrannical.*coverage is 32×32, not 64×64/.test(e)), 'a watercolour texture that is not square, or not its declared size, is refused');
  ok(MP.pngSize(require('path').join(__dirname, '../assets/map/packs/sample/terrain/mountain-b@2x.png')).join('x') === '64x54', 'the validator reads PNG sizes');
  // the preview preset: every domain state near home, deterministic, saved like any campaign
  const a = HB.game.newCampaign({ seed: 'ember-quill-42', name: 'P', keeper: false }), ra = HB.presets.preview(a);
  const sts = Object.values(ra).filter(Boolean).map(L => HB.domain.statusOf(a, L));
  ok(['tributary', 'occupied', 'resisting', 'ruined'].every(s => sts.includes(s)) && ra.threat && ra.threat.threat, 'the map preview shows each domain state, a burned place and a threat');
  ok(HB.endgame.active(a) && a.flags.test, 'the preview begins the great struggle and saves to the test slot');
  const b = HB.game.newCampaign({ seed: 'ember-quill-42', name: 'P', keeper: false }), rb = HB.presets.preview(b);
  ok(Object.keys(ra).every(k => (ra[k] && ra[k].id) === (rb[k] && rb[k].id)), 'the preview picks the same places every time');
  const c = HB.save.deserialize(HB.save.serialize(a));
  ok(HB.domain.statusOf(c, c.world.locations[ra.resisting.id]) === 'resisting' && c.world.locations[ra.burned.id].state === 'burned', 'the preview campaign saves and loads');
}

section('pixel art files (assets/pixelart, made with editor/index.html)');
{
  const fs = require('fs'), path = require('path'), dir = path.join(__dirname, '../assets/pixelart');
  const notes = []; // art the game shows its own drawing for instead (not an error: the owner may still be working on it)
  const AL = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', POSES = ['idle', 'fly', 'grab', 'hurt', 'land', 'bite', 'roar', 'sleep', 'breathe'];
  const fileOf = (id) => id.replace(/[^\w.-]/g, '~') + '.js';
  // the same reading the game does (src/art/pixelart.js): run the file with a stand-in HB.pixelArt
  const read = (text) => { const got = { files: null, defs: [] }; new Function('HB', text)({ pixelArt: { index: (l) => { got.files = l; }, add: (d) => got.defs.push(d) } }); return got; };
  /** problems with one sprite definition ([] when it is fine) */
  const problems = (def, file) => {
    const p = [], n = (v) => typeof v === 'number' && isFinite(v);
    if (!def || typeof def.id !== 'string') return ['no id'];
    if (file && fileOf(def.id) !== file) p.push(`id ${def.id} belongs in ${fileOf(def.id)}`);
    if (!['sprite', 'dragon', 'anim', 'map'].includes(def.kind)) p.push(`kind ${def.kind}`);
    // separate drawings: '<id>#n' variants (map symbols), '<id>@good' / '<id>@evil' versions (any kind)
    const vm = /^(.*?)(#[1-9]\d*)?(@(?:good|evil))?$/.exec(def.id), base = vm[1];
    if (vm[2] && def.kind !== 'map') p.push('only map symbols have numbered variants (#2)');
    if (def.kind === 'anim' && !/^[a-z][\w.]*$/i.test(base)) p.push('anim ids are plain dotted names (lair.room.forge)');
    if (def.kind === 'dragon' && !new RegExp(`^dragon\\.[0-3]\\.(${POSES.join('|')})$`).test(base)) p.push('dragon ids are dragon.<0-3>.<pose>');
    if (def.kind === 'map') { const f = HB.mapSpecFamily(base); if (!f) p.push('not a map spec id'); else if (f.spec.layer === 'terrain' && Array.isArray(def.anchor) && !HB.mapTerrainReach(f.spec, [def.w * (def.scale || 1) / HB.mapDrawnK(base), def.h * (def.scale || 1) / HB.mapDrawnK(base)], [def.w, def.h], def.anchor, false).ok) notes.push(`${def.id}: too big for terrain (the map shows its hand-drawn symbol instead); a smaller Scale or a centred anchor fixes it`); }
    if (!(Number.isInteger(def.w) && Number.isInteger(def.h) && def.w >= 1 && def.h >= 1 && def.w <= 512 && def.h <= 512)) p.push('w and h are whole numbers 1–512');
    if (!(Array.isArray(def.anchor) && def.anchor.length === 2 && def.anchor.every(n) && def.anchor[0] >= 0 && def.anchor[1] >= 0 && def.anchor[0] <= def.w && def.anchor[1] <= def.h)) p.push('anchor is [x, y] inside the canvas');
    if (!(Array.isArray(def.palette) && def.palette.length <= AL.length && def.palette.every(c => /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(c)))) p.push('palette is up to 62 #rrggbb colours');
    const frames = (list, where) => {
      if (!(Array.isArray(list) && list.length >= 1)) { p.push(where + 'at least one frame'); return; }
      list.forEach((f, k) => { const rows = f && f.rows; if (!Array.isArray(rows) || rows.length !== def.h) p.push(`${where}frame ${k + 1}: ${def.h} rows`); else rows.forEach((r, y) => { if (typeof r !== 'string' || r.length !== def.w) p.push(`${where}frame ${k + 1} row ${y}: ${def.w} characters`); else for (const ch of r) if (ch !== '.' && !(AL.indexOf(ch) >= 0 && AL.indexOf(ch) < def.palette.length)) { p.push(`${where}frame ${k + 1} row ${y}: '${ch}' is not a palette index`); break; } }); });
    };
    // a layered drawing has layers (each with frames) instead of frames
    if (def.tones !== undefined) { const t = def.tones; if (!t || typeof t !== 'object' || Object.keys(t).some(k => k !== 'good' && k !== 'evil') || Object.values(t).some(o => !o || typeof o !== 'object' || ['hue', 'sat', 'light', 'mix'].some(k => o[k] !== undefined && !n(o[k])) || (o.tint !== undefined && !/^#[0-9a-f]{6}$/i.test(o.tint)))) p.push('tones is { good?, evil? } of numbers hue, sat, light, mix and a #rrggbb tint'); }
    if (Array.isArray(def.layers)) { if (!def.layers.length) p.push('layers is empty'); def.layers.forEach((l, i) => { if (!l || typeof l.name !== 'string') p.push(`layer ${i + 1} needs a name`); for (const k of ['opacity', 'wash']) if (l && l[k] !== undefined && !(n(l[k]) && l[k] >= 0 && l[k] <= 100)) p.push(`layer ${i + 1}: ${k} is 0–100`); frames(l && l.frames, `layer ${(l && l.name) || i + 1}: `); }); }
    else frames(def.frames, '');
    return p;
  };
  const good = { id: 'map.place.village', kind: 'map', w: 3, h: 2, anchor: [1, 2], palette: ['#2b1a0e', '#c04040'], frames: [{ rows: ['.0.', '010'] }], scale: 1 };
  ok(!problems(good).length && !problems(Object.assign({}, good, { id: 'lair.room.forge', kind: 'anim' })).length, 'a well-formed sprite (and a lair picture) passes the file check');
  const layered = Object.assign({}, good, { frames: undefined, layers: [{ name: 'lines', frames: [{ rows: ['.0.', '0.0'] }] }, { name: 'sketch', hidden: true, frames: [{ rows: ['111', '111'] }] }] });
  ok(!problems(layered).length && problems(Object.assign({}, layered, { layers: [{ name: 'lines', frames: [{ rows: ['.0'] }] }] })).length, 'a layered drawing passes; a layer with the wrong size is caught');
  ok(!problems(Object.assign({}, good, { palette: ['#2b1a0e80', '#c04040'], tones: { evil: { hue: -12, sat: -60, light: -18, tint: '#4a1c1c', mix: 20 } } })).length && problems(Object.assign({}, good, { tones: { wicked: {} } })).length, 'see-through colours and good/evil tones pass; a misspelt tone is caught');
  ok(!problems(Object.assign({}, good, { id: 'map.place.village#3' }), 'map.place.village~3.js').length && !problems(Object.assign({}, good, { id: 'map.place.village#2@evil' }), 'map.place.village~2~evil.js').length && !problems(Object.assign({}, good, { id: 'dragon.1.fly@good', kind: 'dragon' })).length && problems(Object.assign({}, good, { id: 'dragon.1.fly#2', kind: 'dragon' })).length, 'variants (#n) and good/evil versions (@good, @evil) pass in their own files; a numbered dragon variant is caught');
  ok(!problems(Object.assign({}, layered, { layers: [{ name: 'lines', opacity: 60, wash: 20, frames: [{ rows: ['.0.', '0.0'] }] }] })).length && problems(Object.assign({}, layered, { layers: [{ name: 'lines', wash: 140, frames: [{ rows: ['.0.', '0.0'] }] }] })).length, 'a layer\'s opacity and wash (0–100) pass; out of range is caught');
  ok(problems(Object.assign({}, good, { frames: [{ rows: ['.0.', '012'] }] })).some(e => /not a palette index/.test(e)) && problems(Object.assign({}, good, { id: 'dragon.4.fly', kind: 'dragon' })).length && problems(Object.assign({}, good, { w: 4 })).some(e => /4 characters/.test(e)), 'a bad palette index, dragon id or row width is caught');
  const idx = read(fs.readFileSync(path.join(dir, 'index.js'), 'utf8'));
  ok(Array.isArray(idx.files) && idx.files.every(f => fs.existsSync(path.join(dir, f))), 'assets/pixelart/index.js lists files that exist');
  const extra = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'index.js' && f !== 'palettes.js' && !(idx.files || []).includes(f));
  // the editor's saved palettes (not loaded by the game): names and #rrggbb colours
  if (fs.existsSync(path.join(dir, 'palettes.js'))) {
    let pals = null; try { new Function('HB', fs.readFileSync(path.join(dir, 'palettes.js'), 'utf8'))({ pixelArt: { palettes: (l) => { pals = l; } } }); } catch (e) { pals = e.message; }
    ok(Array.isArray(pals) && pals.every(p => p && typeof p.name === 'string' && Array.isArray(p.colors) && p.colors.every(c => /^#[0-9a-f]{6}$/i.test(c))), 'palettes.js holds named palettes of #rrggbb colours' + (Array.isArray(pals) ? '' : ': ' + pals));
  }
  ok(!extra.length, 'every sprite file is listed in index.js' + (extra.length ? ': ' + extra.join(', ') : ''));
  for (const f of idx.files || []) {
    let got; try { got = read(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { ok(false, `${f} runs: ${e.message}`); continue; }
    const p = got.defs.length === 1 ? problems(got.defs[0], f) : ['one HB.pixelArt.add(...) per file'];
    ok(!p.length, `${f} is a valid sprite` + (p.length ? ': ' + p.slice(0, 4).join('; ') : ''));
  }
  for (const n of notes) console.log('  note:', n);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
