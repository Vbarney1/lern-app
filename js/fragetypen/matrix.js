// Fragetyp "matrix": Ergebnis-Matrix (oder Vektor/Zahl) über eine Mini-Tastatur eingeben.
//
// JSON:
//   { "id": "la-040", "typ": "matrix",
//     "frage": "Berechne R(x,180°)·R(z,−90°).",
//     "matrizen": [ … ],                       ← optional: gegebene Matrizen anzeigen
//     "beschriftung": "R",                     ← optional: Name vor dem Eingabefeld
//     "loesung": [[0,1,0],[1,0,0],[0,0,-1]],   ← Größe der Eingabe = Größe der Lösung
//     "tastatur": "einfach" | "voll",          ← optional, Standard: automatisch
//     "toleranz": 0.001,                       ← optional
//     "erklaerung": "…" }
//
// Tastatur "einfach" (nur −1, 0, 1) wird automatisch gewählt, wenn die Lösung
// nur aus diesen Werten besteht – ideal für Drehungen um Vielfache von 90°.
// Eine einzelne Zahl ist einfach eine 1×1-Lösung: [[5]].

import { el } from '../dom.js';
import { zeigeMatrix, zeigeGegebeneMatrizen, formatiereZahl } from '../matrixanzeige.js';
import { zeigeAufloesung } from './gemeinsam.js';

const TASTEN_EINFACH = ['−1', '0', '1', '⌫'];
const TASTEN_VOLL = ['7', '8', '9', '⌫', '4', '5', '6', '−', '1', '2', '3', ',', '←', '0', '→', 'C'];

function nurEinfacheWerte(loesung) {
  return loesung.flat().every((w) => w === -1 || w === 0 || w === 1);
}

function alsZahl(text) {
  if (text === '' || text === '-' || text === ',') return NaN;
  return Number(text.replace(',', '.'));
}

