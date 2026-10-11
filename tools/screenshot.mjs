#!/usr/bin/env node
/* Headless screenshot / scripted-run tool using the preinstalled Playwright Chromium.
 * Usage: node tools/screenshot.mjs <out.png> [jsToRunBeforeShot] [--wait=ms] [--url=path?query] [--w=1280 --h=720]
 * The JS string runs in the page after HB.ready; it may return a Promise.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve playwright from the project, then from common global install locations.
function loadPlaywright() {
  const candidates = [path.resolve(__dirname, '..') + '/', '/opt/node-tools/node_modules/', '/opt/node22/lib/node_modules/', '/usr/lib/node_modules/', '/usr/local/lib/node_modules/'];
  for (const c of candidates) { try { return createRequire(c.endsWith('/') ? c : c + '/')('playwright'); } catch (e) { /* try next */ } }
  throw new Error('playwright not found; run `npm i -D playwright` or set a global install');
}
const { chromium } = loadPlaywright();
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const out = args.find(a => !a.startsWith('--') && a.endsWith('.png')) || 'shot.png';
const js = args.find(a => !a.startsWith('--') && !a.endsWith('.png')) || '';
const opt = (name, def) => { const a = args.find(x => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : def; };
const wait = Number(opt('wait', 600));
const urlPath = opt('url', 'index.html?debug=1');
const W = Number(opt('w', 1280)), H = Number(opt('h', 720));
const port = Number(opt('port', 8765 + Math.floor(Math.random() * 200)));

const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 500));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', m => { const t = `[${m.type()}] ${m.text()}`; logs.push(t); if (m.type() === 'error' || m.type() === 'warning') console.log(t); });
page.on('pageerror', e => { console.log('[pageerror]', e.message); logs.push('[pageerror] ' + e.message); });
try {
  await page.goto(`http://127.0.0.1:${port}/${urlPath}`, { waitUntil: 'load' });
  await page.waitForFunction(() => globalThis.HB && HB.ready === true, null, { timeout: 15000 });
  if (js) {
    const result = await page.evaluate(async (code) => { const f = new Function('return (async () => { ' + code + ' })()'); return await f(); }, js);
    if (result !== undefined) console.log('result:', typeof result === 'object' ? JSON.stringify(result).slice(0, 4000) : result);
  }
  await page.waitForTimeout(wait);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  await page.screenshot({ path: out });
  const err = await page.evaluate(() => (HB.app && HB.app.lastError) ? String(HB.app.lastError.stack || HB.app.lastError) : null);
  if (err) console.log('[runtime error]', err);
  console.log('saved', out);
} catch (e) {
  console.error('FAILED', e.message);
  console.log(logs.slice(-20).join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
  server.kill();
}
