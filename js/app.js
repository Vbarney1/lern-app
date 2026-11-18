// Einstiegspunkt: Bildschirme (Fächerauswahl → Lernrunde → Ergebnis).

import { el } from './dom.js';
import { RUNDEN_GROESSE } from './config.js';
import { ladeFaecherListe, ladeFach } from './inhalte.js';
import { holeFragetyp } from './fragetypen/index.js';
import { stelleRundeZusammen, statistik, naechsterStand, schluessel } from './wiederholung.js';
import { geraetId, neueId, leseFortschritt, setzeStand, reiheEin, bitteUmDauerhaftenSpeicher } from './speicher.js';
import { synchronisiere, starteAutoSync, beiStatusAenderung } from './sync.js';

const app = document.getElementById('app');
const titel = document.getElementById('titel');
const zurueck = document.getElementById('zurueck');
const syncAnzeige = document.getElementById('sync-status');

zurueck.addEventListener('click', () => zeigeStart());

function setzeKopf(text, mitZurueck) {
  titel.textContent = text;
  zurueck.hidden = !mitZurueck;
}

// ---------------------------------------------------------------
// Startseite: Fächerauswahl
// ---------------------------------------------------------------
async function zeigeStart() {
  setzeKopf('Lernen', false);
  app.replaceChildren(el('p', { class: 'hinweis' }, 'Lade Fächer …'));

  let faecher;
  try {
    const metas = await ladeFaecherListe();
    const ergebnisse = await Promise.allSettled(metas.map(ladeFach));
    faecher = metas.map((meta, i) => ({
      meta,
      fach: ergebnisse[i].status === 'fulfilled' ? ergebnisse[i].value : null,
    }));
  } catch (e) {
    app.replaceChildren(el('p', { class: 'fehler' }, 'Fächer konnten nicht geladen werden: ', e.message));
    return;
  }

  if (!faecher.length) {
    app.replaceChildren(el('p', { class: 'hinweis' }, 'Noch keine Fächer vorhanden. Lege einen Ordner unter /faecher an.'));
    return;
  }

  const fortschritt = leseFortschritt();
  const liste = el('ul', { class: 'faecher' });
  for (const { meta, fach } of faecher) {
    if (!fach) {
      liste.append(el('li', { class: 'fach fach--fehler' }, `${meta.name}: Datei fehlerhaft`));
      continue;
    }
    const s = statistik(fach.id, fach.fragen, fortschritt);
    liste.append(el('li', {},
      el('button', { class: 'fach', type: 'button', onclick: () => starteRunde(fach) },
        el('span', { class: 'fach__symbol', 'aria-hidden': 'true' }, fach.symbol || '📚'),
        el('span', { class: 'fach__text' },
          el('strong', {}, fach.name),
          el('small', {}, `${s.gesamt} Karten · ${s.faellig} fällig · ${s.neu} neu`)),
        el('span', { class: 'fach__pfeil', 'aria-hidden': 'true' }, '›'))));
  }
  app.replaceChildren(el('h2', {}, 'Fach wählen'), liste);
}

// ---------------------------------------------------------------
// Lernrunde
// ---------------------------------------------------------------
function starteRunde(fach) {
  const fragen = stelleRundeZusammen(fach.id, fach.fragen, leseFortschritt(), RUNDEN_GROESSE);
  setzeKopf(fach.name, true);
  if (!fragen.length) {
    app.replaceChildren(el('p', { class: 'hinweis' }, 'Dieses Fach enthält keine Fragen.'));
    return;
  }
  zeigeFrage({ fach, fragen, index: 0, richtig: 0 });
}

function zeigeFrage(runde) {
  if (runde.index >= runde.fragen.length) return zeigeErgebnis(runde);

  const frage = runde.fragen[runde.index];
  const buehne = el('div', { class: 'buehne' });
  app.replaceChildren(
    el('div', { class: 'balken' },
      el('div', { class: 'balken__fuellung', style: `width:${(runde.index / runde.fragen.length) * 100}%` })),
    el('p', { class: 'zaehler' }, `Frage ${runde.index + 1} von ${runde.fragen.length}`),
    buehne,
  );
  window.scrollTo(0, 0);

  let erledigt = false;
  holeFragetyp(frage.typ).zeige(frage, buehne, ({ richtig, details }) => {
    if (erledigt) return; // doppelte Taps ignorieren
    erledigt = true;
    erfasseAntwort(runde.fach.id, frage, richtig, details);
    if (richtig) runde.richtig++;
    runde.index++;
    zeigeFrage(runde);
  });
}

function erfasseAntwort(fachId, frage, richtig, details) {
  const jetzt = Date.now();
  const key = schluessel(fachId, frage.id);

  // 1. Wiederholungs-Stand lokal aktualisieren
  setzeStand(key, naechsterStand(leseFortschritt()[key], richtig, jetzt));

  // 2. Antwort für Supabase vormerken (Spaltennamen = Tabelle "antworten")
  reiheEin({
    id: neueId(),
    geraet_id: geraetId(),
    fach_id: fachId,
    frage_id: frage.id,
    frage_typ: frage.typ,
    richtig: Boolean(richtig),
    details: details ?? null,
    beantwortet_am: new Date(jetzt).toISOString(),
  });

  // 3. Hochladen versuchen (klappt offline einfach später)
  synchronisiere();
}

function zeigeErgebnis(runde) {
  const { fach, fragen, richtig } = runde;
  app.replaceChildren(
    el('div', { class: 'ergebnis' },
      el('p', { class: 'ergebnis__zahl' }, `${richtig} / ${fragen.length}`),
      el('p', {}, richtig === fragen.length ? 'Alles gewusst!' : 'Gewusst in dieser Runde')),
    el('div', { class: 'knopfspalte' },
      el('button', { class: 'knopf', type: 'button', onclick: () => starteRunde(fach) }, 'Noch eine Runde'),
      el('button', { class: 'knopf knopf--zweit', type: 'button', onclick: () => zeigeStart() }, 'Zur Fächerauswahl')),
  );
}

// ---------------------------------------------------------------
// Sync-Anzeige oben rechts
// ---------------------------------------------------------------
beiStatusAenderung((s) => {
  let text = '';
  let hinweis = '';
  if (!s.konfiguriert) {
    text = 'lokal';
    hinweis = 'Supabase ist noch nicht eingerichtet (js/config.js). Antworten werden nur lokal gespeichert.';
  } else if (s.laeuft) {
    text = 'Sync …';
  } else if (!s.online) {
    text = s.offen ? `offline · ${s.offen} offen` : 'offline';
  } else if (s.fehler) {
    text = `⚠ ${s.offen} offen`;
    hinweis = s.fehler;
  } else if (s.offen) {
    text = `${s.offen} offen`;
  } else {
    text = '✓ synchron';
  }
  syncAnzeige.textContent = text;
  syncAnzeige.title = hinweis;
});

// ---------------------------------------------------------------
// Start
// ---------------------------------------------------------------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service Worker nicht registriert:', e));
}
bitteUmDauerhaftenSpeicher();
starteAutoSync();
zeigeStart();
