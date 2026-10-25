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
features?.style.setProperty('--steps', String(articles.length - 0.2));

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

// "Let them compete": kommt kurz vor der Mitte rein (Fade-Up mit Blur), bleibt stehen und scrollt dann scharf mit der Seite nach oben.
// Sobald es den Header berührt, nimmt es ihn mit raus. Stößt es oben an, blendet das Raster aus.
const compete = document.querySelector('.compete');
const competeText = document.querySelector('.compete__text');
const heroAll = document.querySelector('.hero-all');
const ease = (v) => 1 - (1 - clamp01(v)) ** 3;
function updateCompete(s, H) {
  if (!compete || calm.matches) return;
  const into = ease(span(s, 0.82 * H, H));
  const yc = H / 2 - Math.max(0, s - 1.45 * H); // Mitte des Textes im Fenster, sobald die Haltezeit vorbei ist
  const hh = header ? header.offsetHeight : 88;
  const touch = hh + 35; // Der Text berührt den Header; ab da nimmt er ihn mit nach oben
  const up = clamp01((touch - yc) / hh); // Header scrollt genauso schnell wie der Text
  competeText.style.setProperty('--o', String(into));
  competeText.style.setProperty('--b', `${8 * (1 - into)}px`);
  competeText.style.setProperty('--y', `${12 * (1 - into)}px`);
  heroAll.style.setProperty('--co', String(span(120 - yc, 0, 120))); // Raster blendet aus, wenn der Text oben anstößt
  if (header) header.style.transform = `translateY(${-up * hh * 1.05}px)`;
}

// Call to Action: Überschrift, Button und Badge blenden nacheinander ein, 50 px bevor das Phone des letzten Features draußen ist.
// Beim Zurückscrollen blenden sie wieder aus, solange sie nicht ganz da sind. Sobald sie einmal ganz stehen, bleiben sie.
const cta = document.querySelector('#get-the-app');
const ctaItems = [...document.querySelectorAll('.cta-item')];
const lastShot = articles[articles.length - 1]?.querySelector('.device-shot');
const ctaDone = new Set();
const footer = document.querySelector('.site-footer');
const ctaStage = document.querySelector('.cta__stage');
let lastS = scrollY;
let drop = 0; // so weit ist die CTA beim Hochscrollen mit dem Footer nach unten gefahren
function updateCta() {
  if (!cta || !lastShot || calm.matches) return;
  const fh = footer.offsetHeight;
  cta.style.setProperty('--footer-h', `${fh}px`);
  // Beim Hochscrollen fahren Footer und CTA zusammen nach unten.
  const ds = scrollY - lastS;
  lastS = scrollY;
  const shown = scrollY - (document.documentElement.scrollHeight - innerHeight - fh); // sichtbare Footer-Höhe
  if (ds < 0) { if (shown > 0) drop = Math.min(fh, drop - ds); } // danach scrollt die ganze Section ohnehin mit der Seite
  else drop = Math.max(0, drop - ds);
  ctaStage.style.transform = drop ? `translateY(${drop}px)` : '';
  const t = 50 - lastShot.getBoundingClientRect().bottom; // > 0: das Phone ist weniger als 50 px vor dem Ausgang
  ctaItems.forEach((el, i) => {
    const raw = ease(span(t - 18 * i, 0, 45));
    if (raw >= 1) ctaDone.add(el);
    const k = ctaDone.has(el) ? 1 : raw;
    el.style.setProperty('--o', String(k));
    el.style.setProperty('--b', `${4 * (1 - k)}px`);
    el.style.setProperty('--y', `${6 * (1 - k)}px`);
    el.style.pointerEvents = k > 0.5 ? '' : 'none';
  });
}

// Features: Die Bühne steht schon, während "Let them compete" hinausgeht. Das erste Feature startet dabei (Text von unten, Phone nur ein), danach überblenden die
// Schritte ineinander (Crossfade mit kleinem Blur, nur der Text versetzt sich leicht).
function updateFeatures() {
  if (!features) return;
  const n = articles.length;
  const stepLen = 0.85 * innerHeight;
  const u = -features.getBoundingClientRect().top / stepLen; // Schritte seit die Bühne steht
  const enter = span(u, 0, 0.3);
  const p = Math.min(n - 1, Math.max(0, u - 0.3)); // 0..n-1, ganze Zahl = Feature steht
  const i0 = Math.min(n - 2, Math.floor(p));
  const x = clamp01((p - i0 - 0.375) / 0.25); // kurze Überblendung, davor und danach steht das Feature lange
  // Text: Der alte blendet in der ersten Hälfte aus (nach oben), der neue in der zweiten ein (von unten), so überdecken sie sich kaum.
  // Phone: echter Crossfade an Ort und Stelle. Beide mit kleinem Blur.
  const out = span(x, 0, 0.6);
  const inn = span(x, 0.4, 1);
  articles.forEach((a, i) => {
    const old = i === i0;
    const next = i === i0 + 1;
    let to = old ? 1 - out : next ? inn : 0;
    let po = old ? 1 - x : next ? x : 0;
    let tb = old ? 4 * out : next ? 4 * (1 - inn) : 0;
    let pb = old ? 2 * x : next ? 2 * (1 - x) : 0;
    let y = old ? -10 * out : next ? 10 * (1 - inn) : 0;
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
  updateCta();
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
