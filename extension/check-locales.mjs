// Every string the extension asks for, checked against every language it ships.
//
//   node extension/check-locales.mjs
//
// A missing key is invisible in testing — Chrome quietly returns an empty
// string, and the button it belonged to simply has no label in Polish. This
// reads the keys out of the code and the markup instead of trusting a list.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const localesDir = join(here, '_locales');
const languages = readdirSync(localesDir);

const messages = new Map();
for (const code of languages) {
  messages.set(code, JSON.parse(readFileSync(join(localesDir, code, 'messages.json'), 'utf8')));
}

const wanted = new Set();
for (const name of readdirSync(here)) {
  if (!name.endsWith('.js') && !name.endsWith('.html') && !name.endsWith('.json')) continue;
  if (name === 'check-locales.mjs') continue;
  const source = readFileSync(join(here, name), 'utf8');
  // t('key'), chrome.i18n.getMessage('key'), data-i18n="key", __MSG_key__
  for (const match of source.matchAll(/\bt\(\s*'([A-Za-z0-9_]+)'/g)) wanted.add(match[1]);
  for (const match of source.matchAll(/getMessage\(\s*'([A-Za-z0-9_]+)'/g)) wanted.add(match[1]);
  for (const match of source.matchAll(/data-i18n="([A-Za-z0-9_]+)"/g)) wanted.add(match[1]);
  for (const match of source.matchAll(/__MSG_([A-Za-z0-9_]+)__/g)) wanted.add(match[1]);
}

let problems = 0;
for (const key of [...wanted].sort()) {
  const missing = languages.filter((code) => !messages.get(code)[key]);
  if (missing.length) {
    problems += 1;
    console.log(`${key.padEnd(24)} missing in ${missing.join(', ')}`);
  }
}

// The other direction: a key nobody asks for any more is dead weight in twelve
// files, and the next person has no way to tell it apart from a live one.
const english = messages.get('en') ?? {};
const unused = Object.keys(english).filter((key) => !wanted.has(key) && key !== 'appDescription');
if (unused.length) console.log(`\nnot referenced anywhere: ${unused.join(', ')}`);

console.log(`\n${wanted.size} keys, ${languages.length} languages, ${problems} gaps`);
process.exit(problems ? 1 : 0);
