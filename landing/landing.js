import './i18n.js';

/* ---------- "How?"-Popover: Hover und Fokus über CSS, Tippen (Touch) und Escape hier ---------- */
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

/* ---------- Hero-Intro, Feature-Wechsel und Header ---------- */
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const features = document.querySelector('.features');
const articles = [...document.querySelectorAll('.feature')];
const header = document.querySelector('[data-header]');
const photo = document.querySelector('.hero__bg');
const clamp01 = (v) => Math.min(1, Math.max(0, v));
let ticking = false;
features?.style.setProperty('--steps', String(articles.length));

/* Intro: erst nur das Foto, nach 1,2 s (oder beim ersten Scrollen) fährt das Phone hoch, 1,1 s später (oder beim weiteren Scrollen) kommt der Titel */
const hero = document.querySelector('.hero');
let phoneTimer;
let titleTimer;
function showTitle() { clearTimeout(titleTimer); hero.classList.add('is-title'); }
function showPhone() {
  if (hero.classList.contains('is-phone')) return;
  clearTimeout(phoneTimer);
  hero.classList.add('is-phone');
  titleTimer = setTimeout(showTitle, 1100);
}
if (hero && !calm.matches) {
  phoneTimer = setTimeout(showPhone, 1200);
  addEventListener('scroll', () => {
    if (scrollY > 8) showPhone();
    if (scrollY > 0.15 * innerHeight && hero.classList.contains('is-phone')) showTitle();
  }, { passive: true });
}

function updateFeatures() {
  if (!features) return;
  const stepLen = 0.6 * innerHeight;
  const t = Math.min(articles.length, Math.max(0, -features.getBoundingClientRect().top / stepLen)); // 0..n, jeder Schritt hat eine Strecke
  articles.forEach((a, i) => {
    let d = t - (i + 0.5); // Abstand zur Mitte des Schritts
    if ((i === 0 && d < 0) || (i === articles.length - 1 && d > 0)) d = 0; // erster steht schon da, letzter bleibt bis zum Ende
    const g = clamp01((Math.abs(d) - 0.15) / 0.42); // 0 = voll da, 1 = weg
    a.style.setProperty('--o', String(1 - g));
    a.style.setProperty('--b', calm.matches ? '0px' : `${4 * g}px`);
    a.style.setProperty('--y', calm.matches ? '0px' : `${(d > 0 ? -14 : 14) * g}px`);
    a.style.pointerEvents = g > 0.5 ? 'none' : '';
  });
}

function update() {
  ticking = false;
  updateFeatures();
  // Header: weiß auf dem Foto, dunkel mit weißem Verlauf, sobald das Foto den Header verlassen hat
  if (header && photo) {
    const noPhoto = getComputedStyle(photo).display === 'none';
    header.classList.toggle('is-light', noPhoto || photo.getBoundingClientRect().bottom <= header.offsetHeight * 0.6);
  }
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
addEventListener('resize', update);
update();

/* ---------- Pointer-Animationen (nur mit echter Maus, ohne reduzierte Bewegung) ---------- */
const live = () => matchMedia('(hover: hover) and (pointer: fine)').matches && !calm.matches;

// Hero-Phone folgt dem Zeiger zur Mausposition (max. 5°).
const heroAll = document.querySelector('.hero-all');
document.querySelectorAll('[data-tilt]').forEach((el) => {
  const clamp = (v) => Math.max(-1, Math.min(1, v));
  heroAll?.addEventListener('pointermove', (e) => {
    if (!live()) return;
    const r = el.getBoundingClientRect();
    const dx = clamp((e.clientX - (r.left + r.width / 2)) / (innerWidth / 2));
    const dy = clamp((e.clientY - (r.top + r.height / 2)) / (innerHeight / 2));
    el.classList.remove('is-leaving');
    el.style.setProperty('--rx', `${dy * 5}deg`);
    el.style.setProperty('--ry', `${-dx * 5}deg`);
  });
  heroAll?.addEventListener('pointerleave', () => {
    el.classList.add('is-leaving');
    el.style.removeProperty('--rx');
    el.style.removeProperty('--ry');
  });
});
