# Lern-App (PWA)

Kurze Lernrunden für unterwegs. Läuft im Browser, lässt sich auf dem iPhone
zum Home-Bildschirm hinzufügen und funktioniert offline.

## Aufbau

```
index.html, manifest.webmanifest, sw.js   App-Hülle, PWA-Manifest, Service Worker (offline)
css/style.css                             Gestaltung (hell/dunkel automatisch)
js/config.js                              ← Supabase-URL und -Key eintragen
js/app.js                                 Bildschirme: Fächerauswahl → Runde → Ergebnis
js/inhalte.js                             lädt Fächer und Fragen
js/wiederholung.js                        Spaced Repetition (Leitner-Boxen)
js/speicher.js                            lokaler Speicher + Offline-Warteschlange
js/sync.js                                Upload zu Supabase
js/fragetypen/                            ein Modul pro Fragetyp (bisher: karteikarte)
faecher/<fach>/fragen.json                ← Inhalte, ein Ordner pro Fach
faecher/index.json                        wird automatisch erzeugt, nicht von Hand bearbeiten
supabase/schema.sql                       SQL für die Datenbank
scripts/                                  lokaler Server, Index-Generator, Icon-Generator
start.cmd                                 Doppelklick = App lokal starten
```

## Neues Fach anlegen

1. Ordner anlegen, z. B. `faecher/mathe/` (Ordnername = Fach-ID; nur Kleinbuchstaben, Ziffern und `-`).
2. Darin `fragen.json` anlegen:

```json
{
  "name": "Mathe",
  "beschreibung": "Grundlagen",
  "symbol": "➗",
  "fragen": [
    { "id": "ma-001", "typ": "karteikarte", "vorderseite": "7 · 8 = ?", "rueckseite": "56" }
  ]
}
```

3. Die Seite neu laden. Bei laufendem `start.cmd` wird `faecher/index.json` automatisch neu erzeugt.

**Wichtig:** Ändere die `id` einer Frage nie nachträglich, denn der Lernfortschritt hängt an ihr.
Ordner, deren Name mit `_` beginnt, werden ignoriert (praktisch für Entwürfe).

## Fragetypen erweitern

Jede Frage hat ein Feld `typ`. Für einen neuen Typ (z. B. Multiple Choice):

1. `js/fragetypen/multiple-choice.js` anlegen, nach dem Muster von `karteikarte.js`:
   `typ`, `istGueltig(frage)` und `zeige(frage, container, beiAntwort)`.
2. In `js/fragetypen/index.js` importieren und in `alleTypen` eintragen.
3. Die Datei in `sw.js` zur Liste `APP_DATEIEN` hinzufügen und `CACHE` hochzählen.

`beiAntwort({ richtig, details })` speichert automatisch. In `details` kann ein Typ
beliebige Zusatzinfos ablegen (z. B. die eingegebene Zahl); sie landen in der Spalte `details`.
Fragen mit unbekanntem Typ werden einfach übersprungen.

## Wiederholungslogik

Leitner-System in `js/wiederholung.js`:

| Box | nächste Wiederholung nach |
|-----|---------------------------|
| 0   | 10 Minuten (nicht gewusst) |
| 1   | 1 Tag  |
| 2   | 3 Tagen |
| 3   | 7 Tagen |
| 4   | 16 Tagen |
| 5   | 35 Tagen |
| 6   | 60 Tagen (Maximum, die Frage kommt immer wieder) |

„Gewusst“ bedeutet eine Box höher, „Nicht gewusst“ zurück auf Box 0.
Eine Runde besteht aus fälligen Fragen, dann neuen, und wird bei Bedarf mit
den als Nächstes fälligen aufgefüllt.

---

## Supabase einrichten (Schritt für Schritt)

Ohne Supabase funktioniert die App auch, speichert dann aber nur lokal (oben rechts steht „lokal“).

