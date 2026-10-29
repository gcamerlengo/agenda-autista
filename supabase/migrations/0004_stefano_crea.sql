-- Anche Stefano (autista) può fissarsi gli impegni da solo.
-- Può eliminare solo quelli che ha creato lui: quelli assegnati dagli altri non si rifiutano.

drop policy if exists "impegni: creazione" on impegni;
create policy "impegni: creazione" on impegni
  for insert to authenticated with check (public.mio_ruolo() is not null);

drop policy if exists "impegni: eliminazione" on impegni;
create policy "impegni: eliminazione" on impegni
  for delete to authenticated using (public.sono_assegnatore() or assegnato_da = auth.uid());
