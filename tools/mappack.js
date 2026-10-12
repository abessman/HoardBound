#!/usr/bin/env node
/* Map art pack validator and packer (no dependencies). Checks a pack the way the game's loader does
 * (src/art/mapassets.js), plus the PNG files themselves, and writes pack.js (pack.json wrapped so the game can load
 * it from file://).
 *   node tools/mappack.js <name|folder>          validate assets/map/packs/<name>/pack.json, then write pack.js
 *   node tools/mappack.js <name|folder> --check  validate only (exit code 1 on errors)
 * Errors mean the game will refuse that variant (and draw the hand-drawn glyph); warnings mean it works but is
 * probably not what you meant. Rules: assets/map/README.md and docs/map-art/REPLACING.md. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function loadSpec() {
  const sb = { console }; sb.globalThis = sb; vm.createContext(sb);
  for (const f of ['src/core/namespace.js', 'src/core/rng.js', 'src/data/mapspec.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sb, { filename: f });
  return sb.HB;
}
/** width and height of a PNG from its IHDR chunk, or null */
function pngSize(file) {
  try {
    const fd = fs.openSync(file, 'r'), b = Buffer.alloc(24); fs.readSync(fd, b, 0, 24, 0); fs.closeSync(fd);
    if (b.readUInt32BE(0) !== 0x89504e47 || b.toString('ascii', 12, 16) !== 'IHDR') return null;
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  } catch (e) { return null; }
}
const num = (a, n) => Array.isArray(a) && a.length === n && a.every(x => typeof x === 'number' && isFinite(x));