### 1. Projekt anlegen
1. Auf <https://supabase.com> registrieren und anmelden.
2. **New project** anklicken.
3. Einen Namen vergeben (z. B. `lern-app`) und ein Datenbank-Passwort festlegen.
   Das Passwort gut aufbewahren, die App selbst braucht es nicht.
4. Eine Region wählen, z. B. **Central EU (Frankfurt)**, dann **Create new project**. Die Einrichtung dauert 1–2 Minuten.

### 2. Tabelle erstellen
1. Links im Menü **SQL Editor** öffnen, dann **New query**.
2. Den kompletten Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen.
3. **Run** klicken. Unten sollte „Success. No rows returned“ stehen.
4. Kontrolle: Unter **Table Editor** gibt es jetzt die Tabelle `antworten`.

Die Tabelle ist durch Row Level Security geschützt. Die App darf nur Antworten
*einfügen*, aber nichts lesen, ändern oder löschen.

### 3. Keys in die App eintragen
1. Links unten **Project Settings**, dann **API Keys** (bzw. **Data API**) öffnen.
2. Diese beiden Werte kopieren:
   - die **Project URL**, z. B. `https://abcdefghijkl.supabase.co`
     (steht unter *Data API* bzw. oben auf der Projektseite)
   - den **Publishable key** (`sb_publishable_…`).
     Bei älteren Projekten heißt er **anon public** (beginnt mit `eyJ…`).
3. In [`js/config.js`](js/config.js) eintragen:

```js
export const SUPABASE_URL = 'https://abcdefghijkl.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_xxxxxxxx';
```

> ⚠️ Niemals den **secret**- bzw. **service_role**-Key eintragen, denn der hat vollen Zugriff.
> Der Publishable-Key darf öffentlich sein, die Rechte regelt die Policy aus `schema.sql`.

### 4. Testen
App neu laden und eine Runde spielen. Oben rechts sollte kurz „Sync …“ und dann
„✓ synchron“ erscheinen. Im **Table Editor**, Tabelle `antworten`, siehst du die Zeilen.
Steht dort „⚠ … offen“, zeigt ein langer Druck bzw. Mouseover auf die Anzeige die Fehlermeldung.

---

## Lokal starten

Doppelklick auf **`start.cmd`** und dann im Browser <http://localhost:8080/> öffnen.
Zum Beenden das Fenster schließen. Es muss nichts installiert werden, das Skript nutzt Windows PowerShell.

Tipp: In Chrome/Edge mit F12 → **Application** siehst du Service Worker, Cache und `localStorage`.

## Aufs iPhone bringen

Service Worker (und damit Offline-Betrieb) funktionieren nur über **HTTPS**.
Die App wird deshalb über **GitHub Pages** veröffentlicht (kostenlos, öffentliches Repository),
genau wie die Kalender-App.

1. Auf dem iPhone in **Safari** die Pages-Adresse öffnen (`https://vbarney1.github.io/<repo-name>/`).
2. Auf **Teilen** (□↑) tippen, dann **Zum Home-Bildschirm**.
3. Die App einmal mit Netz vom Home-Bildschirm starten. Danach geht sie auch offline.

**Updates:**
1. Neues Fach oder neue Fragen? Erst einmal `start.cmd` ausführen, damit `faecher/index.json` aktuell ist.
2. Committen und pushen. Nach 1–2 Minuten ist die neue Version online.

Die App lädt neue Inhalte im Hintergrund. Sichtbar werden sie beim **übernächsten** Öffnen.
Das ist gewollt, damit der Start im Funkloch schnell bleibt.

## Bekannte Grenzen (Grundgerüst)

- Kein Login: Jedes Gerät bekommt eine zufällige `geraet_id`. Der Lernfortschritt liegt
  lokal auf dem Gerät. Er lässt sich später aus der Tabelle `antworten` wiederherstellen,
  sobald es ein Login gibt (Supabase Auth).
- iOS kann Daten von Web-Apps löschen, die wochenlang nicht geöffnet wurden. Die Antworten
  liegen dann aber schon in Supabase.
