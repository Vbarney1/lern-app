// Wiederholungslogik (Spaced Repetition) nach dem Leitner-Prinzip.
//
// Jede Frage liegt in einer "Box". Gewusst → eine Box höher (längere Pause),
// nicht gewusst → zurück in Box 0 (kommt bald wieder).
// Die längste Pause ist begrenzt (60 Tage) – keine Frage verschwindet ganz.
//
// Stand pro Frage: { box, faellig, zuletzt, richtig, falsch }  (Zeiten in ms)

const MINUTE = 60 * 1000;
const TAG = 24 * 60 * MINUTE;

// Pause nach einer Antwort, je nach erreichter Box.
export const INTERVALLE = [
  10 * MINUTE, // Box 0: nicht gewusst → gleich nochmal
  1 * TAG,
  3 * TAG,
  7 * TAG,
  16 * TAG,
  35 * TAG,
  60 * TAG, // Obergrenze: spätestens alle 2 Monate
];

export function schluessel(fachId, frageId) {
  return `${fachId}/${frageId}`;
}

export function naechsterStand(stand, richtig, jetzt = Date.now()) {
  const alt = stand ?? { box: 0, richtig: 0, falsch: 0 };
  const box = richtig ? Math.min(stand ? alt.box + 1 : 1, INTERVALLE.length - 1) : 0;
  return {
    box,
    faellig: jetzt + INTERVALLE[box],
    zuletzt: jetzt,
    richtig: alt.richtig + (richtig ? 1 : 0),
    falsch: alt.falsch + (richtig ? 0 : 1),
  };
}

// Stellt eine Lernrunde zusammen. Reihenfolge der Auswahl:
//   1. fällige Fragen (am längsten überfällig, niedrigste Box zuerst)
//   2. neue Fragen (noch nie beantwortet, zufällig – für eine bunte Mischung)
//   3. falls dann noch Platz ist: die Fragen, die als nächstes fällig würden
// Punkt 3 sorgt dafür, dass man immer eine volle Runde lernen kann.
export function stelleRundeZusammen(fachId, fragen, fortschritt, anzahl, jetzt = Date.now()) {
  const faellig = [];
  const neu = [];
  const spaeter = [];

  for (const frage of fragen) {
    const stand = fortschritt[schluessel(fachId, frage.id)];
    if (!stand) neu.push(frage);
    else if (stand.faellig <= jetzt) faellig.push({ frage, stand });
    else spaeter.push({ frage, stand });
  }

  faellig.sort((a, b) => a.stand.box - b.stand.box || a.stand.faellig - b.stand.faellig);
  spaeter.sort((a, b) => a.stand.faellig - b.stand.faellig);

  const auswahl = [
    ...faellig.map((x) => x.frage),
    ...mische(neu),
    ...spaeter.map((x) => x.frage),
  ].slice(0, anzahl);

  return mische(auswahl);
}

export function statistik(fachId, fragen, fortschritt, jetzt = Date.now()) {
  let neu = 0;
  let faellig = 0;
  for (const frage of fragen) {
    const stand = fortschritt[schluessel(fachId, frage.id)];
    if (!stand) neu++;
    else if (stand.faellig <= jetzt) faellig++;
  }
  return { gesamt: fragen.length, neu, faellig };
}

function mische(liste) {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}
