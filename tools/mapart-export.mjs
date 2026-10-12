#!/usr/bin/env node
/* Map-art handoff exporter (map_update.md §5). Runs the game in the preinstalled Chromium and writes:
 *   docs/map-art/catalog.json, docs/map-art/CATALOG.md   measured size, anchor and bounds of every map glyph
 *   docs/map-art/sheets/*.png                             labelled contact sheets (zoom 1, zoom 2.5, 4× detail), palette
 *   assets/map/packs/sample/                              the sample pack's test art + pack.json + pack.js
 *   assets/map/packs/test-broken/                         a pack of deliberate mistakes (fallback check)
 *   docs/map-art/screens/*.png                            the preview scene with no pack, the sample pack, the broken pack
 *   docs/map-art/perf.json                                draw and chunk timings, decoded image memory, cache bounds
 *   docs/map-art/checks.json                              acceptance checks run in the browser (placements, fallbacks, saves)
 * Usage: node tools/mapart-export.mjs [--only=catalog,sheets,sample,shots,check,perf]
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
      ['sample pack: all 6 ids loaded, 7 images, no warnings', sample.report.ids === 6 && sample.report.images === 7 && sample.report.warnings.length === 0],
      ['mountain a (128×108 @4×) and b (64×54 @2×) draw at the same size and anchor', !!sample.footprint && sample.footprint.length === 2 && sample.footprint[0].slice(1).every((v, i) => Math.abs(v - sample.footprint[1][i + 1]) < 0.01)],
      ['broken pack: the valid pine draws, the 7 mistakes warn and fall back', broken.report.drawing.length === 1 && broken.report.drawing[0] === 'map.terrain.tree.pine' && broken.report.warnings.length >= 7],
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
    comment: 'Test art proving partial replacement: two mountain variants at different resolutions (one with an occlusion mask), a broadleaf tree, a village, a castle with a flag point, a burned town (a state variant) and a pixel-art wagon. Everything else stays hand-drawn.',
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
    },
  };
  const broken = {
    schemaVersion: 1,
    name: 'test-broken',
    comment: 'Deliberate mistakes for the fallback check (docs/map-art/REPLACING.md). Only map.terrain.tree.pine is valid; everything else must warn and fall back to the hand-drawn glyph.',
    assets: [
      { id: 'map.terrain.tree.pine', variants: [{ id: 'ok', src: 'pine-ok@4x.png', sourceSize: [28, 52], logicalSize: [7, 13], anchorPx: [14, 50] }] },
      { id: 'map.terrain.tree.pine', variants: [{ id: 'dup', src: 'pine-ok@4x.png', sourceSize: [28, 52], logicalSize: [7, 13], anchorPx: [14, 50] }] },
      { id: 'map.terrain.volcano', variants: [{ id: 'a', src: 'small-32.png', sourceSize: [32, 32], logicalSize: [20, 20], anchorPx: [16, 30] }] },
      { id: 'map.place.village', variants: [{ id: 'missing', src: 'no-such-file.png', sourceSize: [64, 64], logicalSize: [30, 30], anchorPx: [32, 60] }] },
      { id: 'map.place.town', variants: [{ id: 'wrong-size', src: 'small-32.png', sourceSize: [64, 64], logicalSize: [30, 30], anchorPx: [32, 60] }] },
      { id: 'map.place.castle', variants: [{ id: 'bad-anchor', src: 'small-32.png', sourceSize: [32, 32], logicalSize: [30, 30], anchorPx: [40, 30] }] },
      { id: 'map.terrain.mountain', variants: [{ id: 'too-big', src: 'small-32.png', sourceSize: [32, 32], logicalSize: [120, 120], anchorPx: [16, 31] }] },
      { id: 'map.place.farm', variants: [{ id: 'bad-rect', src: 'small-32.png', rect: [16, 16, 32, 32], logicalSize: [20, 20], anchorPx: [16, 30] }] },
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
