// The first thing anyone sees. It explains the one gesture that is not
// obvious - holding a key over a subtitle - and then gets out of the way.

for (const node of document.querySelectorAll('[data-i18n]')) {
  node.textContent = t(node.dataset.i18n);
}
// The subtitle is animated as one selection: the hand and the highlight in
// the first slide tell the same story, from the first letter to the last.
const line = t('tourSubtitle');
const caption = document.getElementById('caption');
caption.textContent = line;
caption.classList.add('pick');

document.documentElement.lang = chrome.i18n.getUILanguage().split('-')[0];
document.title = t('appName');

document.getElementById('connect').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});
document.getElementById('desktop').addEventListener('click', async () => {
  const reply = await fetch('https://app.subtitlenotes.workers.dev/desktop/latest');
  const latest = await reply.json();
  window.open(latest.url, '_blank');
});
document.getElementById('later').addEventListener('click', () => window.close());

const deck = document.getElementById('tour');
const track = document.getElementById('tourTrack');
const slides = [...deck.querySelectorAll('.tour-slide')];
const dots = [...deck.querySelectorAll('.tour-dot')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let atSlide = 0;
let timer;

function show(index, fromPerson = false) {
  atSlide = (index + slides.length) % slides.length;
  track.style.transform = `translateX(${-atSlide * 100}%)`;
  slides.forEach((slide, position) => slide.classList.toggle('is-active', position === atSlide));
  dots.forEach((dot, position) => dot.setAttribute('aria-current', String(position === atSlide)));
  if (fromPerson) restart();
}
function stop() { clearInterval(timer); timer = undefined; }
function restart() {
  stop();
  if (!reduced) timer = setInterval(() => show(atSlide + 1), 6000);
}
deck.querySelector('[data-tour-prev]').addEventListener('click', () => show(atSlide - 1, true));
deck.querySelector('[data-tour-next]').addEventListener('click', () => show(atSlide + 1, true));
dots.forEach((dot, index) => dot.addEventListener('click', () => show(index, true)));
deck.addEventListener('mouseenter', stop);
deck.addEventListener('mouseleave', restart);
deck.addEventListener('focusin', stop);
deck.addEventListener('focusout', restart);
let touchStart = 0;
deck.addEventListener('touchstart', event => { touchStart = event.changedTouches[0].clientX; }, { passive: true });
deck.addEventListener('touchend', event => {
  const delta = event.changedTouches[0].clientX - touchStart;
  if (Math.abs(delta) > 34) show(atSlide + (delta < 0 ? 1 : -1), true);
}, { passive: true });
restart();
