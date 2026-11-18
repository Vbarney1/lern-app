// Fragetyp "karteikarte": Vorderseite → umdrehen → Rückseite → Selbsteinschätzung.
//
// JSON:
//   { "id": "aw-001", "typ": "karteikarte",
//     "vorderseite": "Frage …", "rueckseite": "Antwort …" }

import { el } from '../dom.js';

export default {
  typ: 'karteikarte',

  istGueltig(frage) {
    return typeof frage.vorderseite === 'string' && typeof frage.rueckseite === 'string';
  },

  zeige(frage, container, beiAntwort) {
    const knoepfe = el('div', { class: 'knopfspalte' });

    const karte = el('button', { class: 'karte', type: 'button', 'aria-label': 'Karte umdrehen', onclick: umdrehen },
      el('div', { class: 'karte__innen' },
        el('div', { class: 'karte__seite' },
          el('span', { class: 'karte__label' }, 'Frage'),
          frage.vorderseite),
        el('div', { class: 'karte__seite karte__seite--hinten', 'aria-hidden': 'true' },
          el('span', { class: 'karte__label' }, 'Antwort'),
          frage.rueckseite)));

    knoepfe.append(el('button', { class: 'knopf', type: 'button', onclick: umdrehen }, 'Antwort zeigen'));
    container.append(karte, knoepfe);

    function umdrehen() {
      if (karte.classList.contains('karte--umgedreht')) return;
      karte.classList.add('karte--umgedreht');
      karte.querySelector('.karte__seite--hinten').removeAttribute('aria-hidden');
      karte.disabled = true;

      const reihe = el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf knopf--schlecht', type: 'button', onclick: () => beiAntwort({ richtig: false }) }, 'Nicht gewusst'),
        el('button', { class: 'knopf knopf--gut', type: 'button', onclick: () => beiAntwort({ richtig: true }) }, 'Gewusst'));
      knoepfe.replaceWith(reihe);
    }
  },
};
