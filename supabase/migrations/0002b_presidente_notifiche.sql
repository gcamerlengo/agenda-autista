-- Passo 2 di 2: Presidente come assegnatore, iscrizioni alle notifiche push
-- e invio delle notifiche (push + email) tramite la funzione /api/notifica su Vercel.

-- Presidente ------------------------------------------------------------------

create or replace function public.sono_assegnatore() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.mio_ruolo() in ('logistica', 'stabilimento', 'amministrazione', 'presidente'), false)
$$;

insert into utenti_autorizzati (email, nome, ruolo) values
  ('biagio.mataluni@oliodante.it', 'Biagio Mataluni', 'presidente')
on conflict (email) do update set nome = excluded.nome, ruolo = excluded.ruolo;

-- Chi aveva già fatto l'accesso con questa email prende il nuovo ruolo.
update utenti u set ruolo = a.ruolo, nome = a.nome
from utenti_autorizzati a
where a.email = u.email and a.email = 'biagio.mataluni@oliodante.it';

-- Iscrizioni push: ogni telefono o computer che ha attivato le notifiche --------

create table if not exists push_iscrizioni (
  endpoint  text primary key,
  utente_id uuid not null default auth.uid() references utenti (id) on delete cascade,
  p256dh    text not null,
  auth      text not null,
  creato_il timestamptz not null default now()
);

alter table push_iscrizioni enable row level security;

drop policy if exists "push: le mie" on push_iscrizioni;
create policy "push: le mie" on push_iscrizioni
  for all to authenticated
  using (utente_id = auth.uid())
  with check (utente_id = auth.uid());

-- Configurazione privata (non visibile dall'app) --------------------------------

create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists privato;
revoke all on schema privato from public, anon, authenticated;

create table if not exists privato.configurazione (
  chiave text primary key,
  valore text not null
);

insert into privato.configurazione (chiave, valore) values
  ('url_notifiche', 'https://agenda-autista-seven.vercel.app/api/notifica'),
  ('segreto_notifiche', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (chiave) do nothing;

-- Invio notifiche -----------------------------------------------------------
-- Destinatari: Stefano e chi ha assegnato l'impegno, escluso chi ha fatto la modifica.

create or replace function public.notifica_impegno() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  rec        impegni;
  autore     uuid := auth.uid();
  url        text;
  segreto    text;
  destinatari jsonb;
begin
  rec := case when tg_op = 'DELETE' then old else new end;

  -- Una modifica che non cambia nulla di visibile non va notificata.
  if tg_op = 'UPDATE' and (to_jsonb(old) - 'aggiornato_il' - 'aggiornato_da')
                        = (to_jsonb(new) - 'aggiornato_il' - 'aggiornato_da') then
    return null;
  end if;

  select valore into url from privato.configurazione where chiave = 'url_notifiche';
  select valore into segreto from privato.configurazione where chiave = 'segreto_notifiche';
  if url is null or segreto is null then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'nome', u.nome,
           'email', u.email,
           'ruolo', u.ruolo,
           'iscrizioni', coalesce((
             select jsonb_agg(jsonb_build_object('endpoint', p.endpoint, 'keys',
                      jsonb_build_object('p256dh', p.p256dh, 'auth', p.auth)))
             from push_iscrizioni p where p.utente_id = u.id), '[]'::jsonb))), '[]'::jsonb)
    into destinatari
  from utenti u
  where (u.ruolo = 'autista' or u.id = rec.assegnato_da)
    and u.id is distinct from autore;

  if jsonb_array_length(destinatari) = 0 then
    return null;
  end if;

  perform net.http_post(
    url := url,
    body := jsonb_build_object(
      'tipo', lower(tg_op),
      'autore', (select nome from utenti where id = autore),
      'assegnato_da', (select nome from utenti where id = rec.assegnato_da),
      'impegno', to_jsonb(rec),
      'prima', case when tg_op = 'UPDATE' then to_jsonb(old) end,
      'destinatari', destinatari),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || segreto));
  return null;
end $$;

drop trigger if exists notifica_dopo_modifica on impegni;
create trigger notifica_dopo_modifica
  after insert or update or delete on impegni
  for each row execute function public.notifica_impegno();

-- Il segreto da copiare su Vercel come WEBHOOK_SECRET:
select valore as "WEBHOOK_SECRET da copiare su Vercel"
from privato.configurazione where chiave = 'segreto_notifiche';
