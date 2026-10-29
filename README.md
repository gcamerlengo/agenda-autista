# Agenda Autista

App web installabile (PWA) per gestire gli impegni di Stefano De Simone, autista di Olio Dante.
Gli impegni li assegnano Logistica, Responsabile Stabilimento, Amministrazione e Presidente. Tutti vedono lo stesso calendario.

- **Frontend:** React + Vite, installabile su Android e iPhone ("Aggiungi a schermata Home").
- **Database e accesso:** Supabase (Postgres). Si entra con un codice a 6 cifre ricevuto via email.
- **Pubblicazione:** Vercel.

## Regole, garantite dal database

| | Stefano (autista) | Logistica / Stabilimento / Amministrazione / Presidente |
|---|---|---|
| Vedere tutti gli impegni | sì | sì |
| Creare un impegno | no | sì |
| Modificare (orari, luogo, mezzo, merce, note, stato) | sì | sì |
| Eliminare / rifiutare | no | sì (eliminare) |

- Due impegni non possono sovrapporsi, chiunque li abbia assegnati (vincolo `nessuna_sovrapposizione`).
- Ogni creazione, modifica o eliminazione finisce in `impegni_storico` con autore e data.
- Possono registrarsi solo le email in `utenti_autorizzati`; il ruolo viene da lì.
- Notifiche push ed email a Stefano e a chi ha assegnato l'impegno, escluso chi ha fatto la modifica.

## Messa in funzione

### 1. Supabase
1. Crea un progetto su [supabase.com](https://supabase.com) (regione Europa).
2. In **SQL Editor** incolla ed esegui `supabase/migrations/0001_schema.sql`.
3. In **Authentication › Emails › Templates** metti il codice nei modelli **Magic Link** e **Confirm signup**
   (il secondo è usato al primo accesso di ogni persona), ad esempio:
   `Il tuo codice per Agenda Autista è: {{ .Token }}`
4. In **Authentication › SMTP Settings** abilita l'SMTP personalizzato con una casella Aruba (es. `agenda@oliodante.it`):
   host `smtps.aruba.it`, porta `465`, utente e password della casella.
   Senza questo passaggio Supabase invia pochissime email all'ora.
5. In **Project Settings › API** copia `Project URL` e la chiave `anon public`.
6. Esegui `supabase/migrations/0002a_ruolo_presidente.sql` **da solo**, poi in una nuova query
   `supabase/migrations/0002b_presidente_notifiche.sql`. L'ultimo mostra il `WEBHOOK_SECRET` da copiare su Vercel.
7. Esegui `supabase/migrations/0003_promemoria.sql`: attiva pg_cron e invia a Stefano una notifica push
   10 minuti prima di ogni impegno da fare.
8. Esegui `supabase/migrations/0004_stefano_crea.sql`: anche Stefano può creare impegni
   ed eliminare quelli che ha creato lui.

### 2. Vercel
1. Su [vercel.com](https://vercel.com) importa il repository `agenda-autista`.
2. Aggiungi le variabili d'ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, e per le notifiche:

   | Variabile | Valore |
   | --- | --- |
   | `WEBHOOK_SECRET` | il valore mostrato da `0002b` |
   | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | generate con `npx web-push generate-vapid-keys` |
   | `SMTP_HOST` / `SMTP_PORT` | `smtps.aruba.it` / `465` |
   | `SMTP_USER` / `SMTP_PASS` | casella Aruba che invia (es. `agenda@oliodante.it`) e password |
   | `SMTP_FROM` | la stessa casella |
3. Pubblica. In Supabase, **Authentication › URL Configuration**, imposta come Site URL l'indirizzo Vercel.

### 3. Sui telefoni
- **iPhone:** apri l'indirizzo in Safari › Condividi › Aggiungi alla schermata Home.
- **Android:** apri in Chrome › menu › Installa app.

## Sviluppo locale

```sh
cp .env.example .env   # e inserisci i valori di Supabase
npm install
npm run dev
```
