-- Promemoria a Stefano sul telefono 10 minuti prima di ogni impegno.
-- Un job pg_cron gira ogni minuto e chiama /api/notifica con tipo 'promemoria' (solo push).

create extension if not exists pg_cron;

-- Un promemoria per impegno e orario: se l'impegno viene spostato, ne parte uno nuovo.
create table if not exists privato.promemoria_inviati (
  impegno_id uuid not null,
  inizio     timestamptz not null,
  inviato_il timestamptz not null default now(),
  primary key (impegno_id, inizio)
);

create or replace function privato.invia_promemoria() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  url     text;
  segreto text;
  dest    jsonb;
  rec     impegni;
begin
  select valore into url from privato.configurazione where chiave = 'url_notifiche';
  select valore into segreto from privato.configurazione where chiave = 'segreto_notifiche';
  if url is null or segreto is null then
    return;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'nome', u.nome,
           'email', u.email,
           'ruolo', u.ruolo,
           'iscrizioni', coalesce((
             select jsonb_agg(jsonb_build_object('endpoint', p.endpoint, 'keys',
                      jsonb_build_object('p256dh', p.p256dh, 'auth', p.auth)))
             from push_iscrizioni p where p.utente_id = u.id), '[]'::jsonb))), '[]'::jsonb)
    into dest
  from utenti u
  where u.ruolo = 'autista';

  for rec in
    select i.* from impegni i
    where i.stato = 'da_fare'
      and i.inizio > now()
      and i.inizio <= now() + interval '10 minutes'
      and not exists (select 1 from privato.promemoria_inviati p
                      where p.impegno_id = i.id and p.inizio = i.inizio)
  loop
    insert into privato.promemoria_inviati (impegno_id, inizio) values (rec.id, rec.inizio);
    perform net.http_post(
      url := url,
      body := jsonb_build_object(
        'tipo', 'promemoria',
        'autore', null,
        'assegnato_da', (select nome from utenti where id = rec.assegnato_da),
        'impegno', to_jsonb(rec),
        'prima', null,
        'destinatari', dest),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || segreto));
  end loop;

  delete from privato.promemoria_inviati where inviato_il < now() - interval '30 days';
end $$;

select cron.unschedule('promemoria-impegni')
where exists (select 1 from cron.job where jobname = 'promemoria-impegni');

select cron.schedule('promemoria-impegni', '* * * * *', 'select privato.invia_promemoria()');
