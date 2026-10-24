/* Übersetzungen: Englisch steht im HTML (data-i18n="schlüssel"), hier kommen nur die Übersetzungen dazu.
   Neue Sprache = neuer Eintrag in `translations` mit denselben Schlüsseln. Fehlende Schlüssel bleiben Englisch. */
export const translations = {
  de: {
    name: 'Deutsch',
    'btn.start': 'App starten',
    'btn.download': 'App laden',
    'btn.startweb': 'Web-App starten',
    'intro.title': 'Dein Handy ist voller Fotos, die gleich aussehen?',
    'hero.title': 'Lass sie antreten. Behalte die besten.',
    'f1.title': 'Immer zwei Fotos gegeneinander.',
    'f1.sub': 'Du wählst den Sieger.',
    'f2.title': 'Ranking ansehen, den Rest löschen.',
    'f2.sub': 'Viele auf einmal löschen, favorisieren oder teilen.',
    'f3.title': 'Ähnliche Fotos, für dich gruppiert.',
    'f3.sub': 'Fotos bleiben auf deinem Gerät.',
    'f4.title': 'Freu dich wieder auf deine Mediathek.',
    'f4.sub': 'Mach saubere Fotos zur Gewohnheit.',
    'tip.trigger': 'Wie?',
    'tip.text':
      'Deine Fotos werden nie hochgeladen. Dein Browser erzeugt nur temporäre Links auf die Dateien auf deinem Gerät. Sie existieren nur im Arbeitsspeicher und werden gelöscht, sobald du zurücksetzt, das Turnier beendest oder die Seite verlässt.',
    'cta.title': 'Finde deine Lieblingsfotos mit Favopic.',
    'cta.or': 'oder',
    'footer.copy': '© Favopic, 2026. Alle Rechte vorbehalten.',
    'footer.contact': 'Kontakt',
    'footer.terms': 'AGB',
    'footer.privacy': 'Datenschutz',
    'footer.imprint': 'Impressum',
  },
};

const KEY = 'favopic-lang';
const english = new Map();
const nodes = [...document.querySelectorAll('[data-i18n]')];
nodes.forEach((n) => english.set(n, n.textContent));
const toggle = document.querySelector('[data-lang-toggle]');

export function setLanguage(lang) {
  const dict = translations[lang];
  nodes.forEach((n) => {
    n.textContent = (dict && dict[n.dataset.i18n]) || english.get(n);
  });
  document.documentElement.lang = dict ? lang : 'en';
  if (toggle) toggle.textContent = dict ? dict.name : 'English';
  try {
    localStorage.setItem(KEY, dict ? lang : 'en');
  } catch {
    /* Speicher blockiert: gilt dann nur für diese Sitzung */
  }
}

let current = 'en';
try {
  const saved = localStorage.getItem(KEY);
  current = saved || (navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'en');
} catch {
  /* s. o. */
}
if (current !== 'en') setLanguage(current);
toggle?.addEventListener('click', () => {
  current = current === 'en' ? 'de' : 'en';
  setLanguage(current);
});
