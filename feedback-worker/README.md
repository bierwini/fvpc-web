# Favopic Feedback-Worker

Cloudflare Worker (Free Tier), der Feedback und Bug-Reports der iOS-App entgegennimmt und per E-Mail an dich weiterleitet.

```
iOS-App  --POST /feedback-->  api.favopic.de (Worker)  --E-Mail-->  dein Postfach
                              prüft Key, Größe, Felder, Rate Limit
```

**Dieser Ordner ist unabhängig von der Website** (`feedback-worker/` hat eigenes `package.json`, die Website bleibt unberührt).

## 0. Weiterleitungsziel: Empfehlung E-Mail

Ich habe **E-Mail über Cloudflare Email Routing** gebaut (`send_email`-Binding):

- kostenlos, kein weiterer Dienstleister außer Cloudflare (der ohnehin den Worker betreibt, wichtig für die Datenschutzerklärung)
- landet dort, wo du ohnehin hinschaust; **Antworten funktionieren direkt** (Reply-To = Adresse des Nutzers, falls gültig)
- Logs gehen sauber als Textanhang mit; keine Längenprobleme (Discord/Slack kappen lange Nachrichten bei ca. 2.000–4.000 Zeichen)
- keine Webhook-URL, die irgendwo leaken kann

Alternativen wären ein privater Discord/Slack-Webhook (schnelle Push-Benachrichtigung, aber Daten bei einem zweiten US-Anbieter, Logs nur als Datei-Upload) oder ein privates GitHub-Issue (gut zum Nachverfolgen, aber Nutzertexte und Logs liegen dauerhaft bei GitHub). **Sag Bescheid, wenn du lieber eine davon möchtest**, dann tausche ich nur die Funktion `forward()` in `src/index.ts`.

## 1. Voraussetzungen

- Node.js 20+ und ein Cloudflare-Account (Free)
- Die Domain `favopic.de` ist als Zone bei Cloudflare angelegt (Nameserver umgestellt)
- Für `api.favopic.de` existiert noch **kein** DNS-Eintrag (sonst vorher löschen, sonst bricht der Deploy ab)

## 2. Cloudflare Email Routing einrichten (einmalig, Dashboard)

1. Dashboard → Domain `favopic.de` → **E-Mail** → **Email Routing** → *Aktivieren*. Cloudflare legt dabei MX- und SPF-Einträge an, klicke auf *Add records and enable*.
   - **Achtung:** Nutzt `favopic.de` bereits ein anderes Mail-Postfach (z. B. Google Workspace oder iCloud), würden die MX-Einträge dessen Mail-Empfang ersetzen. Dann melde dich, wir lösen das anders (z. B. Absender auf Subdomain).
2. Tab **Destination addresses** → *Add destination address* → deine echte Adresse (z. B. Gmail) eintragen → die **Bestätigungsmail** anklicken.
   Nur bestätigte Adressen können als Ziel dienen.
3. Optional (nicht nötig für den Worker): eine Regel `kontakt@favopic.de → deine Adresse` für eingehende Mails.

Der Absender `feedback@favopic.de` muss nicht als Postfach existieren; es muss nur die Domain `favopic.de` sein.

## 3. Projekt einrichten und deployen

```bash
cd feedback-worker
npm install
npx wrangler login                 # öffnet den Browser, Cloudflare-Login bestätigen

npx wrangler deploy                # erster Deploy, legt Worker + Durable Object an
                                   # und die Custom Domain api.favopic.de (DNS + Zertifikat automatisch)
```

Ohne Secrets antwortet der Worker bis zum nächsten Schritt mit `500` (er lässt nichts durch, wenn er nicht konfiguriert ist).

### Secrets setzen

```bash
# 1. Key erzeugen (64 Hex-Zeichen) und notieren, er geht an deinen iOS-Entwickler
openssl rand -hex 32

# 2. Key als Secret speichern (Wert wird abgefragt, nicht ins Terminal tippen/ins Repo schreiben)
npx wrangler secret put FAVOPIC_KEY

# 3. Deine Zieladresse (muss in Email Routing bestätigt sein, siehe oben)
npx wrangler secret put FEEDBACK_TO
```

