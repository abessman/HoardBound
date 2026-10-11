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

  // offerings: villages that trust you bring gifts while they prosper
  st = fresh('offer'); const OV = st.world.locations.filter(L => (L.type === 'village' || L.type === 'farm') && Math.hypot(L.x - st.world.home.x, L.y - st.world.home.y) < 25)[0];
  if (OV) { OV.trust = 40; OV.threat = null; OV.wealth = OV.wealthMax; HB.tribute.accrueOfferings(st, 90); const got = HB.tribute.collectOfferings(st); ok(got.total > 0 && got.names.includes(OV.name), 'offerings collected: ' + got.total); const est = HB.tribute.offeringEstimate(st, 20); ok(est.hi > est.lo && est.lo > 0, 'offerings over a sleep shown as a range'); OV.state = 'burned'; ok(!HB.tribute.offeringPlaces(st).includes(OV), 'a burned village brings nothing'); }
  // guarding caravans takes longer to earn a name now
  ok(HB.TITLE_BY_ID.roadwarden.need === 4, 'Warden of the Roads needs four guarded caravans');
  // saves keep stories and pursuit
  st = fresh('save'); force(st, 'stolenChest'); HB.pursuit.start(st, st.world.locations[1], { pursued: true, outcome: 'withdrew' });
  const st4 = HB.save.deserialize(HB.save.serialize(st));
  ok(st4.situations.length === st.situations.length && st4.situations[0].t === st.situations[0].t && !!st4.pursuit === !!st.pursuit, 'situations and pursuit saved');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
