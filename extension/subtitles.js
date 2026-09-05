// Makes subtitles selectable in any web player.
//
// The first version of this drew its own copy of the line over the player's.
// That was wrong: the copy had its own size and its own position, so it never
// looked like the caption the viewer had set up, and it flickered whenever the
// player rebuilt its element underneath.
//
// Nothing is drawn here now. The player's own caption element is made
// selectable in place — the same words, the same size, the same spot, because
// it is literally the same element. All this layer does is decide when it is
// text you can drag across and when it is the player's again.
//
// While the key is not held the caption is exactly as the player left it: you
// can drag it, click through it to pause, resize it in the player's menu.
// Hold the key and it becomes ordinary text: drag across characters, click a
// word, let go and the meaning appears.

(() => {
  if (window.__subtitleNotesSubs) return;
  window.__subtitleNotesSubs = true;

  /// Where players keep their captions. The generic patterns at the end catch
  /// the rest: a player that calls its element "subtitle" or "caption" is
  /// telling us what it is.
  const CAPTION_SELECTORS = [
    '.ytp-caption-segment', // YouTube
    '.player-timedtext-text-container', // Netflix
    '.vjs-text-track-cue', // Video.js
    '.jw-text-track-cue', // JW Player
    '.plyr__caption', // Plyr
    '.shaka-text-container', // Shaka
    // Playerjs, which the Russian film sites use. Its elements are <pjsdiv>
    // tags — a tag, not a class — and the caption is the one whose id ends in
    // "_subtitle", e.g. "pjs_cdnplayer_subtitle" on rezka.
    'pjsdiv[id*="subtitle" i]',
    '[id*="_subtitle" i]',
    '[class*="subtitles__container"]',
    '[class*="caption-window"]',
    '[class*="subtitle-text"]',
  ];

  const style = document.createElement('style');
  // Only ever applied while the key is held, and removed the moment it is let
  // go, so nothing about the player changes when this extension is idle.
  style.textContent = `
    .sn-pick, .sn-pick * {
      user-select: text !important; -webkit-user-select: text !important;
      pointer-events: auto !important; cursor: text !important;
    }
    /* The browser's own highlight is a rectangle as tall as the line box, with
       square corners, and nothing about it can be changed — not the height,
       not the radius. So it is made invisible and drawn again below. */
    .sn-pick ::selection { background: transparent !important; }
    .sn-pick::selection { background: transparent !important; }
    .sn-picking ::selection { background: transparent !important; }`;
  document.documentElement.appendChild(style);

  const flat = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const settings = () => window.__subtitleNotes?.settings ?? SN_DEFAULTS;

  // ---- the highlight --------------------------------------------------------
  //
  // Drawn by hand, one rounded pane per line of the selection, sitting behind
  // the words rather than over them: short enough not to swallow the line,
  // soft enough to read through, and it fades in rather than snapping on.
  const glow = document.createElement('div');
  glow.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483645; pointer-events: none;';
  glow.setAttribute('data-sn-layer', '');
  const glowRoot = glow.attachShadow({ mode: 'closed' });
  glowRoot.innerHTML = `
    <style>
      /* Faint enough that the letters keep their own colour — a mark under the
         words, not paint over them. */
      .pane {
        position: fixed; border-radius: 10px; pointer-events: none;
        background: linear-gradient(180deg, rgba(96, 232, 166, .26), rgba(44, 180, 122, .20));
        box-shadow: 0 0 0 1px rgba(140, 245, 197, .30);
      }
      .pane.enter { animation: in .13s ease-out; }
      @keyframes in { from { opacity: 0; transform: scaleX(.97); } to { opacity: 1; transform: none; } }
    </style>`;
  document.documentElement.appendChild(glow);

  function clearGlow() {
    for (const pane of glowRoot.querySelectorAll('.pane')) pane.remove();
  }

  /// Draws the highlight from a list of boxes rather than from the live
  /// selection, so the words can stay marked after the selection itself is
  /// gone. Keeping the selection alive was what left the browser's blue
  /// rectangle on the line once the card had opened.
  let frozen = null;

  function drawGlow() {
    if (!armed) {
      clearGlow();
      return;
    }
    const selection = window.getSelection();
    const live = selection && !selection.isCollapsed && selection.rangeCount
      ? selection.getRangeAt(0)
      : null;
    if (!live && frozen) return paintPanes(frozen);
    if (!live || !insideCaption(live.startContainer)) {
      clearGlow();
      return;
    }
    paintPanes([...live.getClientRects()]);
  }

  function paintPanes(rects) {
    const visible = rects.filter((rect) => rect.width >= 1 && rect.height >= 1);
    const panes = [...glowRoot.querySelectorAll('.pane')];
    for (const [index, rect] of visible.entries()) {
      // Trimmed top and bottom: a line box is taller than the letters in it,
      // and a highlight that fills it looks like a bar rather than a mark.
      // Less trimming than before, though - it was sitting on the letters.
      const inset = Math.min(4, Math.max(1, rect.height * 0.09));
      const pane = panes[index] ?? document.createElement('div');
      if (!panes[index]) {
        pane.className = 'pane enter';
        glowRoot.appendChild(pane);
      }
      pane.style.left = `${Math.round(rect.left - 7)}px`;
      pane.style.top = `${Math.round(rect.top + inset)}px`;
      pane.style.width = `${Math.round(rect.width + 14)}px`;
      pane.style.height = `${Math.round(rect.height - inset * 2)}px`;
    }
    for (let index = visible.length; index < panes.length; index += 1) panes[index].remove();
  }

  /// Text offsets within a caption, counted across all its text nodes, so the
  /// same range can be found again in a rebuilt copy of the same line.
  function offsetsIn(caption, range) {
    const walk = document.createTreeWalker(caption, NodeFilter.SHOW_TEXT);
    let seen = 0;
    let from = null;
    let to = null;
    for (let node = walk.nextNode(); node; node = walk.nextNode()) {
      if (node === range.startContainer) from = seen + range.startOffset;
      if (node === range.endContainer) to = seen + range.endOffset;
      seen += node.data.length;
    }
    return from === null || to === null ? null : { from, to, length: seen };
  }

  function rangeAt(caption, from, to) {
    const walk = document.createTreeWalker(caption, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let seen = 0;
    let started = false;
    for (let node = walk.nextNode(); node; node = walk.nextNode()) {
      const end = seen + node.data.length;
      if (!started && from <= end) {
        range.setStart(node, Math.max(0, from - seen));
        started = true;
      }
      if (started && to <= end) {
        range.setEnd(node, Math.max(0, to - seen));
        return started ? range : null;
      }
      seen = end;
    }
    return null;
  }

  /// Players rebuild the caption element for every line, and a rebuild in the
  /// middle of a drag used to throw the selection away — which is what made it
  /// vanish letter by letter. The words are the same, so the same range is put
  /// back on the new element.
  function restoreGrip() {
    if (!grip || !armed) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    refresh(true);
    const caption = marked.find((node) => flat(node.innerText) === grip.text);
    if (!caption) return;
    const range = rangeAt(caption, grip.from, grip.to);
    if (!range) return;
    selection?.removeAllRanges();
    selection?.addRange(range);
    drawGlow();
  }

  document.addEventListener('selectionchange', () => {
    if (armed) clampToCaption();
    drawGlow();
    if (!holding) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const caption = marked.find((node) => node.contains(range.startContainer));
    const offsets = caption && offsetsIn(caption, range);
    if (offsets) grip = { ...offsets, text: flat(caption.innerText) };
  });

  // A caption replaced while the mouse is down takes the selection with it.
  new MutationObserver(() => {
    if (armed) requestAnimationFrame(restoreGrip);
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  /// A drag that wanders past the end of the line used to swallow the player's
  /// clock along with it, in the browser's own blue. The selection is kept
  /// inside the caption it started in.
  function clampToCaption() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const caption = marked.find((node) => node.contains(range.startContainer) || node.contains(range.endContainer));
    if (!caption) return;
    const inside = (node) => node && caption.contains(node);
    if (inside(range.startContainer) && inside(range.endContainer)) return;
    const fixed = range.cloneRange();
    if (!inside(range.startContainer)) fixed.setStartBefore(caption.firstChild ?? caption);
    if (!inside(range.endContainer)) fixed.setEndAfter(caption.lastChild ?? caption);
    selection.removeAllRanges();
    selection.addRange(fixed);
  }
  window.addEventListener('scroll', drawGlow, true);
  window.addEventListener('resize', drawGlow);

  /// The biggest video actually on screen. A page can hold several — a trailer
  /// in a sidebar, an advert — and the one being watched is the large one.
  function currentVideo() {
    let best = null;
    let bestArea = 0;
    for (const video of document.querySelectorAll('video')) {
      const rect = video.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area < 40000 || rect.bottom < 0 || rect.top > window.innerHeight) continue;
      if (area > bestArea) {
        best = video;
        bestArea = area;
      }
    }
    return best;
  }

  /// Every caption element on screen right now. Usually one; YouTube can show
  /// two windows at once, and a player may keep an empty one around.
  function captionNodes() {
    const found = [];
    for (const selector of CAPTION_SELECTORS) {
      for (const node of document.querySelectorAll(selector)) {
        const rect = node.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const text = flat(node.innerText);
        // A caption is a line or two, not a page of markup.
        if (!text || text.length > 220) continue;
        // The outermost match wins: a container whose child also matched would
        // otherwise be marked twice.
        if (!found.some((other) => other.contains(node))) found.push(node);
      }
    }
    return found;
  }

  // What the popup asks when somebody opens it over this page. Answered from
  // here because this is the only script that knows what a caption looks like.
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type !== 'pageState') return false;
    const options = settings();
    respond({
      captions: captionNodes().length,
      subtitles: options.subtitles !== false,
      space: options.spaceLine === true &&
        (typeof snSiteAllowed !== 'function' || snSiteAllowed(options, location.hostname)),
      blocked: typeof snBlocked === 'function' && snBlocked(options, location.hostname),
      keys: typeof snSubtitleKeyLabel === 'function' ? snSubtitleKeyLabel(options) : '',
    });
    return true;
  });

  let marked = [];
  let armed = false;
  let holding = false;
  let markedAt = 0;
  /// The character range being dragged, kept as plain offsets so it can be put
  /// back on a caption the player has rebuilt underneath it.
  let grip = null;

  function mark(on) {
    for (const node of marked) node.classList.remove('sn-pick');
    marked = on ? captionNodes() : [];
    for (const node of marked) node.classList.add('sn-pick');
    undrag(on);
    lift(on);
    markedAt = performance.now();
  }

  /// Whatever the player has lying on top of its own caption.
  ///
  /// A caption can be perfectly selectable and still unreachable: Plyr keeps
  /// its poster over the picture after a seek, YouTube slides the control bar
  /// under the line when the mouse comes near. The mouse lands on that instead
  /// of on the words, and a player with nothing wrong with it looks broken.
  ///
  /// So the covers stop taking the mouse for as long as the key is held. Three
  /// points along the line rather than one: a control bar often covers only
  /// half of it.
  let lifted = [];

  function lift(on) {
    for (const { node, value } of lifted) node.style.pointerEvents = value;
    lifted = [];
    if (!on) return;
    for (const caption of marked) {
      const rect = caption.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) continue;
      const middle = rect.top + rect.height / 2;
      const inset = Math.min(10, rect.width / 4);
      for (const x of [rect.left + inset, rect.left + rect.width / 2, rect.right - inset]) {
        const stack = document.elementsFromPoint(x, middle);
        const reached = stack.findIndex((node) => node === caption || caption.contains(node));
        if (reached <= 0) continue;
        for (const node of stack.slice(0, reached)) {
          // Ancestors are not covers, and our own layers must keep their mouse:
          // the card has buttons on it.
          if (!(node instanceof HTMLElement) || node.contains(caption)) continue;
          if (node.hasAttribute('data-sn-layer')) continue;
          if (lifted.some((kept) => kept.node === node)) continue;
          lifted.push({ node, value: node.style.pointerEvents });
          node.style.pointerEvents = 'none';
        }
      }
    }
  }

  /// Players that let the viewer move the caption box mark it
  /// `draggable="true"` - YouTube does. A dragged element is not a selectable
  /// one: the browser starts carrying the box the moment the mouse moves, so
  /// the words could never be picked and the line simply followed the cursor.
  /// That is the whole of the "it just drags the subtitles" report.
  ///
  /// The attribute comes off while the key is held and goes back the moment it
  /// is let go, so moving the captions still works when this is idle.
  let undragged = [];

  function undrag(on) {
    for (const node of undragged) node.draggable = true;
    undragged = [];
    if (!on) return;
    for (const caption of marked) {
      const family = [caption, ...caption.querySelectorAll('[draggable="true"]')];
      // The box that carries the line is usually the caption's parent, not the
      // caption: YouTube's segment sits inside a draggable window.
      let node = caption.parentElement;
      for (let step = 0; node && step < 5; step += 1, node = node.parentElement) family.push(node);
      for (const element of family) {
        if (element instanceof HTMLElement && element.draggable) {
          element.draggable = false;
          undragged.push(element);
        }
      }
    }
  }

  // Belt and braces: a player that starts its own drag from script rather than
  // from the attribute is stopped here instead.
  //
  // These listeners sit on `window`, not on `document`. Capturing runs
  // window -> document -> element, so a listener here is reached before any of
  // the player's own capturing ones - and the player registered its first,
  // because a content script runs after the page it is added to. On
  // `document` ours came second and the player had already called
  // preventDefault, which is what stopped a selection from ever starting.
  window.addEventListener(
    'dragstart',
    (event) => {
      if (armed && insideCaption(event.target)) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true,
  );

  // Cancelling `selectstart` is the other way a page refuses to be selected,
  // and it cannot be un-cancelled - so the page never gets to see the event.
  window.addEventListener(
    'selectstart',
    (event) => {
      if (armed && insideCaption(event.target)) event.stopPropagation();
    },
    true,
  );

  /// Players build a fresh element for every line, so the one on screen is
  /// rarely the one that was marked a second ago. The scan is cheap and
  /// throttled, and it has to have happened before the mouse goes down —
  /// afterwards is too late for the browser to start a selection.
  function refresh(force = false) {
    if (!armed) return;
    // A drag normally freezes the scan, so the element under the cursor is not
    // swapped out from under it. `force` is for the one case that must scan
    // anyway: the player has already swapped it, and the selection has to be
    // found again on the new element.
    if (!force && (holding || performance.now() - markedAt < 120)) return;
    mark(true);
  }

  function setArmed(value) {
    if (armed === value) return;
    armed = value;
    document.documentElement.classList.toggle('sn-picking', value);
    mark(value);
    if (!value) {
      // Letting go of the key must not hand the words back to the browser's
      // own blue rectangle, so the selection goes with it.
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && insideCaption(selection.anchorNode)) {
        selection.removeAllRanges();
      }
      clearGlow();
      grip = null;
      frozen = null;
    }
    if (window.__subtitleNotes) window.__subtitleNotes.armed = value;
  }

  // Clicking a caption is how a word is picked, so it must not also be the
  // gesture that throws the answer away.
  window.__subtitleNotesInCaption = (node) => insideCaption(node);

  /// Fullscreen replaces the page with one element; anything outside it is not
  /// drawn at all, highlight included.
  function reparent() {
    const parent = document.fullscreenElement ?? document.webkitFullscreenElement ?? document.documentElement;
    if (glow.parentNode !== parent) parent.appendChild(glow);
  }
  document.addEventListener('fullscreenchange', reparent);
  document.addEventListener('webkitfullscreenchange', reparent);

  const asleep = () => {
    const options = settings();
    return options.subtitles === false ||
      (typeof snBlocked === 'function' && snBlocked(options, location.hostname));
  };

  const armFrom = (event) => {
    if (asleep()) return setArmed(false);
    // Letting go of the key in the middle of a drag must not throw away the
    // words already selected — many people release it before the mouse.
    if (holding) return;
    setArmed(snSubtitleKeyHeld(event, settings()));
    refresh();
  };
  document.addEventListener('keydown', armFrom, true);
  document.addEventListener('keyup', armFrom, true);
  document.addEventListener('mousemove', armFrom, true);
  window.addEventListener('blur', () => setArmed(false));
  // Players rebuild the caption for every line, so the marking is refreshed
  // while the key stays held. A drag must remain untouched: forcing a new scan
  // here was enough to make Playerjs redraw the highlight on every character.
  setInterval(() => refresh(), 300);

  const insideCaption = (node) => {
    const element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    return marked.some((caption) => caption === element || caption.contains(element));
  };

  // Some players listen for pointerdown rather than mousedown and cancel it,
  // which would stop a selection from ever starting.
  window.addEventListener(
    'pointerdown',
    (event) => {
      if (armed && insideCaption(event.target)) event.stopPropagation();
    },
    true,
  );

  // The click that ends a selection is a separate event from the mouse going
  // up, and players listen for it to pause. Swallowing it is what keeps the
  // film from starting again the moment a word is picked.
  window.addEventListener(
    'click',
    (event) => {
      if (!armed || !insideCaption(event.target)) return;
      event.stopPropagation();
      event.preventDefault();
    },
    true,
  );

  window.addEventListener(
    'mousedown',
    (event) => {
      if (!armed) return;
      if (!insideCaption(event.target)) {
        // The line may have changed between the last scan and this click.
        refresh(true);
        if (!insideCaption(event.target)) return;
      }
      // The player must not pause, seek or start dragging its caption while a
      // line is being read.
      event.stopPropagation();
      holding = true;
      frozen = null;
      // Pausing here rather than at the end of the selection is the difference
      // between reading a line and chasing it: cues change every two seconds,
      // and the words would move out from under the cursor mid-drag.
      reparent();
      const video = currentVideo();
      if (settings().pauseVideo !== false && video && !video.paused) video.pause();
    },
    true,
  );

  window.addEventListener(
    'mouseup',
    (event) => {
      if (!holding) return;
      holding = false;
      if (!armed) return;
      event.stopPropagation();

      const selection = window.getSelection();
      let text = flat(selection?.toString());
      let rect = null;
      let caption = null;

      if (text && selection.rangeCount) {
        const range = selection.getRangeAt(0);
        rect = range.getBoundingClientRect();
        // Read the source line before clearing the native selection. Clearing
        // it first also clears anchorNode, which reduced every Rezka capture
        // to one word and left the translator without its context.
        caption = marked.find((node) =>
          node.contains(range.startContainer) || node.contains(range.endContainer),
        );
      } else {
        // A click rather than a drag: take the word it landed on and show it
        // selected, so what was picked is never a guess.
        const range = wordAt(event.clientX, event.clientY);
        if (!range) return;
        selection?.removeAllRanges();
        selection?.addRange(range);
        text = flat(range.toString());
        rect = range.getBoundingClientRect();
        caption = marked.find((node) => node.contains(range.startContainer));
      }

      const line = flat(caption?.innerText) || text;

      // The words stay marked, but the browser's own selection goes: that is
      // the blue rectangle, and it has no business staying behind.
      frozen = rect ? [rect] : null;
      window.getSelection()?.removeAllRanges();
      clearGlow();
      if (frozen) paintPanes(frozen);

      text = text.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      if (!text) return;

      const api = window.__subtitleNotes;
      if (!api) return;
      const video = currentVideo();
      // Subtitles always save themselves: you paused a film and dragged across
      // a word on purpose, and a "Save" button after that is a question with
      // one answer. The card still offers to undo.
      (api.saveNow)(
        rect,
        text,
        line,
        // The name of the film and, for a series, which episode of it. The
        // player was asked at the moment of the selection: an episode chosen
        // half an hour ago is still the one on screen, and reading it now
        // costs nothing.
        snMediaInfo(),
        video ? Math.round(video.currentTime * 1000) : null,
      );
    },
    true,
  );

  /// The whole word under the pointer, as a range, so a plain click picks a
  /// word without the reader having to drag across it exactly.
  function wordAt(x, y) {
    const caret = document.caretRangeFromPoint?.(x, y);
    const node = caret?.startContainer;
    if (!caret || !node || node.nodeType !== Node.TEXT_NODE) return null;
    const text = node.data;
    const letter = (character) => character && /[\p{L}\p{N}'’-]/u.test(character);
    let from = caret.startOffset;
    let to = caret.startOffset;
    if (!letter(text[from]) && !letter(text[from - 1])) return null;
    while (letter(text[from - 1])) from -= 1;
    while (letter(text[to])) to += 1;
    if (from === to) return null;
    const range = document.createRange();
    range.setStart(node, from);
    range.setEnd(node, to);
    return range;
  }

  // Space is the pause key, so it can also ask what the line being paused on
  // means. Off unless asked for: in a browser space scrolls the page, presses
  // the button under the cursor and goes into every comment box, and a
  // translation window on all of those is an interruption. In VLC, where space
  // is the pause key and nothing else, it is on.
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.code !== 'Space' || event.ctrlKey || event.altKey || event.metaKey) return;
      const options = window.__subtitleNotes?.settings ?? {};
      if (options.spaceLine !== true) return;
      if (asleep()) return;
      // Space is the one thing here that a page already uses for something
      // else, so it is the one thing worth pointing at particular sites.
      // Selecting words with the mouse takes nothing away from anybody and
      // goes on working everywhere.
      if (typeof snSiteAllowed === 'function' && !snSiteAllowed(options, location.hostname)) return;
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (typing) return;
      const caption = captionNodes()[0];
      if (!caption) return;
      const line = (caption.innerText || '').replace(/\s+/g, ' ').trim();
      if (!line) return;
      const api = window.__subtitleNotes;
      if (!api) return;
      const where = caption.getBoundingClientRect();
      const video = currentVideo();
      const at = video ? Math.round(video.currentTime * 1000) : null;
      // Reading and collecting are different acts, so keeping the line is a
      // separate answer from translating it.
      if (options.spaceSaves === true) api.saveNow(where, line, line, snMediaInfo(), at);
      else api.showCard(where, line, line, snMediaInfo(), at);
    },
    true,
  );
})();
