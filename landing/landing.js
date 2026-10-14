// Edition-Switch: steuert nur, welcher Button im Header sichtbar ist (CSS über data-edition).
const root = document.documentElement;
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
