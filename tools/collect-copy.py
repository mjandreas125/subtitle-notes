# -*- coding: utf-8 -*-
"""Every user-facing string in the product, in one file, per language.

    python tools/collect-copy.py

Writes `docs/copy-review/strings.json` and one readable `<lang>.md` per
language beside it. Nothing is edited: this only reads, so it can be re-run
after a review to see what changed.

The strings live in six places, in five different formats, because each part
of the product needs them at a different time - a Chrome extension wants
`_locales`, a Worker wants a TypeScript object, Flutter wants a const map. A
reviewer should not have to know any of that, which is what this is for.
"""

from __future__ import annotations

import glob
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'copy-review')


def read(path: str) -> str:
    return io.open(os.path.join(ROOT, path), encoding='utf-8').read()


def unescape_js(value: str) -> str:
    return (value.replace("\\'", "'").replace('\\"', '"')
                 .replace('\\\\', '\\').replace('\\n', '\n'))


def unescape_dart(value: str) -> str:
    return unescape_js(value).replace('\\$', '$')


def blocks(text: str, opener: str, indent: str) -> dict[str, str]:
    """The `lang: { ... }` sections of an object literal, as raw text."""
    found = {}
    start = text.index(opener)
    pattern = re.compile('^' + indent + '[\'"]?(\\w+)[\'"]?: \\{$', re.M)
    for match in pattern.finditer(text, start):
        end = text.index('\n' + indent + '},', match.end())
        found[match.group(1)] = text[match.end():end]
    return found


def pairs_js(block: str) -> dict[str, str]:
    out = {}
    for key, value in re.findall(r"(\w+): '((?:[^'\\]|\\.)*)'", block):
        out[key] = unescape_js(value)
    return out


def pairs_dart(block: str) -> dict[str, str]:
    out = {}
    for key, value in re.findall(r"'((?:[^'\\]|\\.)*)': '((?:[^'\\]|\\.)*)'", block):
        out[unescape_dart(key)] = unescape_dart(value)
    return out


def pairs_python(block: str) -> dict[str, str]:
    out = {}
    for key, value in re.findall(r'"([^"\\]*)": "((?:[^"\\]|\\.)*)"', block):
        out[key] = value.replace('\\"', '"').replace('\\\\', '\\')
    return out


surfaces: dict[str, dict[str, dict[str, str]]] = {}

# 1. the front page
home = read('cloud_api/src/home.ts')
surfaces['site-home'] = {lang: pairs_js(block)
                         for lang, block in blocks(home, 'const HOME_TEXT', '  ').items()}

# 2. the sign-in / pairing page
index = read('cloud_api/src/index.ts')
link = {}
for match in re.finditer(r"^  (\w+): \{ (title: .*?) \},$", index, re.M):
    link[match.group(1)] = pairs_js(match.group(2))
surfaces['site-link'] = link

# 3. the web library
library = read('cloud_api/src/library.ts')
surfaces['site-library'] = {lang: pairs_js(block)
                            for lang, block in blocks(library, 'const SAY', '  ').items()}

# 4. the browser extension
extension = {}
for path in sorted(glob.glob(os.path.join(ROOT, 'extension', '_locales', '*', 'messages.json'))):
    lang = os.path.basename(os.path.dirname(path))
    data = json.load(io.open(path, encoding='utf-8'))
    extension[lang] = {key: value['message'] for key, value in data.items()}
surfaces['extension'] = extension

# 5. the phone and Windows app
i18n = read('mobile/lib/i18n.dart')
surfaces['app'] = {lang: pairs_dart(block)
                   for lang, block in blocks(i18n, 'static const _values', '    ').items()}

# 6. the background helpers on Windows
desktop = read('desktop_i18n.py')
surfaces['desktop'] = {lang: pairs_python(block)
                       for lang, block in blocks(desktop, '_TEXT: dict', '    ').items()}

os.makedirs(OUT, exist_ok=True)
with io.open(os.path.join(OUT, 'strings.json'), 'w', encoding='utf-8', newline='\n') as handle:
    json.dump(surfaces, handle, ensure_ascii=False, indent=2, sort_keys=True)
    handle.write('\n')

languages = sorted({lang for surface in surfaces.values() for lang in surface})
english = {name: surface.get('en', {}) for name, surface in surfaces.items()}

for lang in languages:
    lines = ['# ' + lang, '',
             'Left: the English the key stands for. Right: what this language says.',
             'Empty English means the key is its own source text.', '']
    for name in sorted(surfaces):
        block = surfaces[name].get(lang)
        if not block:
            continue
        lines.append('## ' + name + '  (' + str(len(block)) + ')')
        lines.append('')
        lines.append('| key | English | ' + lang + ' |')
        lines.append('|---|---|---|')
        for key, value in block.items():
            source = english[name].get(key, key if name == 'app' else '')
            cell = lambda text: str(text).replace('|', '\\|').replace('\n', ' ')
            lines.append('| ' + cell(key)[:60] + ' | ' + cell(source) + ' | ' + cell(value) + ' |')
        lines.append('')
    with io.open(os.path.join(OUT, lang + '.md'), 'w', encoding='utf-8', newline='\n') as handle:
        handle.write('\n'.join(lines))

# Which languages are missing which keys. The extension has a check that keeps
# its files in step; nothing keeps the other five in step, and a missing key
# means the reader silently gets English.
gaps = ['# Missing keys', '',
        'A key one language has and another does not. The reader of the second',
        'one gets English there, silently. `app` is measured against every key',
        'any language uses, because its keys are the English text itself.', '']
for name in sorted(surfaces):
    every = set()
    for lang, block in surfaces[name].items():
        # `app.en` exists only to override four strings an English reader must
        # not be shown as-is; those are not keys the other languages owe.
        if name == 'app' and lang == 'en':
            continue
        every |= set(block)
    # The English block of `app` deliberately holds only the four strings that
    # an English reader must not be shown as-is; it is not a gap.
    reference = {lang: every - set(block)
                 for lang, block in surfaces[name].items()
                 if not (name == 'app' and lang == 'en')}
    missing = {lang: keys for lang, keys in reference.items() if keys}
    gaps.append('## ' + name)
    gaps.append('')
    if not missing:
        gaps.append('Every language has every key.')
        gaps.append('')
        continue
    for lang, keys in sorted(missing.items()):
        gaps.append('- **' + lang + '** misses ' + str(len(keys)) + ':')
        for key in sorted(keys)[:40]:
            gaps.append('  - `' + key.replace('`', "'")[:90] + '`')
        if len(keys) > 40:
            gaps.append('  - ... and ' + str(len(keys) - 40) + ' more')
    gaps.append('')

with io.open(os.path.join(OUT, 'gaps.md'), 'w', encoding='utf-8', newline='\n') as handle:
    handle.write('\n'.join(gaps) + '\n')

total = sum(len(block) for surface in surfaces.values() for block in surface.values())
print('languages:', len(languages))
for name in sorted(surfaces):
    counts = {lang: len(block) for lang, block in surfaces[name].items()}
    sizes = sorted(set(counts.values()))
    print(f'  {name:14} {len(counts)} languages, {sizes} strings each')
print('strings in total:', total)
print('written to docs/copy-review/')
