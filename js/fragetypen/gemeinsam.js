// Gemeinsame Bausteine für automatisch ausgewertete Fragetypen.

import { el } from '../dom.js';

// Zeigt "Richtig/Falsch", optional Zusatzinhalt (z. B. die Lösung), die Erklärung
// und einen "Weiter"-Knopf. Erst "Weiter" meldet die Antwort an die App.
export function zeigeAufloesung(container, { richtig, erklaerung, extra }, weiter) {
  const knopf = el('button', { class: 'knopf', type: 'button', onclick: weiter }, 'Weiter');
  container.append(el('div', { class: `aufloesung ${richtig ? 'aufloesung--gut' : 'aufloesung--schlecht'}` },
    el('strong', {}, richtig ? '✓ Richtig' : '✗ Leider falsch'),
    extra ?? null,
    erklaerung ? el('p', { class: 'aufloesung__text' }, erklaerung) : null),
  el('div', { class: 'knopfspalte' }, knopf));
  knopf.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function mische(liste) {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}
