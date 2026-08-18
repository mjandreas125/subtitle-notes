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
  /// Save every selection instantly, with no key held at all.
  instantAlways: false,
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
