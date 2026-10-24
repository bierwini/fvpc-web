import './i18n.js';

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
const pinned = window.matchMedia('(min-height: 52rem)');
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

/* ---------- Header: weiß auf dem Foto, dunkel mit weißem Verlauf, sobald das Foto den Header verlassen hat ---------- */
const header = document.querySelector('.hero-wrap .site-header');
const photo = document.querySelector('.hero-wrap__bg');
if (header && photo) {
  let ticking = false;
  const update = () => {
    ticking = false;
    const noPhoto = getComputedStyle(photo).display === 'none';
    header.classList.toggle('is-light', noPhoto || photo.getBoundingClientRect().bottom <= header.offsetHeight * 0.6);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
}

/* ---------- Pointer-Animationen: Buttons und Phones folgen dem Mauszeiger (nur mit echter Maus, ohne reduzierte Bewegung) ---------- */
const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
const live = () => fine.matches && !calm.matches;

// Buttons: bleiben stehen, der Zoom wächst von der Mausposition aus (Ursprung folgt dem Zeiger).
document.querySelectorAll('.btn').forEach((el) => {
  el.addEventListener('pointermove', (e) => {
    if (!live()) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--ox', `${e.clientX - r.left}px`);
    el.style.setProperty('--oy', `${e.clientY - r.top}px`);
  });
});

// Hero-Phone: neigt sich leicht zum Zeiger (max. 3,5°), beim Verlassen schwingt es ruhig zurück.
document.querySelectorAll('[data-tilt]').forEach((el) => {
  el.addEventListener('pointermove', (e) => {
    if (!live()) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    el.classList.remove('is-leaving');
    el.style.setProperty('--ry', `${nx * 7}deg`);
    el.style.setProperty('--rx', `${-ny * 7}deg`);
  });
  el.addEventListener('pointerleave', () => {
    el.classList.add('is-leaving');
    el.style.removeProperty('--rx');
    el.style.removeProperty('--ry');
  });
});