/** validate a pack folder: { name, errors: [], warnings: [], ok: [ids that will draw] } */
function validate(dir) {
  const HB = loadSpec(), out = { name: path.basename(dir), errors: [], warnings: [], ok: [] };
  const E = (m) => out.errors.push(m), W = (m) => out.warnings.push(m);
  let pack;
  try { pack = JSON.parse(fs.readFileSync(path.join(dir, 'pack.json'), 'utf8')); } catch (e) { E(`pack.json: ${e.message}`); return out; }
  if (pack.schemaVersion !== 1) W(`schemaVersion should be 1 (got ${pack.schemaVersion})`);
  if (pack.name && pack.name !== out.name) E(`"name" is "${pack.name}" but the folder is "${out.name}": the game loads packs by folder name`);
  const list = Array.isArray(pack.assets) ? pack.assets.map(a => [a && a.id, a]) : Object.entries(pack.assets || {});
  const seen = new Set();
  for (const [id, def] of list) {
    if (!id) { E('an asset has no id'); continue; }
    if (seen.has(id)) { E(`duplicate id ${id}: only the first is used`); continue; }
    seen.add(id);
    const fam = HB.mapSpecFamily(id);
    if (!fam) { E(`unknown id ${id} (see docs/map-art/CATALOG.md for the ids)`); continue; }
    const vs = (def && def.variants) || [];
    if (!vs.length) { E(`${id}: no variants`); continue; }
    let good = 0;
    vs.forEach((v, i) => {
      const where = `${id} variant ${v && v.id !== undefined ? v.id : i}`, before = out.errors.length;
      if (fam.spec.layer === 'wash') { washVariant(dir, fam, v, where, E, W); if (out.errors.length === before) good++; return; }
      if (!v || typeof v.src !== 'string') { E(`${where}: missing "src"`); return; }
      if (v.rect && !num(v.rect, 4)) { E(`${where}: "rect" must be [x, y, width, height]`); return; }
      const size = v.rect ? [v.rect[2], v.rect[3]] : v.sourceSize;
      if (!num(size, 2) || size[0] <= 0 || size[1] <= 0) { E(`${where}: "sourceSize" must be [width, height]`); return; }
      if (!num(v.logicalSize, 2) || v.logicalSize[0] <= 0 || v.logicalSize[1] <= 0) { E(`${where}: "logicalSize" must be [width, height] > 0`); return; }
      if (!num(v.anchorPx, 2) || v.anchorPx[0] < 0 || v.anchorPx[1] < 0 || v.anchorPx[0] > size[0] || v.anchorPx[1] > size[1]) { E(`${where}: "anchorPx" ${JSON.stringify(v.anchorPx)} is not inside the ${size[0]}×${size[1]} frame`); return; }
      if (v.contentBoundsPx && (!num(v.contentBoundsPx, 4) || v.contentBoundsPx[0] < 0 || v.contentBoundsPx[1] < 0 || v.contentBoundsPx[0] + v.contentBoundsPx[2] > size[0] || v.contentBoundsPx[1] + v.contentBoundsPx[3] > size[1])) W(`${where}: "contentBoundsPx" lies outside the frame`);
      const uniform = !v.allowStretch && Math.abs((v.logicalSize[0] / v.logicalSize[1]) / (size[0] / size[1]) - 1) > 0.03;
      if (uniform) W(`${where}: logicalSize ${v.logicalSize.join('×')} has a different aspect from the frame ${size.join('×')}; the game keeps the frame's aspect (set allowStretch to stretch)`);
      if (fam.spec.layer === 'terrain') {
        const t = HB.mapTerrainReach(fam.spec, v.logicalSize, size, v.anchorPx, uniform);
        if (!t.ok) E(`${where}: reaches ${t.cells.toFixed(2)} cells from its anchor at its largest size; terrain may reach ${t.limit} (shrink logicalSize or move the anchor)`);
      }
      if (v.sampling && v.sampling !== 'smooth' && v.sampling !== 'pixel') W(`${where}: sampling "${v.sampling}" is not smooth or pixel; smooth is used`);
      if (v.layer && v.layer !== fam.spec.layer) W(`${where}: layer "${v.layer}" differs from the family's "${fam.spec.layer}"; the family's layer is used`);
      const file = /^assets\//.test(v.src) ? path.join(root, v.src) : path.join(dir, v.src);
      if (/^(https?:|data:)/.test(v.src)) W(`${where}: remote or inline image not checked`);
      else {
        const dim = pngSize(file);
        if (!fs.existsSync(file)) E(`${where}: ${path.relative(root, file)} does not exist`);
        else if (!dim) E(`${where}: ${path.relative(root, file)} is not a PNG`);
        else if (v.rect ? (v.rect[0] + v.rect[2] > dim[0] || v.rect[1] + v.rect[3] > dim[1]) : (dim[0] !== size[0] || dim[1] !== size[1])) E(`${where}: ${path.basename(file)} is ${dim.join('×')}, which does not match ${v.rect ? 'rect ' + v.rect.join(',') : 'sourceSize ' + size.join('×')}`);
      }
      for (const key of ['occlusionMask', 'tintMask']) if (typeof v[key] === 'string') { const mf = path.join(dir, v[key]), md = pngSize(mf); if (!md) E(`${where}: ${key} ${v[key]} is missing or not a PNG`); else if (!v.rect && (md[0] !== size[0] || md[1] !== size[1])) W(`${where}: ${key} is ${md.join('×')}, not ${size.join('×')}`); }
      // ink discovery masks (docs/map-art/INK_AND_WASH.md): the art file's size, pixel for pixel; a bad one falls back to a derived mask
      const art = pngSize(file);
      for (const key of ['inkMask', 'revealMask']) if (v[key] !== undefined) {
        if (typeof v[key] !== 'string') { W(`${where}: ${key} must be a file path`); continue; }
        const mf = /^assets\//.test(v[key]) ? path.join(root, v[key]) : path.join(dir, v[key]), md = pngSize(mf);
        if (!md) W(`${where}: ${key} ${v[key]} is missing or not a PNG; the engine derives it from the art`);
        else if (art && (md[0] !== art[0] || md[1] !== art[1])) W(`${where}: ${key} is ${md.join('×')} but the art file is ${art.join('×')}; the engine derives it from the art`);
      }
      if (v.inkEntryPx !== undefined && (!num(v.inkEntryPx, 2) || v.inkEntryPx[0] < 0 || v.inkEntryPx[1] < 0 || v.inkEntryPx[0] > size[0] || v.inkEntryPx[1] > size[1])) W(`${where}: inkEntryPx must be [x, y] inside the frame; ignored`);
      if (v.attach && v.attach.flag && !num(v.attach.flag, 2)) W(`${where}: attach.flag must be [x, y] in source pixels`);
      if (v.labelOffset && !num(v.labelOffset, 2)) W(`${where}: labelOffset must be [x, y] in logical px`);
      if (out.errors.length === before) good++;
    });
    if (good) out.ok.push(id);
  }
  return out;
}
/** a watercolour variant: tileable coverage/pooling/hue textures (map.wash.<path>) or a bloom order mask (map.wash.bloom) */
function washVariant(dir, fam, v, where, E, W) {
  const file = (f) => /^assets\//.test(f) ? path.join(root, f) : path.join(dir, f);
  if (!v || typeof v !== 'object') { E(`${where}: not an object`); return; }
  if (fam.spec.kind === 'bloom') {
    if (typeof v.src !== 'string' || !num(v.sourceSize, 2)) { E(`${where}: a bloom mask needs "src" and "sourceSize"`); return; }
    if (v.sourceSize[0] !== v.sourceSize[1]) { E(`${where}: a bloom mask must be square (sourceSize ${v.sourceSize.join('×')})`); return; }
    if (![256, 512].includes(v.sourceSize[0])) W(`${where}: bloom masks are meant to be 256 or 512 px`);
    if (v.span !== undefined && !(v.span > 0)) W(`${where}: "span" must be a number > 0; 2.5 is used`);
    const d = pngSize(file(v.src));
    if (!d) E(`${where}: ${v.src} is missing or not a PNG`);
    else if (d[0] !== v.sourceSize[0] || d[1] !== v.sourceSize[1]) E(`${where}: ${v.src} is ${d.join('×')}, not ${v.sourceSize.join('×')}`);
    return;
  }
  if (typeof v.coverage !== 'string') { E(`${where}: a wash needs "coverage"`); return; }
  if (!num(v.size, 2) || v.size[0] !== v.size[1] || v.size[0] <= 0 || (v.size[0] & (v.size[0] - 1))) { E(`${where}: "size" must be square and a power of two (256, 512, 1024)`); return; }
  if (v.cellsPerTile !== undefined && !(v.cellsPerTile > 0)) W(`${where}: "cellsPerTile" must be a number > 0; 8 is used`);
  for (const key of ['coverage', 'pooling', 'hue']) if (v[key] !== undefined) {
    if (typeof v[key] !== 'string') { E(`${where}: ${key} must be a file path`); continue; }
    const d = pngSize(file(v[key]));
    if (!d) (key === 'coverage' ? E : W)(`${where}: ${key} ${v[key]} is missing or not a PNG`);
    else if (d[0] !== v.size[0] || d[1] !== v.size[1]) E(`${where}: ${key} is ${d.join('×')}, not ${v.size.join('×')} (all files of a variant share its "size")`);
  }
}
/** pack.json → pack.js (a classic script the game can load from file://) */
function writePackJs(dir) {
  const json = fs.readFileSync(path.join(dir, 'pack.json'), 'utf8').trim();
  fs.writeFileSync(path.join(dir, 'pack.js'), `/* Generated from pack.json by tools/mappack.js: edit pack.json, then run node tools/mappack.js ${path.basename(dir)} */\nHB.mapAssets && HB.mapAssets.definePack(${json}, ${JSON.stringify(path.basename(dir))});\n`);
}
module.exports = { validate, writePackJs, pngSize };

if (require.main === module) {
  const arg = process.argv[2];
  if (!arg) { console.log('usage: node tools/mappack.js <pack name|folder> [--check]'); process.exit(2); }
  const dir = fs.existsSync(arg) ? path.resolve(arg) : path.join(root, 'assets/map/packs', arg);
  const r = validate(dir);
  for (const e of r.errors) console.log('error:  ' + e);
  for (const w of r.warnings) console.log('warning: ' + w);
  console.log(`${r.name}: ${r.ok.length} id(s) will draw (${r.ok.join(', ') || 'none'}); ${r.errors.length} error(s), ${r.warnings.length} warning(s)`);
  if (!process.argv.includes('--check') && fs.existsSync(path.join(dir, 'pack.json'))) { writePackJs(dir); console.log('wrote ' + path.relative(root, path.join(dir, 'pack.js'))); }
  process.exitCode = r.errors.length ? 1 : 0;
}
