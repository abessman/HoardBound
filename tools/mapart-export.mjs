#!/usr/bin/env node
/* Map-art handoff exporter (map_update.md §5). Runs the game in the preinstalled Chromium and writes:
 *   docs/map-art/catalog.json, docs/map-art/CATALOG.md   measured size, anchor and bounds of every map glyph
 *   docs/map-art/sheets/*.png                             labelled contact sheets (zoom 1, zoom 2.5, 4× detail), palette
 *   assets/map/packs/sample/                              the sample pack's test art + pack.json + pack.js
 *   assets/map/packs/test-broken/                         a pack of deliberate mistakes (fallback check)
 *   docs/map-art/screens/*.png                            the preview scene with no pack, the sample pack, the broken pack
 *   docs/map-art/perf.json                                draw and chunk timings, decoded image memory, cache bounds
 *   docs/map-art/checks.json                              acceptance checks run in the browser (placements, fallbacks, saves)
 *   docs/map-art/ink-checks.json, screens/ink-*.jpg       ink discovery and watercolour checks, costs and screens (tools/inkcheck-page.js)
 * Usage: node tools/mapart-export.mjs [--only=catalog,sheets,sample,shots,check,perf,ink]
 * Deterministic: fixed seed, fixed camera, fixed draw seeds. Re-run after changing src/art/mapart.js or mapspec.js. */
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const c of [root + '/', '/opt/node-tools/node_modules/', '/opt/node22/lib/node_modules/', '/usr/lib/node_modules/', '/usr/local/lib/node_modules/']) { try { return createRequire(c)('playwright'); } catch (e) { /* next */ } }
  throw new Error('playwright not found');
}
const { chromium } = loadPlaywright();
const mappack = require('./mappack.js');
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const want = (k) => !only.length || only.includes(k);
const DOCS = path.join(root, 'docs/map-art'), SHEETS = path.join(DOCS, 'sheets'), SCREENS = path.join(DOCS, 'screens');
for (const d of [DOCS, SHEETS, SCREENS]) fs.mkdirSync(d, { recursive: true });
const writePng = (file, dataUrl) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64')); };
const rel = (f) => path.relative(root, f);

