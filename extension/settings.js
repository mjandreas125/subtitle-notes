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
  /// Say the English word out loud when a card opens.
  speak: false,
  /// The short card: the meaning and nothing else.
  compactCard: true,
  /// Space reads the caption that is on screen. Nothing is saved by it: what
  /// goes into the library is what was deliberately selected.
  spaceLine: true,
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

/// The number a word like "season" is talking about, on whichever side of it
/// the language happens to put the digits: "Season 2", "2 сезон", "Сезон №2".
function snNumberNear(text, word) {
  const after = text.match(new RegExp(word + '\\s*[№#:.]?\\s*(\\d{1,3})\\b', 'i'));
  if (after) return after[1];
  const before = text.match(new RegExp('\\b(\\d{1,3})\\s*[-–]?\\s*(?:[а-яё]{1,2}\\s*)?' + word, 'i'));
  return before ? before[1] : '';
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
  return {
    season: number(snNumberNear(text, SN_SEASON_WORD)),
    episode: number(snNumberNear(text, SN_EPISODE_WORD)),
  };
}

const SN_CHOSEN = '.active, .selected, .current, .is-active, [aria-selected="true"], [aria-current="true"], [aria-current="page"]';

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
    const episode = node.getAttribute('data-episode_id') || '';
    if (!episode) continue;
    const season =
      node.getAttribute('data-season_id') ||
      document.querySelector('[data-tab_id].active')?.getAttribute('data-tab_id') ||
      '';
    return {
      season: season ? String(parseInt(season, 10)) : '',
      episode: String(parseInt(episode, 10)),
    };
  }

  const result = { season: '', episode: '' };
  const naming = (node) =>
    `${node.id || ''} ${typeof node.className === 'string' ? node.className : ''} ${node.getAttribute('aria-label') || ''}`;
  const seasonWord = new RegExp(SN_SEASON_WORD, 'i');
  const episodeWord = new RegExp(SN_EPISODE_WORD, 'i');

  // A dropdown says what is chosen without any highlighting to interpret.
  for (const select of document.querySelectorAll('select')) {
    const label = `${naming(select)} ${select.name || ''}`;
    const text = `${select.selectedOptions?.[0]?.textContent || ''} ${select.value || ''}`;
    const digits = text.match(/\d{1,3}/);
    if (!digits) continue;
    if (!result.season && seasonWord.test(label)) result.season = String(parseInt(digits[0], 10));
    if (!result.episode && episodeWord.test(label)) result.episode = String(parseInt(digits[0], 10));
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
    const text = (chosen?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const digits = text.match(/\d{1,3}/);
    if (!digits) continue;
    if (wantsSeason) result.season = String(parseInt(digits[0], 10));
    if (wantsEpisode) result.episode = String(parseInt(digits[0], 10));
  }
  return result;
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
    found
      .replace(/\s*[-–—|]\s*(YouTube|Netflix|смотреть онлайн|HD 720|HDrezka).*$/i, '')
      // The episode is kept in a field of its own, so repeating it here would
      // file the same series under a different heading every week.
      .replace(/\bS\s?\d{1,2}\s*[:.\-\s]?\s*E\s?\d{1,3}\b/i, '')
      .replace(/\s*[|·—–-]\s*$/, '')
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
