const root = document.documentElement;

/* ---------- Edition-Switch: steuert nur, welcher Header-Button sichtbar ist (CSS über data-edition) ---------- */
const options = document.querySelectorAll('[data-edition-option]');
const KEY = 'favopic-edition';

function setEdition(edition) {
  root.dataset.edition = edition;
  options.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.editionOption === edition)));
  try {
    localStorage.setItem(KEY, edition);
  } catch {
    /* Speicher blockiert: egal, die Auswahl gilt dann nur für diese Sitzung */
  }
}

let saved = null;
try {
  saved = localStorage.getItem(KEY);
} catch {
  /* s. o. */
}
setEdition(saved === 'ios' ? 'ios' : 'web');
options.forEach((b) => b.addEventListener('click', () => setEdition(b.dataset.editionOption)));

/* ---------- "How?"-Bubble: Hover und Fokus über CSS, Tippen (Touch) und Escape hier ---------- */
const tip = document.querySelector('.tip');
const tipTrigger = tip?.querySelector('.tip__trigger');
if (tip && tipTrigger) {
  tipTrigger.addEventListener('click', () => tip.classList.toggle('is-open'));
  document.addEventListener('click', (e) => {
    if (!tip.contains(e.target)) tip.classList.remove('is-open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') tip.classList.remove('is-open');
  });
}

/* ---------- Features: aktiver Schritt = der Scroll-Abschnitt, der den oberen Fensterrand kreuzt ---------- */
const features = document.querySelector('.features');
const articles = [...document.querySelectorAll('.feature')];
const steps = [...document.querySelectorAll('.features__steps > div')];
// Muss exakt zur Media Query in landing.css passen (nur sehr niedrige Fenster fallen zurück).
const pinned = window.matchMedia('(min-height: 34rem)');
let observer = null;

function activate(index) {
  articles.forEach((a, i) => {
    a.classList.toggle('is-active', i === index);
    // Inaktive Schritte sind visibility:hidden und damit auch für Screenreader ausgeblendet.
  });
}

function syncFeatures() {
  observer?.disconnect();
  observer = null;
  if (!features || !pinned.matches) return;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) activate(steps.indexOf(entry.target));
      }
    },
    { rootMargin: '0px 0px -100% 0px' }, // eine Linie am oberen Fensterrand (= Position der klebenden Bühne)
  );
  steps.forEach((s) => observer.observe(s));
}

syncFeatures();
pinned.addEventListener('change', syncFeatures);

/* ---------- Header über dem Foto: weiße Schrift, danach (wenn das Foto weggescrollt ist) dunkel ---------- */
const header = document.querySelector('.site-header');
const photo = document.querySelector('.hero-wrap__bg');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (header && photo) {
  let ticking = false;
  const update = () => {
    ticking = false;
    const over = !reduceMotion.matches && photo.getBoundingClientRect().bottom > header.offsetHeight * 0.75;
    header.classList.toggle('is-over-photo', over);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
}
