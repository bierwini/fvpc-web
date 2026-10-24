/* Übersetzungen: Englisch steht im HTML (data-i18n="schlüssel"), hier kommen nur die weiteren Sprachen dazu.
   Neue Sprache = neuer Eintrag in `translations` mit denselben Schlüsseln. Fehlende Schlüssel bleiben Englisch.
   Die Texte hier sind Entwürfe und werden durch die finalen Übersetzungen ersetzt. */
export const translations = {
  de: {
    name: 'Deutsch',
    'btn.download': 'App laden',
    'btn.tryweb': 'Web testen',
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
    'tip.text': 'Deine Fotos werden nie hochgeladen. Dein Browser erzeugt nur temporäre Links auf die Dateien auf deinem Gerät. Sie existieren nur im Arbeitsspeicher und werden gelöscht, sobald du zurücksetzt, das Turnier beendest oder die Seite verlässt.',
    'cta.title': 'Finde deine Lieblingsfotos.',
    'footer.copy': '© Favopic, 2026. Alle Rechte vorbehalten.',
    'footer.contact': 'Kontakt',
    'footer.terms': 'AGB',
    'footer.privacy': 'Datenschutz',
    'footer.imprint': 'Impressum',
  },
  fr: {
    name: 'Français',
    'btn.download': "Télécharger l'app",
    'btn.tryweb': 'Essayer le Web',
    'intro.title': 'Votre téléphone est plein de photos qui se ressemblent ?',
    'hero.title': 'Faites-les s’affronter. Gardez les meilleures.',
    'f1.title': 'Deux photos à la fois.',
    'f1.sub': 'Vous choisissez la gagnante.',
    'f2.title': 'Obtenez un classement, supprimez le reste.',
    'f2.sub': 'Supprimez, mettez en favori ou partagez en masse.',
    'f3.title': 'Les photos similaires, regroupées pour vous.',
    'f3.sub': 'Vos photos restent sur votre appareil.',
    'f4.title': 'Retrouvez le plaisir de votre photothèque.',
    'f4.sub': 'Faites du tri une habitude.',
    'tip.trigger': 'Comment ?',
    'tip.text': 'Vos photos ne sont jamais envoyées. Votre navigateur crée seulement des liens temporaires vers les fichiers de votre appareil. Ils n’existent qu’en mémoire et sont supprimés dès que vous réinitialisez, terminez le tournoi ou quittez la page.',
    'cta.title': 'Trouvez vos photos préférées.',
    'footer.copy': '© Favopic, 2026. Tous droits réservés.',
    'footer.contact': 'Contact',
    'footer.terms': 'Conditions',
    'footer.privacy': 'Confidentialité',
    'footer.imprint': 'Mentions légales',
  },
  es: {
    name: 'Español',
    'btn.download': 'Descargar app',
    'btn.tryweb': 'Probar Web',
    'intro.title': '¿Tu móvil está lleno de fotos que se parecen?',
    'hero.title': 'Déjalas competir. Quédate con las mejores.',
    'f1.title': 'Dos fotos a la vez.',
    'f1.sub': 'Tú eliges la ganadora.',
    'f2.title': 'Consigue un ranking, borra el resto.',
    'f2.sub': 'Borra, marca como favoritas o comparte muchas a la vez.',
    'f3.title': 'Fotos parecidas, agrupadas para ti.',
    'f3.sub': 'Tus fotos se quedan en tu dispositivo.',
    'f4.title': 'Disfruta de tu galería otra vez.',
    'f4.sub': 'Haz de las fotos limpias un hábito.',
    'tip.trigger': '¿Cómo?',
    'tip.text': 'Tus fotos nunca se suben. Tu navegador solo crea enlaces temporales a los archivos de tu dispositivo. Existen solo en la memoria y se eliminan en cuanto restableces, cierras el torneo o sales de la página.',
    'cta.title': 'Encuentra tus fotos favoritas.',
    'footer.copy': '© Favopic, 2026. Todos los derechos reservados.',
    'footer.contact': 'Contacto',
    'footer.terms': 'Términos',
    'footer.privacy': 'Privacidad',
    'footer.imprint': 'Aviso legal',
  },
};
const ENGLISH = 'English';

const KEY = 'favopic-lang';
const nodes = [...document.querySelectorAll('[data-i18n]')];
const english = new Map(nodes.map((n) => [n, n.textContent]));
const current = document.querySelector('[data-lang-current]');
const list = document.querySelector('[data-lang-list]');

function setLanguage(lang) {
  const dict = translations[lang];
  nodes.forEach((n) => {
    n.textContent = dict?.[n.dataset.i18n] ?? english.get(n);
  });
  document.documentElement.lang = dict ? lang : 'en';
  if (current) current.textContent = dict ? dict.name : ENGLISH;
  buildList(dict ? lang : 'en');
  try {
    localStorage.setItem(KEY, dict ? lang : 'en');
  } catch {
    /* Speicher blockiert: gilt dann nur für diese Sitzung */
  }
}

// Liste über dem Footer-Link: alle Sprachen außer der aktuellen, in derselben Schrift wie der Link.
function buildList(active) {
  if (!list) return;
  const options = [['en', ENGLISH], ...Object.entries(translations).map(([code, t]) => [code, t.name])];
  list.replaceChildren(
    ...options
      .filter(([code]) => code !== active)
      .map(([code, name]) => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = name;
        b.lang = code;
        b.addEventListener('click', () => {
          setLanguage(code);
          toggle(false);
        });
        li.append(b);
        return li;
      }),
  );
}

function toggle(open) {
  if (!list || !current) return;
  list.hidden = !open;
  current.setAttribute('aria-expanded', String(open));
}

let start = 'en';
try {
  start = localStorage.getItem(KEY) || (navigator.language || '').slice(0, 2).toLowerCase();
} catch {
  /* s. o. */
}
setLanguage(translations[start] ? start : 'en');
current?.addEventListener('click', () => toggle(list.hidden));
document.addEventListener('click', (e) => {
  if (!e.target.closest('.lang')) toggle(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') toggle(false);
});
