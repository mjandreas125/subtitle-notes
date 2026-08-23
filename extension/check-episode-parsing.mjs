// The two pure functions behind "which episode is this".
//
//   node extension/check-episode-parsing.mjs
//
// They decide what a card says it came from, and they are the part that can go
// wrong quietly: a quality selector reading "1080p" inside a div called
// "episode-controls" used to be filed as episode 108. Everything here is a case
// that has been seen on a real site or is one keystroke away from one.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, 'settings.js'), 'utf8');

// settings.js is a content script: it expects a page around it, but the two
// functions under test only need the language tables above them.
const sandbox = {
  chrome: { i18n: { getMessage: () => '' } },
  document: { querySelectorAll: () => [], querySelector: () => null, title: '' },
  window: {},
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const { snEpisodeFromText, snChosenNumber, snMediaTitle } = sandbox;

let failures = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures += 1;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${ok ? '' : `  got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`);
}

// ---- notations a player or a page title actually uses -----------------------
for (const [text, season, episode] of [
  ['Severance S2:E5 Trojan’s Horse', '2', '5'],
  ['Severance S02E05', '2', '5'],
  ['The Wire 3x07 - Back Burners', '3', '7'],
  ['Разделение — 2 сезон 5 серия', '2', '5'],
  ['Смотреть 12 серия 3 сезон онлайн', '3', '12'],
  ['Season 4, Episode 11', '4', '11'],
  ['Staffel 2 Folge 6', '2', '6'],
  ['2. hooaeg, 7. osa', '2', '7'],
  ['How 3 Phase Power Works', '', ''],
  ['Dune: Part Two', '', ''],
]) {
  expect(`text "${text}"`, snEpisodeFromText(text), { season, episode });
}

// ---- what a highlighted item in a list is allowed to mean -------------------
for (const [label, want] of [
  ['5 серия', '5'],
  ['Episode 7', '7'],
  ['Серия 12', '12'],
  ['S2', '2'],
  ['3', '3'],
  ['  Season 3  ', '3'],
  // The ones that must be refused: a quality, a codec, a running time, a
  // placeholder row, and anything with words still attached to it.
  ['1080p', ''],
  ['720p HD', ''],
  ['0', ''],
  ['x265', ''],
  ['English (5.1)', ''],
  ['Sound: 2 tracks', ''],
  ['', ''],
]) {
  expect(`chosen item "${label}"`, snChosenNumber(label), want);
}

// ---- the name the series is filed under -------------------------------------
// A page title is the series, the episode and an advertisement for the site.
// Only the first of those may become the name, or the same programme arrives in
// the library under a different heading every week.
for (const [pageTitle, want] of [
  ['Смотреть Разделение (2 сезон 5 серия) онлайн бесплатно — HDrezka', 'Разделение'],
  ['Severance S2:E5 Trojan Horse - Netflix', 'Severance'],
  ['The Wire - Season 3 Episode 7 - watch online', 'The Wire'],
  ['Разделение 2x05 в хорошем качестве', 'Разделение'],
  ['How 3 Phase Power Works - YouTube', 'How 3 Phase Power Works'],
  ['Blade Runner 2049', 'Blade Runner 2049'],
  ['Dune: Part Two', 'Dune: Part Two'],
]) {
  sandbox.document.title = pageTitle;
  expect(`title "${pageTitle}"`, snMediaTitle(), want);
}

console.log(failures ? `\n${failures} failed` : '\nall episode parsing checks passed');
process.exit(failures ? 1 : 0);
