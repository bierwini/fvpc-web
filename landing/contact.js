import { translations } from './i18n.js';

/* Kontaktformular: Validierung im Browser, Honeypot-Feld und Mindestzeit gegen Bots, Versand per fetch an `data-endpoint`.
   Solange kein Endpunkt eingetragen ist, wird nichts gesendet. */
const form = document.querySelector('#contact-form');
const select = form?.querySelector('#cf-country');
const status = form?.querySelector('.form__status');
const sendBtn = form?.querySelector('button[type="submit"]');
const opened = Date.now();

// ISO-3166-Länder; die Namen kommen in der Sprache der Seite aus Intl.DisplayNames
const REGIONS = 'AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI KH CM CA CV CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KP KR XK KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PS PA PG PY PE PH PL PT QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW'.split(' ');

function buildCountries() {
  if (!select) return;
  const lang = document.documentElement.lang || 'en';
  const names = new Intl.DisplayNames([lang], { type: 'region' });
  const chosen = select.value;
  const items = REGIONS.map((code) => [code, names.of(code)]).sort((a, b) => a[1].localeCompare(b[1], lang));
  const first = document.createElement('option');
  first.value = '';
  first.textContent = text('contact.choose');
  select.replaceChildren(first, ...items.map(([code, name]) => Object.assign(document.createElement('option'), { value: code, textContent: name })));
  select.value = chosen;
}

const text = (key) => translations[document.documentElement.lang]?.[key] ?? FALLBACK[key];
const FALLBACK = {
  'contact.choose': 'Select a country',
  'contact.invalid': 'Please check the highlighted fields.',
  'contact.sending': 'Sending…',
  'contact.ok': 'Thank you! We will get back to you soon.',
  'contact.error': 'Something went wrong. Please try again later.',
  'contact.unavailable': 'The form is not available yet.',
};

function say(msg, ok) {
  status.hidden = !msg;
  status.textContent = msg;
  status.style.color = ok ? '' : '#d70015';
}

if (form) {
  buildCountries();
  document.addEventListener('favopic:lang', buildCountries);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fields = [...form.querySelectorAll('input:not([name="website"]), select, textarea')];
    fields.forEach((f) => f.setAttribute('aria-invalid', String(!f.checkValidity())));
    if (!form.checkValidity()) {
      form.querySelector('[aria-invalid="true"]')?.focus();
      return say(text('contact.invalid'), false);
    }
    const data = Object.fromEntries(new FormData(form));
    // Bots füllen das versteckte Feld oder senden sofort: so tun, als wäre es angekommen
    if (data.website || Date.now() - opened < 3000) return say(text('contact.ok'), true);
    const endpoint = form.dataset.endpoint;
    if (!endpoint) return say(text('contact.unavailable'), false);
    sendBtn.disabled = true;
    say(text('contact.sending'), true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: data.name, email: data.email, country: data.country, message: data.message }),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      say(text('contact.ok'), true);
    } catch {
      say(text('contact.error'), false);
    }
    sendBtn.disabled = false;
  });
}
