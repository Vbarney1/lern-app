// Register aller Fragetypen.
//
// Jeder Fragetyp ist ein Modul mit diesem Aufbau:
//
//   export default {
//     typ: 'karteikarte',                 // Wert des Feldes "typ" in der JSON
//     istGueltig(frage) { … },            // true, wenn alle nötigen Felder da sind
//     zeige(frage, container, beiAntwort) // zeichnet die Frage in "container"
//   }
//
// "beiAntwort" muss genau einmal aufgerufen werden:
//   beiAntwort({ richtig: true | false, details: {…optional…} })
//
// Neuer Typ: Datei anlegen, hier importieren und in die Liste eintragen
// (und in sw.js zu APP_DATEIEN hinzufügen) – der Rest der App bleibt unverändert.

import karteikarte from './karteikarte.js';
import auswahl from './auswahl.js';
import matrix from './matrix.js';

const alleTypen = [karteikarte, auswahl, matrix];

const register = Object.fromEntries(alleTypen.map((t) => [t.typ, t]));

export function holeFragetyp(typ) {
  return register[typ];
}

export function istUnterstuetzt(frage) {
  const typ = frage && register[frage.typ];
  return Boolean(typ && frage.id && typ.istGueltig(frage));
}

// Kurzer Text einer Frage (für Listen, z. B. aussortierte Fragen).
export function frageText(frage) {
  return String(frage.frage ?? frage.vorderseite ?? frage.id).slice(0, 200);
}
