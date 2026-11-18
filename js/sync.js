// Überträgt gespeicherte Antworten an Supabase (REST-API, ohne Zusatzbibliothek).
//
// Ablauf: Jede Antwort landet zuerst in der lokalen Warteschlange.
// Sobald Netz da ist, wird sie hochgeladen und danach lokal entfernt.
// Jede Antwort hat eine feste ID → doppeltes Hochladen schadet nicht
// (Supabase meldet 409 "schon vorhanden", das wird als Erfolg gewertet).

import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { leseWarteschlange, entferneAusWarteschlange } from './speicher.js';

const PAKET_GROESSE = 100;
let laeuft = false;
let letzterFehler = null;
const beobachter = new Set();

export function istKonfiguriert() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

export function beiStatusAenderung(fn) {
  beobachter.add(fn);
  fn(status());
}

function status() {
  return {
    konfiguriert: istKonfiguriert(),
    online: navigator.onLine,
    offen: leseWarteschlange().length,
    laeuft,
    fehler: letzterFehler,
  };
}

function melde() {
  const s = status();
  beobachter.forEach((fn) => fn(s));
}

function kopfzeilen() {
  const h = {
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
  // Alte "anon"-Keys sind JWTs (beginnen mit eyJ) und gehören zusätzlich
  // in den Authorization-Header. Neue "publishable" Keys nicht.
  if (SUPABASE_KEY.startsWith('eyJ')) h.Authorization = `Bearer ${SUPABASE_KEY}`;
  return h;
}

// Einfaches INSERT. (Ein "Upsert" mit on_conflict bräuchte Leserechte auf
// die Tabelle – die bekommt der öffentliche Key absichtlich nicht.)
let letzteFehlermeldung = '';
async function sende(antworten) {
  const basis = SUPABASE_URL.replace(/\/+$/, '');
  const antwort = await fetch(`${basis}/rest/v1/antworten`, {
    method: 'POST',
    headers: kopfzeilen(),
    body: JSON.stringify(antworten),
  });
  letzteFehlermeldung = antwort.ok ? '' : await antwort.text();
  return antwort.status;
}

function pruefe(status) {
  if (status < 200 || status >= 300) throw new Error(`Supabase ${status}: ${letzteFehlermeldung}`);
}

export async function synchronisiere() {
  if (laeuft || !istKonfiguriert() || !navigator.onLine) return melde();
  laeuft = true;
  melde();
  try {
    let offen = leseWarteschlange();
    while (offen.length) {
      const paket = offen.slice(0, PAKET_GROESSE);
      const status = await sende(paket);
      if (status === 409) {
        // Mindestens eine Antwort ist schon in Supabase (z. B. Verbindung brach
        // nach dem Speichern ab). Dann einzeln senden; 409 heißt "schon da".
        for (const einzeln of paket) {
          const s = await sende([einzeln]);
          if (s !== 409) pruefe(s);
        }
      } else {
        pruefe(status);
      }
      entferneAusWarteschlange(paket.map((a) => a.id));
      offen = leseWarteschlange();
    }
    letzterFehler = null;
  } catch (e) {
    letzterFehler = e.message;
    console.warn('Sync fehlgeschlagen – nächster Versuch später.', e);
  } finally {
    laeuft = false;
    melde();
  }
}

// Automatisch synchronisieren: beim Start, wenn das Netz zurückkommt,
// wenn die App wieder in den Vordergrund kommt und alle 2 Minuten.
export function starteAutoSync() {
  window.addEventListener('online', synchronisiere);
  window.addEventListener('offline', melde);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') synchronisiere();
  });
  setInterval(synchronisiere, 2 * 60 * 1000);
  synchronisiere();
}
