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
