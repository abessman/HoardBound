#!/usr/bin/env node
/* Scripted browser playthrough with screenshots: hatch → fly → raid → return → lair → build → sleep → awaken.
 * Usage: node tools/playthrough.mjs [outDir] [seed] */
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
function loadPlaywright() { for (const c of [root + '/', '/opt/node-tools/node_modules/', '/opt/node22/lib/node_modules/', '/usr/lib/node_modules/', '/usr/local/lib/node_modules/']) { try { return createRequire(c)('playwright'); } catch (e) { /* next */ } } throw new Error('playwright not found'); }
const { chromium } = loadPlaywright();
const outDir = process.argv[2] || path.join(root, 'shots');
const seed = process.argv[3] || 'ember-quill-42';
fs.mkdirSync(outDir, { recursive: true });
const port = 8900 + Math.floor(Math.random() * 100);
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 500));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (name) => { await page.waitForTimeout(250); await page.screenshot({ path: path.join(outDir, name + '.png') }); console.log('shot', name); };
const ev = (code) => page.evaluate(async (c) => { const f = new Function('return (async () => { ' + c + ' })()'); return await f(); }, code);
try {
  await page.goto(`http://127.0.0.1:${port}/index.html?debug=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => globalThis.HB && HB.ready === true, null, { timeout: 15000 });
  await shot('01-title');
  // new game screen via UI click
  await page.mouse.click(640, 414); await page.waitForTimeout(300); await shot('02-newgame');
  // start campaign programmatically with the chosen seed (equivalent to pressing Hatch)
  await ev(`HB.scenes.pop(); HB.flow.startCampaign({ seed: '${seed}', name: 'Vorthax', breed: 'red', keeper: true, deathMode: 'legend' });`);
  await page.waitForFunction(() => HB.state && HB.flow.map, null, { timeout: 20000 });
  await page.waitForTimeout(600); await shot('03-intro');
  await ev(`while (HB.scenes.top() instanceof HB.IntroScene) HB.scenes.pop();`);
  await page.waitForTimeout(400); await shot('04-map-start');
  // the goal panel and the Aims board
  await ev(`HB.flow.map.openAims();`); await page.waitForTimeout(300); await shot('04a-aims');
  const aims = await ev(`const sc=HB.scenes.top(); const o=sc.opps.map(o=>o.aim+': '+o.title); HB.scenes.pop(sc); return o;`);
  console.log('aims:', aims);
  // tap empty land: should offer a point to explore
  await page.mouse.click(860, 260); await page.waitForTimeout(300);
  const tapped = await ev(`const s = HB.flow.map.selected; return s ? (s.kind || s.type) + ':' + s.name : 'nothing';`);
  console.log('tap on empty map selects:', tapped);
  await shot('04b-explore-point');
  await ev(`HB.flow.map.selected = null;`);
  // helpers: fly to the selected target and answer cards with the first choice; play a raid; settle what follows
  const flyAndArrive = async (tag, prefer) => {
    await ev(`const st=HB.state, m=HB.flow.map; HB.travel.begin(st, m.selected, m);`);
    await page.waitForTimeout(1200); await shot(tag + '-flight');
    let cardShot = false;
    for (let i = 0; i < 120; i++) {
      const top = await ev(`return HB.scenes.top().constructor.name + ':' + HB.state.phase;`);
      if (top.startsWith('CardScene') && !cardShot && top.endsWith('encounter')) { cardShot = true; await shot(tag + '-arrival'); }
      const ph = await ev(`const t=HB.scenes.top(); if (t instanceof HB.CardScene && !t.result) { const re = ${prefer ? prefer.toString() : 'null'}; const ch = (re && t.o.choices.find(c => !c.disabled && re.test(c.label))) || t.o.choices.find(c => !c.disabled); t.choose(ch); } else if (t instanceof HB.CardScene && t.result) { t.close(); } return HB.state.phase + ':' + HB.scenes.top().constructor.name;`);
      if (ph.startsWith('encounter') && ph.includes('RaidScene')) break;
      if (ph.startsWith('planning') && !ph.includes('Card')) break;
      await page.waitForTimeout(250);
    }
  };
  const playRaid = async (tag) => {
    await page.waitForTimeout(400); await shot(tag + '-raid-start');
    const res = await ev(`const sc=HB.scenes.top(); if(!(sc instanceof HB.RaidScene)) return 'no raid: '+sc.constructor.name; const r=sc.r; let n=0; while(!r.ended && n++<4000){ HB.raid.update(r,1/30,{}); const f=HB.raid.focus(r); if(f && !r.dragon.busy){ const acts=HB.raid.actionsFor(r,f).filter(a=>a.enabled).map(a=>a.id); const pick=f.raider?(acts.includes('roar')?'roar':'bite'):acts.includes('grab')?'grab':acts.includes('dodge')?'dodge':acts.includes('feed')?'feed':null; HB.raid.perform(r, pick||'wait', f);} if(r.mode!=='defend' && ((r.alarm>60 && (r.loot.gold+r.loot.items.length)>0) || r.dragon.passes>=2)) HB.raid.perform(r,'withdraw'); if(r.dragon.hp<12 || r.dragon.passes>=4) HB.raid.perform(r,'withdraw'); if(n===300) sc.draw(HB.app.ctx);} return {mode:r.mode, outcome:r.outcome, gold:r.loot.gold, items:r.loot.items.length, recovered:r.recoveredValue, alarm:Math.round(r.alarm), hp:Math.round(r.dragon.hp)};`);
    console.log(tag, 'raid', res);
    await page.waitForTimeout(300); await shot(tag + '-raid-end');
  };
  const settle = async (tag) => {
    let consShot = false, goodsShot = false;
    for (let i = 0; i < 60; i++) {
      const t = await ev(`return HB.scenes.top().constructor.name;`);
      if (t === 'CardScene' && !goodsShot) { goodsShot = true; await shot(tag + '-goods'); }
      if (t === 'ConsequenceScene' && !consShot) { consShot = true; await shot(tag + '-consequence'); const sum = await ev(`const s=HB.state.lastConsequence; return [s.headline].concat(s.lines.map(l=>' - '+l.text)).join(String.fromCharCode(10));`); console.log(sum); }
      const done = await ev(`const t=HB.scenes.top(); if (t instanceof HB.CardScene && !t.result) { t.choose(t.o.choices[0]); return 'card'; } if (t instanceof HB.CardScene && t.result) { t.close(); return 'card'; } if (t instanceof HB.ConsequenceScene || t.constructor.name==='Modal') { HB.scenes.pop(t); return 'cons'; } return t.constructor.name;`);
      if (done === 'MapScene') break;
      await page.waitForTimeout(200);
    }
  };
  // 1) the opening story (differs per world): fly to its place and take it on
  const story = await ev(`const st=HB.state, m=HB.flow.map; const sit=HB.situations.open(st)[0]; const o=HB.goals.opportunities(st).find(o=>(o.story||o.urgent) && o.ref && o.ref.kind==='loc' && !HB.travel.canBegin(st, st.world.locations[o.ref.id])); if(!o) return {sit: sit && sit.t}; const L=st.world.locations[o.ref.id]; m.select(L); m.centerOn(L.x+0.5, L.y+0.5, 1.9, true); return {sit: sit && sit.t, title: o.title, place: L.name, type: L.type};`);
  console.log('story', story);
  await page.waitForTimeout(500); await shot('05-preview-story');
  if (story && story.place) { await flyAndArrive('06', /Drive off|^Raid/); await playRaid('07'); await settle('08'); }
  const after1 = await ev(`const st=HB.state; return {titles: st.renown.titles.map(t=>t.name), reactions: st.reactions.length};`);
  console.log('after defend', after1);
  // 2) a theft: the nearest easy target that is not under attack
  const target = await ev(`const st=HB.state, m=HB.flow.map; st.dragon.stamina = st.dragon.stats.maxStamina; const near=HB.world.locationsNear(st.world, st.dragon.x, st.dragon.y, 14, L=>L.knowledge.seen && !L.threat && !L.flags.savedYear && ['farm','village','camp'].includes(L.type) && L.state==='normal' && Math.hypot(L.x-st.dragon.x, L.y-st.dragon.y) > 1); if(!near.length) return null; const L=near[0].L; m.select(L); m.centerOn(L.x+0.5, L.y+0.5, 1.9, true); return {name:L.name, type:L.type, d:near[0].d};`);
  console.log('target', target);
  await page.waitForTimeout(500); await shot('05b-preview');
  if (target) { await flyAndArrive('06b'); await playRaid('07b'); await settle('08b'); }
  await shot('09-after-raid');
  // fly home via the modal's primary button equivalent
  await ev(`const t=HB.scenes.top(); if (t.constructor.name==='Modal') { HB.scenes.pop(t); } HB.travel.returnHome(HB.state, HB.flow.map);`);
  for (let i = 0; i < 160; i++) {
    const ph = await ev(`const t=HB.scenes.top(); if (t instanceof HB.CardScene && !t.result) { t.choose(t.o.choices[0]); } else if (t instanceof HB.CardScene && t.result) { t.close(); } return HB.state.phase;`);
    if (ph === 'home') break;
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(400); await shot('10-home');
  await ev(`let t=HB.scenes.top(); while (t.constructor.name==='Modal' || t instanceof HB.CardScene) { HB.scenes.pop(t); t=HB.scenes.top(); }`);
  const hoard = await ev(`return {gold: HB.state.hoard.gold, items: HB.state.hoard.items.length, def: HB.state.dragon.stats.defense, hp: HB.state.dragon.stats.maxHealth};`);
  console.log('hoard', hoard);
  // lair: build an entrance with a little cheat gold if needed
  await ev(`const st=HB.state; if (st.hoard.gold < 200) st.hoard.gold += 200; HB.stats.recompute(st); HB.scenes.push(new HB.LairScene(st));`);
  await page.waitForTimeout(400); await shot('11-lair-hoard');
  await ev(`const sc=HB.scenes.top(); sc.tab='build'; sc.buildUi(); sc.selectedUpgrade = sc.list.items.find(i=>i.u.id==='entrance'); sc.buildUi();`);
  await page.waitForTimeout(300); await shot('12-lair-build');
  const built = await ev(`return HB.lair.build(HB.state, 'entrance');`);
  console.log('build', built);
  await ev(`let t=HB.scenes.top(); while (t.constructor.name==='Modal') { HB.scenes.pop(t); t=HB.scenes.top(); } const sc=HB.scenes.top(); sc.tab='workers'; sc.buildUi();`);
  await page.waitForTimeout(300); await shot('13-lair-workers');
  await ev(`const sc=HB.scenes.top(); sc.tab='sleep'; sc.sleepSel=2; sc.buildUi();`);
  await page.waitForTimeout(300); await shot('14-lair-sleep');
  // sleep 20 years
  await ev(`const st=HB.state; HB.scenes.pop(); HB.sleep.begin(st, 20, HB.flow.map);`);
  for (let i = 0; i < 200; i++) {
    const t = await ev(`const t=HB.scenes.top(); if (t instanceof HB.CardScene && !t.result) { t.choose(t.o.choices[0]); } else if (t instanceof HB.CardScene && t.result) { t.close(); } if (t instanceof HB.SleepScene) t.speed = 8; return t.constructor.name;`);
    if (t === 'AwakenScene' || t === 'DeathScene') break;
    if (i === 6) await shot('15-sleeping');
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(400); await shot('16-awaken');
  const after = await ev(`const st=HB.state; return {tier: st.dragon.tier, age: Math.floor(st.dragon.age), year: st.time.year, gold: st.hoard.gold, upgrades: st.lair.upgrades, events: st.lastSleep ? st.lastSleep.events.length : 0};`);
  console.log('after sleep', after);
  await ev(`const t=HB.scenes.top(); if (t instanceof HB.AwakenScene) HB.scenes.pop(t);`);
  await page.waitForTimeout(500); await shot('17-map-after');
  await ev(`HB.scenes.push(new HB.ChronicleScene(HB.state));`); await page.waitForTimeout(300); await shot('18-chronicle');
  await ev(`HB.scenes.pop(); HB.scenes.push(new HB.RealmsScene(HB.state));`); await page.waitForTimeout(300); await shot('19-realms');
  await ev(`HB.scenes.pop(); const ok = HB.save.write(HB.state, 'playtest'); const st2 = HB.save.read('playtest'); return ok && st2.time.year === HB.state.time.year;`).then(v => console.log('save/load ok:', v));
  console.log('errors:', errors.length ? errors : 'none');
} catch (e) {
  console.error('FAILED', e);
  await shot('error');
  process.exitCode = 1;
} finally {
  await browser.close(); server.kill();
}
