// Shared defaults, loaded by every part of the extension.
//
// Content scripts and the worker are separate worlds with no imports between
// them, so this file is listed first everywhere and hangs one object off the
// global scope rather than exporting.

/// Every visible string comes from _locales, and Chrome picks the folder from
/// the browser's own language. Falling back to the key rather than an empty
/// string means a missing translation is obvious instead of invisible.
const t = (key, ...args) => {
  // An orphaned content script has no extension left to ask, and throwing here
  // would take the panel down with it.
  try {
    return chrome.i18n.getMessage(key, args.map(String)) || key;
  } catch (_) {
    return key;
  }
};

const SN_DEFAULTS = {
  /// Held while selecting — or pressed just after — saves without asking.
  hotkey: { ctrl: true, alt: true, shift: false, meta: false, key: '' },
  /// Where the panel appears: by the selection, or pinned to a corner.
  position: 'selection', // selection | top-left | top-right | bottom-left | bottom-right
  /// Remembered after the panel is dragged, per corner mode.
  offset: { x: 0, y: 0 },
  /// How long an instantly saved card stays on screen.
  hideAfter: 6,
  /// Pause a video when one of its subtitles is picked.
  pauseVideo: true,
  /// Make subtitles clickable on video sites.
  subtitles: true,
  /// Which keys turn the subtitle line into selectable text. Any combination,
  /// or none of them at all.
  ///
  /// Players own the mouse over their own captions: Playerjs lets you drag the
  /// line up and down, YouTube and Netflix pause on a click, everything has a
  /// settings menu for caption size. A layer that grabs the mouse takes all of
  /// that away, so by default it does not: hold the keys and the line becomes
  /// text, let go and the player has its mouse back.
  subtitleKey: { ctrl: true, alt: false, shift: false },
  /// Sites the extension keeps out of, one host per line.
  blocked: [],
  /// Where the player features are wanted: clickable subtitles and the space
  /// key. Empty means everywhere a player is recognised.
  ///
  /// A browser is not a video player. Everything in here takes over keys and
  /// captions on whatever page it is on, and on the other thousand pages a
  /// person visits that is an intrusion, not a feature - so it can be pointed
  /// at the two or three sites they actually watch films on.
  subtitleSites: [],
  /// Say the English word out loud when a card opens.
  speak: false,
  /// The short card: the meaning and nothing else.
  compactCard: true,
  /// Space reads the caption that is on screen.
  ///
  /// Off by default here, and on in VLC. In VLC space is the pause key and
  /// nothing else; in a browser it scrolls the page, plays the video, presses
  /// the button under the cursor and is typed into every comment box - and a
  /// translation window appearing on every one of those is the extension
  /// interrupting rather than helping.
  spaceLine: false,
  /// Whether what space translated is also kept.
  ///
  /// Reading a line and collecting a word are different acts: pausing on a
  /// sentence to see what it means should not quietly fill the library with
  /// whole subtitles. Someone who does want that can say so.
  spaceSaves: false,
};

function snMatchesHotkey(event, hotkey) {
  if (!hotkey.ctrl && !hotkey.alt && !hotkey.shift && !hotkey.meta && !hotkey.key) return false;
  return (
    Boolean(event.ctrlKey) === Boolean(hotkey.ctrl) &&
    Boolean(event.altKey) === Boolean(hotkey.alt) &&
    Boolean(event.shiftKey) === Boolean(hotkey.shift) &&
    Boolean(event.metaKey) === Boolean(hotkey.meta) &&
    (!hotkey.key || (event.key || '').toLowerCase() === hotkey.key.toLowerCase())
  );
}

