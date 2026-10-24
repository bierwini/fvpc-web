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

/* ---------- Features: aktiver Schritt = der Scroll-Abschnitt, der den oberen Fensterrand kreuzt ---------- */
const articles = [...document.querySelectorAll('.feature')];
const steps = [...document.querySelectorAll('.features__steps > div')];
if (steps.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const index = steps.indexOf(entry.target);
        articles.forEach((a, i) => {
          a.classList.toggle('is-active', i === index);
          a.classList.toggle('is-past', i < index);
        });
      }
    },
    { rootMargin: '0px 0px -100% 0px' }, // eine Linie am oberen Fensterrand (= Position der klebenden Bühne)
  );
  steps.forEach((s) => observer.observe(s));
}

/* ---------- Header: weiß auf dem Foto, dunkel mit weißem Verlauf, sobald das Foto den Header verlassen hat ---------- */
const header = document.querySelector('[data-header]');
const photo = document.querySelector('.hero__bg');
if (header && photo) {
  const update = () => {
    const noPhoto = getComputedStyle(photo).display === 'none';
    header.classList.toggle('is-light', noPhoto || photo.getBoundingClientRect().bottom <= header.offsetHeight * 0.6);
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
}

/* ---------- Pointer-Animationen (nur mit echter Maus, ohne reduzierte Bewegung) ---------- */
const live = () => matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;

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
