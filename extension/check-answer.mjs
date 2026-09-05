// Which of the server's two answers the card shows.
//
//   node extension/check-answer.mjs
//
// The worker answers a selection twice: `translation` is what the reader
// highlighted, `focus_translation` is the expression it narrowed a long
// selection down to. Reading the second one over the first is how a phrase
// came up translated and then turned into a single word a second later, so it
// is worth a check that does not need a browser, a session or a server.

import fs from 'fs';

const source = fs.readFileSync(new URL('./capture.js', import.meta.url), 'utf8');
const start = source.indexOf('function answerFor(');
const end = source.indexOf('\n  }', start) + 4;
if (start < 0) {
  console.error('answerFor is gone from capture.js');
  process.exit(1);
}
const answerFor = new Function(`${source.slice(start, end)} return answerFor;`)();

const cases = [
  {
    what: 'a phrase is answered as the phrase, not as a word out of it',
    text: 'made her out to be a hero',
    info: { translation: 'выставили её героем', focus_translation: 'выставили' },
    want: 'выставили её героем',
  },
  {
    what: 'a whole sentence keeps the sentence',
    text: 'The word you did not know, where you met it.',
    info: { translation: 'Слово, которого вы не знали, там, где вы его встретили.', focus_translation: 'встретили' },
    want: 'Слово, которого вы не знали, там, где вы его встретили.',
  },
  {
    what: 'one word gets the sense it has in its line',
    text: 'record',
    info: { translation: 'никому не нужна судимость', focus_translation: 'судимость' },
    want: 'судимость',
  },
  {
    what: 'one word with no contextual answer falls back to the line',
    text: 'record',
    info: { translation: 'судимость', focus_translation: '' },
    want: 'судимость',
  },
  {
    what: 'a phrase with no phrase answer falls back to the narrowed one',
    text: 'made her out',
    info: { translation: '', focus_translation: 'выставили' },
    want: 'выставили',
  },
  {
    what: 'surrounding spaces do not turn one word into several',
    text: '  record  ',
    info: { translation: 'никому не нужна судимость', focus_translation: 'судимость' },
    want: 'судимость',
  },
];

let bad = 0;
for (const { what, text, info, want } of cases) {
  const got = answerFor(info, text);
  const ok = got === want;
  if (!ok) bad += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}   ${what}`);
  if (!ok) console.log(`         wanted ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
}

console.log(bad ? `\n${bad} of ${cases.length} wrong` : `\nall ${cases.length} answer checks passed`);
process.exit(bad ? 1 : 0);
