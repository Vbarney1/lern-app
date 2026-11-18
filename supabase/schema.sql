-- ------------------------------------------------------------------
-- Lern-App: Datenbank-Schema für Supabase
-- Im Supabase-Dashboard unter "SQL Editor" einfügen und "Run" klicken.
-- ------------------------------------------------------------------

-- Jede beantwortete Frage = eine Zeile.
create table if not exists public.antworten (
  id              uuid primary key,             -- wird von der App erzeugt (verhindert Duplikate beim Sync)
  geraet_id       uuid not null,                -- zufällige ID des Geräts (später: Benutzer-ID)
  fach_id         text not null,                -- Ordnername, z. B. 'allgemeinwissen'
  frage_id        text not null,                -- z. B. 'aw-001'
  frage_typ       text not null,                -- z. B. 'karteikarte'
  richtig         boolean not null,
  details         jsonb,                        -- Zusatzinfos späterer Fragetypen (z. B. eingegebene Zahl)
  beantwortet_am  timestamptz not null,         -- Zeitpunkt auf dem Gerät (auch wenn offline)
  empfangen_am    timestamptz not null default now()  -- Zeitpunkt des Syncs
);

create index if not exists antworten_geraet_frage_idx
  on public.antworten (geraet_id, fach_id, frage_id, beantwortet_am);

-- Zugriffsschutz (Row Level Security) einschalten.
alter table public.antworten enable row level security;

-- Die App (öffentlicher Key = Rolle "anon") darf nur NEUE Antworten einfügen,
-- aber nichts lesen, ändern oder löschen.
drop policy if exists "App darf Antworten einfuegen" on public.antworten;
create policy "App darf Antworten einfuegen"
  on public.antworten
  for insert
  to anon
  with check (true);

grant insert on table public.antworten to anon;
