// Lokaler Speicher (localStorage) – funktioniert auch komplett offline.
//
//   geraetId        zufällige ID dieses Geräts (ersetzt vorerst ein Login)
//   warteschlange   Antworten, die noch nicht zu Supabase übertragen wurden
//   fortschritt     Wiederholungs-Stand pro Frage (siehe wiederholung.js)

const SCHLUESSEL = {
  geraet: 'lernapp.geraetId',
  warteschlange: 'lernapp.warteschlange',
  fortschritt: 'lernapp.fortschritt',
  aussortiert: 'lernapp.aussortiert',
};

function lese(name, ersatz) {
  try {
    const roh = localStorage.getItem(name);
    return roh ? JSON.parse(roh) : ersatz;
  } catch {
    return ersatz;
  }
}

function schreibe(name, wert) {
  localStorage.setItem(name, JSON.stringify(wert));
}

// crypto.randomUUID gibt es nur über HTTPS/localhost – daher mit Ersatz.
export function neueId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function geraetId() {
  let id = localStorage.getItem(SCHLUESSEL.geraet);
  if (!id) {
    id = neueId();
    localStorage.setItem(SCHLUESSEL.geraet, id);
  }
  return id;
}

// ---- Fortschritt ----
export function leseFortschritt() {
  return lese(SCHLUESSEL.fortschritt, {});
}

export function setzeStand(schluessel, stand) {
  const alle = leseFortschritt();
  alle[schluessel] = stand;
  schreibe(SCHLUESSEL.fortschritt, alle);
}

// ---- Warteschlange für den Sync ----
export function leseWarteschlange() {
  return lese(SCHLUESSEL.warteschlange, []);
}

// "tabelle" = Ziel-Tabelle in Supabase. Wird vor dem Senden wieder entfernt.
export function reiheEin(datensatz, tabelle = 'antworten') {
  const liste = leseWarteschlange();
  liste.push({ ...datensatz, _tabelle: tabelle });
  schreibe(SCHLUESSEL.warteschlange, liste);
}

export function entferneAusWarteschlange(ids) {
  const weg = new Set(ids);
  schreibe(SCHLUESSEL.warteschlange, leseWarteschlange().filter((a) => !weg.has(a.id)));
}

// ---- Aussortierte Fragen ----
// { "fach/frage": { fachId, frageId, text, grund, kommentar, zeit } }
export function leseAussortiert() {
  return lese(SCHLUESSEL.aussortiert, {});
}

export function sortiereAus(schluessel, eintrag) {
  const alle = leseAussortiert();
  alle[schluessel] = eintrag;
  schreibe(SCHLUESSEL.aussortiert, alle);
}

export function nimmWiederAuf(schluessel) {
  const alle = leseAussortiert();
  delete alle[schluessel];
  schreibe(SCHLUESSEL.aussortiert, alle);
}

// Bittet den Browser, die Daten nicht automatisch zu löschen (v. a. iOS).
export function bitteUmDauerhaftenSpeicher() {
  navigator.storage?.persist?.().catch(() => {});
}