const SN_KEY_LABELS = { ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift' };

/// The combination as an object, whichever shape it was saved in: earlier
/// builds stored one key as a word.
function snSubtitleKeys(settings) {
  const value = settings?.subtitleKey ?? { ctrl: true };
  if (typeof value === 'string') {
    return { ctrl: value === 'ctrl', alt: value === 'alt', shift: value === 'shift' };
  }
  return { ctrl: false, alt: false, shift: false, ...value };
}

/// Whether the keys that make subtitles selectable are down right now. Any
/// event carrying modifier state answers it — a key press, a mouse move, a
/// click — so the layer can arm itself without tracking presses by hand.
///
/// Every key in the combination has to be held; extra ones do no harm, which
/// is what lets Ctrl+Alt both select and save when selecting is set to Ctrl.
function snSubtitleKeyHeld(event, settings) {
  const keys = snSubtitleKeys(settings);
  if (!keys.ctrl && !keys.alt && !keys.shift) return true;
  return (
    (!keys.ctrl || Boolean(event.ctrlKey)) &&
    (!keys.alt || Boolean(event.altKey)) &&
    (!keys.shift || Boolean(event.shiftKey))
  );
}

function snSubtitleKeyLabel(settings) {
  const keys = snSubtitleKeys(settings);
  const parts = ['ctrl', 'alt', 'shift'].filter((name) => keys[name]).map((name) => SN_KEY_LABELS[name]);
  return parts.join(' + ');
}

function snHotkeyLabel(hotkey) {
  const parts = [];
  if (hotkey.ctrl) parts.push('Ctrl');
  if (hotkey.alt) parts.push('Alt');
  if (hotkey.shift) parts.push('Shift');
  if (hotkey.meta) parts.push('Win');
  if (hotkey.key) parts.push(hotkey.key.toUpperCase());
  return parts.length ? parts.join(' + ') : 'не задано';
}

async function snLoadSettings() {
  const stored = await chrome.storage.sync.get('settings');
  return { ...SN_DEFAULTS, ...(stored.settings ?? {}) };
}

/// A site as a name, out of whatever was pasted in.
///
/// People paste the address of the page they are watching, because that is
/// what is in front of them. "https://rezka.ag/series/drama/1234-severance/"
/// and "www.rezka.ag" and "rezka.ag" all mean the same site.
function snSiteKey(value) {
  let text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  text = text.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  text = text.split(/[/?#]/)[0];
  text = text.split('@').pop() || '';
  text = text.replace(/:\d+$/, '').replace(/^www\./, '');
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(text) ? text : '';
}

/// Whether a host is this site or a part of it. Naming rezka.ag covers
/// hdrezka.rezka.ag without anyone having to think about subdomains.
function snSiteMatches(rule, host) {
  const site = snSiteKey(host);
  return Boolean(rule && site && (site === rule || site.endsWith('.' + rule)));
}

/// Whether the player features belong on this page.
///
/// An empty list means every site: someone who has not named any is not asking
/// to be restricted, they simply have not been to the settings.
function snSiteAllowed(settings, host) {
  const wanted = (settings.subtitleSites ?? []).map(snSiteKey).filter(Boolean);
  return wanted.length === 0 || wanted.some((rule) => snSiteMatches(rule, host));
}

/// True when the extension should keep out of this page entirely.
function snBlocked(settings, host) {
  return (settings.blocked ?? []).some((entry) => {
    const rule = String(entry).trim().toLowerCase().replace(/^www\./, '');
    if (!rule) return false;
    const site = host.toLowerCase().replace(/^www\./, '');
    return site === rule || site.endsWith('.' + rule);
  });
}

// ---- which film, and which episode of it ------------------------------------
//
// A card that says only "Silo" is a card you cannot place: the same word turns
// up in the second episode and in the sixth, and the library shows one line for
// both. The player on screen always knows which episode is playing — it is what
// the viewer just clicked — so the page is asked rather than guessed at.

const SN_SEASON_WORD = '(?:seasons?|сезон[а-яё]*|hooaeg|staffel|saison|temporada|stagione|sezon[ua]?|säsong|kausi)';
const SN_EPISODE_WORD = '(?:episodes?|épisode|episodio|epizod|odcinek|сери[яию]|серій?|серія|folge|osa|avsnitt|jakso|bölüm|aflevering)';

/// Season and episode read off a line of words, by pairing each number with
/// the unit word next to it.
///
/// Anything simpler gets one of these wrong. Taking the number after the word
/// makes "2 сезон 5 серия" season five; taking the number before it makes
/// "Staffel 2 Folge 6" episode two. A number belongs to one unit, so each is
/// claimed once: whichever word reaches it first keeps it.
///
/// Word matching is fenced with letter lookarounds rather than `\b`, because
/// word boundaries are defined on the Latin alphabet — `\bсезон` never matches
/// at all — while a bare "osa" would otherwise be found inside "Rosa".
function snUnitNumbers(value) {
  const season = new RegExp('^' + SN_SEASON_WORD + '$', 'iu');
  const episode = new RegExp('^' + SN_EPISODE_WORD + '$', 'iu');
  const tokens = String(value || '').match(/\d{1,3}|[\p{L}]+/gu) ?? [];
  const claimed = new Set();
  const found = { season: '', episode: '' };

  /// The number beside this word, looking behind first — most languages that
  /// put the digits in front are the ones where the word carries a suffix, so
  /// a one- or two-letter token in between ("2-й сезон") is stepped over.
  const beside = (at) => {
    for (const step of [-1, 1]) {
      let index = at + step;
      if (step === -1 && /^[\p{L}]{1,2}$/u.test(tokens[index] ?? '')) index -= 1;
      const token = tokens[index];
      if (!token || claimed.has(index) || !/^\d{1,3}$/.test(token)) continue;
      const number = parseInt(token, 10);
      if (number <= 0) continue;
      claimed.add(index);
      return String(number);
    }
    return '';
  };

  tokens.forEach((token, index) => {
    if (!found.season && season.test(token)) found.season = beside(index);
    else if (!found.episode && episode.test(token)) found.episode = beside(index);
  });
  return found;
}

/// Season and episode read out of a piece of text, in the notations players
/// and file names actually use.
function snEpisodeFromText(value) {
  const text = String(value || '').replace(/\s+/g, ' ');
  const number = (raw) => (raw ? String(parseInt(raw, 10)) : '');
  let found = text.match(/\bS\s?(\d{1,2})\s*[:.\-\s]?\s*E\s?(\d{1,3})\b/i);
  if (found) return { season: number(found[1]), episode: number(found[2]) };
  found = text.match(/\b(\d{1,2})\s*[x×х]\s*(\d{1,3})\b/i);
  if (found) return { season: number(found[1]), episode: number(found[2]) };
  return snUnitNumbers(text);
}

const SN_CHOSEN = '.active, .selected, .current, .is-active, [aria-selected="true"], [aria-current="true"], [aria-current="page"]';

/// The number a chosen item stands for, or nothing.
///
/// "5 серия", "Episode 7", "S2" and a bare "3" are episode numbers. "1080p" is
/// not, and neither is "Sound: 2 tracks" — a list that merely has the word
/// "episode" somewhere in its class name will happily hand over the digits of
/// whatever else is highlighted inside it, and a card filed under episode 108
/// is worse than a card filed under no episode at all.
function snChosenNumber(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text || text.length > 40) return '';
  const bare = text
    .replace(new RegExp(SN_SEASON_WORD + '|' + SN_EPISODE_WORD, 'ig'), ' ')
    .replace(/[№#:.,\-–—]/g, ' ')
    .replace(/\b[se]\s*(?=\d)/i, '')
    .replace(/\s+/g, '')
    .trim();
  if (!/^\d{1,3}$/.test(bare)) return '';
  const number = parseInt(bare, 10);
  // Seasons and episodes are counted from one; a zero here is a page element
  // that happens to contain a digit.
  return number > 0 ? String(number) : '';
}

/// What the page itself says is playing.
///
/// Three ways, in order of how much each can be trusted: the attributes the
/// common player shells put on the episode they highlighted, the item marked as
/// chosen inside a list that calls itself seasons or episodes, and finally the
/// words on screen.
function snEpisodeFromPage() {
  // Playerjs shells — rezka and the sites that borrowed its markup — mark the
  // chosen episode with the numbers themselves, which beats reading labels.
  for (const node of document.querySelectorAll('[data-episode_id]')) {
    if (!node.matches(SN_CHOSEN)) continue;
    const episode = snChosenNumber(node.getAttribute('data-episode_id'));
    if (!episode) continue;
    const season =
      snChosenNumber(node.getAttribute('data-season_id')) ||
      snChosenNumber(document.querySelector('[data-tab_id].active')?.getAttribute('data-tab_id'));
    return { season, episode };
  }

  const result = { season: '', episode: '' };
  const naming = (node) =>
    `${node.id || ''} ${typeof node.className === 'string' ? node.className : ''} ${node.getAttribute('aria-label') || ''}`;
  const seasonWord = new RegExp(SN_SEASON_WORD, 'i');
  const episodeWord = new RegExp(SN_EPISODE_WORD, 'i');

  // A dropdown says what is chosen without any highlighting to interpret.
  for (const select of document.querySelectorAll('select')) {
    const label = `${naming(select)} ${select.name || ''}`;
    const number =
      snChosenNumber(select.selectedOptions?.[0]?.textContent) || snChosenNumber(select.value);
    if (!number) continue;
    if (!result.season && seasonWord.test(label)) result.season = number;
    if (!result.episode && episodeWord.test(label)) result.episode = number;
  }

  // A list of episodes with one of them highlighted. The item carries the
  // number and the list itself says whether it holds seasons or episodes.
  const lists = document.querySelectorAll(
    'ul, ol, nav, [class*="season" i], [class*="episode" i], [class*="serii" i], [id*="season" i], [id*="episode" i]',
  );
  for (const list of lists) {
    if (result.season && result.episode) break;
    const label = naming(list);
    const wantsSeason = !result.season && seasonWord.test(label);
    const wantsEpisode = !result.episode && episodeWord.test(label);
    if (!wantsSeason && !wantsEpisode) continue;
    const chosen = list.querySelector(SN_CHOSEN);
    if (!chosen) continue;
    // The highlighted item may belong to a nested list of the other kind - a
    // wrapper called "seasons" that holds the episodes inside it. Only the
    // list closest to the item may speak for it, or the episode number gets
    // filed as the season.
    const owner = chosen.parentElement?.closest(
      'ul, ol, nav, [class*="season" i], [class*="episode" i], [id*="season" i], [id*="episode" i]',
    );
    if (owner && owner !== list) continue;
    const number = snChosenNumber(chosen.textContent);
    if (!number) continue;
    if (wantsSeason) result.season = number;
    if (wantsEpisode) result.episode = number;
  }
  return result;
}

/// What a site writes around the name of what you are watching.
///
/// Letter lookarounds, not `\b`: word boundaries are defined on the Latin
/// alphabet, so `\bонлайн` never matches and the advertisement stays in the
/// name of every card.
const SN_TITLE_TAIL = new RegExp(
  '\\s*[-–—|]?\\s*(?<!\\p{L})(?:youtube|netflix|hdrezka|hd 720|watch online|watch free|' +
    'смотреть онлайн|онлайн бесплатно|в хорошем качестве|бесплатно|ver online|online ansehen)' +
    '(?!\\p{L}).*$',
  'iu',
);
const SN_TITLE_LEAD = /^\s*(?:смотреть|дивитися|watch|ver|regarder|assistir)\s+/iu;

/// The same name every week.
///
/// A page title is usually the series, the episode and an advertisement for
/// the site, in some order. The episode is kept in a field of its own, so
/// leaving it in the name as well files "Разделение (2 сезон 5 серия)" and
/// "Разделение (2 сезон 6 серия)" as two different programmes.
///
/// Only a unit word with a number attached is removed. "Osa" is a word in its
/// own right, and a film may be called it.
function snWithoutEpisode(value) {
  const unit = '(?:' + SN_SEASON_WORD + '|' + SN_EPISODE_WORD + ')';
  const numbered = new RegExp(
    '(?:(\\d{1,3})\\s*[.)\\-–]?\\s*(?:[а-яё]{1,2}\\s*)?)?' +
      '(?<!\\p{L})' + unit + '(?!\\p{L})' +
      '(?:\\s*[№#:.]?\\s*(\\d{1,3}))?',
    'giu',
  );
  const bracketed = new RegExp('[([][^)\\]]*' + unit + '[^)\\]]*[)\\]]', 'giu');
  const marker = /\bS\s?\d{1,2}\s*[:.\-\s]?\s*E\s?\d{1,3}\b|\b\d{1,2}\s*[x×х]\s*\d{1,3}\b/gi;
  const text = String(value || '');

  // Where the episode is first mentioned, however it is written.
  let cut = -1;
  const note = (index) => {
    if (index >= 0 && (cut < 0 || index < cut)) cut = index;
  };
  note(text.search(bracketed));
  note(text.search(marker));
  for (const match of text.matchAll(numbered)) {
    if (match[1] || match[2]) {
      note(match.index);
      break;
    }
  }

  // A series writes its name first and the episode after it, so everything
  // from the episode onwards is the episode. When there is nothing in front —
  // "5 серия Разделение" — the mention is cut out instead of the name.
  if (cut > 0 && (text.slice(0, cut).match(/\p{L}/gu) ?? []).length >= 2) return text.slice(0, cut);
  return text
    .replace(bracketed, ' ')
    .replace(numbered, (match, before, after) => (before || after ? ' ' : match))
    .replace(marker, ' ');
}

/// The name of what is playing, with the site's own furniture trimmed off.
function snMediaTitle() {
  const flat = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const candidates = [
    // Netflix names the block; its first line is the series and the rest is
    // the episode, which is why the whole block is not the title.
    document.querySelector('[data-uia="video-title"] h4')?.textContent,
    document.querySelector('[data-uia="video-title"]')?.textContent,
    document.querySelector('#above-the-fold #title h1')?.textContent,
    document.querySelector('h1')?.textContent,
    document.title,
  ];
  const found = candidates.map(flat).find(Boolean) || 'Video';
  return (
    flat(snWithoutEpisode(found.replace(SN_TITLE_TAIL, '')))
      .replace(SN_TITLE_LEAD, '')
      // Separators left facing each other where something was cut out.
      .replace(/\s*([-–—|·:])\s*(?=[-–—|·:])/g, ' ')
      .replace(/^[\s|·—–\-:]+|[\s|·—–\-:]+$/g, '')
      .trim()
      .slice(0, 90) || 'Video'
  );
}

/// An element's words with its parts kept apart.
///
/// Netflix writes the title, the episode and its name as three spans in one
/// block, and `textContent` glues them into "SeveranceS2:E5Trojan's Horse" -
/// where "S2:E5" no longer starts a word and no pattern can find it.
function snSpacedText(node) {
  if (!node) return '';
  const parts = node.children.length
    ? Array.from(node.children).map((child) => child.textContent || '')
    : [node.textContent || ''];
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/// Everything a saved card needs in order to say where it came from.
function snMediaInfo() {
  const page = snEpisodeFromPage();
  // Nothing usable in the markup: the words on screen are the last resort, and
  // the page title is where a series usually spells the episode out.
  const spelled =
    page.season && page.episode
      ? page
      : snEpisodeFromText(
          `${snSpacedText(document.querySelector('[data-uia="video-title"]'))} ${document.title}`,
        );
  return {
    title: snMediaTitle(),
    season: page.season || spelled.season || null,
    episode: page.episode || spelled.episode || null,
  };
}