const port = 8900 + Math.floor(Math.random() * 300);
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const browser = await chromium.launch();
const PREVIEW = 'index.html?scene=mappreview';
async function open(query, w = 1280, h = 720) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.logs = [];
  page.on('console', m => page.logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => page.logs.push('[pageerror] ' + e.message));
  await page.goto(`http://127.0.0.1:${port}/${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => globalThis.HB && HB.ready === true, null, { timeout: 20000 });
  return page;
}
/** wait until the pack's images have loaded and the map has redrawn its chunks */
const settle = (page, ms = 1500) => page.evaluate((ms) => new Promise(res => { const t0 = performance.now(); const tick = () => { if ((!HB.mapAssets || HB.mapAssets.loading === 0) && performance.now() - t0 > ms) res(); else setTimeout(tick, 100); }; tick(); }), ms);

try {
  // ---------- catalog + sheets (procedural, no pack)
  let catalog = null;
  if (want('catalog') || want('sheets') || want('sample')) {
    const page = await open(PREVIEW + '&mappack=none');
    await page.addScriptTag({ path: path.join(__dirname, 'mapart-page.js') });
    catalog = await page.evaluate(() => MAPART_EXPORT.catalog());
    if (want('catalog')) {
      const meta = await page.evaluate(() => ({ version: HB.VERSION, spec: { schemaVersion: HB.MAP_SPEC.schemaVersion, cell: HB.MAP_SPEC.cell, lod1Cell: HB.MAP_SPEC.lod1Cell, marginCells: HB.MAP_SPEC.marginCells } }));
      fs.writeFileSync(path.join(DOCS, 'catalog.json'), JSON.stringify({ generated: 'node tools/mapart-export.mjs', game: meta.version, spec: meta.spec, units: 'logical px = screen px at zoom 1 when the size parameter equals ref (k = 1). Bounds are [left, top, right, bottom] from the anchor.', assets: catalog }, null, 1) + '\n');
      fs.writeFileSync(path.join(DOCS, 'CATALOG.md'), catalogMd(catalog, meta));
      console.log('catalog:', catalog.length, 'entries');
    }
    if (want('sheets')) {
      writePng(path.join(SHEETS, 'contact-zoom1.png'), await page.evaluate(() => MAPART_EXPORT.sheet(1, { cols: 10, cw: 124, ch: 104, title: 'HoardBound map glyphs at zoom 1 (the default view)' })));
      writePng(path.join(SHEETS, 'contact-zoom2.5.png'), await page.evaluate(() => MAPART_EXPORT.sheet(2.5, { cols: 9, cw: 190, ch: 170, title: 'HoardBound map glyphs at zoom 2.5 (a typical close view)' })));
      writePng(path.join(SHEETS, 'contact-detail-4x.png'), await page.evaluate(() => MAPART_EXPORT.sheet(1, { mag: 4, cols: 8, cw: 250, ch: 250, title: 'HoardBound map glyphs, zoom 1 magnified 4× (export scale)' })));
      writePng(path.join(SHEETS, 'palette.png'), await page.evaluate(() => MAPART_EXPORT.palette()));
      console.log('sheets written');
    }
    if (want('sample')) {
      const files = await page.evaluate(() => MAPART_EXPORT.samplePack());
      for (const [name, url] of Object.entries(files)) {
        if (name.startsWith('__broken/')) writePng(path.join(root, 'assets/map/packs/test-broken', name.slice(9)), url);
        else writePng(path.join(root, 'assets/map/packs/sample', name), url);
      }
      writePacks();
      console.log('sample packs written');
    }
    await page.close();
  }

  // ---------- screenshots: preview with no pack, the sample pack, the broken pack; close and far zoom
  if (want('shots')) {
    const shots = [
      ['preview-none.jpg', '&mappack=none'], ['preview-sample.jpg', '&mappack=sample'], ['preview-sample-chunks.jpg', '&mappack=sample&chunks=1'],
      ['preview-sample-close.jpg', '&mappack=sample&cam=~-3,0,2.6'], ['preview-none-close.jpg', '&mappack=none&cam=~-3,0,2.6'],
      ['preview-sample-far.jpg', '&mappack=sample&cam=~0,1,0.45'], ['preview-broken.jpg', '&mappack=test-broken'],
    ];
    const report = {};
    for (const [file, q] of shots) {
      const page = await open(PREVIEW + q); await settle(page);
      await page.screenshot({ path: path.join(SCREENS, file), type: 'jpeg', quality: 85 });
      report[file] = await page.evaluate(() => HB.mapAssets.report());
      const errs = page.logs.filter(l => l.startsWith('[pageerror]') || l.startsWith('[error]'));
      if (errs.length) console.log(file, errs.join('\n'));
      await page.close();
    }
    // iPad-sized viewport (1180×820 CSS px at 2× like an iPad Air in landscape), with the sample pack
    {
      const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
      await page.goto(`http://127.0.0.1:${port}/${PREVIEW}&mappack=sample`, { waitUntil: 'load' });
      await page.waitForFunction(() => globalThis.HB && HB.ready === true, null, { timeout: 20000 }); await settle(page);
      await page.screenshot({ path: path.join(SCREENS, 'preview-sample-ipad.jpg'), type: 'jpeg', quality: 80 });
      await page.close();
    }
    fs.writeFileSync(path.join(SCREENS, 'loaded.json'), JSON.stringify(report, null, 1) + '\n');
    console.log('screens written; broken pack warnings:\n  ' + report['preview-broken.jpg'].warnings.join('\n  '));
  }

  // ---------- acceptance checks (map_update.md §6) that a script can prove; writes docs/map-art/checks.json
  if (want('check')) {
    const probe = async (pack) => {
      const page = await open(PREVIEW + '&mappack=' + pack); await settle(page);
      const r = await page.evaluate(() => {
        const map = HB.flow.map, A = HB.mapart, st = map.state, H = st.world.home, calls = [];
        // every glyph the chunk asks for, with its position and size: must not depend on the art
        const names = ['mountain', 'mountainJagged', 'hill', 'treeRound', 'treePine', 'treeBare', 'treeBurned', 'grassTuft', 'swampTuft', 'dune', 'snowDots', 'field', 'ash', 'blossom', 'wave'];
        const orig = {}; for (const n of names) { orig[n] = A[n]; A[n] = function (ctx, x, y, a) { calls.push(`${n}:${x.toFixed(2)},${y.toFixed(2)},${(+a).toFixed(2)}`); return orig[n].apply(A, arguments); }; }
        const cx = Math.floor(H.x / 16), cy = Math.floor(H.y / 16);
        for (const [dx, dy] of [[0, 0], [-1, 0], [0, -1], [1, 0]]) { map.renderChunk(cx + dx, cy + dy, 0); map.renderChunk(cx + dx, cy + dy, 1); }
        for (const n of names) A[n] = orig[n];
        // hit areas: the place under each settlement's screen position
        const hits = st.world.locations.filter(L => Math.abs(L.x - H.x) < 14 && Math.abs(L.y - H.y) < 10).map(L => { const p = map.worldToScreen(L.x + 0.5, L.y + 0.3); const f = map.locationAtScreen(p.x, p.y); return `${L.id}:${f ? f.id : '-'}`; });
        // the same footprint from different source resolutions (mountain variants a@4× and b@2×)
        let footprint = null; const e = HB.mapAssets.entries.get('map.terrain.mountain');
        if (e) { const c = document.createElement('canvas').getContext('2d'); footprint = e.variants.map(v => { const d = HB.mapAssets.drawResolved(c, { id: e.id, v }, 50, 50, 26.4, { key: 'x' }); return [v.sw + '×' + v.sh, +d.dw.toFixed(3), +d.dh.toFixed(3), +d.dx.toFixed(3), +d.dy.toFixed(3)]; }); }
        const save = HB.save.serialize(st), back = HB.save.serialize(HB.save.deserialize(save));
        return { calls: calls.join('|'), nCalls: calls.length, hits, footprint, save, back, report: HB.mapAssets.report(), wrapped: typeof A.proc.mountain === 'function' && A.mountain !== A.proc.mountain };
      });
      const errs = page.logs.filter(l => l.startsWith('[pageerror]'));
      await page.close();
      return Object.assign(r, { pageErrors: errs });
    };
    const none = await probe('none'), sample = await probe('sample'), broken = await probe('test-broken');
    // compare saves without the wall-clock keys (created, savedAt); list the keys that differ
    const saveDiff = (a, b) => { const x = JSON.parse(a), y = JSON.parse(b); return Object.keys(x).filter(k => !['savedAt', 'created'].includes(k) && JSON.stringify(x[k]) !== JSON.stringify(y[k])); };
    const d1 = saveDiff(none.save, sample.save), d2 = saveDiff(none.save, none.back).concat(saveDiff(sample.save, sample.back));
    if (d1.length || d2.length) console.log('save differences:', d1, d2);
    const checks = [
      ['map drawing is wrapped (procedural copies kept in HB.mapart.proc)', none.wrapped],
      ['no pack: nothing loaded, no warnings', none.report.ids === 0 && none.report.warnings.length === 0],
      ['glyph placements identical with no pack, the sample pack and the broken pack (' + none.nCalls + ' glyph calls in 4 chunks at both levels of detail)', none.calls === sample.calls && none.calls === broken.calls && none.nCalls > 50],
      ['selection hit areas identical with and without art', JSON.stringify(none.hits) === JSON.stringify(sample.hits)],
      ['sample pack: all 9 ids loaded (6 symbols, 2 watercolour textures, a bloom mask), 18 images (with 4 ink masks, 6 wash textures), no warnings', sample.report.ids === 9 && sample.report.images === 18 && sample.report.warnings.length === 0],
      ['mountain a (128×108 @4×) and b (64×54 @2×) draw at the same size and anchor', !!sample.footprint && sample.footprint.length === 2 && sample.footprint[0].slice(1).every((v, i) => Math.abs(v - sample.footprint[1][i + 1]) < 0.01)],
      ['broken pack: the valid pine draws, the 9 mistakes (and its wrong-size ink mask) warn and fall back', broken.report.drawing.length === 1 && broken.report.drawing[0] === 'map.terrain.tree.pine' && broken.report.warnings.length >= 10 && broken.report.warnings.some(w => /inkMask/.test(w)) && broken.report.warnings.some(w => /map.wash.benevolent/.test(w))],
      ['campaign saves identical with no pack and with the sample pack (art is not saved)', !d1.length],
      ['save → load → save round-trips', !d2.length],
      ['no page errors', !none.pageErrors.length && !sample.pageErrors.length && !broken.pageErrors.length],
    ];
    fs.writeFileSync(path.join(DOCS, 'checks.json'), JSON.stringify({ generated: 'node tools/mapart-export.mjs --only=check', checks: checks.map(([name, ok]) => ({ name, ok: !!ok })), footprint: sample.footprint, brokenWarnings: broken.report.warnings }, null, 1) + '\n');
    for (const [name, ok] of checks) console.log((ok ? 'ok   ' : 'FAIL ') + name);
    if (checks.some(c => !c[1])) process.exitCode = 1;
  }

  // ---------- performance and memory (headless Chromium: compare the two columns, not absolute numbers)
  if (want('perf')) {
    const perf = { note: 'Headless Chromium on the build container, 1280×720 at 1×. Compare the columns; absolute numbers are not an iPad.', runs: {} };
    for (const pack of ['none', 'sample']) {
      const page = await open(PREVIEW + '&mappack=' + pack); await settle(page);
      perf.runs[pack] = await page.evaluate(() => new Promise((resolve) => {
        const map = HB.flow.map, out = {};
        // full redraw of the visible chunks (what happens when a pack finishes loading)
        map.chunks.clear(); map.chunkOrder.length = 0;
        const tl = map.screenToWorld(0, 0), br = map.screenToWorld(HB.W, HB.H);
        let t0 = performance.now(), n = 0;
        for (let cy = Math.floor(tl.y / 16); cy <= Math.floor(br.y / 16); cy++) for (let cx = Math.floor(tl.x / 16); cx <= Math.floor(br.x / 16); cx++) { map.getChunk(cx, cy, 0, { n: 99 }); n++; }
        out.chunkRebuild = { chunks: n, ms: +(performance.now() - t0).toFixed(1), msPerChunk: +((performance.now() - t0) / n).toFixed(2) };
        // 150 real frames of the game loop: time inside the map's draw, and the frame interval
        const draw = map.draw.bind(map), times = [], stamps = [];
        map.draw = function (ctx) { const a = performance.now(); draw(ctx); times.push(performance.now() - a); };
        const step = (t) => { stamps.push(t); if (stamps.length < 150) requestAnimationFrame(step); else finish(); };
        requestAnimationFrame(step);
        function finish() {
          map.draw = draw;
          const q = (a, p) => { const b = a.slice().sort((x, y) => x - y); return +b[Math.floor(b.length * p)].toFixed(2); };
          const gaps = stamps.slice(1).map((t, i) => t - stamps[i]);
          out.frame = { drawMedianMs: q(times, 0.5), drawP90Ms: q(times, 0.9), frameIntervalMedianMs: q(gaps, 0.5), fps: +(1000 / q(gaps, 0.5)).toFixed(0) };
          const lod0 = (16 + 4) * 22, lod1 = (16 + 4) * 7;
          out.cache = { maxChunks: map.maxChunks, lod0ChunkPx: `${lod0}×${lod0}`, lod0ChunkBytes: lod0 * lod0 * 4, lod1ChunkPx: `${lod1}×${lod1}`, worstCaseMB: +(map.maxChunks * lod0 * lod0 * 4 / 1048576).toFixed(1) };
          out.pack = HB.mapAssets.report();
          delete out.pack.warnings;
          resolve(out);
        }
      }));
      await page.close();
    }
    fs.writeFileSync(path.join(DOCS, 'perf.json'), JSON.stringify(perf, null, 1) + '\n');
    console.log(JSON.stringify(perf.runs, null, 1));
  }
  // ---------- ink discovery and watercolour (docs/map-art/INK_AND_WASH.md): the preview stepped frame by frame, then
  // the live map's wash; writes docs/map-art/ink-checks.json and docs/map-art/screens/ink-*.jpg
  if (want('ink')) {
    const R = { generated: 'node tools/mapart-export.mjs --only=ink', note: 'Headless Chromium on the build container, 1280×720 at 1×, software canvas: compare numbers with each other, not with an iPad. The preview is stepped at 60 frames a second and every frame is drawn and checked.', checks: [], perf: {}, colours: {}, anchoring: null, budget: null };
    const check = (name, ok, detail) => { R.checks.push(detail === undefined ? { name, ok: !!ok } : { name, ok: !!ok, detail }); };
    const frames = (page) => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const shot = async (page, name) => { await frames(page); await page.screenshot({ path: path.join(SCREENS, name), type: 'jpeg', quality: 82 }); };
    const ink = async (q) => { const p = await open('index.html?scene=inkpreview' + q); await settle(p, 700); await p.addScriptTag({ path: path.join(__dirname, 'inkcheck-page.js') }); return p; };
    const E = (p, fn, arg) => p.evaluate(fn, arg);

    // 1. full motion, sample pack: discovery
    let p = await ink('&mappack=sample');
    let s = await E(p, () => INKCHECK.run(0.5));
    check('before discovery: the mountain beside known land is a faint sketch; the forest and the village are not shown at all', s.states.mountain === 'sketch' && s.states.trees.every(x => x === 'hidden') && s.states.village === 'hidden', s.states);
    await shot(p, 'ink-1-sketch.jpg');
    await E(p, () => INKCHECK.fly());
    await E(p, () => INKCHECK.untilPool());
    await E(p, () => INKCHECK.run(0.25)); await shot(p, 'ink-2-pool.jpg');
    await E(p, () => INKCHECK.run(0.45)); await shot(p, 'ink-3-drain.jpg');
    R.anchoring = await E(p, () => INKCHECK.anchorCheck());
    await E(p, () => INKCHECK.run(0.55)); await shot(p, 'ink-4-wet.jpg');
    await E(p, () => INKCHECK.runUntil(() => INKCHECK.trees().some(f => f.state === 'revealing'), 6));
    await E(p, () => INKCHECK.run(0.75)); await shot(p, 'ink-5-forest.jpg');
    await E(p, () => INKCHECK.runUntil(() => INKCHECK.village().state === 'revealing', 6));
    await E(p, () => INKCHECK.run(1.25)); await shot(p, 'ink-6-village.jpg');
    s = await E(p, () => INKCHECK.run(4));
    await shot(p, 'ink-7-drawn.jpg');
    const masks = await E(p, () => ({ mountain: INKCHECK.mountain().buf.usedPackMasks, village: INKCHECK.village().buf.usedPackMasks, tree: INKCHECK.trees().find(f => f.ids[0].endsWith('round')).buf.usedPackMasks, mountainArt: !!INKCHECK.mountain().buf.r, villageArt: !!INKCHECK.village().buf.r }));
    let L = await E(p, () => ({ violations: INKCHECK.L.violations.slice(0, 5), nViol: INKCHECK.L.violations.length, pools: INKCHECK.L.pools.size, maxPools: INKCHECK.L.maxPools }));
    check('every discovered feature ends drawn (mountain, 7 trees, village)', s.states.mountain === 'drawn' && s.states.trees.every(x => x === 'drawn') && s.states.village === 'drawn', s.states);
    check('ink pools appeared and drained (one per discovery step; never more than 4 at once)', L.pools >= 2 && L.maxPools <= 4 && s.pools === 0, { pools: L.pools, maxAtOnce: L.maxPools });
    check('knowledge rules on every frame: the village is never sketched, nothing is drawn before its cell is revealed, sketches stay within 3 cells of known land, a drawn feature never undraws', L.nViol === 0, L.violations);
    check('the sample pack\'s ink and reveal masks are used for the mountain and the village; the round tree (no masks) derives its own', masks.mountain.ink && masks.mountain.order && masks.village.ink && masks.village.order && !masks.tree.ink && !masks.tree.order && masks.mountainArt && masks.villageArt, masks);
    const A = R.anchoring;
    check('world-anchored: mid-animation (an ink pool and inking features), panning two cells moves the wash, the pool and the ink exactly with the land', A.pools > 0 && A.panPixels > 5000 && A.panMeanDiff < 1, { panMeanDiff: A.panMeanDiff, pixels: A.panPixels, pools: A.pools, animating: A.animating });
    check('world-anchored: zooming 2.5 → 1.5 leaves the wash and the ink over the same land (centroid within 0.15 cells)', A.washCentroidShiftCells < 0.15 && A.inkCentroidShiftCells < 0.15, { wash: A.washCentroidShiftCells, ink: A.inkCentroidShiftCells });
    // revealed areas stay drawn
    const poolsBefore = L.pools;
    await E(p, () => INKCHECK.flyBack()); s = await E(p, () => INKCHECK.run(6));
    L = await E(p, () => ({ pools: INKCHECK.L.pools.size, nViol: INKCHECK.L.violations.length }));
    check('flying back over explored land: everything stays drawn, no new ink', s.states.mountain === 'drawn' && s.states.trees.every(x => x === 'drawn') && s.states.village === 'drawn' && L.pools === poolsBefore && L.nViol === 0);
    // 2. watercolour: a place joins, the territory grows, the rule turns cruel
    await E(p, () => INKCHECK.sc.villageJoins());
    await E(p, () => INKCHECK.run(0.45)); await shot(p, 'ink-8-bloom.jpg');
    const vx = await E(p, () => { const v = INKCHECK.sc.sources.find(s => s.key === 'village'); return v ? { x: v.x, y: v.y } : null; });
    const covMid = vx ? await E(p, (v) => INKCHECK.coverage(v.x + 1.5, v.y, 2.5), vx) : 0;
    s = await E(p, () => INKCHECK.run(2.5));
    const covEnd = vx ? await E(p, (v) => INKCHECK.coverage(v.x + 1.5, v.y, 2.5), vx) : 0;
    check('a place that joins blooms from itself: part-way after 0.45 s, complete and still after 3 s', vx && covEnd > 0.5 && covMid < covEnd * 0.8 && !s.washActive, { midway: covMid, end: covEnd });
    R.colours.kind = await E(p, () => INKCHECK.colour());
    await shot(p, 'ink-9-wash-kind.jpg');
    const lair = await E(p, () => { const l = INKCHECK.lair(); return { x: l.x, y: l.y, r: l.r }; });
    const in0 = await E(p, (l) => INKCHECK.coverage(l.x, l.y, l.r * 0.7), lair);
    await E(p, () => INKCHECK.sc.grow()); await E(p, () => INKCHECK.run(0.3));
    const in1 = await E(p, (l) => INKCHECK.coverage(l.x, l.y, l.r * 0.7), lair), ring1 = await E(p, (l) => INKCHECK.coverage(l.x, l.y, l.r + 2), lair);
    await E(p, () => INKCHECK.run(2.6));
    const ring2 = await E(p, (l) => INKCHECK.coverage(l.x, l.y, l.r + 2), lair);
    check('growing territory spreads outward from its old edge; the land already painted stays painted (no flash)', in1 >= in0 * 0.97 && ring1 < ring2 * 0.95, { innerBefore: in0, innerDuring: in1, ringDuring: ring1, ringAfter: ring2 });
    await E(p, () => INKCHECK.sc.setRule(-1)); await E(p, () => INKCHECK.run(0.6)); await shot(p, 'ink-10-recolour.jpg');
    await E(p, () => INKCHECK.run(2.6)); R.colours.cruel = await E(p, () => INKCHECK.colour()); await shot(p, 'ink-11-wash-cruel.jpg');
    const [k, c] = [R.colours.kind, R.colours.cruel];
    check('kind wash reads green-gold, cruel wash rust-charcoal', k && c && k[1] >= k[2] + 40 && (c[0] - c[1]) > (k[0] - k[1]) + 40 && c[0] > c[2] + 30, { kind: k, cruel: c });
    // 3. the iPad budget
    R.budget = await E(p, () => INKCHECK.capCheck());
    check('budget: 40 features found at once → at most 24 animate (the rest fade in), every buffer ≤ 160 px', R.budget.revealing <= 24 && R.budget.revealing > 0 && R.budget.fading === 40 - R.budget.revealing && R.budget.maxBufferPx <= 160, { revealing: R.budget.revealing, fading: R.budget.fading, maxBufferPx: R.budget.maxBufferPx });
    R.perf.preview = await E(p, () => INKCHECK.perf());
    const st1 = await E(p, () => ({ same: INKCHECK.storage() === INKCHECK.storage0, errors: 0 }));
    const errs1 = p.logs.filter(l => l.startsWith('[pageerror]'));
    await p.close();

    // 4. reduced motion
    p = await ink('&mappack=sample&reducedmotion=1');
    await E(p, () => INKCHECK.fly()); await E(p, () => INKCHECK.runUntil(() => INKCHECK.mountain().state === 'fading', 4));
    await E(p, () => INKCHECK.run(0.12)); await shot(p, 'ink-12-reduced.jpg');
    s = await E(p, () => INKCHECK.run(8));
    await E(p, () => INKCHECK.sc.villageJoins()); await E(p, () => INKCHECK.run(0.05));
    const red = await E(p, () => ({ pools: INKCHECK.L.pools.size, fade: INKCHECK.L.fade, spread: INKCHECK.sc.wash.spread.length, active: INKCHECK.sc.wash.active(INKCHECK.sc.t), nViol: INKCHECK.L.violations.length }));
    await E(p, () => INKCHECK.run(0.35));
    const redAfter = await E(p, () => INKCHECK.sc.wash.active(INKCHECK.sc.t));
    check('reduced motion: no pools or rivulets; each feature cross-fades to drawn within 0.3 s; washes fade in without spreading', red.pools === 0 && red.fade.length >= 9 && Math.max(...red.fade) <= 0.3 + 1 / 30 && red.spread === 0 && red.active && !redAfter && s.states.village === 'drawn' && red.nViol === 0, { fadeSeconds: Math.max(...red.fade), features: red.fade.length, pools: red.pools, spreading: red.spread });
    const errs2 = p.logs.filter(l => l.startsWith('[pageerror]'));
    await p.close();

    // 5. hand-drawn symbols (no pack): masks derived from the procedural art
    p = await ink('&mappack=none');
    await E(p, () => INKCHECK.fly()); await E(p, () => INKCHECK.untilPool()); await E(p, () => INKCHECK.run(1.25)); await shot(p, 'ink-13-handdrawn-wet.jpg');
    s = await E(p, () => INKCHECK.run(7));
    const none = await E(p, () => ({ m: INKCHECK.mountain().buf.usedPackMasks, nViol: INKCHECK.L.violations.length }));
    check('no pack: the hand-drawn symbols ink in the same way with derived masks', !none.m.ink && !none.m.order && s.states.village === 'drawn' && none.nViol === 0);
    const errs3 = p.logs.filter(l => l.startsWith('[pageerror]'));
    await p.close();

    // 6. the live map: the wash follows the real territory
    const live = async (preset, q = '') => {
      const pg = await open(`index.html?scene=map&seed=ember-quill-42&preset=${preset}&mappack=sample${q}`); await settle(pg, 1200);
      // close the story cards a preset opens (the endgame's introduction), then let the wash settle
      await pg.evaluate(() => { for (let i = 0; i < 6 && HB.scenes.top() !== HB.flow.map; i++) HB.scenes.pop(); });
      await settle(pg, 2200); await pg.evaluate(() => { for (let i = 0; i < 6 && HB.scenes.top() !== HB.flow.map; i++) HB.scenes.pop(); });
      return pg;
    };
    p = await live('adult-cruel');
    const lv = await E(p, () => {
      const map = HB.flow.map, st = map.state, W = st.world, inf = HB.domain.influence(st), wl = map.wash, R = wl.rect;
      const d = wl.ctx.getImageData(0, 0, wl.canvas.width, wl.canvas.height).data; let on = 0, out = 0, r = 0, g = 0, b = 0, a = 0;
      const ok = (x, y) => x >= 0 && y >= 0 && x < W.w && y < W.h && W.region[y * W.w + x] === inf.region && HB.isLand(W.terrain[y * W.w + x]);
      for (let py = 0; py < wl.canvas.height; py++) for (let px = 0; px < wl.canvas.width; px++) {
        const o = (py * wl.canvas.width + px) * 4; if (d[o + 3] <= 8) continue; on++;
        const wx = R.x0 + (px + 0.5) / R.res, wy = R.y0 + (py + 0.5) / R.res, cx = Math.floor(wx), cy = Math.floor(wy);
        if (!ok(cx, cy) && !ok(cx - 1, cy) && !ok(cx + 1, cy) && !ok(cx, cy - 1) && !ok(cx, cy + 1)) out++;
        if (d[o + 3] > 20) { r += d[o] * d[o + 3]; g += d[o + 1] * d[o + 3]; b += d[o + 2] * d[o + 3]; a += d[o + 3]; }
      }
      const strip = (s) => { const x = JSON.parse(s); delete x.savedAt; delete x.created; return JSON.stringify(x); };
      return { sources: wl.sources.length, infSources: inf.sources.filter(s => s.r > 0).length, painted: on, outside: out, colour: a ? [Math.round(r / a), Math.round(g / a), Math.round(b / a)] : null, save: strip(HB.save.serialize(st)), textured: !!HB.mapAssets.washData('tyrannical') };
    });
    await new Promise(r => setTimeout(r, 1500));
    const save2 = await E(p, () => { const x = JSON.parse(HB.save.serialize(HB.flow.map.state)); delete x.savedAt; delete x.created; return JSON.stringify(x); });
    R.colours.liveCruel = lv.colour;
    check('live map: the wash is painted from the real territory (one bloom source per territory source) and stays on home-region land', lv.sources === lv.infSources && lv.painted > 200 && lv.outside / lv.painted < 0.01 && lv.textured, { sources: lv.sources, painted: lv.painted, outsideShare: +(lv.outside / Math.max(1, lv.painted)).toFixed(4) });
    check('live map: drawing the wash leaves the campaign save unchanged', save2 === lv.save);
    // a place is occupied: its bloom spreads on the map
    const occ = await E(p, () => {
      const map = HB.flow.map, st = map.state, D = HB.domain, n0 = map.wash.sources.length;
      const L = st.world.locations.find(L => ['village', 'town', 'farm'].includes(L.type) && L.state === 'normal' && D.inHomeRegion(st, L) && D.inInfluence(st, L) && !L.occupation && !['protected', 'allied'].includes(D.statusOf(st, L)));
      if (!L) return { found: false };
      L.fear = 100; D.occupy(st, L); // returns the story of the occupation; success shows in L.occupation
      map.centerOn(L.x + 0.5, L.y + 0.5, 1.6, true);
      const T = HB.mapWash.Layer.prototype, stp = T.step; window.__washMs = []; T.step = function () { const t0 = performance.now(); const r = stp.apply(this, arguments); window.__washMs.push(performance.now() - t0); return r; };
      return { found: true, occupied: !!L.occupation, n0, name: L.name, x: L.x + 0.5, y: L.y + 0.5, cells: HB.domain.influence(st).count };
    });
    await new Promise(r => setTimeout(r, 450));
    const occMid = await E(p, (o) => { const w = HB.flow.map.wash; return { n: w.sources.length, spreading: w.spread.some(s => Math.hypot(s.x - o.x, s.y - o.y) < 0.6), active: w.active(HB.flow.map.t), sliceMs: window.__washMs.map(x => +x.toFixed(1)), job: w.lastJob, canvas: `${w.canvas.width}×${w.canvas.height}` }; }, occ);
    R.perf.liveMap = { territoryCells: occ.cells, washCanvasPx: occMid.canvas, repaintSlicesMs: occMid.sliceMs, repaintTotalMs: occMid.job && occMid.job.ms, repaintFrames: occMid.job && occMid.job.frames, note: `a repaint happens only when the territory changes (a place joins or is lost, the phase or hoard widens the circle, the rule turns); it is spread over frames at most ${6} ms each, the old painting showing meanwhile` };
    await shot(p, 'ink-14-live-occupy.jpg');
    await new Promise(r => setTimeout(r, 3000));
    const occEnd = await E(p, () => HB.flow.map.wash.active(HB.flow.map.t));
    await shot(p, 'ink-15-live-cruel.jpg');
    check('live map: occupying a place adds its source and a bloom spreads from it, then settles', occ.found && occ.occupied && occMid.n === occ.n0 + 1 && occMid.spreading && occMid.active && !occEnd, { place: occ.name, occupied: occ.occupied, before: occ.n0, after: occMid.n });
    const errs4 = p.logs.filter(l => l.startsWith('[pageerror]'));
    await p.close();
    p = await live('adult-kind');
    R.colours.liveKind = await E(p, () => { const wl = HB.flow.map.wash, d = wl.ctx.getImageData(0, 0, wl.canvas.width, wl.canvas.height).data; let r = 0, g = 0, b = 0, a = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 20) { r += d[i] * d[i + 3]; g += d[i + 1] * d[i + 3]; b += d[i + 2] * d[i + 3]; a += d[i + 3]; } return a ? [Math.round(r / a), Math.round(g / a), Math.round(b / a)] : null; });
    await shot(p, 'ink-16-live-kind.jpg');
    const [lk, lc] = [R.colours.liveKind, R.colours.liveCruel];
    check('live map: a kind dragon\'s wash is green-gold, a cruel one\'s rust', lk && lc && lk[1] >= lk[2] + 30 && (lc[0] - lc[1]) > (lk[0] - lk[1]) + 30, { kind: lk, cruel: lc });
    const errs5 = p.logs.filter(l => l.startsWith('[pageerror]'));
    await p.close();
    check('nothing written to localStorage by the preview (no saves, no settings)', st1.same);
    const allErrs = [...errs1, ...errs2, ...errs3, ...errs4, ...errs5];
    check('no page errors', !allErrs.length, allErrs.slice(0, 3));
    fs.writeFileSync(path.join(DOCS, 'ink-checks.json'), JSON.stringify(R, null, 1) + '\n');
    for (const c of R.checks) console.log((c.ok ? 'ok   ' : 'FAIL ') + c.name + (c.ok ? '' : '  ' + JSON.stringify(c.detail)));
    console.log('perf:', JSON.stringify(R.perf.preview), '\nbudget:', JSON.stringify(R.budget));
    if (R.checks.some(c => !c.ok)) process.exitCode = 1;
  }
} catch (e) {
  console.error('FAILED', e.stack || e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.kill();
}

// ---------- the sample packs' manifests (sizes chosen from the catalog's measurements of the procedural glyphs)
function writePacks() {
  const sample = {
    schemaVersion: 1,
    name: 'sample',
    comment: 'Test art proving partial replacement: two mountain variants at different resolutions (one with an occlusion mask), a broadleaf tree, a village, a castle with a flag point, a burned town (a state variant) and a pixel-art wagon. Mountain a and the village carry ink and reveal-order masks; kind and cruel watercolour textures and a bloom order mask. Everything else stays hand-drawn.',
    assets: {
      'map.terrain.mountain': { variants: [
        { id: 'a', src: 'terrain/mountain-a@4x.png', sourceSize: [128, 108], logicalSize: [30, 25.3], anchorPx: [64, 102], contentBoundsPx: [3, 5, 122, 100], occlusionMask: 'terrain/mountain-a-mask@4x.png', inkMask: 'terrain/mountain-a-ink@4x.png', revealMask: 'terrain/mountain-a-order@4x.png', layer: 'terrain', sampling: 'smooth', allowFlipX: true },
        { id: 'b', src: 'terrain/mountain-b@2x.png', sourceSize: [64, 54], logicalSize: [30, 25.3], anchorPx: [32, 51], contentBoundsPx: [2, 5, 60, 47], layer: 'terrain', sampling: 'smooth' },
      ] },
      'map.terrain.tree.round': { variants: [
        { id: 'a', src: 'terrain/tree-round@4x.png', sourceSize: [40, 48], logicalSize: [10, 12], anchorPx: [20, 44], contentBoundsPx: [3, 2, 34, 44], layer: 'terrain', sampling: 'smooth', allowFlipX: true },
      ] },
      'map.place.village': { variants: [
        { id: 'a', src: 'places/village@4x.png', sourceSize: [120, 92], logicalSize: [30, 23], anchorPx: [60, 86], contentBoundsPx: [8, 18, 104, 72], inkMask: 'places/village-ink@4x.png', revealMask: 'places/village-order@4x.png', layer: 'places', sampling: 'smooth', labelOffset: [0, 1] },
      ] },
      'map.place.castle': { variants: [
        { id: 'a', src: 'places/castle@4x.png', sourceSize: [112, 128], logicalSize: [28, 32], anchorPx: [56, 124], contentBoundsPx: [8, 20, 96, 106], layer: 'places', sampling: 'smooth', attach: { flag: [56, 22] } },
      ] },
      'map.place.town.burned': { variants: [
        { id: 'a', src: 'places/town-burned@4x.png', sourceSize: [136, 112], logicalSize: [34, 28], anchorPx: [68, 104], contentBoundsPx: [14, 0, 106, 106], layer: 'places', sampling: 'smooth' },
      ] },
      'map.marker.wagon': { variants: [
        { id: 'a', src: 'markers/wagon-pixel@1x.png', sourceSize: [12, 9], logicalSize: [18, 13.5], anchorPx: [6, 8], contentBoundsPx: [0, 0, 12, 8], layer: 'markers', sampling: 'pixel', allowFlipX: false },
      ] },
      // ink discovery and watercolour (docs/map-art/INK_AND_WASH.md); the round tree keeps derived masks to show the fallback
      'map.wash.benevolent': { variants: [
        { id: 'a', coverage: 'wash/kind-coverage.png', pooling: 'wash/kind-pooling.png', hue: 'wash/kind-hue.png', size: [256, 256], cellsPerTile: 8 },
      ] },
      'map.wash.tyrannical': { variants: [
        { id: 'a', coverage: 'wash/cruel-coverage.png', pooling: 'wash/cruel-pooling.png', hue: 'wash/cruel-hue.png', size: [256, 256], cellsPerTile: 8 },
      ] },
      'map.wash.bloom': { variants: [
        { id: 'a', src: 'wash/bloom-a.png', sourceSize: [256, 256], span: 2.5, allowFlipX: true },
      ] },
    },
  };
  const broken = {
    schemaVersion: 1,
    name: 'test-broken',
    comment: 'Deliberate mistakes for the fallback check (docs/map-art/REPLACING.md). Only map.terrain.tree.pine is valid (its inkMask is the wrong size and falls back to a derived mask); everything else must warn and fall back to the hand-drawn glyph or the procedural wash.',
    assets: [
      { id: 'map.terrain.tree.pine', variants: [{ id: 'ok', src: 'pine-ok@4x.png', sourceSize: [28, 52], logicalSize: [7, 13], anchorPx: [14, 50], inkMask: 'small-32.png' }] },
      { id: 'map.terrain.tree.pine', variants: [{ id: 'dup', src: 'pine-ok@4x.png', sourceSize: [28, 52], logicalSize: [7, 13], anchorPx: [14, 50] }] },
      { id: 'map.terrain.volcano', variants: [{ id: 'a', src: 'small-32.png', sourceSize: [32, 32], logicalSize: [20, 20], anchorPx: [16, 30] }] },
      { id: 'map.place.village', variants: [{ id: 'missing', src: 'no-such-file.png', sourceSize: [64, 64], logicalSize: [30, 30], anchorPx: [32, 60] }] },
      { id: 'map.place.town', variants: [{ id: 'wrong-size', src: 'small-32.png', sourceSize: [64, 64], logicalSize: [30, 30], anchorPx: [32, 60] }] },
      { id: 'map.place.castle', variants: [{ id: 'bad-anchor', src: 'small-32.png', sourceSize: [32, 32], logicalSize: [30, 30], anchorPx: [40, 30] }] },
      { id: 'map.terrain.mountain', variants: [{ id: 'too-big', src: 'small-32.png', sourceSize: [32, 32], logicalSize: [120, 120], anchorPx: [16, 31] }] },
      { id: 'map.place.farm', variants: [{ id: 'bad-rect', src: 'small-32.png', rect: [16, 16, 32, 32], logicalSize: [20, 20], anchorPx: [16, 30] }] },
      { id: 'map.wash.benevolent', variants: [{ id: 'not-square', coverage: 'pine-ok@4x.png', size: [28, 52] }] },
      { id: 'map.wash.tyrannical', variants: [{ id: 'wrong-size', coverage: 'small-32.png', size: [64, 64] }] },
    ],
  };
  for (const [name, pack] of [['sample', sample], ['test-broken', broken]]) {
    const dir = path.join(root, 'assets/map/packs', name);
    fs.writeFileSync(path.join(dir, 'pack.json'), JSON.stringify(pack, null, 2) + '\n');
    mappack.writePackJs(dir);
  }
}

function catalogMd(cat, meta) {
  const f = (a) => a ? a.join(' × ') : '';
  const b = (u) => `${u[0]}, ${u[1]} → ${u[2]}, ${u[3]}`;
  const lines = [
    '# Map art catalog',
    '',
    `Measured from the procedural drawing in HoardBound ${meta.version} by \`node tools/mapart-export.mjs\`. Machine-readable: [catalog.json](catalog.json). How to use it: [REPLACING.md](REPLACING.md); art rules: [ART_SPEC.md](ART_SPEC.md).`,
    '',
    'Units: **logical px** = screen px at zoom 1 when the drawing\'s size parameter equals `ref` (k = 1). **Bounds** are the ink extent measured from the anchor (left, top → right, bottom), the union of 24 random draws for glyphs that vary. **Recommended** adds 1 px padding: draw your PNG at 4× that size and put the anchor at the 4× point. **On screen** is the recommended frame\'s size at zoom 1 / 2.5 / 3.2 (the largest).',
    '',
    'Watercolour masks (`map.wash.*`) and the per-variant ink and reveal masks are not glyphs and are not listed here: [INK_AND_WASH.md](INK_AND_WASH.md).',
    '',
    'Layers: `terrain` is drawn into cached map chunks (reach limited to 2.2 cells, checked at both levels of detail); `places`, `markers`, `fog` and `ui` are drawn every frame at screen resolution.',
    '',
    '| id | purpose | layer · param | ref (k=1) | max k | anchor | bounds from anchor | recommended logical · anchor | 4× PNG · anchor | on screen z1 / z2.5 / z3.2 | states | builder |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const e of cat) {
    const st = e.state ? `state of ${e.family}` : e.sub ? `sub-id of ${e.family}` : (e.familyStates.length ? e.familyStates.join(', ') : '—');
    lines.push(`| \`${e.id}\` | ${e.purpose.replace(/\|/g, '/')} | ${e.layer} · ${e.param} | ${e.ref}${e.refY ? ' (h ' + e.refY + ')' : ''} | ${e.maxK}${e.lod1K ? ' (far ' + e.lod1K + ')' : ''} | ${e.anchor} | ${b(e.measured.boundsFromAnchor)} | ${f(e.recommended.logicalSize)} · ${e.recommended.anchorLogical.join(', ')} | ${f(e.recommended.sourceSizeAt4x)} · ${e.recommended.anchorPxAt4x.join(', ')} | ${f(e.onScreen.zoom1)} / ${f(e.onScreen.zoom2_5)} / ${f(e.onScreen.maxZoom3_2)} | ${st} | \`${e.builder.replace(/\|/g, '/')}\` |`);
  }
  lines.push('', '## Notes', '',
    '- Places are all drawn with the same rule (s = clamp(10·√zoom, 4, 12) × a type scale: farm 0.75, city 1.15, hold and rival lair 1.1), so a place never grows past k = 1.2: close zoom shows places at most 1.2× their logical size while the land keeps growing.',
    '- Terrain glyphs sit in chunk canvases at 22 px per cell (7 in the far view) that are scaled with the map: terrain PNGs above 2× gain no sharpness today. Places and markers are drawn at screen resolution (up to 2× device pixels): use 4×.',
    '- Labels are never part of the art. A place\'s name is centred under its anchor; an asset may move it with `labelOffset` (logical px).',
    '- Faction flags (castles) and pennants are drawn by the engine: give castle art an `attach.flag` point instead of painting a flag. Army banners take the faction colour through a `tintMask`.',
    '- Every id also falls back: state → base id → procedural (places: sub-id + state → sub-id → state → type).',
    '');
  return lines.join('\n');
}