Jedes `secret put` erzeugt automatisch eine neue Version und aktiviert sie. Prüfen: `npx wrangler secret list` (zeigt nur Namen). Den Key kannst du jederzeit mit `secret put` ersetzen; dann muss die App aktualisiert werden.

### Domain prüfen

Dashboard → Workers & Pages → `favopic-feedback` → *Settings* → *Domains & Routes*: `api.favopic.de` sollte als Custom Domain mit Status *Active* stehen. Das Zertifikat kann wenige Minuten brauchen. Unter DNS siehst du den automatisch angelegten Eintrag für `api` (Proxy an, orange Wolke). **Nichts manuell anlegen.**

## 4. Lokal testen (optional, vor dem Deploy)

```bash
printf 'FAVOPIC_KEY=testkey\nFEEDBACK_TO=ich@example.com\n' > .dev.vars   # ist in .gitignore
npx wrangler dev --port 8787
# in einem zweiten Terminal:
KEY=testkey ./scripts/curl-tests.sh
```

Lokal versendet Wrangler keine echten Mails, sondern schreibt sie als `.eml`-Datei nach `.wrangler/tmp/email/` (Pfad steht im Log). Unit-Tests: `npm test`, Typen: `npm run typecheck`.

## 5. Tests mit curl (produktiv)

```bash
export URL=https://api.favopic.de/feedback
export KEY=<dein Key>
```

Gültiges Feedback (erwartet `200 {"ok":true}`, Mail kommt an):

```bash
curl -i -X POST $URL -H "Content-Type: application/json" -H "X-Favopic-Key: $KEY" \
  -d '{"type":"feedback","email":"test@example.com","message":"Tolle App!"}'
```

Bug-Report mit Logs (200; Mail mit Anhang `favopic-logs.txt`):

```bash
curl -i -X POST $URL -H "Content-Type: application/json" -H "X-Favopic-Key: $KEY" \
  -d '{"type":"bugReport","email":"","message":"Crash beim Start","deviceInfo":"iPhone, iOS 26.1, v1.0 (12)","logs":"zeile 1\nzeile 2"}'
```

| Fall | Befehl (Kurzform) | Erwartung |
|---|---|---|
| Key fehlt | wie oben, ohne `-H "X-Favopic-Key..."` | `401` |
| Key falsch | `-H "X-Favopic-Key: falsch"` | `401` |
| Zu groß | `head -c 250000 /dev/zero \| tr '\0' a > big.txt; curl -i -X POST $URL -H "Content-Type: application/json" -H "X-Favopic-Key: $KEY" --data-binary @big.txt` | `413` |
| Falscher type | `-d '{"type":"spam","message":"x"}'` | `400` |
| Leere Nachricht | `-d '{"type":"feedback","message":""}'` | `400` |
| Falsche Methode | `curl -i $URL -H "X-Favopic-Key: $KEY"` | `405` |
| Falscher Pfad | `curl -i -X POST https://api.favopic.de/x ...` | `404` |
| Falscher Content-Type | `-H "Content-Type: text/plain"` | `415` |

Rate Limit: dieselbe gültige Anfrage 6-mal schicken. Die ersten 5 geben `200`, die 6. `429` mit `Retry-After`-Header (Sekunden). Nur **gültige** Anfragen zählen; Fehlversuche (400/401/413) verbrauchen kein Kontingent.

```bash
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST $URL -H "Content-Type: application/json" \
    -H "X-Favopic-Key: $KEY" -d '{"type":"feedback","message":"Ratelimit-Test"}'
done     # 200 200 200 200 200 429
```

Alles auf einmal: `BASE_URL=https://api.favopic.de KEY=$KEY ./scripts/curl-tests.sh` (versendet dabei 5 echte Test-Mails; danach bist du 10 Minuten gedrosselt, `SKIP_RATELIMIT=1` lässt den Drossel-Teil weg).

