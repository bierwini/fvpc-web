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
const heroSection = document.querySelector('.hero');
const heroTitle = document.querySelector('.hero__title');
const phone = document.querySelector('.phone');
const features = document.querySelector('.features');
const articles = [...document.querySelectorAll('.feature')];
const header = document.querySelector('[data-header]');
const photo = document.querySelector('.hero__bg');
const clamp01 = (v) => Math.min(1, Math.max(0, v));
let ticking = false;

function updateHero(s, H) {
  if (calm.matches) return;
  // Titel startet in der Mitte, scrollt nur halb so schnell nach oben und blendet am Ende aus.
  heroTitle.style.setProperty('--ty', `${0.5 * Math.min(s, 1.2 * H)}px`);
  heroTitle.style.setProperty('--to', String(1 - clamp01((s - 0.5 * H) / (0.4 * H))));
  // Phone: kommt von unten 1,3 x so schnell wie die Seite, danach 2,5 x so schnell wieder hinaus (weg, wenn "Let them compete" in der Mitte steht).
  const base = H + 60; // Ausgangslage unter dem unteren Rand (wie im CSS)
  const s1 = 0.45 * H;
  const y1 = base - 1.3 * s1;
  const y = s <= s1 ? base - 1.3 * s : y1 - ((y1 + 663) / (0.5 * H)) * (s - s1);
  phone.style.setProperty('--sy', `${y - (base - s)}px`);
  phone.style.setProperty('--sx', `${clamp01(s / H) * 22}deg`); // neigt sich mit dem Scrollen zurück
}

function updateFeatures() {
  if (!features) return;
  const stepLen = 0.6 * innerHeight;
  const t = Math.min(4, Math.max(0, -features.getBoundingClientRect().top / stepLen)); // 0..4, jeder Schritt hat eine Strecke
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
  const H = heroSection.offsetHeight;
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

// Hero-Phone folgt dem Zeiger: Im ganzen Hero neigt es sich zur Mausposition (max. 5°). Die Seite zum Zeiger kommt näher.
const hero = document.querySelector('.hero-all');
document.querySelectorAll('[data-tilt]').forEach((el) => {
  const clamp = (v) => Math.max(-1, Math.min(1, v));
  hero?.addEventListener('pointermove', (e) => {
    if (!live()) return;
    const r = el.getBoundingClientRect();
    const dx = clamp((e.clientX - (r.left + r.width / 2)) / (innerWidth / 2));
    const dy = clamp((e.clientY - (r.top + r.height / 2)) / (innerHeight / 2));
    el.classList.remove('is-leaving');
    el.style.setProperty('--ry', `${-dx * 5}deg`);
    el.style.setProperty('--rx', `${dy * 5}deg`);
  });
  hero?.addEventListener('pointerleave', () => {
    el.classList.add('is-leaving');
    el.style.removeProperty('--rx');
    el.style.removeProperty('--ry');
  });
});
