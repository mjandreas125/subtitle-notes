// Walks the promo film one frame at a time and writes a PNG per frame.
//
//   node tools/render-film.mjs <lang> <outDir> [fps] [duration]
//
// The page declares every animation paused and seeks it with a negative delay,
// so `FILM.seek(t)` is the whole clock: frame n is a pure function of n/fps and
// nothing depends on how fast this machine happens to be. That is the only
// reason a headless browser can be used as a renderer at all - screencasting a
// page that animates in real time drops frames on any busy laptop.

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const [lang = 'en', outDir = 'frames', fps = '30', duration = '38.8'] = process.argv.slice(2);
const FPS = Number(fps);
const FRAMES = Math.round(Number(duration) * FPS);
const PORT = 9500 + (lang === 'ru' ? 1 : 0);
const PROFILE = `C:/Users/andre/AppData/Local/Temp/claude/film-profile-${lang}`;
const PAGE = 'file:///D:/LiisbetSystem/vlc_subtitle_translator/release_package/promo/film.html'
  + `?lang=${lang}&t=0`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
rmSync(PROFILE, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--force-device-scale-factor=1', '--window-size=1920,1080',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE,
  '--no-first-run', '--no-default-browser-check',
  PAGE,
], { stdio: 'ignore' });

let targets = null;
for (let i = 0; i < 60 && !targets; i++) {
  await wait(300);
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch { /* not up yet */ }
}
if (!targets) throw new Error('Chrome did not open a debugging port');

const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
};
const call = (method, params) => new Promise((res) => {
  const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params }));
});

// Belt and braces: a headless Chrome reports "reduce" for prefers-reduced-motion,
// and the page already exempts itself, but saying so here costs nothing.
await call('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
});
await call('Emulation.setDeviceMetricsOverride', {
  width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false,
});

// Fonts have to have settled before the first frame, or frame 0 is the
// fallback face and frame 1 is not.
for (let i = 0; i < 40; i++) {
  const r = await call('Runtime.evaluate', { expression: 'document.fonts.status', returnByValue: true });
  if (r?.result?.value === 'loaded') break;
  await wait(150);
}

const started = Date.now();
for (let n = 0; n < FRAMES; n++) {
  const t = n / FPS;
  await call('Runtime.evaluate', { expression: `FILM.seek(${t})` });
  const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(resolve(outDir, String(n).padStart(5, '0') + '.png'), Buffer.from(shot.data, 'base64'));
  if (n % 60 === 0 || n === FRAMES - 1) {
    const done = n + 1;
    const rate = done / ((Date.now() - started) / 1000);
    process.stdout.write(`\r${lang}: ${done}/${FRAMES} frames  ${rate.toFixed(1)}/s  `
      + `eta ${Math.round((FRAMES - done) / rate)}s   `);
  }
}
process.stdout.write('\n');
chrome.kill();
process.exit(0);
