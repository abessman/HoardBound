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
  // select the nearest easy target and open its preview
  const target = await ev(`const st=HB.state, m=HB.flow.map; const near=HB.world.locationsNear(st.world, st.world.home.x, st.world.home.y, 12, L=>L.knowledge.seen && ['farm','village','camp'].includes(L.type)); const L=near[0].L; m.select(L); m.centerOn(L.x+0.5, L.y+0.5, 1.9, true); return {name:L.name, type:L.type, d:near[0].d};`);
  console.log('target', target);
  await page.waitForTimeout(500); await shot('05-preview');
  // fly
  await ev(`const st=HB.state, m=HB.flow.map; HB.travel.begin(st, m.selected, m);`);
  await page.waitForTimeout(1500); await shot('06-flight');
  // wait for arrival (events may pop cards: auto-choose the first option)
  for (let i = 0; i < 120; i++) {
    const ph = await ev(`const t=HB.scenes.top(); if (t instanceof HB.CardScene && !t.result) { t.choose(t.o.choices[0]); } else if (t instanceof HB.CardScene && t.result) { t.close(); } return HB.state.phase + ':' + HB.scenes.top().constructor.name;`);
    if (ph.startsWith('encounter') && ph.includes('RaidScene')) break;
    if (ph.startsWith('planning')) break;
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(400); await shot('07-raid-start');
  // play the raid: grab what is exposed, dodge bolts, withdraw when alarm is high
  const raidResult = await ev(`const sc=HB.scenes.top(); if(!(sc instanceof HB.RaidScene)) return 'no raid: '+sc.constructor.name; const r=sc.r; let n=0; while(!r.ended && n++<3000){ HB.raid.update(r,1/30,{}); const f=HB.raid.focus(r); if(f && !r.dragon.busy){ const acts=HB.raid.actionsFor(r,f).filter(a=>a.enabled).map(a=>a.id); const pick=acts.includes('grab')?'grab':acts.includes('dodge')?'dodge':acts.includes('feed')?'feed':null; HB.raid.perform(r, pick||'wait', f);} if((r.alarm>60 && (r.loot.gold+r.loot.items.length)>0) || r.dragon.hp<15 || r.dragon.passes>=2) HB.raid.perform(r,'withdraw'); if(n===200) sc.draw(HB.app.ctx);} return {outcome:r.outcome, gold:r.loot.gold, items:r.loot.items.length, alarm:Math.round(r.alarm), hp:r.dragon.hp};`);
  console.log('raid', raidResult);
  await page.waitForTimeout(300); await shot('08-raid-end');
  for (let i = 0; i < 40; i++) { const t = await ev(`return HB.scenes.top().constructor.name + ':' + HB.state.phase;`); if (t.startsWith('Modal') || t.startsWith('MapScene')) break; await page.waitForTimeout(200); }
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
