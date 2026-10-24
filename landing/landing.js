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

/* Intro: erst nur das Foto, nach 1,2 s (oder beim ersten Scrollen) fährt das Phone hoch, 1,1 s später kommt der Titel.
   Bis alles an seinem Platz steht, scrollt die Seite nicht; Scrollen startet nur das Intro. */
const hero = document.querySelector('.hero');
const heroTitle = document.querySelector('.hero__title');
const phone = document.querySelector('.phone');
const span = (s, from, to) => clamp01((s - from) / (to - from));
let locked = false;
let started = false;
let phoneTimer;
const unlock = () => { locked = false; };
function showTitle() {
  hero.classList.add('is-title');
  heroTitle.addEventListener('animationend', unlock, { once: true });
  setTimeout(unlock, 2500);
}
function begin() {
  if (started) return;
  started = true;
  clearTimeout(phoneTimer);
  hero.classList.add('is-phone');
  setTimeout(showTitle, 1100);
}
if (hero && !calm.matches) {
  if (scrollY > 8) {
    started = true;
    hero.classList.add('is-phone', 'is-title');
  } else {
    locked = true;
    phoneTimer = setTimeout(begin, 1200);
    const hold = (e) => { if (locked) { e.preventDefault(); begin(); } };
    addEventListener('wheel', hold, { passive: false });
    addEventListener('touchmove', hold, { passive: false });
    addEventListener('keydown', (e) => { if ([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'End', 'Home'].includes(e.key)) hold(e); });
    addEventListener('scroll', () => { if (locked && scrollY > 0) { scrollTo(0, 0); begin(); } }, { passive: true });
  }
}

// Das Phone ist ein einziges Objekt: Es scrollt mit dem Hero bis auf die Position des ersten Features und bleibt dort stehen, blendet kurz vor
// "Let them compete" aus und kommt mit dem ersten Feature wieder (das Feature hat dafür nur einen unsichtbaren Platzhalter).
const shot = articles[0]?.querySelector('.device-shot');
const stage = document.querySelector('.features__stage');
const PHONE_H = 643.55;
function updatePhone(s, H, featureOpacity) {
  if (!phone || !shot || !stage || calm.matches) return;
  const base = phone.offsetTop; // Position ohne Transform (CSS top)
  const shotRect = shot.getBoundingClientRect();
  const pinned = shotRect.top - stage.getBoundingClientRect().top; // Platzhalter-Position, sobald die Bühne steht
  const inFeatures = features.getBoundingClientRect().top < H;
  const y = inFeatures ? shotRect.top : Math.max(pinned, base - s);
  const o = inFeatures ? featureOpacity : 1 - span(s, 0.7 * H, 0.95 * H);
  phone.style.setProperty('--py', `${y - base}px`);
  phone.style.setProperty('--k', String(shotRect.height / PHONE_H));
  phone.style.setProperty('--po', String(o));
  phone.style.visibility = o <= 0.001 ? 'hidden' : '';
}

function updateFeatures() {
  if (!features) return 1;
  const stepLen = 0.6 * innerHeight;
  const top = features.getBoundingClientRect().top;
  const enter = clamp01((top - 0.15 * innerHeight) / (0.7 * innerHeight)); // das erste Feature blendet beim Hereinscrollen ein
  const t = Math.min(articles.length, Math.max(0, -top / stepLen)); // 0..n, jeder Schritt hat eine Strecke
  let first = 1;
  articles.forEach((a, i) => {
    let d = t - (i + 0.5); // Abstand zur Mitte des Schritts
    if ((i === 0 && d < 0) || (i === articles.length - 1 && d > 0)) d = 0; // erster steht schon da, letzter bleibt bis zum Ende
    let g = clamp01((Math.abs(d) - 0.2) / 0.3); // 0 = voll da, 1 = weg
    if (i === 0) g = Math.max(g, enter);
    if (i === 0) first = 1 - g;
    a.style.setProperty('--o', String(1 - g));
    a.style.setProperty('--b', calm.matches ? '0px' : `${2 * g}px`);
    a.style.setProperty('--y', calm.matches ? '0px' : `${(d > 0 ? -10 : 10) * g}px`);
    a.style.pointerEvents = g > 0.5 ? 'none' : '';
  });
  return first;
}

function update() {
  ticking = false;
  updatePhone(scrollY, innerHeight, updateFeatures());
  // Header: weiß auf dem Foto, dunkel mit weißem Verlauf, sobald das Foto den Header verlassen hat
  if (header && photo) {
    const noPhoto = getComputedStyle(photo).display === 'none';
    header.classList.toggle('is-light', noPhoto || photo.getBoundingClientRect().bottom <= header.offsetHeight * 0.6);
  }
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
addEventListener('resize', update);
update();

/* ---------- Zeiger-Neigung (nur mit echter Maus, ohne reduzierte Bewegung) ---------- */
// Das Phone folgt dem Zeiger überall (die Seite zum Zeiger kommt näher, max. 5°). Auf dem Phone selbst neigt sich dagegen die Seite
// weg, auf der der Zeiger steht (max. 3°), so lässt es sich ausrichten.
const live = () => matchMedia('(hover: hover) and (pointer: fine)').matches && !calm.matches;
const tilt = phone?.querySelector('[data-tilt]');
if (phone && tilt) {
  const clamp = (v) => Math.max(-1, Math.min(1, v));
  addEventListener('pointermove', (e) => {
    if (!live() || phone.style.visibility === 'hidden') return;
    const r = phone.getBoundingClientRect();
    const over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    let rx;
    let ry;
    if (over) {
      ry = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * 3;
      rx = -clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * 3;
    } else {
      ry = -clamp((e.clientX - (r.left + r.width / 2)) / (innerWidth / 2)) * 5;
      rx = clamp((e.clientY - (r.top + r.height / 2)) / (innerHeight / 2)) * 5;
    }
    tilt.classList.remove('is-leaving');
    tilt.style.setProperty('--rx', `${rx}deg`);
    tilt.style.setProperty('--ry', `${ry}deg`);
  });
  document.documentElement.addEventListener('pointerleave', () => {
    tilt.classList.add('is-leaving');
    tilt.style.removeProperty('--rx');
    tilt.style.removeProperty('--ry');
  });
}
