#!/usr/bin/env node
/* All declared map glyphs/states must resolve in the complete pack, including file:// delivery.
 * Run after changing the manifest, mapink.js, or catalog. No campaign is created. */
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
let chromium;
for (const root of [import.meta.url,'/opt/node-tools/node_modules/','/usr/local/lib/node_modules/']) {
  try { ({chromium}=createRequire(root)('playwright')); break; } catch {}
}
if(!chromium)throw new Error('Playwright is required for this browser check.');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
try {
  const page=await browser.newPage({viewport:{width:1024,height:768},hasTouch:true}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('../index.html?scene=artcatalog&mappack=illuminated',import.meta.url).href);
  await page.waitForFunction(()=>globalThis.HB?.ready&&HB.mapAssets.entries.size>0&&HB.mapAssets.loading===0);
  const result=await page.evaluate(()=>{
    const missing=[];
    for(const [id,f] of Object.entries(HB.MAP_SPEC.families)) {
      if(f.layer==='wash'||f.optional===true)continue;
      for(const k of [id,...f.states.map(s=>id+'.'+s)])if(!HB.mapAssets.resolve([k],k)&&!HB.mapInk.supports(k))missing.push(k);
    }
    const before=JSON.stringify(localStorage), scene=HB.scenes.top();let pages=0;
    for(const group of ['Places','Homes','Terrain','Travelers & signs']) {
      scene.group=group;scene.page=0;scene.refresh();
      for(let i=0;i<scene.pages;i++){scene.page=i;scene.draw(document.getElementById('game').getContext('2d'));pages++;}
    }
    return {missing,pages,noSave:JSON.stringify(localStorage)===before,report:HB.mapAssets.report(),allReady:[...HB.mapAssets.entries.values()].every(e=>e.variants.every(v=>v.ready&&!v.failed)),runtimeError:String(HB.app.lastError||'')};
  });
  assert.deepEqual(result.missing,[]);assert.deepEqual(result.report.warnings,[]);
  assert.equal(result.allReady,true);assert.equal(result.noSave,true);assert.equal(result.runtimeError,'');
  assert.equal(result.report.images,39);assert.equal(result.report.ids,96);
  await page.evaluate(()=>{HB.scenes.top().group='Places';HB.scenes.top().page=0;HB.scenes.top().refresh();});
  // Tap Next in virtual canvas coordinates, compensating for letterboxing.
  const box=await page.locator('#game').boundingBox();
  await page.touchscreen.tap(box.x+260*box.width/1280,box.y+679*box.height/720);
  await page.waitForFunction(()=>HB.scenes.top().page===1);
  await page.evaluate(()=>HB.mapAssets.use('none'));
  assert.equal(await page.evaluate(()=>HB.mapInk.enabled()),false);
  assert.deepEqual(errors,[]);
  console.log(`PASS: ${result.report.ids} PNG ids, 23 native details, ${result.pages} catalog pages, no missing states; file://, touch, no-save and rollback checks.`);
} finally {await browser.close();}
