-- Agenda Autista: schema, ruoli, blocco sovrapposizioni e storico modifiche.
-- Da eseguire una volta nel SQL editor di Supabase (o con `supabase db push`).

create extension if not exists btree_gist;

-- Ruoli ---------------------------------------------------------------------

create type ruolo as enum ('autista', 'logistica', 'stabilimento', 'amministrazione');

-- Solo queste email possono registrarsi. Il ruolo viene assegnato da qui.
create table utenti_autorizzati (
  email text primary key,
  nome  text not null,
  ruolo ruolo not null
);

insert into utenti_autorizzati (email, nome, ruolo) values
  ('stefano.desimone@oliodante.it',   'Stefano De Simone',  'autista'),
  ('ottorino.guerriero@oliodante.it', 'Ottorino Guerriero', 'logistica'),
  ('antonio.pancione@oliodante.it',   'Antonio Pancione',   'stabilimento'),
  ('mario.deconcilio@oliodante.it',   'Mario De Concilio',  'amministrazione');

create table utenti (
  id    uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  nome  text not null,
  ruolo ruolo not null
);

-- Alla registrazione: crea il profilo, oppure rifiuta le email non autorizzate.
create function public.gestisci_nuovo_utente() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  a utenti_autorizzati;
begin
  select * into a from utenti_autorizzati where lower(email) = lower(new.email);
  if not found then
    raise exception 'Email non autorizzata: %', new.email;
  end if;
  insert into utenti (id, email, nome, ruolo) values (new.id, lower(new.email), a.nome, a.ruolo);
  return new;
end $$;

create trigger su_nuovo_utente
  after insert on auth.users
  for each row execute function public.gestisci_nuovo_utente();

create function public.mio_ruolo() returns ruolo
language sql stable security definer set search_path = public as $$
  select ruolo from utenti where id = auth.uid()
$$;

create function public.sono_assegnatore() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.mio_ruolo() in ('logistica', 'stabilimento', 'amministrazione'), false)
$$;

-- Impegni -------------------------------------------------------------------

create type stato_impegno as enum ('da_fare', 'completato');

create table impegni (
  id            uuid primary key default gen_random_uuid(),
  titolo        text not null check (length(trim(titolo)) > 0),
  inizio        timestamptz not null,
  fine          timestamptz not null,
  luogo         text not null default '',
  mezzo         text not null default '',
  merce         text not null default '',
  note          text not null default '',
  stato         stato_impegno not null default 'da_fare',
  assegnato_da  uuid not null references utenti (id),
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  aggiornato_da uuid references utenti (id),
  check (fine > inizio),
  -- C'è un solo autista: due impegni non possono sovrapporsi, chiunque li assegni.
  constraint nessuna_sovrapposizione
    exclude using gist (tstzrange(inizio, fine, '[)') with &&)
);

create index impegni_inizio_idx on impegni (inizio);

-- Imposta chi ha assegnato / modificato; l'assegnatore originale non cambia mai.
create function public.prepara_impegno() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.assegnato_da := auth.uid();
    new.creato_il := now();
  else
    new.assegnato_da := old.assegnato_da;
    new.creato_il := old.creato_il;
  end if;
  new.aggiornato_il := now();
  new.aggiornato_da := auth.uid();
  return new;
end $$;

create trigger prima_di_salvare_impegno
  before insert or update on impegni
  for each row execute function public.prepara_impegno();

-- Storico -------------------------------------------------------------------

create table impegni_storico (
  id         bigint generated always as identity primary key,
  impegno_id uuid not null,
  utente_id  uuid references utenti (id),
  azione     text not null check (azione in ('creato', 'modificato', 'eliminato')),
  prima      jsonb,
  dopo       jsonb,
  quando     timestamptz not null default now()
);

create index impegni_storico_impegno_idx on impegni_storico (impegno_id, quando);

create function public.registra_storico() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into impegni_storico (impegno_id, utente_id, azione, dopo)
      values (new.id, auth.uid(), 'creato', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into impegni_storico (impegno_id, utente_id, azione, prima, dopo)
      values (new.id, auth.uid(), 'modificato', to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into impegni_storico (impegno_id, utente_id, azione, prima)
      values (old.id, auth.uid(), 'eliminato', to_jsonb(old));
    return old;
  end if;
end $$;

create trigger dopo_aver_salvato_impegno
  after insert or update or delete on impegni
  for each row execute function public.registra_storico();

-- Permessi (Row Level Security) ---------------------------------------------
-- Tutti e quattro vedono tutto. Gli assegnatori creano, modificano ed eliminano.
-- Stefano modifica (orari, campi, stato) ma non crea né elimina: un impegno non si rifiuta.

alter table utenti_autorizzati enable row level security;
alter table utenti enable row level security;
alter table impegni enable row level security;
alter table impegni_storico enable row level security;

create policy "utenti: lettura" on utenti
  for select to authenticated using (true);

create policy "impegni: lettura" on impegni
  for select to authenticated using (public.mio_ruolo() is not null);

create policy "impegni: creazione" on impegni
  for insert to authenticated with check (public.sono_assegnatore());

create policy "impegni: modifica" on impegni
  for update to authenticated
  using (public.mio_ruolo() is not null)
  with check (public.mio_ruolo() is not null);

create policy "impegni: eliminazione" on impegni
  for delete to authenticated using (public.sono_assegnatore());

create policy "storico: lettura" on impegni_storico
  for select to authenticated using (public.mio_ruolo() is not null);

-- Aggiornamenti in tempo reale sul calendario di tutti.
alter publication supabase_realtime add table impegni;
