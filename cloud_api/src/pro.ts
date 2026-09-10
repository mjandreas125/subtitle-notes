/**
 * The page where somebody buys Pro.
 *
 * It wears the landing page's clothes on purpose - the same paper, the same
 * accent, the same type - because arriving here from the extension should feel
 * like the same product rather than a payment form somebody bolted on.
 *
 * The copy exists in English and Russian, the two languages the author reads.
 * Every other language falls back to English rather than being machine
 * translated: an unverified sentence about money is worse than a sentence in
 * a language the reader can at least recognise. The other twelve are a
 * translation job, not a code change.
 */

const TEXT: Record<string, Record<string, string>> = {
  en: {
    title: 'Subtitle Notes Pro',
    lede: 'Everything stays free. Pro removes the ceiling.',
    freeHead: 'What stays free, always',
    freeBody: 'The gesture, the reading in context, saving, your library on the phone, '
      + 'the browser and the computer, revision on a schedule, and export to Anki. '
      + 'None of that is going behind a wall - not now, not later.',
    ceilingHead: 'The ceiling',
    ceilingBody: 'A free account gets {n} readings a day. Past that a card is still made, '
      + 'from the dictionary rather than the model, and it says so. Nothing stops '
      + 'mid-scene and nothing asks you to pay while a film is paused.',
    proHead: 'What Pro adds',
    proOne: 'No daily ceiling.',
    proTwo: 'The slow, careful model whenever you ask for it, not three times a day.',
    proThree: 'Your own API key instead, if you would rather pay the model directly - '
      + 'that has no ceiling either, and it is free.',
    yearly: 'A year',
    monthly: 'A month',
    yearlyNote: 'Two months less than paying monthly',
    monthlyNote: 'Cancel whenever',
    buy: 'Continue to payment',
    signedOut: 'Open this page from the app, the extension or your library, so it knows who you are.',
    done: 'Thank you. Your account is Pro - the phone, the browser and the computer '
      + 'will know at their next request. Nothing to restore anywhere.',
    cancelled: 'Nothing was charged. The free account is unchanged.',
    manage: 'Change or cancel',
    already: 'This account is Pro.',
    perMonth: '/mo',
    perYear: '/yr',
  },
  ru: {
    title: 'Subtitle Notes Pro',
    lede: 'Всё остаётся бесплатным. Pro снимает потолок.',
    freeHead: 'Что бесплатно всегда',
    freeBody: 'Жест, разбор реплики, сохранение, библиотека на телефоне, в браузере и на '
      + 'компьютере, повторение по расписанию и выгрузка в Anki. Ничего из этого '
      + 'за забор не уедет — ни сейчас, ни потом.',
    ceilingHead: 'Потолок',
    ceilingBody: 'Бесплатному аккаунту — {n} разборов в день. Дальше карточка всё равно '
      + 'делается, только словарём, а не моделью, и честно об этом говорит. '
      + 'Ничего не обрывается посреди сцены и никто не просит денег на паузе.',
    proHead: 'Что добавляет Pro',
    proOne: 'Потолка нет.',
    proTwo: 'Медленная, вдумчивая модель тогда, когда попросишь, а не три раза в день.',
    proThree: 'Либо свой ключ, если удобнее платить модели напрямую — там потолка тоже '
      + 'нет, и это бесплатно.',
    yearly: 'Год',
    monthly: 'Месяц',
    yearlyNote: 'На два месяца дешевле помесячного',
    monthlyNote: 'Отмена в любой момент',
    buy: 'Перейти к оплате',
    signedOut: 'Открой эту страницу из приложения, расширения или библиотеки, чтобы она знала, кто ты.',
    done: 'Спасибо. Аккаунт теперь Pro — телефон, браузер и компьютер узнают об этом '
      + 'при следующем запросе. Ничего нигде восстанавливать не нужно.',
    cancelled: 'Ничего не списано. Бесплатный аккаунт не изменился.',
    manage: 'Изменить или отменить',
    already: 'Этот аккаунт — Pro.',
    perMonth: '/мес',
    perYear: '/год',
  },
};

