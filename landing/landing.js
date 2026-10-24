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

/* ---------- Scroll-Szene: Hero, Parallax des Phones, Feature-Wechsel und Header, alles aus der Scrollposition berechnet ---------- */
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const heroTitle = document.querySelector('.hero__title');
const phone = document.querySelector('.phone');
const features = document.querySelector('.features');
const articles = [...document.querySelectorAll('.feature')];
const header = document.querySelector('[data-header]');
const photo = document.querySelector('.hero__bg');
const clamp01 = (v) => Math.min(1, Math.max(0, v));
let ticking = false;
features?.style.setProperty('--steps', String(articles.length));

const RUN = 1.6; // Hero bleibt so viele Fensterhöhen stehen (wie .hero-run im CSS: 100 + 160 svh)
const ease = (v) => 1 - (1 - clamp01(v)) ** 3;
const span = (s, from, to) => clamp01((s - from) / (to - from));

function updateHero(s, H) {
  if (calm.matches) return;
  // 1. Titel kommt in der Mitte per Scroll rein (unscharf zu scharf), 2. wandert auf seine Position,
  // 3. Phone fährt von unten auf seine Position, 4. neigt sich per Scroll, 5. alles scrollt zusammen weg, das Phone am Ende schneller.
  const fade = span(s, 0, 0.3 * H);
  const finalDy = 0.27 * H + heroTitle.offsetHeight / 2 - H / 2;
  heroTitle.style.setProperty('--to', String(fade));
  heroTitle.style.setProperty('--tb', `${12 * (1 - fade)}px`);
  heroTitle.style.setProperty('--ty', `${finalDy * ease(span(s, 0.25 * H, 0.6 * H))}px`);

  const phoneTop = parseFloat(getComputedStyle(phone).top);
  const rise = (H - phoneTop + 40) * (1 - ease(span(s, 0.5 * H, 1.1 * H))); // Abstand unter seiner Position
  const leave = s - RUN * H; // > 0: Hero scrollt mit der Seite weg
  const need = Math.max(0, phoneTop + 663 - 0.85 * H); // so viel mehr als die Seite, damit es nach 0,85 Fensterhöhen draußen ist
  const extra = leave > 0 ? need * (leave / (0.85 * H)) ** 2 : 0;
  phone.style.setProperty('--sy', `${rise - extra}px`);
  phone.style.setProperty('--sx', `${-6 * span(s, 1.0 * H, 1.9 * H)}deg`); // Oberkante neigt sich zum Betrachter
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
    a.style.setProperty('--b', calm.matches ? '0px' : `${10 * g}px`);
    a.style.setProperty('--y', calm.matches ? '0px' : `${(d > 0 ? -28 : 28) * g}px`);
    a.style.pointerEvents = g > 0.5 ? 'none' : '';
  });
}

function update() {
  ticking = false;
  const H = innerHeight;
  updateHero(scrollY, H);
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

// Hero-Phone folgt dem Zeiger nur nach links und rechts (max. 5°). Nach oben und unten neigt es sich per Scroll.
const hero = document.querySelector('.hero-all');
document.querySelectorAll('[data-tilt]').forEach((el) => {
  const clamp = (v) => Math.max(-1, Math.min(1, v));
  hero?.addEventListener('pointermove', (e) => {
    if (!live()) return;
    const r = el.getBoundingClientRect();
    const dx = clamp((e.clientX - (r.left + r.width / 2)) / (innerWidth / 2));
    el.classList.remove('is-leaving');
    el.style.setProperty('--ry', `${-dx * 5}deg`);
  });
  hero?.addEventListener('pointerleave', () => {
    el.classList.add('is-leaving');
    el.style.removeProperty('--ry');
  });
});
