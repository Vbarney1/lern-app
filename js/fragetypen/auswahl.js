// Fragetyp "auswahl" (Multiple Choice, genau eine richtige Antwort).
//
// JSON:
//   { "id": "la-001", "typ": "auswahl",
//     "frage": "(A·B)ᵀ = ?",
//     "matrizen": [ { "name": "A", "werte": [[1,2],[3,4]] } ],   ← optional
//     "optionen": ["Bᵀ·Aᵀ", "Aᵀ·Bᵀ", "B·A"],
//     "richtig": 0,                                             ← Index in "optionen"
//     "erklaerung": "…" }                                       ← optional
// Die Optionen werden bei jeder Anzeige neu gemischt.

import { el } from '../dom.js';
import { zeigeGegebeneMatrizen, formelText } from '../matrixanzeige.js';
import { zeigeAufloesung, mische } from './gemeinsam.js';

export default {
  typ: 'auswahl',

  istGueltig(f) {
    return typeof f.frage === 'string'
      && Array.isArray(f.optionen) && f.optionen.length >= 2
      && Number.isInteger(f.richtig) && f.richtig >= 0 && f.richtig < f.optionen.length;
  },

  zeige(frage, container, beiAntwort) {
    const knoepfe = new Map();
    for (const i of mische(frage.optionen.map((_, i) => i))) {
      knoepfe.set(i, el('button', { class: 'option', type: 'button', onclick: () => waehle(i) }, formelText(frage.optionen[i])));
    }

    container.append(
      el('div', { class: 'aufgabe' }, el('p', { class: 'aufgabe__text' }, formelText(frage.frage)), zeigeGegebeneMatrizen(frage)),
      el('div', { class: 'optionen' }, [...knoepfe.values()]),
    );

    function waehle(i) {
      const richtig = i === frage.richtig;
      for (const [index, knopf] of knoepfe) {
        knopf.disabled = true;
        if (index === frage.richtig) knopf.classList.add('option--richtig');
        else if (index === i) knopf.classList.add('option--falsch');
      }
      zeigeAufloesung(container, { richtig, erklaerung: frage.erklaerung },
        () => beiAntwort({ richtig, details: { gewaehlt: frage.optionen[i] } }));
    }
  },
};