## 6. Was der Worker tut (Spec-Abgleich)

- Nur `POST /feedback`; `404` für andere Pfade, `405` für andere Methoden.
- `X-Favopic-Key` wird in konstanter Zeit gegen `FAVOPIC_KEY` geprüft, sonst `401`.
- `Content-Type: application/json` Pflicht (`415`); Body max. 200 KB (`413`), geprüft per `Content-Length` **und** an den tatsächlich gelesenen Bytes.
- Strenge Validierung (`400`): `type` ∈ {`feedback`,`bugReport`}, `message` nicht leer und ≤ 5.000 Zeichen, `email` ≤ 254, `logs` ≤ 100.000 Bytes (UTF-8). Zeichen werden wie in Swift als Graphem-Cluster gezählt, damit Emoji nicht zu Unrecht abgelehnt werden. Steuerzeichen außer `\n` und `\t` werden entfernt.
- `email` ist nur ein Reply-To-Hinweis: Nur wenn syntaktisch plausibel (ohne Leerzeichen/Kommas/Zeilenumbrüche, also kein Header-Injection-Risiko) wird sie als `Reply-To` gesetzt, sonst stillschweigend ignoriert. `deviceInfo`/`logs` werden bei `feedback` verworfen.
- Rate Limit: 5 gültige Einsendungen pro 10 Minuten pro Client-IP (IPv6 pro /64), danach `429`. Umsetzung als Durable Object (SQLite, im Free Tier enthalten), weil das eingebaute Rate-Limiting-Binding nur 10- oder 60-Sekunden-Fenster kennt. Werte stehen in `wrangler.toml` (`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_SECONDS`). Gespeichert werden nur Zeitstempel unter einem Hash der IP; nach Fensterende wird alles gelöscht.
- Mail: fester Betreff (`[Favopic] Feedback` / `[Favopic] Bug-Bericht`) ohne Nutzerinhalt, Inhalt nur als `text/plain` (kein HTML), Logs als Anhang `favopic-logs.txt`.
- Keine CORS-Header, keine Stacktraces (Fehler sind nur `{"ok":false}` mit kurzem Fehlerhinweis bei 400).
- Antwort bei Erfolg: `200 {"ok":true}`. Fällt der Mailversand oder der Rate Limiter aus: `502` bzw. `503` (die App zeigt dann „fehlgeschlagen“ und der Nutzer kann es erneut versuchen).

### Logging und Aufbewahrung

- Der Worker loggt nur `{status, bodyBytes, type, logs:true/false}`. Weder Nachricht, E-Mail, Logs noch IP. Workers Logs/Observability sind in `wrangler.toml` bewusst **aus**.
- Der Worker **speichert nichts**, außer den anonymen Rate-Limit-Zeitstempeln (max. 10 Minuten). Die Daten existieren danach ausschließlich **in deinem Postfach** (und im Postfach-Anbieter, z. B. Gmail). Die Aufbewahrungsdauer bestimmst du damit selbst: Lege fest, wann du Mails löschst (Empfehlung: Bug-Reports mit Logs nach Bearbeitung, spätestens nach 6 Monaten).
- Cloudflare selbst sieht die Verbindungsdaten (IP etc.) als Hosting-/Netzwerkanbieter und verarbeitet die Mail beim Versand kurz.

### Grenzen / ehrlich gesagt

- Der Key steckt in der App und ist extrahierbar. Er hält nur Gelegenheits-Spam ab. Der Hauptschutz ist das IP-Limit. Später möglich: Apple **App Attest**.
- Ein Angreifer mit vielen IPs kann trotzdem Mails erzeugen. Bei Bedarf Cloudflare WAF Rate Limiting für `api.favopic.de` oder Turnstile/App Attest ergänzen.
- 200 KB Gesamtgröße: JSON maskiert `\n` als `\\n` und `/` als `\\/`. 100.000 Bytes Logs können dadurch bis etwa 150–200 KB groß werden. Ist das zu knapp, `maxBodyBytes` in `src/validate.ts` erhöhen.
- Es gibt wegen der Free-Tier-Grenzen (100.000 Requests/Tag) keine Kosten, aber auch keine Garantie bei Massenspam.

