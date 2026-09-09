// Builds every store asset from the two source pages, in every locale.
//
//   node tools/build-promo.mjs            everything
//   node tools/build-promo.mjs shots      just the screenshots (fast)
//   node tools/build-promo.mjs tiles      Chrome Web Store tile + marquee
//   node tools/build-promo.mjs film ru    just the Russian film
//   node tools/build-promo.mjs film en domain  film with a distinct output name
//
// Out:
//   release_package/store-<lang>/shot-1..5.png     1280x800, for the listing
//   release_package/store/tile-440x280.png         440x280, 24-bit PNG
//   release_package/store/marquee-1400x560.png     1400x560, 24-bit PNG
//   release_package/promo/subtitle-notes-<lang>.mp4  1920x1080, for YouTube
//
// The frames go to the system temp directory and are deleted afterwards: a
// forty-second film is about 1100 PNGs, and they have no business sitting in
// the repository.

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(import.meta.dirname, '..');
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const FFMPEG = 'C:/Users/andre/AppData/Local/Microsoft/WinGet/Packages'
  + '/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin/ffmpeg.exe';
const PAGES = 'file:///' + ROOT.replace(/\\/g, '/') + '/release_package/promo';
const LANGS = ['en', 'ru'];
const FPS = 30;
const DURATION = 27.45;   // STORY_END * RATE, as declared in film.html

const [what = 'all', onlyLang, suffix] = process.argv.slice(2);
const langs = onlyLang ? [onlyLang] : LANGS;
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit', cwd: ROOT });

/** The five listing screenshots, one headless Chrome per shot. */
function shots(lang) {
  const out = join(ROOT, 'release_package', `store-${lang}`);
  mkdirSync(out, { recursive: true });
  for (let n = 1; n <= 5; n++) {
    execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars',
      '--force-device-scale-factor=1', '--window-size=1280,800',
      '--virtual-time-budget=4000',
      '--screenshot=' + join(out, `shot-${n}.png`),
      `${PAGES}/shots.html?lang=${lang}&n=${n}`,
    ], { stdio: 'ignore' });
  }
  console.log(`shots: release_package/store-${lang}/shot-1..5.png`);
}

/** Chrome Web Store's two unlocalised listing images. */
function tiles() {
  const out = join(ROOT, 'release_package', 'store');
  const raw = join(tmpdir(), 'subtitle-notes-tiles');
  mkdirSync(out, { recursive: true });
  mkdirSync(raw, { recursive: true });

  const tile = join(raw, 'tile-440x280.png');
  const marquee = join(raw, 'marquee-1400x560.png');
  for (const [name, size, target] of [
    ['small', '440,280', tile],
    ['marquee', '1400,560', marquee],
  ]) {
    execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars',
      '--force-device-scale-factor=1', `--window-size=${size}`,
      '--virtual-time-budget=4000', `--screenshot=${target}`,
      `${PAGES}/tiles.html?n=${name}`,
    ], { stdio: 'ignore' });
  }

  // Store images must be JPEG or 24-bit PNG; Chrome's own screenshots are RGBA.
  for (const [source, target] of [
    [tile, join(out, 'tile-440x280.png')],
    [marquee, join(out, 'marquee-1400x560.png')],
  ]) {
    run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-pix_fmt', 'rgb24', target]);
  }
  rmSync(raw, { recursive: true, force: true });
  console.log('tiles: release_package/store/tile-440x280.png, marquee-1400x560.png');
}

/** The film: synthesise the sound, walk the frames, mux. */
function film(lang) {
  const build = join(ROOT, 'release_package', 'promo', 'build');
  mkdirSync(build, { recursive: true });
  const audio = join(build, 'audio.wav');
  if (!existsSync(audio)) run('python', [join('tools', 'promo-audio.py'), audio]);

  const frames = join(tmpdir(), `subtitle-notes-frames-${lang}`);
  run('node', [join('tools', 'render-film.mjs'), lang, frames, String(FPS), String(DURATION)]);

  const tag = suffix ? `-${suffix.replace(/[^a-z0-9-]/gi, '-')}` : '';
  const mp4 = join(ROOT, 'release_package', 'promo', `subtitle-notes-${lang}${tag}.mp4`);
  rmSync(mp4, { force: true });
  run(FFMPEG, [
    '-hide_banner', '-loglevel', 'warning',
    '-framerate', String(FPS), '-i', join(frames, '%05d.png'),
    '-i', audio,
    // What YouTube wants and what every player can open: High profile H.264,
    // 4:2:0, with the index at the front so it starts before it has finished
    // downloading.
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '17',
    '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '320k', '-ar', '48000',
    '-movflags', '+faststart', '-shortest', mp4,
  ]);
  rmSync(frames, { recursive: true, force: true });
  console.log(`film: ${mp4}`);
}

if (what === 'all' || what === 'tiles') tiles();
if (what === 'all' || what === 'shots' || what === 'film') {
  for (const lang of langs) {
    if (what === 'all' || what === 'shots') shots(lang);
    if (what === 'all' || what === 'film') film(lang);
  }
}
