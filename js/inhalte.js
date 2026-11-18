// Lädt Fächer und Fragen aus dem Ordner /faecher.
//
// faecher/index.json wird automatisch aus den Unterordnern erzeugt
// (scripts/faecher-index.ps1, läuft bei jedem Start mit start.cmd).
// Ein neues Fach = neuer Ordner faecher/<fach-id>/fragen.json – kein Code nötig.

import { istUnterstuetzt } from './fragetypen/index.js';

export async function ladeFaecherListe() {
  const antwort = await fetch('faecher/index.json');
  if (!antwort.ok) throw new Error(`faecher/index.json nicht gefunden (${antwort.status})`);
  const daten = await antwort.json();
  return daten.faecher ?? [];
}

export async function ladeFach(meta) {
  const antwort = await fetch(`faecher/${encodeURIComponent(meta.id)}/fragen.json`);
  if (!antwort.ok) throw new Error(`Fragen für "${meta.id}" nicht gefunden (${antwort.status})`);
  const daten = await antwort.json();
  const alle = Array.isArray(daten.fragen) ? daten.fragen : [];

  // Fragen mit unbekanntem Typ (oder fehlenden Feldern) überspringen statt abzustürzen.
  const fragen = alle.filter(istUnterstuetzt);
  if (fragen.length < alle.length) {
    console.warn(`[${meta.id}] ${alle.length - fragen.length} Frage(n) übersprungen (unbekannter Typ oder unvollständig).`);
  }
  return { ...meta, fragen };
}
