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

// "Let them compete": kommt kurz vor der Mitte rein (Fade-Up mit Blur), bleibt stehen und scrollt dann ganz normal mit der Seite nach oben.
// Erst kurz vor dem Header blurt es, dann scrollen Text und Header zusammen nach oben raus, und das Raster wird dabei weiß.
const compete = document.querySelector('.compete');
const competeText = document.querySelector('.compete__text');
const heroAll = document.querySelector('.hero-all');
const ease = (v) => 1 - (1 - clamp01(v)) ** 3;
function updateCompete(s, H) {
  if (!compete || calm.matches) return;
  const into = ease(span(s, 0.82 * H, H));
  const yc = H / 2 - Math.max(0, s - 1.45 * H); // Mitte des Textes im Fenster, sobald die Haltezeit vorbei ist
  const near = span(200 - yc, 0, 110); // Blur, kurz bevor der Text den Header erreicht
  const gone = span(200 - yc, 30, 160);
  const up = clamp01((240 - yc) / 120); // Header und Raster gehen schon vor dem Blur mit dem Text raus
  competeText.style.setProperty('--o', String(into * (1 - gone)));
  competeText.style.setProperty('--b', `${8 * (1 - into) + 8 * near}px`);
  competeText.style.setProperty('--y', `${12 * (1 - into)}px`);
  heroAll.style.setProperty('--co', String(up));
  if (header) header.style.transform = `translateY(${-up * header.offsetHeight * 1.05}px)`;
}

// Call to Action: Überschrift, Button und Badge kommen nacheinander (je nach Position im Fenster), erst wenn das Phone fast draußen ist
const ctaItems = [...document.querySelectorAll('.cta-item')];
function updateCta(H) {
  if (calm.matches) return;
  ctaItems.forEach((el) => {
    const r = el.getBoundingClientRect();
    const k = ease((0.72 * H - (r.top + r.height / 2)) / 110);
    el.style.setProperty('--o', String(k));
    el.style.setProperty('--b', `${4 * (1 - k)}px`);
    el.style.setProperty('--y', `${12 * (1 - k)}px`);
  });
}

// Features: Die Bühne steht schon, während "Let them compete" hinausgeht. Das erste Feature startet dabei (Text von unten, Phone nur ein), danach überblenden die
// Schritte ineinander (Crossfade mit kleinem Blur, nur der Text versetzt sich leicht).
function updateFeatures() {
  if (!features) return;
  const n = articles.length;
  const stepLen = 0.6 * innerHeight;
  const u = -features.getBoundingClientRect().top / stepLen; // Schritte seit die Bühne steht
  const enter = span(u, 0, 0.5);
  const p = Math.min(n - 1, Math.max(0, u - 0.5)); // 0..n-1, ganze Zahl = Feature steht
  const i0 = Math.min(n - 2, Math.floor(p));
  const x = clamp01((p - i0 - 0.3) / 0.4); // Überblendung im mittleren Teil jedes Schritts
  // Text: Der alte blendet in der ersten Hälfte aus (nach oben), der neue in der zweiten ein (von unten), so überdecken sie sich kaum.
  // Phone: echter Crossfade an Ort und Stelle. Beide mit kleinem Blur.
  const out = span(x, 0, 0.6);
  const inn = span(x, 0.4, 1);
  articles.forEach((a, i) => {
    const old = i === i0;
    const next = i === i0 + 1;
    let to = old ? 1 - out : next ? inn : 0;
    let po = old ? 1 - x : next ? x : 0;
    let tb = old ? 3 * out : next ? 3 * (1 - inn) : 0;
    let pb = old ? 2 * x : next ? 2 * (1 - x) : 0;
    let y = old ? -8 * out : next ? 8 * (1 - inn) : 0;
    if (i === 0) { to *= enter; po *= enter; y += 20 * (1 - enter); tb += 4 * (1 - enter); pb += 4 * (1 - enter); } // Einstieg: Text von unten, Phone nur ein
    a.style.setProperty('--to', String(to));
    a.style.setProperty('--o', String(po));
    a.style.setProperty('--b', calm.matches ? '0px' : `${tb}px`);
    a.style.setProperty('--pb', calm.matches ? '0px' : `${pb}px`);
    a.style.setProperty('--y', calm.matches ? '0px' : `${y}px`);
    a.style.pointerEvents = to > 0.5 ? '' : 'none';
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