export default {
  typ: 'matrix',

  istGueltig(f) {
    const l = f.loesung;
    return typeof f.frage === 'string' && Array.isArray(l) && l.length > 0
      && l.every((zeile) => Array.isArray(zeile) && zeile.length === l[0].length && zeile.every(Number.isFinite));
  },

  zeige(frage, container, beiAntwort) {
    const zeilen = frage.loesung.length;
    const spalten = frage.loesung[0].length;
    const anzahl = zeilen * spalten;
    const loesung = frage.loesung.flat();
    const einfach = (frage.tastatur ?? (nurEinfacheWerte(frage.loesung) ? 'einfach' : 'voll')) === 'einfach';
    const toleranz = frage.toleranz ?? 0.001;

    const eingaben = Array(anzahl).fill(''); // intern mit "-" und ","
    let aktiv = 0;
    let fertig = false;

    // ---- Eingabe-Raster ----
    const zellen = eingaben.map((_, i) =>
      el('button', { class: 'zelle', type: 'button', onclick: () => { if (!fertig) { aktiv = i; zeichne(); } } }));
    const raster = el('div', { class: 'matrix matrix--eingabe', style: `grid-template-columns: repeat(${spalten}, auto)` }, zellen);

    // ---- Tastatur ----
    const tasten = (einfach ? TASTEN_EINFACH : TASTEN_VOLL).map((t) =>
      el('button', { class: `taste${t === '⌫' || t === 'C' ? ' taste--funktion' : ''}`, type: 'button', onclick: () => druecke(t) }, t));
    const tastatur = el('div', { class: `tastatur ${einfach ? 'tastatur--einfach' : ''}` }, tasten);

    const hinweis = el('p', { class: 'hinweis hinweis--klein' });
    const pruefen = el('button', { class: 'knopf', type: 'button', onclick: pruefe }, 'Prüfen');
    const bedienung = el('div', { class: 'bedienung' }, tastatur, hinweis, pruefen);

    container.append(
      el('div', { class: 'aufgabe' }, el('p', { class: 'aufgabe__text' }, frage.frage), zeigeGegebeneMatrizen(frage)),
      el('div', { class: 'matrixblock matrixblock--eingabe' },
        frage.beschriftung ? el('span', { class: 'matrixblock__name' }, `${frage.beschriftung} =`) : null,
        raster),
      bedienung,
    );
    zeichne();

    // Am PC auch mit der echten Tastatur bedienbar.
    function tastendruck(e) {
      if (!container.isConnected || fertig) return document.removeEventListener('keydown', tastendruck);
      const map = { Backspace: '⌫', ArrowLeft: '←', ArrowRight: '→', Tab: '→', '-': '−', '.': ',', ',': ',', Delete: 'C' };
      let t = map[e.key] ?? (/^[0-9]$/.test(e.key) ? e.key : null);
      if (e.key === 'Enter') { e.preventDefault(); return pruefe(); }
      if (!t) return;
      if (einfach) t = { '1': '1', '0': '0', '−': '−1', '⌫': '⌫', '←': '←', '→': '→' }[t];
      if (!t) return;
      e.preventDefault();
      druecke(t);
    }
    document.addEventListener('keydown', tastendruck);

    function druecke(t) {
      if (fertig) return;
      let wert = eingaben[aktiv];
      if (t === '←') aktiv = Math.max(0, aktiv - 1);
      else if (t === '→') aktiv = Math.min(anzahl - 1, aktiv + 1);
      else if (t === '⌫') wert = einfach ? '' : wert.slice(0, -1);
      else if (t === 'C') wert = '';
      else if (einfach) {
        eingaben[aktiv] = t === '−1' ? '-1' : t;
        aktiv = Math.min(anzahl - 1, aktiv + 1); // direkt zum nächsten Feld
        return zeichne();
      } else if (t === '−') wert = wert.startsWith('-') ? wert.slice(1) : `-${wert}`;
      else if (t === ',') { if (!wert.includes(',')) wert = `${wert || '0'},`; }
      else if (wert.replace(/[-,]/g, '').length < 8) wert = wert === '0' ? t : wert === '-0' ? `-${t}` : wert + t;
      if (!['←', '→'].includes(t)) eingaben[aktiv] = wert;
      zeichne();
    }

    function zeichne() {
      zellen.forEach((z, i) => {
        z.textContent = eingaben[i].replace('-', '−') || '·';
        z.classList.toggle('zelle--leer', eingaben[i] === '');
        z.classList.toggle('zelle--aktiv', !fertig && i === aktiv);
      });
      hinweis.textContent = '';
    }

    function pruefe() {
      if (fertig) return;
      const zahlen = eingaben.map(alsZahl);
      if (zahlen.some(Number.isNaN)) {
        hinweis.textContent = 'Bitte alle Felder ausfüllen.';
        aktiv = zahlen.findIndex(Number.isNaN);
        zellen.forEach((z, i) => z.classList.toggle('zelle--aktiv', i === aktiv));
        return;
      }
      fertig = true;
      document.removeEventListener('keydown', tastendruck);
      const stimmt = zahlen.map((z, i) => Math.abs(z - loesung[i]) <= toleranz);
      const richtig = stimmt.every(Boolean);
      zellen.forEach((z, i) => {
        z.disabled = true;
        z.classList.remove('zelle--aktiv');
        z.classList.add(stimmt[i] ? 'zelle--richtig' : 'zelle--falsch');
      });
      bedienung.remove();

      const extra = richtig ? null : el('div', { class: 'loesung' },
        el('span', { class: 'loesung__titel' }, 'Richtig wäre:'),
        zeigeMatrix(frage.loesung, frage.beschriftung));
      zeigeAufloesung(container, { richtig, erklaerung: frage.erklaerung, extra },
        () => beiAntwort({ richtig, details: { eingabe: zahlen.map(formatiereZahl).join(' ') } }));
    }
  },
};
