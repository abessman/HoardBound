/* Doc checks: size budgets (docs stay small), broken links and paths, and the six sections every system doc has.
 * Usage: node tools/docscheck.js   (exit code 1 if anything fails) */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const rel = (p) => path.relative(root, p);
let fails = 0;
const fail = (msg) => { fails++; console.log('  FAIL:', msg); };

const BUDGETS = [
  ['CLAUDE.md', 90], ['next_chat_kickoff.md', 90], ['DESIGN.md', 120],
  ['src/game/CLAUDE.md', 60], ['src/views/CLAUDE.md', 60], ['src/art/CLAUDE.md', 60], ['src/world/CLAUDE.md', 60], ['src/data/CLAUDE.md', 60], ['tools/CLAUDE.md', 60],
];
const SYSTEM_SECTIONS = ['## Intent', '## How it works', '## Code', '## Tests', '## Known issues and tuning', '## Related'];
const SYSTEM_BUDGET = 160;

const lines = (f) => fs.readFileSync(f, 'utf8').split('\n').length;
const exists = (p) => fs.existsSync(p);

console.log('sizes');
for (const [f, max] of BUDGETS) {
  const p = path.join(root, f);
  if (!exists(p)) { fail(`${f} is missing`); continue; }
  const n = lines(p); console.log(`  ${f.padEnd(28)} ${String(n).padStart(4)} / ${max}`);
  if (n > max) fail(`${f} has ${n} lines (budget ${max}): split it or move detail into docs/systems/`);
}
const sysDir = path.join(root, 'docs/systems');
const systems = exists(sysDir) ? fs.readdirSync(sysDir).filter(f => f.endsWith('.md')) : [];
if (!systems.length) fail('no docs/systems/*.md');
for (const f of systems) {
  const p = path.join(sysDir, f), text = fs.readFileSync(p, 'utf8'), n = text.split('\n').length;
  console.log(`  docs/systems/${f.padEnd(15)} ${String(n).padStart(4)} / ${SYSTEM_BUDGET}`);
  if (n > SYSTEM_BUDGET) fail(`docs/systems/${f} has ${n} lines (budget ${SYSTEM_BUDGET})`);
  for (const h of SYSTEM_SECTIONS) if (!text.split('\n').some(l => l.trim() === h)) fail(`docs/systems/${f} lacks "${h}"`);
}

console.log('links');
const mdFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.md')) mdFiles.push(p);
  }
})(root);
let checked = 0;
for (const f of mdFiles) {
  const text = fs.readFileSync(f, 'utf8');
  // markdown links, relative to the file
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1].split('#')[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    checked++;
    if (!exists(path.resolve(path.dirname(f), target))) fail(`${rel(f)} links to missing ${m[1]}`);
  }
  // backticked repo paths (from the repo root) in the guide files
  if (/CLAUDE\.md$|next_chat_kickoff\.md$/.test(f)) {
    for (const m of text.matchAll(/`([A-Za-z0-9_\-./]+\/[A-Za-z0-9_\-.]+\.(?:md|js|mjs|html|json))`/g)) {
      checked++;
      if (!exists(path.join(root, m[1]))) fail(`${rel(f)} mentions missing ${m[1]}`);
    }
  }
}
console.log(`  ${checked} links and paths checked in ${mdFiles.length} files`);
console.log(fails ? `\n${fails} doc problem(s)` : '\ndocs ok');
process.exit(fails ? 1 : 0);
