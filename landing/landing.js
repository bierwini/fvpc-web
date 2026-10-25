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

// Das Phone scrollt mit dem Hero und wird im letzten Viertel schneller, sodass es zusammen mit dem Hero verschwindet
const PHONE_H = 643.55;
function updatePhone(s, H) {
  if (!phone || calm.matches) return;
  const gone = (phone.offsetTop + PHONE_H - H + 24) * span(s, 0.7 * H, H) ** 2; // so viel schneller als die Seite
  phone.style.setProperty('--py', `${-gone}px`);
  phone.style.visibility = s >= H ? 'hidden' : '';
}

// "Let them compete": kommt kurz vor der Mitte rein (Fade-Up mit Blur), bleibt stehen, scrollt dann mit der Seite nach oben und blendet dabei aus.
// Kurz bevor es den Header erreicht, scrollt der Header raus und das Raster wird weiß.
const compete = document.querySelector('.compete');
const competeText = document.querySelector('.compete__text');
const heroAll = document.querySelector('.hero-all');
const ease = (v) => 1 - (1 - clamp01(v)) ** 3;
function updateCompete(s, H) {
  if (!compete || calm.matches) return;
  const into = ease(span(s, 0.82 * H, H));
  const out = ease(span(s, 1.45 * H, 1.78 * H));
  const leave = ease(span(s, 1.72 * H, 1.95 * H));
  competeText.style.setProperty('--o', String(into * (1 - out)));
  competeText.style.setProperty('--b', `${8 * (1 - into) + 8 * out}px`);
  competeText.style.setProperty('--y', `${12 * (1 - into) - 12 * out}px`);
  heroAll.style.setProperty('--co', String(leave));
  if (header) header.style.transform = `translateY(${-leave * header.offsetHeight * 1.05}px)`;
}

// Call to Action: Überschrift, Button und Badge kommen nacheinander, je weiter der Abschnitt ins Bild scrollt
const cta = document.querySelector('#get-the-app');
const ctaItems = [...document.querySelectorAll('.cta-item')];
function updateCta(H) {
  if (!cta || calm.matches) return;
  const r = clamp01((H - cta.getBoundingClientRect().top) / H);
  ctaItems.forEach((el, i) => {
    const k = ease(span(r, 0.35 + 0.18 * i, 0.7 + 0.15 * i));
    el.style.setProperty('--o', String(k));
    el.style.setProperty('--b', `${6 * (1 - k)}px`);
    el.style.setProperty('--y', `${14 * (1 - k)}px`);
  });
}

// Features: Die Bühne steht, sobald "Let them compete" weg ist. Das erste Feature (Text und Phone) kommt von unten, danach überblenden die
// Schritte ineinander (Crossfade mit kleinem Blur, ohne Versatz).
function updateFeatures() {
  if (!features) return;
  const n = articles.length;
  const stepLen = 0.6 * innerHeight;
  const u = -features.getBoundingClientRect().top / stepLen; // Schritte seit die Bühne steht
  const enter = span(u, 0, 0.5);
  const p = Math.min(n - 1, Math.max(0, u - 0.5)); // 0..n-1, ganze Zahl = Feature steht
  const i0 = Math.min(n - 2, Math.floor(p));
  const x = clamp01((p - i0 - 0.3) / 0.4); // Überblendung im mittleren Teil jedes Schritts
  articles.forEach((a, i) => {
    let o = i === i0 ? 1 - x : i === i0 + 1 ? x : 0;
    let b = i === i0 ? 2 * x : i === i0 + 1 ? 2 * (1 - x) : 0; // kleiner Blur nur im Crossfade, kein Versatz
    let y = 0;
    if (i === 0) { o *= enter; y = 20 * (1 - enter); b += 4 * (1 - enter); } // nur der Einstieg kommt von unten
    a.style.setProperty('--o', String(o));
    a.style.setProperty('--b', calm.matches ? '0px' : `${b}px`);
    a.style.setProperty('--y', calm.matches ? '0px' : `${y}px`);
    a.style.pointerEvents = o > 0.5 ? '' : 'none';
  });
}

function update() {
  ticking = false;
  updatePhone(scrollY, innerHeight);
  updateCompete(scrollY, innerHeight);
  updateCta(innerHeight);
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
