// Highlight text on any page and keep what it means.
//
// The panel lives in a shadow root. A page's stylesheet cannot reach inside one,
// and ours cannot leak out - which matters when the "page" is a news site with
// three competing CSS frameworks, or a reader that restyles every div it finds.

(() => {
  if (window.__subtitleNotesReady) return;
  window.__subtitleNotesReady = true;

  const MAX_SELECTION = 240;
  let settings = { ...SN_DEFAULTS };
  let asleep = false;

  snLoadSettings().then((loaded) => {
    settings = loaded;
    asleep = snBlocked(settings, location.hostname);
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes.settings) return;
    settings = { ...SN_DEFAULTS, ...changes.settings.newValue };
    asleep = snBlocked(settings, location.hostname);
    if (asleep) close();
  });

  const host = document.createElement('div');
  host.style.cssText = 'all: initial; position: fixed; z-index: 2147483647; top: 0; left: 0;';
  // Says "this layer belongs to the extension" to the subtitle script, which
  // takes the mouse away from anything covering a caption - and must not take
  // it away from the card it is about to draw.
  host.setAttribute('data-sn-layer', '');
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `
    <style>
      /* One accent, warm paper, hairline edges. The heavy outline and hard
         offset shadow this used to have are a house style borrowed from
         somewhere else; a reading panel should sit quietly on the page it is
         explaining. */
      :host { all: initial; }
      * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
      .layer { position: fixed; top: 0; left: 0;
        --paper: #faf8f4; --ink: #14201c; --soft: #6b7a74; --hair: #e2ddd3;
        --accent: #1e7a4c; --wash: #e7f2ea; --shade: 12 32 24;
      }
      .chip, .card {
        position: fixed; background: var(--paper); color: var(--ink);
        border: 1px solid var(--hair);
        box-shadow: 0 1px 2px rgb(var(--shade) / .10), 0 10px 26px -8px rgb(var(--shade) / .28);
      }
      .chip {
        display: flex; align-items: center; gap: 8px; padding: 7px 13px 7px 11px;
        border-radius: 10px; font-size: 13.5px; font-weight: 650; letter-spacing: -.01em;
        cursor: pointer; color: var(--accent); border-color: #cfe3d6;
      }
      .chip:hover { background: var(--wash); }
      .chip:active { transform: translateY(1px); }
      .chip span:first-child { font-size: 12px; opacity: .8; }

      .card {
        width: 336px; max-width: calc(100vw - 24px); padding: 16px 18px 15px;
        border-radius: 16px; border-left: 3px solid var(--accent);
      }
      /* Only the meaning. Dark on purpose: it sits over a film, and a sheet of
         white paper in the middle of a dark picture is a lamp in the face.
         Everything that is not the answer is gone, buttons included - a word
         picked out of a subtitle saves itself, so there is nothing to press. */
      .card.small {
        width: auto; min-width: 148px; max-width: 300px; padding: 9px 12px 10px;
        border-radius: 11px; border: 1px solid rgba(255, 255, 255, .10); border-left: 2px solid #46d68f;
        background: rgba(18, 22, 21, .94); color: #f2f7f4;
        box-shadow: 0 8px 24px -10px rgba(0, 0, 0, .8);
      }
      .card.small .head { font-size: 14.5px; font-weight: 600; line-height: 1.35; color: #dbe6e0; }
      .card.small .term {
        margin: 0; padding: 0; border: 0; font-size: 17px; font-weight: 640;
        letter-spacing: -.015em; color: #7fe3ab; line-height: 1.3;
      }
      .card.small .term b { color: #f2f7f4; font-weight: 600; font-size: 14px; }
      .card.small .sentence {
        margin-top: 5px; font-size: 12.5px; font-weight: 500; color: #93a49c; line-height: 1.35;
      }
      .card.small .syn, .card.small .note, .card.small .seen,
      .card.small .row, .card.small .say, .card.small .sentence { display: none; }
      .card.small .wait span { background: #46d68f; }
      .card.small .head.keep { display: block; font-size: 14px; color: #f2f7f4; }
      .card.small .row.keep { display: flex; margin-top: 9px; }
      .card.small .row.keep button { padding: 7px 10px; font-size: 13px; background: #1e7a4c; color: #ffffff; }
      .card.small .flag { margin-bottom: 5px; font-size: 9.5px; letter-spacing: .09em; color: #7fe3ab; }
      .card.small .flag.grey { color: #8c9a93; }
      .card.small .muted { font-size: 12.5px; color: #93a49c; }
      .card.small .say { color: #93a49c; }
      .card.small .say:hover { background: rgba(255, 255, 255, .08); }
      /* Undoing is still possible - the word is one swipe away in the app -
         so the card itself stays a single line. */
      .card.pinned { cursor: grab; }
      .card.dragging { cursor: grabbing; user-select: none; }

      .head {
        display: flex; align-items: flex-start; gap: 10px;
        font-size: 19px; font-weight: 640; line-height: 1.26; letter-spacing: -.021em;
        text-wrap: balance;
      }
      /* The meaning is the answer, so it is set apart from the sentence above
         it by a rule rather than by another block of colour. */
      .term {
        margin-top: 12px; padding-top: 11px; border-top: 1px solid var(--hair);
        font-size: 14.5px; font-weight: 600; color: var(--accent); line-height: 1.4;
      }
      .term b { color: var(--ink); font-weight: 650; }
      .note { margin-top: 9px; font-size: 12.5px; font-style: italic; color: var(--soft); line-height: 1.45; }
      /* The whole line, under the meaning of the part that was picked out of
         it. Small and quiet: it is there to place the answer, not to be read. */
      .sentence { margin-top: 8px; font-size: 13px; font-weight: 500; color: var(--soft); line-height: 1.4; }
      /* Waiting for the answer, drawn as the shape the answer will have. An
         echo of the English that is still highlighted on screen was worse than
         nothing: it looked like a result, and it was one the reader already had. */
      .wait { display: flex; flex-direction: column; gap: 7px; padding: 3px 0 2px; }
      .wait span {
        display: block; height: 11px; border-radius: 5px; background: var(--accent);
        opacity: .22; animation: sn-breathe 1.15s ease-in-out infinite;
      }
      .wait span:first-child { width: 132px; }
      .wait span:last-child { width: 78px; animation-delay: .18s; }
      @keyframes sn-breathe { 50% { opacity: .42; } }
      @media (prefers-reduced-motion: reduce) { .wait span { animation: none; } }
      .seen { margin-top: 8px; font-size: 12px; font-weight: 600; color: #8a6d2f; letter-spacing: .01em; }

      .syn { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 5px; }
      .syn span {
        padding: 3px 8px; border-radius: 7px; font-size: 12.5px; font-weight: 550;
        background: var(--wash); color: #2c5a45;
      }

      .row { margin-top: 15px; display: flex; gap: 10px; align-items: center; }
      .row.thin { margin-top: 11px; }
      button {
        flex: 1; padding: 9px 12px; border-radius: 10px; border: 0;
        font-size: 13.5px; font-weight: 650; letter-spacing: -.005em; cursor: pointer;
        background: var(--accent); color: #ffffff;
      }
      button:hover { filter: brightness(1.06); }
      button:active { transform: translateY(1px); }
      /* A second bordered button beside the first is noise: the quieter
         choices are plain text. */
      button.ghost { background: transparent; color: var(--soft); font-weight: 600; }
      button.ghost:hover { background: var(--wash); color: var(--ink); filter: none; }
      button[disabled] { opacity: .5; cursor: default; transform: none; }
      button.say {
        flex: 0 0 auto; margin-left: auto; padding: 3px 5px; background: transparent;
        color: var(--soft); border-radius: 7px; line-height: 0;
      }
      button.say svg { width: 15px; height: 15px; display: block; }
      button.say:hover { background: var(--wash); }

      .muted { font-size: 13.5px; color: var(--soft); line-height: 1.5; }
      /* Writing your own wording: one line, no dialogue, no form. */
      .mine { margin-top: 11px; display: flex; gap: 8px; }
      .mine input {
        flex: 1; min-width: 0; padding: 8px 10px; border-radius: 9px;
        border: 1px solid var(--hair); background: transparent; color: var(--ink);
        font: 600 13.5px inherit;
      }
      .mine input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
      .mine button { flex: 0 0 auto; }
      .thanks { margin-top: 9px; font-size: 12.5px; font-weight: 600; color: var(--accent); }
      .flag {
        display: inline-block; margin-bottom: 10px; font-size: 11px; font-weight: 700;
        letter-spacing: .07em; text-transform: uppercase; color: var(--accent);
      }
      .flag.grey { color: var(--soft); }

      @media (prefers-color-scheme: dark) {
        .layer {
          --paper: #151b19; --ink: #eaf1ed; --soft: #93a49c; --hair: #2a3733;
          --accent: #64c795; --wash: #1d2a25; --shade: 0 0 0;
        }
        .chip { border-color: #2f4a3d; }
        .syn span { color: #a9d9c0; }
        button { color: #062115; }
      }
    </style>
    <div class="layer"></div>`;
  const layer = root.querySelector('.layer');
  document.documentElement.appendChild(host);

  /// Fullscreen replaces the page with one element, and anything outside it is
  /// not drawn at all - which is why the card appeared nowhere while a film was
  /// full screen. It moves inside for the duration.
  function reparent() {
    const parent = document.fullscreenElement ?? document.webkitFullscreenElement ?? document.documentElement;
    if (host.parentNode !== parent) parent.appendChild(host);
  }
  document.addEventListener('fullscreenchange', reparent);
  document.addEventListener('webkitfullscreenchange', reparent);

  const ask = (message) =>
    new Promise((resolve) => {
      // Reloading the extension leaves the old copy of this script running in
      // pages that were already open. It can still draw, but it can no longer
      // reach the extension, and the only cure is refreshing the page.
      if (!chrome.runtime?.id) return resolve({ ok: false, error: t('reloaded') });
      try {
        chrome.runtime.sendMessage(message, (reply) =>
          resolve(reply ?? { ok: false, error: t('reloaded') }),
        );
      } catch (_) {
        resolve({ ok: false, error: t('reloaded') });
      }
    });

  let panel = null;
  let hideTimer = null;
  function close() {
    clearTimeout(hideTimer);
    panel?.remove();
    panel = null;
  }

  /// Where the panel goes. By the selection it follows the text; pinned to a
  /// corner it stays put, which is what you want when the same spot on screen
  /// should always hold the answer.
  function place(node, rect) {
    const gap = 8;
    const width = node.offsetWidth || 330;
    const height = node.offsetHeight || 120;
    const clamp = (value, max) => Math.min(Math.max(gap, value), Math.max(gap, max - gap));

    if (settings.position === 'selection' && rect) {
      const below = rect.bottom + gap;
      const top = below + height > window.innerHeight - gap ? Math.max(gap, rect.top - height - gap) : below;
      node.style.left = `${Math.round(clamp(rect.left, window.innerWidth - width))}px`;
      node.style.top = `${Math.round(top)}px`;
      return;
    }
    const [vertical, horizontal] = (settings.position === 'selection' ? 'top-right' : settings.position).split('-');
    const x = horizontal === 'left' ? gap : window.innerWidth - width - gap;
    const y = vertical === 'top' ? gap : window.innerHeight - height - gap;
    node.style.left = `${Math.round(clamp(x + (settings.offset?.x ?? 0), window.innerWidth - width))}px`;
    node.style.top = `${Math.round(clamp(y + (settings.offset?.y ?? 0), window.innerHeight - height))}px`;
  }

  /// Whether the reader asked for the short card.
  const compact = () => settings.compactCard !== false;

  function element(className, html) {
    const node = document.createElement('div');
    node.className = className;
    node.innerHTML = html;
    return node;
  }

  /// A speaker, drawn rather than borrowed from the emoji font - which renders
  /// as a different picture on every machine and never matches the card.
  const SPEAKER =
    '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
    '<path d="M4 8v4h3l4 3V5L7 8H4z" fill="currentColor"/>' +
    '<path d="M13.6 7.2a4 4 0 0 1 0 5.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M15.9 5a7 7 0 0 1 0 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>' +
    '</svg>';

  const escape = (value) =>
    String(value).replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]));

  // A fast dictionary request may be rate-limited while the contextual
  // reading is still on its way. Never turn that temporary failure into a
  // visible card.
  function hasTranslation(value) {
    const text = String(value ?? '').trim();
    return Boolean(text) && text.toLowerCase() !== 'translation unavailable';
  }

  /// A pinned panel can be dragged to a better spot, and stays there next time.
  function makeDraggable(node) {
    if (settings.position === 'selection') return;
    node.classList.add('pinned');
    node.addEventListener('mousedown', (event) => {
      if (event.target.closest('button')) return;
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const from = { ...(settings.offset ?? { x: 0, y: 0 }) };
      node.classList.add('dragging');
      const move = (moveEvent) => {
        settings.offset = { x: from.x + moveEvent.clientX - startX, y: from.y + moveEvent.clientY - startY };
        place(node, null);
      };
      const drop = async () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', drop);
        node.classList.remove('dragging');
        const stored = await chrome.storage.sync.get('settings');
        await chrome.storage.sync.set({ settings: { ...(stored.settings ?? {}), offset: settings.offset } });
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', drop);
    });
  }

  /// Hearing the word matters as much as reading it. The server identifies
  /// the subtitle's language while translating, so a French or Spanish line
  /// is no longer forced through an English browser voice.
  function speak(text, sourceLanguage) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const code = String(sourceLanguage || '').toLowerCase();
      utterance.lang = /^[a-z]{2,3}$/.test(code) ? code : navigator.language;
      utterance.rate = 0.92;
      window.speechSynthesis.speak(utterance);
    } catch (_) {
      // No voices installed; the card is still perfectly readable.
    }
  }

  /// What the card says: what the selected words mean, and nothing else.
  ///
  /// Synonyms, the note on why an idiom means what it does and the English
  /// term repeated back all belong to a card being studied, in the app, with
  /// the film stopped. Over a running film they are three things to read
  /// before the one thing that was asked for.
  function meaningHtml(info, text) {
    const meaning = info.focus_translation || info.translation || '';
    // The whole line, only when it is a different sentence from the answer -
    // which it is not when the whole line is what was selected.
    const line = info.translation && info.translation !== meaning ? info.translation : '';
    const spoken = info.term_en && info.term_en.toLowerCase() !== text.toLowerCase() ? info.term_en : text;
    if (compact()) return `<div class="term">${escape(meaning)}</div>`;
    return `
      <div class="head">${escape(meaning)}<button class="say" id="say" title="${escape(t('listen'))}" data-say="${escape(spoken)}" data-say-lang="${escape(info.source_language || '')}">🔊</button></div>
      ${line ? `<div class="sentence">${escape(line)}</div>` : ''}`;
  }

  /// The dictionary's answer, in the same shape, so that what appears first is
  /// replaced in place rather than by a differently built card.
  const quickHtml = (translation) => meaningHtml({ focus_translation: translation }, '');

  /// The shape of an answer that has not arrived yet.
  const waitingHtml = () => '<div class="wait"><span></span><span></span></div>';

  /// Wires up whatever optional controls the freshly written card contains.
  function activate(node, { spokenText, seen } = {}) {
    const say = node.querySelector('#say');
    if (say) {
      say.addEventListener('click', (event) => {
        event.stopPropagation();
        speak(say.dataset.say, say.dataset.sayLang);
      });
      if (settings.speak && spokenText) speak(say.dataset.say, say.dataset.sayLang);
    }
    if (seen > 1) {
      node.querySelector('.head')?.insertAdjacentHTML(
        'afterend',
        `<div class="seen">${escape(t('seenBefore', seen))}</div>`,
      );
    }
  }

  function notPairedHtml() {
    return `<div class="head keep">${t('connectTitle')}</div>
      <div class="muted" style="margin-top:8px">${t('connectBody')}</div>
      <div class="row keep"><button id="connect">${t('connectAction')}</button></div>`;
  }

  function showChip(rect, text, context, media) {
    close();
    reparent();
    panel = element('chip', `<span>✦</span><span>${t('chipAsk')}</span>`);
    layer.appendChild(panel);
    place(panel, rect);
    panel.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      showCard(rect, text, context, media);
    });
  }

  /// Reading without keeping: what space does to the line on screen, and what
  /// the chip offers. Nothing is saved unless the button is pressed.
  async function showCard(rect, text, context, media, timecodeMs = null) {
    close();
    reparent();
    panel = element(`card${compact() ? ' small' : ''}`, waitingHtml());
    layer.appendChild(panel);
    place(panel, rect);
    makeDraggable(panel);

    // The dictionary answers in a moment and the reading of the whole line
    // takes a beat longer. Show the first one rather than a row of dots, and
    // let the considered answer replace it when it lands.
    const mine = panel;
    ask({ type: 'quick', text }).then((quick) => {
      if (panel !== mine || mine.dataset.read || !quick.ok) return;
      if (!hasTranslation(quick.data?.translation)) return;
      mine.innerHTML = quickHtml(quick.data.translation);
    });

    const reply = await ask({ type: 'reading', text, context });
    if (!panel || panel !== mine) return;
    mine.dataset.read = '1';

    if (!reply.ok) {
      panel.innerHTML =
        reply.error === 'not-paired'
          ? notPairedHtml()
          : `<div class="muted">${escape(reply.error)}</div><div class="row"><button class="ghost" id="close">${t('close')}</button></div>`;
      panel.querySelector('#connect')?.addEventListener('click', () => ask({ type: 'options' }).then(close));
      panel.querySelector('#close')?.addEventListener('click', close);
      place(panel, rect);
      return;
    }

    panel.innerHTML = `${meaningHtml(reply.data, text)}
      <div class="row"><button id="save">${t('save')}</button><button class="ghost" id="close">${t('close')}</button></div>`;
    activate(panel, { spokenText: true });
    place(panel, rect);

    panel.querySelector('#close').addEventListener('click', close);
    const save = panel.querySelector('#save');
    save.addEventListener('click', async () => {
      save.disabled = true;
      save.textContent = t('saving');
      const saved = await ask({ type: 'capture', text, context, ...where(media), timecodeMs });
      if (!panel) return;
      save.textContent = saved.ok ? (saved.data.reused ? t('savedAlready') : t('saved')) : t('failed');
      if (saved.ok) setTimeout(close, 900);
      else save.disabled = false;
    });
  }

  /// Where a selection came from, in the shape the worker wants it. Callers
  /// hand over whatever they know - a whole media description from the player,
  /// or nothing at all on an ordinary web page.
  function where(media) {
    if (typeof media === 'string') return { title: media, season: null, episode: null };
    return {
      title: media?.title || document.title,
      season: media?.season || null,
      episode: media?.episode || null,
    };
  }

  /// The whole point of the hotkey: no button, no confirmation. Which is
  /// exactly why the card that appears offers to undo - a stray drag with the
  /// keys held should not quietly cost you a card you have to hunt down later.
  async function saveNow(rect, text, context, media, timecodeMs = null) {
    close();
    reparent();
    // The answer is the only thing anyone is waiting for, so the card opens as
    // the shape of the answer. It used to open with the selected English and
    // "translating…" under it, which read as a result - and one the reader
    // already had, still highlighted two centimetres away.
    panel = element(`card${compact() ? ' small' : ''}`, waitingHtml());
    layer.appendChild(panel);
    place(panel, rect);
    makeDraggable(panel);

    // Two requests, not three. The dictionary answers in a fraction of a
    // second and goes on screen the moment it does; saving now answers with
    // the reading as well, so there is nothing left for a separate one to do.
    // The card used to wait for the slow model before it settled, which is
    // why an instant capture did not feel instant.
    const mine = panel;
    const quick = ask({ type: 'quick', text });
    const saving = ask({ type: 'capture', text, context, ...where(media), timecodeMs });
    quick.then((answer) => {
      // Only until something better arrives, and never over the top of it.
      if (panel !== mine || mine.dataset.settled || !answer.ok) return;
      if (!hasTranslation(answer.data?.translation)) return;
      mine.innerHTML = quickHtml(answer.data.translation);
    });

    const saved = await saving;
    if (panel !== mine) return;
    // A refused save carries no data - the session expiring is the usual
    // reason - and reading through it threw before the error could be shown.
    const stored = saved.ok && saved.data
      ? saved.data.focus_translation || saved.data.translation
      : '';

    if (!saved.ok) {
      panel.innerHTML =
        saved.error === 'not-paired'
          ? notPairedHtml()
          : `<div class="flag grey">${t('notSaved')}</div>
             <div class="head">${escape(text)}</div>
             <div class="muted" style="margin-top:8px">${escape(saved.error)}</div>
             ${compact() ? '' : `<div class="row"><button id="retry">${t('save')}</button><button class="ghost" id="close">${t('close')}</button></div>`}`;
      panel.querySelector('#retry')?.addEventListener('click', () => saveNow(rect, text, context, media, timecodeMs));
      panel.querySelector('#connect')?.addEventListener('click', () => ask({ type: 'options' }).then(close));
      panel.querySelector('#close')?.addEventListener('click', close);
      place(panel, rect);
      return;
    }

    const reused = Boolean(saved.data.reused);
    // The saved card is the better answer, so it replaces the dictionary's.
    // When every provider was down it has nothing to say: the server has
    // marked the card as still owing a translation and will finish it later,
    // so whatever the dictionary managed stays on screen instead.
    const settled = hasTranslation(stored) && !saved.data.pending_translation;
    if (settled) mine.dataset.settled = '1';
    // Nothing from the dictionary either: every provider was unreachable in
    // that one moment. The card is kept and flagged on the server, which comes
    // back to it later, so this says what will happen rather than showing the
    // English back as though it were an answer.
    const drawn = [...mine.children].filter((node) => !node.classList.contains('wait'));
    const body = settled
      ? meaningHtml(
          {
            focus_translation: saved.data.focus_translation,
            translation: saved.data.translation,
            term_en: saved.data.focus_phrase || saved.data.focus_word,
            source_language: saved.data.source_lang,
          },
          text,
        )
      : drawn.length
        ? drawn.map((node) => node.outerHTML).join('')
        : `<div class="muted">${t('pendingLater')}</div>`;
    panel.innerHTML = `
      ${compact() ? '' : `<div class="flag${reused ? ' grey' : ''}">${reused ? t('inLibrary') : t('saved')}</div>`}
      ${body}
      <div class="row thin">
        ${reused ? '' : `<button class="ghost" id="undo">${t('undo')}</button>`}
        ${compact() ? '' : `<button class="ghost" id="rerun">${t('rerun')}</button>
        <button class="ghost" id="mine">${t('mine')}</button>`}
      </div>`;
    activate(panel, { seen: Number(saved.data.seen_count) || 1 });

    // A second opinion on a card that is already saved: the server re-reads the
    // line with the slower model, which is not the answer the fast one gave.
    panel.querySelector('#rerun')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = t('rerunning');
      const fresh = await ask({ type: 'rerun', id: saved.data.id });
      if (panel !== mine) return;
      clearTimeout(hideTimer);
      if (!fresh.ok) {
        button.disabled = false;
        button.textContent = t('failed');
        return;
      }
      mine.innerHTML = `<div class="flag">${t('saved')}</div>` +
        meaningHtml(
          {
            translation: fresh.data.translation,
            term_en: fresh.data.focus_phrase || fresh.data.focus_word,
            focus_translation: fresh.data.focus_translation,
          },
          text,
        );
      activate(mine, { seen: Number(fresh.data.seen_count) || 1 });
      place(mine, rect);
    });

    // A reader who knows the word better than the model does can simply write
    // it. Their card changes immediately; the same wording from enough people
    // becomes the reading everyone gets.
    panel.querySelector('#mine')?.addEventListener('click', () => {
      if (panel !== mine || mine.querySelector('.mine')) return;
      clearTimeout(hideTimer);
      const row = element('mine', `<input id="own" placeholder="${escape(t('minePlaceholder'))}" maxlength="120">
        <button id="sendOwn">${t('save')}</button>`);
      mine.appendChild(row);
      const field = row.querySelector('#own');
      field.value = saved.data.focus_translation || '';
      field.focus();
      field.select();
      const send = async () => {
        const text = field.value.trim();
        if (!text) return;
        row.querySelector('#sendOwn').disabled = true;
        const answer = await ask({ type: 'suggest', id: saved.data.id, text });
        if (panel !== mine) return;
        row.remove();
        mine.insertAdjacentHTML(
          'beforeend',
          `<div class="thanks">${escape(
            answer.ok && answer.data.votes >= answer.data.quorum ? t('mineAgreed') : t('mineThanks'),
          )}</div>`,
        );
        hideTimer = setTimeout(close, 2600);
      };
      row.querySelector('#sendOwn').addEventListener('click', send);
      field.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') send();
        event.stopPropagation();
      });
    });

    panel.querySelector('#undo')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = t('undoing');
      const gone = await ask({ type: 'undo', id: saved.data.id });
      if (!panel) return;
      button.textContent = gone.ok ? t('undone') : t('failed');
      if (gone.ok) setTimeout(close, 700);
    });

    clearTimeout(hideTimer);
    hideTimer = setTimeout(close, Math.max(2, Number(settings.hideAfter) || 6) * 1000);
  }

  /// The sentence the selection sits in. It is what lets the server tell a
  /// criminal record from a vinyl one, so it is worth the extra work of walking
  /// up to the containing block.
  function sentenceAround(selection, text) {
    const node = selection.anchorNode;
    const block = node?.nodeType === 1 ? node : node?.parentElement;
    const whole = (block?.closest('p, li, td, h1, h2, h3, blockquote, div') || block)?.innerText || '';
    if (!whole || whole.length > 600) return '';
    const flat = whole.replace(/\s+/g, ' ').trim();
    return flat.toLowerCase().includes(text.toLowerCase()) ? flat : '';
  }

  function currentSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return null;
    const text = selection.toString().replace(/\s+/g, ' ').trim();
    if (!text || text.length > MAX_SELECTION || !/[\p{L}]/u.test(text)) return null;
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    if (!rect.width && !rect.height) return null;
    return { text, rect, context: sentenceAround(selection, text) };
  }

  document.addEventListener('mouseup', (event) => {
    if (asleep || event.target === host) return;
    // Let the click that dismisses the panel finish before reading the selection.
    setTimeout(() => {
      const found = currentSelection();
      if (!found) {
        if (panel?.classList.contains('chip')) close();
        return;
      }
      const instant = snMatchesHotkey(event, settings.hotkey);
      // A plain browser selection belongs to the page. Reading, saving and
      // network requests begin only with the configured Ctrl+Alt shortcut.
      if (instant) saveNow(found.rect, found.text, found.context, snMediaInfo());
    }, 10);
  });

  // The same combination works after the fact: select with the mouse or the
  // keyboard, then press it. Holding the keys while dragging is awkward on a
  // trackpad, and this covers keyboard-only selection too.
  let armed = true;
  document.addEventListener('keydown', (event) => {
    // Escape undoes a selection that caught the wrong words, and takes the
    // panel with it. Nothing is saved by highlighting alone, so this is only
    // ever tidying up.
    if (event.key === 'Escape') {
      window.getSelection()?.removeAllRanges();
      return close();
    }
    if (asleep || !armed) return;
    if (!snMatchesHotkey(event, settings.hotkey)) return;
    const found = currentSelection();
    if (!found) return;
    armed = false;
    event.preventDefault();
    saveNow(found.rect, found.text, found.context, snMediaInfo());
  });
  document.addEventListener('keyup', () => {
    armed = true;
  });

  document.addEventListener('mousedown', (event) => {
    if (event.target === host) return;
    // Picking the next word out of a subtitle should not count as dismissing
    // the answer to the last one: the card is replaced a moment later anyway,
    // and closing it here made it flash away on every click in the player.
    if (window.__subtitleNotesInCaption?.(event.target)) return;
    close();
  });

  // Shared with the subtitle layer, which runs in the same isolated world.
  window.__subtitleNotes = {
    showCard,
    saveNow,
    close,
    ask,
    get settings() {
      return settings;
    },
  };
})();
