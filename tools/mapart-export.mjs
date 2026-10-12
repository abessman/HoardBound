#!/usr/bin/env node
/* Map-art handoff exporter (map_update.md §5). Runs the game in the preinstalled Chromium and writes:
 *   docs/map-art/catalog.json, docs/map-art/CATALOG.md   measured size, anchor and bounds of every map glyph
 *   docs/map-art/sheets/*.png                             labelled contact sheets (zoom 1, zoom 2.5, 4× detail), palette
 *   assets/map/packs/sample/                              the sample pack's test art + pack.json + pack.js
 *   assets/map/packs/test-broken/                         a pack of deliberate mistakes (fallback check)
 *   docs/map-art/screens/*.png                            the preview scene with no pack, the sample pack, the broken pack
 *   docs/map-art/perf.json                                draw and chunk timings, decoded image memory, cache bounds
 *   docs/map-art/checks.json                              acceptance checks run in the browser (placements, fallbacks, saves)
 *   docs/map-art/wash-checks.json, screens/wash-*.jpg     reveal wash and territory wash checks, costs and screens (tools/washcheck-page.js)
 * Usage: node tools/mapart-export.mjs [--only=catalog,sheets,sample,shots,check,perf,wash]
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
      ['sample pack: all 9 ids loaded (6 symbols, 2 watercolour textures, a bloom mask), 14 images (with 6 wash textures and a bloom mask), no warnings', sample.report.ids === 9 && sample.report.images === 14 && sample.report.warnings.length === 0],
      ['mountain a (128×108 @4×) and b (64×54 @2×) draw at the same size and anchor', !!sample.footprint && sample.footprint.length === 2 && sample.footprint[0].slice(1).every((v, i) => Math.abs(v - sample.footprint[1][i + 1]) < 0.01)],
      ['broken pack: the valid pine draws, the 9 mistakes warn and fall back', broken.report.drawing.length === 1 && broken.report.drawing[0] === 'map.terrain.tree.pine' && broken.report.warnings.length >= 9 && broken.report.warnings.some(w => /map.wash.benevolent/.test(w))],
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
  // ---------- watercolour (docs/map-art/WASH.md): the reveal wash and the territory wash in the preview, stepped frame by
  // frame, then on the live map; writes docs/map-art/wash-checks.json and docs/map-art/screens/wash-*.jpg
  if (want('wash')) {
    const R = { generated: 'node tools/mapart-export.mjs --only=wash', note: 'Headless Chromium on the build container, 1280×720 at 1×, software canvas: compare numbers with each other, not with an iPad. The preview is stepped at 60 frames a second and every frame is drawn and checked.', checks: [], perf: {}, colours: {}, edge: null, anchoring: null };
    const check = (name, ok, detail) => { R.checks.push(detail === undefined ? { name, ok: !!ok } : { name, ok: !!ok, detail }); };
    const frames = (page) => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const shot = async (page, name) => { await frames(page); await page.screenshot({ path: path.join(SCREENS, name), type: 'jpeg', quality: 82 }); };
    const wash = async (q) => { const p = await open('index.html?scene=washpreview' + q); await settle(p, 700); await p.addScriptTag({ path: path.join(__dirname, 'washcheck-page.js') }); return p; };
    const E = (p, fn, arg) => p.evaluate(fn, arg);

    // 1. the reveal wash, with the sample pack's symbols
    let p = await wash('&mappack=sample');
    let s = await E(p, () => WASHCHECK.run(0.5));
    check('before the flight: nothing under the fog is drawn (the mountain, the forest and the village are unknown)', s.shown.length === 0 && s.cells === 0, s);
    await shot(p, 'wash-1-start.jpg');
    await E(p, () => WASHCHECK.fly());
    s = await E(p, () => WASHCHECK.run(1.1));
    R.edge = await E(p, () => WASHCHECK.cellMask());
    R.anchoring = await E(p, () => WASHCHECK.anchorCheck());
    await shot(p, 'wash-2-reveal.jpg');
    s = await E(p, () => WASHCHECK.run(1.2)); await shot(p, 'wash-3-reveal.jpg');
    const ed = R.edge;
    check('the paper dissolves along an irregular edge, not as a uniform square fade (inside a half-uncovered cell the cover varies pixel to pixel)', ed && ed.sd > 50 && ed.uncovered >= 4, ed);
    check('a thin warm wash lies at the wet edge while it spreads', ed && ed.tint > 4, ed && { tint: ed.tint });
    // a disc of land revealed at once (as when the dragon lands or grows): the wash starts at the dragon and bleeds outward
    const spread = await E(p, () => { const L = new HB.mapReveal.Layer({ seed: 'x' }), cells = []; for (let y = 2; y < 18; y++) for (let x = 2; x < 18; x++) if (Math.hypot(x + 0.5 - 10, y + 0.5 - 10) < 6) cells.push(y * 40 + x);
      L.add(cells, 40, 0, 10, 10); const pts = cells.map(i => [Math.hypot(i % 40 + 0.5 - 10, ((i / 40) | 0) + 0.5 - 10), L.cells.get(i).t0]); const near = pts.filter(p => p[0] < 2), far = pts.filter(p => p[0] > 4.5), m = (a) => a.reduce((s, p) => s + p[1], 0) / a.length; return { near: +m(near).toFixed(2), far: +m(far).toFixed(2), monotone: pts.every(p => pts.every(q => p[0] < q[0] - 0.01 ? p[1] <= q[1] + 1e-9 : true)) }; });
    check('the wash bleeds outward from the dragon: land farther from it starts later', spread.far > spread.near + 0.2 && spread.monotone, spread);
    const A = R.anchoring;
    check('world-anchored: panning two cells mid-reveal moves the wash exactly with the land', A.cells > 0 && A.pixels > 2000 && A.meanDiff < 1, A);
    s = await E(p, () => WASHCHECK.run(6.5));
    await shot(p, 'wash-4-revealed.jpg');
    let L = await E(p, () => ({ v: WASHCHECK.L.violations.slice(0, 5), n: WASHCHECK.L.violations.length, max: WASHCHECK.L.maxCells }));
    check('knowledge on every frame: nothing is drawn before its cell is revealed; the village appears only once discovered', L.n === 0, L.v);
    check('the wash dries away completely: every revealed cell clear, nothing left over the map', s.cells === 0 && s.fogLeft === 0 && s.shown.length === 9, s);
    // 2. the territory wash
    await E(p, () => WASHCHECK.sc.villageJoins());
    await E(p, () => WASHCHECK.run(0.45)); await shot(p, 'wash-5-bloom.jpg');
    const vx = { x: 21.5 + 8, y: 10 + 1 };
    const covMid = await E(p, (v) => WASHCHECK.coverage(v.x + 1.5, v.y, 2.5), vx);
    s = await E(p, () => WASHCHECK.run(2.6));
    const covEnd = await E(p, (v) => WASHCHECK.coverage(v.x + 1.5, v.y, 2.5), vx), still = await E(p, () => WASHCHECK.sc.wash.active(WASHCHECK.sc.t));
    check('a place that joins blooms from itself: part-way after 0.45 s, complete and still after 3 s', covEnd > 0.5 && covMid < covEnd * 0.8 && !still, { midway: covMid, end: covEnd });
    R.colours.kind = await E(p, () => WASHCHECK.colour()); await shot(p, 'wash-6-kind.jpg');
    const lair = await E(p, () => { const l = WASHCHECK.lair(); return { x: l.x, y: l.y, r: l.r }; });
    const in0 = await E(p, (l) => WASHCHECK.coverage(l.x, l.y, l.r * 0.7), lair);
    await E(p, () => WASHCHECK.sc.grow()); await E(p, () => WASHCHECK.run(0.3));
    const in1 = await E(p, (l) => WASHCHECK.coverage(l.x, l.y, l.r * 0.7), lair), ring1 = await E(p, (l) => WASHCHECK.coverage(l.x, l.y, l.r + 2), lair);
    await E(p, () => WASHCHECK.run(2.6));
    const ring2 = await E(p, (l) => WASHCHECK.coverage(l.x, l.y, l.r + 2), lair);
    check('growing territory spreads outward from its old edge; the land already painted stays painted', in1 >= in0 * 0.97 && ring1 < ring2 * 0.95, { innerBefore: in0, innerDuring: in1, ringDuring: ring1, ringAfter: ring2 });
    await E(p, () => WASHCHECK.sc.setRule(-1)); await E(p, () => WASHCHECK.run(3.2)); R.colours.cruel = await E(p, () => WASHCHECK.colour()); await shot(p, 'wash-7-cruel.jpg');
    const [k, c] = [R.colours.kind, R.colours.cruel];
    check('kind territory reads green-gold, cruel rust-charcoal', k && c && k[1] >= k[2] + 40 && (c[0] - c[1]) > (k[0] - k[1]) + 40 && c[0] > c[2] + 30, { kind: k, cruel: c });
    R.perf.preview = await E(p, () => WASHCHECK.perf());
    const st1 = await E(p, () => WASHCHECK.storage() === WASHCHECK.storage0);
    const errs1 = p.logs.filter(l => l.startsWith('[pageerror]'));
    await p.close();

    // 3. reduced motion: a quick fade, no spreading, no tint
    p = await wash('&mappack=sample&reducedmotion=1');
    await E(p, () => WASHCHECK.fly()); await E(p, () => WASHCHECK.run(1.0));
    const red = await E(p, () => { const R = WASHCHECK.sc.reveal, t0s = [...R.cells.values()].map(c => c.t0); return { cells: R.cells.size, allReduced: [...R.cells.values()].every(c => c.reduced), spread: t0s.length ? Math.max(...t0s) - Math.min(...t0s) : 0, mask: WASHCHECK.cellMask() }; });
    await shot(p, 'wash-8-reduced.jpg');
    s = await E(p, () => WASHCHECK.run(7));
    check('reduced motion: newly revealed land fades in within 0.3 s, without spreading or tint', red.allReduced && (!red.mask || red.mask.tint === 0) && s.cells === 0 && s.fogLeft === 0, { cells: red.cells, tint: red.mask && red.mask.tint });
    const errs2 = p.logs.filter(l => l.startsWith('[pageerror]'));
    await p.close();

    // 4. the live map: the reveal wash during a flight; the territory wash follows the real territory
    const live = async (preset, q = '') => {
      const pg = await open(`index.html?scene=map&seed=ember-quill-42${preset ? '&preset=' + preset : ''}&mappack=sample${q}`); await settle(pg, 1200);
      // close the story cards a start opens, then let the map settle
      await pg.evaluate(() => { for (let i = 0; i < 6 && HB.scenes.top() !== HB.flow.map; i++) HB.scenes.pop(); });
      await settle(pg, 1600); await pg.evaluate(() => { for (let i = 0; i < 6 && HB.scenes.top() !== HB.flow.map; i++) HB.scenes.pop(); });
      return pg;
    };
    p = await live('');
    const strip = (x) => { const o = JSON.parse(x); delete o.savedAt; delete o.created; return JSON.stringify(o); };
    const fly = await E(p, () => {
      const m = HB.flow.map, st = m.state; m.cam.zoom = 2.6;
      const T = HB.mapReveal.Layer.prototype, d0 = T.draw; window.__rv = []; T.draw = function () { const a = performance.now(); const r = d0.apply(this, arguments); window.__rv.push(performance.now() - a); return r; };
      HB.travel.begin(st, HB.travel.makePoint(st, st.dragon.x + 9, st.dragon.y + 1), m); return { start: st.know.revealed.reduce((a, b) => a + b, 0) };
    });
    let seen = 0;
    for (let k = 0; k < 60; k++) {
      await new Promise(r => setTimeout(r, 300));
      const o = await E(p, () => { const m = HB.flow.map; m.centerOn(m.state.dragon.x + 0.5, m.state.dragon.y + 0.5, null, true); return { n: m.revealWash.cells.size, flying: m.state.phase === 'traveling' }; });
      seen = Math.max(seen, o.n); if (k === 2) await shot(p, 'wash-9-live-reveal.jpg');
      if (!o.flying && k > 3) break;
    }
    await new Promise(r => setTimeout(r, 2500));
    const after = await E(p, () => { const m = HB.flow.map, st = m.state, K = st.know.revealed; let left = 0; for (let i = 0; i < K.length; i++) if (K[i] && m.fogAlpha[i] > 0) left++; return { cells: m.revealWash.cells.size, left, revealed: K.reduce((a, b) => a + b, 0), ms: window.__rv.slice().sort((a, b) => a - b) }; });
    R.perf.liveReveal = { revealLayerMedianMs: after.ms.length ? +after.ms[Math.floor(after.ms.length / 2)].toFixed(2) : 0, revealLayerMaxMs: after.ms.length ? +after.ms[after.ms.length - 1].toFixed(2) : 0, frames: after.ms.length, maxRevealingCells: seen };
    check('live map: flying uncovers new land through the reveal wash, which then dries away (no fog left on revealed land)', seen > 5 && after.revealed > fly.start && after.cells === 0 && after.left === 0, { maxRevealing: seen, newCells: after.revealed - fly.start, left: after.left });
    const errs3 = p.logs.filter(l => l.startsWith('[pageerror]'));
    await p.close();
    p = await live('adult-cruel');
    const lv = await E(p, () => {
      const map = HB.flow.map, st = map.state, W = st.world, inf = HB.domain.influence(st), wl = map.wash, Rr = wl.rect;
      const d = wl.ctx.getImageData(0, 0, wl.canvas.width, wl.canvas.height).data; let on = 0, out = 0, r = 0, g = 0, b = 0, a = 0;
      const ok = (x, y) => x >= 0 && y >= 0 && x < W.w && y < W.h && W.region[y * W.w + x] === inf.region && HB.isLand(W.terrain[y * W.w + x]);
      for (let py = 0; py < wl.canvas.height; py++) for (let px = 0; px < wl.canvas.width; px++) {
        const o = (py * wl.canvas.width + px) * 4; if (d[o + 3] <= 8) continue; on++;
        const wx = Rr.x0 + (px + 0.5) / Rr.res, wy = Rr.y0 + (py + 0.5) / Rr.res, cx = Math.floor(wx), cy = Math.floor(wy);
        if (!ok(cx, cy) && !ok(cx - 1, cy) && !ok(cx + 1, cy) && !ok(cx, cy - 1) && !ok(cx, cy + 1)) out++;
        if (d[o + 3] > 20) { r += d[o] * d[o + 3]; g += d[o + 1] * d[o + 3]; b += d[o + 2] * d[o + 3]; a += d[o + 3]; }
      }
      return { sources: wl.sources.length, infSources: inf.sources.filter(s => s.r > 0).length, painted: on, outside: out, colour: a ? [Math.round(r / a), Math.round(g / a), Math.round(b / a)] : null, save: HB.save.serialize(st), textured: !!HB.mapAssets.washData('tyrannical') };
    });
    await new Promise(r => setTimeout(r, 1500));
    const save2 = await E(p, () => HB.save.serialize(HB.flow.map.state));
    R.colours.liveCruel = lv.colour;
    check('live map: the territory is painted from the real territory sources and stays on home-region land', lv.sources === lv.infSources && lv.painted > 200 && lv.outside / lv.painted < 0.01 && lv.textured, { sources: lv.sources, painted: lv.painted, outsideShare: +(lv.outside / Math.max(1, lv.painted)).toFixed(4) });
    check('live map: drawing the washes leaves the campaign save unchanged', strip(save2) === strip(lv.save));
    const occ = await E(p, () => {
      const map = HB.flow.map, st = map.state, D = HB.domain, n0 = map.wash.sources.length;
      const L = st.world.locations.find(L => ['village', 'town', 'farm'].includes(L.type) && L.state === 'normal' && D.inHomeRegion(st, L) && D.inInfluence(st, L) && !L.occupation && !['protected', 'allied'].includes(D.statusOf(st, L)));
      if (!L) return { found: false };
      L.fear = 100; D.occupy(st, L); map.centerOn(L.x + 0.5, L.y + 0.5, 1.6, true);
      return { found: true, occupied: !!L.occupation, n0, name: L.name, x: L.x + 0.5, y: L.y + 0.5 };
    });
    await new Promise(r => setTimeout(r, 450));
    const occMid = await E(p, (o) => { const w = HB.flow.map.wash; return { n: w.sources.length, spreading: w.spread.some(s => Math.hypot(s.x - o.x, s.y - o.y) < 0.6), active: w.active(HB.flow.map.t) }; }, occ);
    await shot(p, 'wash-10-live-occupy.jpg');
    await new Promise(r => setTimeout(r, 3000));
    const occEnd = await E(p, () => HB.flow.map.wash.active(HB.flow.map.t));
    check('live map: occupying a place adds its source and a bloom spreads from it, then settles', occ.found && occ.occupied && occMid.n === occ.n0 + 1 && occMid.spreading && occMid.active && !occEnd, { place: occ.name, before: occ.n0, after: occMid.n });
    const errs4 = p.logs.filter(l => l.startsWith('[pageerror]'));
    await p.close();
    p = await live('adult-kind');
    R.colours.liveKind = await E(p, () => { const wl = HB.flow.map.wash, d = wl.ctx.getImageData(0, 0, wl.canvas.width, wl.canvas.height).data; let r = 0, g = 0, b = 0, a = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 20) { r += d[i] * d[i + 3]; g += d[i + 1] * d[i + 3]; b += d[i + 2] * d[i + 3]; a += d[i + 3]; } return a ? [Math.round(r / a), Math.round(g / a), Math.round(b / a)] : null; });
    await shot(p, 'wash-11-live-kind.jpg');
    const [lk, lc] = [R.colours.liveKind, R.colours.liveCruel];
    check('live map: a kind dragon\'s territory is green-gold, a cruel one\'s rust', lk && lc && lk[1] >= lk[2] + 30 && (lc[0] - lc[1]) > (lk[0] - lk[1]) + 30, { kind: lk, cruel: lc });
    const errs5 = p.logs.filter(l => l.startsWith('[pageerror]'));
    await p.close();
    check('nothing written to localStorage by the preview (no saves, no settings)', st1);
    const allErrs = [...errs1, ...errs2, ...errs3, ...errs4, ...errs5];
    check('no page errors', !allErrs.length, allErrs.slice(0, 3));
    fs.writeFileSync(path.join(DOCS, 'wash-checks.json'), JSON.stringify(R, null, 1) + '\n');
    for (const c of R.checks) console.log((c.ok ? 'ok   ' : 'FAIL ') + c.name + (c.ok ? '' : '  ' + JSON.stringify(c.detail)));
    console.log('perf:', JSON.stringify(R.perf));
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
    comment: 'Test art proving partial replacement: two mountain variants at different resolutions (one with an occlusion mask), a broadleaf tree, a village, a castle with a flag point, a burned town (a state variant) and a pixel-art wagon. Kind and cruel watercolour textures and a bloom order mask for the territory. Everything else stays hand-drawn.',
    assets: {
      'map.terrain.mountain': { variants: [
        { id: 'a', src: 'terrain/mountain-a@4x.png', sourceSize: [128, 108], logicalSize: [30, 25.3], anchorPx: [64, 102], contentBoundsPx: [3, 5, 122, 100], occlusionMask: 'terrain/mountain-a-mask@4x.png', layer: 'terrain', sampling: 'smooth', allowFlipX: true },
        { id: 'b', src: 'terrain/mountain-b@2x.png', sourceSize: [64, 54], logicalSize: [30, 25.3], anchorPx: [32, 51], contentBoundsPx: [2, 5, 60, 47], layer: 'terrain', sampling: 'smooth' },
      ] },
      'map.terrain.tree.round': { variants: [
        { id: 'a', src: 'terrain/tree-round@4x.png', sourceSize: [40, 48], logicalSize: [10, 12], anchorPx: [20, 44], contentBoundsPx: [3, 2, 34, 44], layer: 'terrain', sampling: 'smooth', allowFlipX: true },
      ] },
      'map.place.village': { variants: [
        { id: 'a', src: 'places/village@4x.png', sourceSize: [120, 92], logicalSize: [30, 23], anchorPx: [60, 86], contentBoundsPx: [8, 18, 104, 72], layer: 'places', sampling: 'smooth', labelOffset: [0, 1] },
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
      // watercolour for the territory (docs/map-art/WASH.md)
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
    comment: 'Deliberate mistakes for the fallback check (docs/map-art/REPLACING.md). Only map.terrain.tree.pine is valid; everything else must warn and fall back to the hand-drawn glyph or the procedural wash.',
    assets: [
      { id: 'map.terrain.tree.pine', variants: [{ id: 'ok', src: 'pine-ok@4x.png', sourceSize: [28, 52], logicalSize: [7, 13], anchorPx: [14, 50] }] },
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
    'Watercolour masks (`map.wash.*`) are not glyphs and are not listed here: [WASH.md](WASH.md).',
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
