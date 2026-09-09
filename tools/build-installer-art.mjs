// The setup wizard's side panel, one image per language.
//
//   node tools/build-installer-art.mjs
//
// Out:
//   installer/side/<lang>.bmp    164x314, 24-bit, one per language
//   installer/wizard-side.bmp    the English one, which the [Setup] directive
//                                names and which a language without an image
//                                falls back to
//
// The sentence on the panel is the landing page's own headline, read out of
// cloud_api/src/home.ts. That is deliberate: the wizard used to carry a
// Russian sentence baked into a bitmap while its buttons spoke English, and
// the way to make that impossible again is to have no second place where the
// sentence is written down.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, copyFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(import.meta.dirname, '..');
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const FFMPEG = 'C:/Users/andre/AppData/Local/Microsoft/WinGet/Packages'
  + '/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin/ffmpeg.exe';
const PAGE = 'file:///' + ROOT.replace(/\\/g, '/') + '/installer/wizard-side.html';

/** Every `h1:` in the landing page's dictionary, by language. */
function headlines() {
  const source = readFileSync(join(ROOT, 'cloud_api', 'src', 'home.ts'), 'utf8');
  const blocks = [...source.matchAll(/[\r\n]  ([a-zA-Z_]+): \{/g)];
  const found = new Map();
  blocks.forEach((block, i) => {
    const from = block.index + block[0].length;
    const to = i + 1 < blocks.length ? blocks[i + 1].index : source.length;
    const body = source.slice(from, to);
    const at = body.indexOf("h1: '");
    if (at < 0) return;
    const end = body.indexOf("',", at + 5);
    found.set(block[1], body.slice(at + 5, end).replace(/\\'/g, "'"));
  });
  return found;
}

const out = join(ROOT, 'installer', 'side');
const raw = join(tmpdir(), 'subtitle-notes-installer-art');
mkdirSync(out, { recursive: true });
mkdirSync(raw, { recursive: true });

for (const [lang, text] of headlines()) {
  const png = join(raw, `${lang}.png`);
  const bmp = join(out, `${lang}.bmp`);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--window-size=164,314',
    '--virtual-time-budget=3000',
    '--screenshot=' + png,
    `${PAGE}?t=${encodeURIComponent(text)}`,
  ], { stdio: 'ignore' });
  // Inno reads plain 24-bit BMP; a PNG or an alpha channel is refused.
  execFileSync(FFMPEG, ['-v', 'error', '-y', '-i', png, '-pix_fmt', 'bgr24', bmp],
    { stdio: 'inherit' });
  console.log(`installer/side/${lang}.bmp  ${text}`);
}

copyFileSync(join(out, 'en.bmp'), join(ROOT, 'installer', 'wizard-side.bmp'));
console.log('installer/wizard-side.bmp  <- en.bmp');
rmSync(raw, { recursive: true, force: true });