## 7. Checkliste für den iOS-Entwickler

- [ ] URL: `POST https://api.favopic.de/feedback`
- [ ] Header `Content-Type: application/json`
- [ ] Header **`X-Favopic-Key: <der erzeugte 64-stellige Hex-Key>`** (Key separat und sicher übergeben, nicht in Git/Chat-Verlauf Dritter; `openssl rand -hex 32`)
- [ ] Body exakt wie vereinbart: `type` (`"feedback"` | `"bugReport"`), `email` (optional, auch `""`), `message` (nicht leer, ≤ 5.000), nur bei bugReport `deviceInfo` und optional `logs` (≤ 100.000 Bytes, UTF-8)
- [ ] 2xx = Erfolg (Antwort `{"ok":true}`, wird ignoriert); `400/401/413/415/429/5xx` = Fehlschlag
- [ ] Bei `429` gibt es einen `Retry-After`-Header; die App darf weiterhin eine generische Fehlermeldung zeigen
- [ ] Limit: 5 erfolgreiche Einsendungen pro 10 Minuten pro Netzwerk-IP (Testen in Büro/WLAN teilt die IP!)
- [ ] Gesamtgröße < 200 KB (Logs vorher auf die letzten Zeilen kürzen)
- [ ] ATS: HTTPS ist Pflicht (ist gegeben); keine Ausnahme nötig
- [ ] Datenschutz-Hinweis in der App vor dem Senden (Logs enthalten ggf. Gerätedaten; Toggle für Logs bleibt freiwillig)

## 8. Hinweis für die Datenschutzerklärung (keine Rechtsberatung)

Ergänze einen Abschnitt „Feedback und Fehlerberichte in der App“, der den Ist-Zustand beschreibt:

- **Daten:** Nachrichtentext, optional die von dir angegebene E-Mail-Adresse, bei Fehlerberichten Geräteinfos (Gerätetyp, iOS-Version, App-Version) und, **nur wenn der Nutzer es aktiviert lässt**, App-Protokolle (Logs). Dazu technisch die IP-Adresse bei der Übertragung.
- **Zweck:** Bearbeitung von Rückmeldungen, Fehleranalyse, bei angegebener E-Mail: Antwort an den Nutzer.
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Produktverbesserung); bei Antworten auf Anfragen zusätzlich lit. b bzw. a. Die Eingabe ist freiwillig, Logs sind ein freiwilliger Schalter (Einwilligung, Art. 6 Abs. 1 lit. a).
- **Empfänger/Auftragsverarbeiter:** Cloudflare, Inc. (Betrieb des Dienstes `api.favopic.de` und E-Mail-Weiterleitung, USA, Absicherung über EU-US Data Privacy Framework und Standardvertragsklauseln; Cloudflare stellt dafür einen Auftragsverarbeitungsvertrag (DPA) bereit, bitte prüfen, dass er für deinen Account gilt) sowie dein E-Mail-Anbieter (z. B. Google für Gmail).
- **Speicherung:** Der Dienst speichert Inhalte nicht selbst und schreibt sie nicht in Logs. Sie liegen nur in deinem Postfach. Nenne die konkrete Löschfrist (z. B. „spätestens nach 6 Monaten bzw. nach Abschluss der Bearbeitung“). IP-Adressen werden nur kurzzeitig (10 Minuten, als Hash) zur Missbrauchsabwehr verwendet.
- **Hinweis:** Nutzer sollen keine sensiblen Daten in das Freitextfeld schreiben. Auskunft/Löschung per E-Mail an dich.
- **App-Store-Datenschutzangaben („Nutrition Labels“):** Mindestens „Other User Content“ (Nachricht) bzw. „Contact Info – Email Address“ und ggf. „Diagnostics“ (Logs), jeweils *nicht mit Identität verknüpft* bzw. verknüpft, wenn eine E-Mail angegeben wird. Zweck: „App Functionality“, kein Tracking.
