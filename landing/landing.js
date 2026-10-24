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
        articles.forEach((a, i) => a.classList.toggle('is-active', i === index));
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

// Buttons bleiben stehen, der Zoom wächst von der Mausposition aus.
document.querySelectorAll('.btn').forEach((el) => {
  el.addEventListener('pointermove', (e) => {
    if (!live()) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--ox', `${e.clientX - r.left}px`);
    el.style.setProperty('--oy', `${e.clientY - r.top}px`);
  });
});

// Hero-Phone neigt sich leicht zum Zeiger (max. 3,5°).
document.querySelectorAll('[data-tilt]').forEach((el) => {
  el.addEventListener('pointermove', (e) => {
    if (!live()) return;
    const r = el.getBoundingClientRect();
    el.classList.remove('is-leaving');
    el.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 7}deg`);
    el.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - 0.5) * 7}deg`);
  });
  el.addEventListener('pointerleave', () => {
    el.classList.add('is-leaving');
    el.style.removeProperty('--rx');
    el.style.removeProperty('--ry');
  });
});
