-- ------------------------------------------------------------------
-- Lern-App: Tabelle für Feedback zu Fragen ("Frage melden / aussortieren")
-- Im Supabase-Dashboard unter "SQL Editor" einfügen und "Run" klicken.
-- ------------------------------------------------------------------

create table if not exists public.feedback (
  id            uuid primary key,              -- von der App erzeugt (verhindert Duplikate beim Sync)
  geraet_id     uuid not null,
  fach_id       text not null,
  frage_id      text not null,
  frage_text    text,                          -- Kopie des Fragetexts zum leichteren Lesen
  grund         text not null,                 -- z. B. 'Fehlerhaft / falsch', 'Zu leicht'
  kommentar     text,
  erstellt_am   timestamptz not null,
  empfangen_am  timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Die App darf Feedback einfügen ...
drop policy if exists "App darf Feedback einfuegen" on public.feedback;
create policy "App darf Feedback einfuegen"
  on public.feedback for insert to anon with check (true);

-- ... und lesen. So kann Claude das Feedback direkt abrufen, um die Fragen zu verbessern.
-- (Feedback enthält nur Fragen-IDs, Gründe und deine Kommentare – nichts Persönliches.
--  Wer den öffentlichen Key kennt, könnte es ebenfalls lesen.)
drop policy if exists "App darf Feedback lesen" on public.feedback;
create policy "App darf Feedback lesen"
  on public.feedback for select to anon using (true);

grant insert, select on table public.feedback to anon;
