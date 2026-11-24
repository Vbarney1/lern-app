// Darstellung von Matrizen/Vektoren und Zahlen (deutsches Format).

import { el } from './dom.js';

// 0.5 → "0,5"   -3 → "−3"
export function formatiereZahl(wert) {
  if (typeof wert !== 'number') return String(wert);
  const gerundet = Math.round(wert * 10000) / 10000;
  return String(gerundet).replace('.', ',').replace('-', '−');
}

// Text mit kleinen Formeln: Ausdrücke wie "[1 0 0]ᵀ", "R(z, 90°)" oder "det(2·A)"
// werden nie mittendrin umgebrochen (sie rutschen als Ganzes in die nächste Zeile).
const FORMEL = /(\[[^\]\n]*\][ᵀ⁻¹]*|[A-Za-zᵃᵇ]+\([^()\n]{1,14}\)[ᵀ⁻¹]*)/g;
export function formelText(text) {
  return String(text).split(FORMEL).map((teil, i) =>
    (i % 2 === 1 ? el('span', { class: 'formel' }, teil) : teil));
}

// Eine Matrix mit Klammern, optional mit Namen davor ("A =").
export function zeigeMatrix(werte, name) {
  const spalten = werte[0]?.length ?? 1;
  const raster = el('div', { class: 'matrix', style: `grid-template-columns: repeat(${spalten}, auto)` },
    werte.flat().map((w) => el('span', { class: 'matrix__wert' }, formatiereZahl(w))));
  return el('div', { class: 'matrixblock' },
    name ? el('span', { class: 'matrixblock__name' }, `${name} =`) : null,
    raster);
}

// Alle in einer Frage mitgegebenen Matrizen ("matrizen": [{ "name": "A", "werte": [[…]] }]).
export function zeigeGegebeneMatrizen(frage) {
  if (!Array.isArray(frage.matrizen) || !frage.matrizen.length) return null;
  return el('div', { class: 'gegeben' }, frage.matrizen.map((m) => zeigeMatrix(m.werte, m.name)));
}