const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function proPage(
  lang: string,
  state: { done: boolean; cancelled: boolean; smartPerDay: number },
): string {
  const t = TEXT[lang] ?? TEXT.en;
  const note = state.done ? t.done : state.cancelled ? t.cancelled : '';

  return `<!doctype html>
<html lang="${esc(lang)}"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)}</title>
<style>
  :root {
    --paper: #faf8f4; --ink: #14201c; --soft: #5d6d67; --hair: #e4dfd5;
    --accent: #1e7a4c; --wash: #e7f2ea; --card: #ffffff;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --paper: #101614; --ink: #eaf1ed; --soft: #93a49c; --hair: #26332e;
      --accent: #64c795; --wash: #17241f; --card: #151d1a;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--paper); color: var(--ink);
    font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .page { max-width: 46rem; margin: 0 auto; padding: 3.5rem 1.25rem 4rem; }
  header { display: flex; align-items: center; gap: .7rem; margin-bottom: 3rem; }
  .glyph { width: 26px; height: 18px; border-radius: 4px; background: var(--accent); position: relative; }
  .glyph::after {
    content: ""; position: absolute; left: 4px; right: 4px; bottom: 4px;
    height: 3px; border-radius: 2px; background: var(--paper); opacity: .85;
  }
  .wordmark { font-weight: 700; letter-spacing: -.02em; font-size: 1.05rem; }
  h1 { margin: 0 0 .8rem; font-size: clamp(1.9rem, 5vw, 2.7rem); line-height: 1.1;
       letter-spacing: -.035em; font-weight: 700; text-wrap: balance; }
  .lede { margin: 0 0 2.6rem; font-size: 1.15rem; color: var(--soft); max-width: 40ch; }
  h2 { font-size: .95rem; letter-spacing: .06em; text-transform: uppercase;
       color: var(--soft); font-weight: 650; margin: 2.8rem 0 .9rem; }
  p { margin: 0 0 1rem; }
  .note {
    background: var(--wash); border: 1px solid var(--hair); border-radius: 12px;
    padding: 1rem 1.2rem; margin-bottom: 2.4rem;
  }
  ul { margin: 0; padding-left: 1.15rem; display: grid; gap: .45rem; }

  .plans { display: grid; gap: .9rem; grid-template-columns: 1fr; margin-top: 1.2rem; }
  @media (min-width: 34rem) { .plans { grid-template-columns: 1fr 1fr; } }
  .plan {
    display: block; width: 100%; text-align: left; cursor: pointer;
    background: var(--card); border: 1px solid var(--hair); border-radius: 14px;
    padding: 1.15rem 1.25rem 1.25rem; color: inherit; font: inherit;
  }
  .plan[data-on="1"] { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
  .plan .amount { font-size: 1.7rem; font-weight: 700; letter-spacing: -.03em; }
  .plan .amount span { font-size: 1rem; font-weight: 400; color: var(--soft); }
  .plan .name { font-size: .8rem; letter-spacing: .08em; text-transform: uppercase; color: var(--soft); }
  .plan .sub { color: var(--soft); font-size: .92rem; margin-top: .3rem; }

  button.go {
    margin-top: 1.4rem; width: 100%; padding: .95rem 1rem; border: 0; cursor: pointer;
    border-radius: 12px; background: var(--accent); color: #fff;
    font: 600 1.02rem/1 system-ui, sans-serif; letter-spacing: -.01em;
  }
  button.go[disabled] { opacity: .55; cursor: default; }
  .fine { color: var(--soft); font-size: .9rem; margin-top: 1rem; }
  a { color: var(--accent); }
</style></head>
<body><div class="page">
  <header><div class="glyph"></div><div class="wordmark">Subtitle Notes</div></header>

  <h1>${esc(t.title)}</h1>
  <p class="lede">${esc(t.lede)}</p>

  ${note ? `<div class="note">${esc(note)}</div>` : ''}

  <h2>${esc(t.freeHead)}</h2>
  <p>${esc(t.freeBody)}</p>

  <h2>${esc(t.ceilingHead)}</h2>
  <p>${esc(t.ceilingBody.replace('{n}', String(state.smartPerDay)))}</p>

  <h2>${esc(t.proHead)}</h2>
  <ul>
    <li>${esc(t.proOne)}</li>
    <li>${esc(t.proTwo)}</li>
    <li>${esc(t.proThree)}</li>
  </ul>

  <div class="plans">
    <button class="plan" data-period="yearly" data-on="1">
      <div class="name">${esc(t.yearly)}</div>
      <div class="amount">24 €<span>${esc(t.perYear)}</span></div>
      <div class="sub">${esc(t.yearlyNote)}</div>
    </button>
    <button class="plan" data-period="monthly">
      <div class="name">${esc(t.monthly)}</div>
      <div class="amount">3 €<span>${esc(t.perMonth)}</span></div>
      <div class="sub">${esc(t.monthlyNote)}</div>
    </button>
  </div>

  <button class="go" id="go">${esc(t.buy)}</button>
  <p class="fine" id="fine"></p>
</div>

<script>
(function () {
  // The session arrives in the fragment, the way the library already receives
  // it: a fragment is never sent to a server, so it cannot end up in a log or
  // in a referrer on the way to Stripe.
  var token = new URLSearchParams(location.hash.slice(1)).get('t') || '';
  var period = 'yearly';
  var plans = [].slice.call(document.querySelectorAll('.plan'));
  plans.forEach(function (b) {
    b.onclick = function () {
      period = b.dataset.period;
      plans.forEach(function (x) { x.removeAttribute('data-on'); });
      b.dataset.on = '1';
    };
  });

  var go = document.getElementById('go');
  var fine = document.getElementById('fine');
  if (!token) {
    go.disabled = true;
    fine.textContent = ${JSON.stringify(TEXT[lang]?.signedOut ?? TEXT.en.signedOut)};
    return;
  }

  // One handler, one branch. An account that is already paid gets Stripe's
  // own portal; everybody else gets a checkout. Two handlers on one button is
  // how a person ends up buying a second subscription by accident.
  var mode = 'buy';
  fetch('/v1/me', { headers: { Authorization: 'Bearer ' + token } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (me) {
      if (!me || me.plan !== 'pro') return;
      mode = 'manage';
      go.textContent = ${JSON.stringify(TEXT[lang]?.manage ?? TEXT.en.manage)};
      fine.textContent = ${JSON.stringify(TEXT[lang]?.already ?? TEXT.en.already)};
    })
    .catch(function () { /* the button still works; it just says "buy" */ });

  go.addEventListener('click', function () {
    if (go.dataset.busy) return;
    go.dataset.busy = '1';
    var path = mode === 'manage' ? '/v1/billing/portal' : '/v1/billing/checkout';
    fetch(path, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ period: period }),
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.url) { location.href = d.url; return; }
        fine.textContent = d.detail || 'Something went wrong';
        go.dataset.busy = '';
      })
      .catch(function () { go.dataset.busy = ''; });
  });
})();
</script>
</body></html>`;
}
