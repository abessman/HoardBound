/* Opening-cycle bot: plays the first valley as a robber (story, raids until hoard strength 1150, entrance, 20-year sleep)
 * and reports pacing, heat, pursuit and the awakening. Usage: node tools/cyclebot.js [seed] */
const HB = require('./headless.js')();
const seed = process.argv[2] || 'ember-quill-42';
const st = HB.game.newCampaign({ seed, name: 'Bot', breed: 'red', keeper: false });
let ambushes = 0;
const fly = (t) => { const err = HB.travel.canBegin(st, t); if (err) return err; HB.travel.begin(st, t, null); let g = 0; while ((st.phase === 'traveling' || st.phase === 'returning') && g++ < 40000) HB.travel.update(st, 1 / 30, null); if (st.ambush) { ambushes++; HB.hunters.resolveAmbush(st, 'flee', null); return 'ambushed'; } return null; };
const playRaid = (r) => { let n = 0; while (!r.ended && n++ < 20000) { HB.raid.update(r, 1 / 30, {}); const f = HB.raid.focus(r); if (f && !r.dragon.busy) { const acts = HB.raid.actionsFor(r, f).filter(a => a.enabled).map(a => a.id); const pick = f.raider ? (acts.includes('roar') ? 'roar' : 'bite') : acts.includes('grab') ? 'grab' : acts.includes('dodge') ? 'dodge' : acts.includes('feed') ? 'feed' : 'wait'; HB.raid.perform(r, pick, f); } if (r.mode !== 'defend' && (r.alarm > 55 || r.dragon.passes >= 2 || r.dragon.hp < r.state.dragon.stats.maxHealth * 0.3)) HB.raid.perform(r, 'withdraw'); } };
let trips = 0, log = [];
// 1) defend
const V = st.world.locations.find(L => L.threat); console.log('opening:', HB.situations.open(st).map(s=>s.t).join(','));
if (V && !fly(V)) { const r = HB.encounter.begin(st, V, null, { direct: true, defend: true }); playRaid(r); HB.encounter.finishRaid(st, V, r, null); log.push(`defend ${V.name}: ${r.outcome}`); }
// 2) raid until hoard strength reaches 1000 + entrance cost
for (let i = 0; i < 40 && HB.stats.hoardEnergy(st) < 1150; i++) {
  if (st.phase === 'home') { /* rest happens on arrival */ }
  const opp = HB.goals.opportunities(st).find(o => o.aim === 'grow' && o.ref && (o.ref.kind === 'loc' ? !HB.travel.canBegin(st, st.world.locations[o.ref.id]) : true));
  if (!opp) { log.push('no grow opportunity; resting'); HB.travel.restInWild(st, null); continue; }
  const t = opp.ref.kind === 'loc' ? st.world.locations[opp.ref.id] : st.entities.find(e => e.id === opp.ref.id);
  if (!t) continue;
  const err = fly(t); if (err) { log.push('cannot fly: ' + err); HB.travel.returnHome(st, null); fly(st.world.locations[st.world.home.locId]); continue; }
  st.phase = 'planning';
  const r = HB.encounter.begin(st, t, null, { direct: true });
  let got = 0;
  if (r && r.entities) { playRaid(r); HB.encounter.finishRaid(st, t, r, null); got = r.stolenValue; }
  else if (r && r.text) got = -1;
  trips++;
  fly(st.world.locations[st.world.home.locId]);
  log.push(`trip ${trips}: ${t.name || t.kind} (${t.type || t.kind}) +${got} → hoard ${Math.round(HB.stats.hoardEnergy(st))}, day ${st.time.totalDays}, hp ${st.dragon.health}/${st.dragon.stats.maxHealth}`);
  if (st.phase === 'dead') break;
}
console.log(log.join('\n')); console.log('ambushes', ambushes, 'heat', st.world.factions.filter(f=>f.dragon.heat).map(f=>f.name+':'+Math.round(f.dragon.heat)).join(' '), 'lairFound', HB.pursuit.lairFoundCount(st), 'hunters', st.entities.filter(e=>e.kind==='hunters').length);
const m = HB.goals.milestone(st); console.log('milestone:', m.reqs.map(r => r.label + ' ' + r.cur + '/' + r.need).join(', '), '| next:', m.nextStep);
console.log('why entrance:', HB.lair.whyNow(st, 'entrance'));
console.log('build entrance', JSON.stringify(HB.lair.build(st, 'entrance')));
console.log('titles', st.renown.titles.map(t => t.name), 'deeds', JSON.stringify(st.renown.deeds));
console.log('preview', HB.sleep.preview(st, 20).lines.map(l => l.text).join('\n  '));
HB.sleep.begin(st, 20, null);
const s = st.lastSleep;
console.log('woke: tierUp', s.tierUp, 'dead', s.dead, 'tier', st.dragon.tier, 'age', st.dragon.age.toFixed(1), 'hoard', Math.round(HB.stats.hoardEnergy(st)));
console.log('reactions unseen', HB.consequences.unseen(st).map(r => r.text + ' (' + r.cause + ')').join('\n  '));
console.log('next goal', HB.goals.milestone(st).title, HB.goals.milestone(st).nextStep);
