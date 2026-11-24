// Einstiegspunkt: Bildschirme (Fächerauswahl → Lernrunde → Ergebnis, Aussortiert).

import { el } from './dom.js';
import { RUNDEN_GROESSE } from './config.js';
import { ladeFaecherListe, ladeFach } from './inhalte.js';
import { holeFragetyp, frageText } from './fragetypen/index.js';
import { stelleRundeZusammen, statistik, naechsterStand, schluessel } from './wiederholung.js';
import {
  geraetId, neueId, leseFortschritt, setzeStand, reiheEin, bitteUmDauerhaftenSpeicher,
  leseAussortiert, sortiereAus, nimmWiederAuf,
} from './speicher.js';
import { synchronisiere, starteAutoSync, beiStatusAenderung } from './sync.js';

const app = document.getElementById('app');
const titel = document.getElementById('titel');
const zurueck = document.getElementById('zurueck');
const syncAnzeige = document.getElementById('sync-status');

const GRUENDE = ['Fehlerhaft / falsch', 'Unverständlich', 'Zu leicht', 'Zu schwer', 'Unbrauchbar / irrelevant', 'Sonstiges'];

zurueck.addEventListener('click', () => zeigeStart());

function setzeKopf(text, mitZurueck) {
  titel.textContent = text;
  zurueck.hidden = !mitZurueck;
}

// Fragen eines Fachs ohne die aussortierten.
function aktiveFragen(fach) {
  const aus = leseAussortiert();
  return fach.fragen.filter((f) => !aus[schluessel(fach.id, f.id)]);
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
    const s = statistik(fach.id, aktiveFragen(fach), fortschritt);
    liste.append(el('li', {},
      el('button', { class: 'fach', type: 'button', onclick: () => starteRunde(fach) },
        el('span', { class: 'fach__symbol', 'aria-hidden': 'true' }, fach.symbol || '📚'),
        el('span', { class: 'fach__text' },
          el('strong', {}, fach.name),
          el('small', {}, `${s.gesamt} Fragen · ${s.faellig} fällig · ${s.neu} neu`)),
        el('span', { class: 'fach__pfeil', 'aria-hidden': 'true' }, '›'))));
  }

  const anzahlAus = Object.keys(leseAussortiert()).length;
  app.replaceChildren(el('h2', {}, 'Fach wählen'), liste);
  if (anzahlAus) {
    app.append(el('button', { class: 'textknopf', type: 'button', onclick: zeigeAussortierte },
      `Aussortierte Fragen (${anzahlAus})`));
  }
}

// ---------------------------------------------------------------
// Lernrunde
// ---------------------------------------------------------------
function starteRunde(fach) {
  const fragen = stelleRundeZusammen(fach.id, aktiveFragen(fach), leseFortschritt(), RUNDEN_GROESSE);
  setzeKopf(fach.name, true);
  if (!fragen.length) {
    app.replaceChildren(el('p', { class: 'hinweis' }, 'Dieses Fach enthält keine (aktiven) Fragen.'));
    return;
  }
  zeigeFrage({ fach, fragen, index: 0, richtig: 0 });
}

function zeigeFrage(runde) {
  if (runde.index >= runde.fragen.length) return zeigeErgebnis(runde);

  const frage = runde.fragen[runde.index];
  const buehne = el('div', { class: 'buehne' });
  const meldeKnopf = el('button', { class: 'textknopf textknopf--leise', type: 'button',
    onclick: () => meldeKnopf.replaceWith(meldeFormular(runde, frage, meldeKnopf)) }, '⚑ Frage melden / aussortieren');

  app.replaceChildren(
    el('div', { class: 'balken' },
      el('div', { class: 'balken__fuellung', style: `width:${(runde.index / runde.fragen.length) * 100}%` })),
    el('p', { class: 'zaehler' }, `Frage ${runde.index + 1} von ${runde.fragen.length}`),
    buehne,
    meldeKnopf,
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

// ---------------------------------------------------------------
// Frage melden → aussortieren + Feedback an Supabase
// ---------------------------------------------------------------
function meldeFormular(runde, frage, meldeKnopf) {
  let grund = null;
  const chips = GRUENDE.map((g) => el('button', { class: 'chip', type: 'button', onclick: () => {
    grund = g;
    chips.forEach((c) => c.classList.toggle('chip--aktiv', c.textContent === g));
    senden.disabled = false;
  } }, g));
  const kommentar = el('textarea', { class: 'kommentar', rows: '3',
    placeholder: 'Was stört dich? (optional – hilft beim Verbessern)' });
  const senden = el('button', { class: 'knopf', type: 'button', disabled: true, onclick: absenden },
    'Aussortieren & Feedback senden');

  const formular = el('div', { class: 'meldung' },
    el('strong', {}, 'Was ist mit dieser Frage?'),
    el('div', { class: 'chips' }, chips),
    kommentar,
    el('div', { class: 'knopfspalte' },
      senden,
      el('button', { class: 'knopf knopf--zweit', type: 'button', onclick: () => formular.replaceWith(meldeKnopf) }, 'Abbrechen')));
  return formular;

  function absenden() {
    const fachId = runde.fach.id;
    const text = frageText(frage);
    const notiz = kommentar.value.trim();
    sortiereAus(schluessel(fachId, frage.id), {
      fachId, fachName: runde.fach.name, frageId: frage.id, text, grund, kommentar: notiz, zeit: Date.now(),
    });
    reiheEin({
      id: neueId(),
      geraet_id: geraetId(),
      fach_id: fachId,
      frage_id: frage.id,
      frage_text: text,
      grund,
      kommentar: notiz || null,
      erstellt_am: new Date().toISOString(),
    }, 'feedback');
    synchronisiere();

    // Frage aus der laufenden Runde nehmen, nächste anzeigen.
    runde.fragen.splice(runde.index, 1);
    if (!runde.fragen.length) return zeigeStart();
    zeigeFrage(runde);
  }
}

function zeigeAussortierte() {
  setzeKopf('Aussortiert', true);
  const eintraege = Object.entries(leseAussortiert()).sort((a, b) => b[1].zeit - a[1].zeit);
  if (!eintraege.length) return zeigeStart();

  app.replaceChildren(
    el('p', { class: 'hinweis' }, 'Diese Fragen kommen nicht mehr in deinen Runden vor. Dein Feedback wurde (bzw. wird) an Supabase gesendet.'),
    el('ul', { class: 'aussortiert' }, eintraege.map(([key, e]) => el('li', { class: 'aussortiert__eintrag' },
      el('strong', {}, e.text),
      el('small', {}, `${e.fachName ?? e.fachId} · ${e.grund}`),
      e.kommentar ? el('p', { class: 'aussortiert__kommentar' }, `„${e.kommentar}“`) : null,
      el('button', { class: 'knopf knopf--zweit', type: 'button', onclick: () => { nimmWiederAuf(key); zeigeAussortierte(); } },
        'Wieder aufnehmen')))),
  );
}

function zeigeErgebnis(runde) {
  const { fach, fragen, richtig } = runde;
  app.replaceChildren(
    el('div', { class: 'ergebnis' },
      el('p', { class: 'ergebnis__zahl' }, `${richtig} / ${fragen.length}`),
      el('p', {}, richtig === fragen.length ? 'Alles richtig!' : 'Richtig in dieser Runde')),
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
