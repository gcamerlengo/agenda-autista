# Agenda Autista

App web installabile (PWA) per gestire gli impegni di Stefano De Simone, autista di Olio Dante.
Gli impegni li assegnano Logistica, Responsabile Stabilimento e Amministrazione. Tutti e quattro vedono lo stesso calendario.

- **Frontend:** React + Vite, installabile su Android e iPhone ("Aggiungi a schermata Home").
- **Database e accesso:** Supabase (Postgres). Si entra con un codice a 6 cifre ricevuto via email.
- **Pubblicazione:** Vercel.

## Regole, garantite dal database

| | Stefano (autista) | Logistica / Stabilimento / Amministrazione |
|---|---|---|
| Vedere tutti gli impegni | sì | sì |
| Creare un impegno | no | sì |
| Modificare (orari, luogo, mezzo, merce, note, stato) | sì | sì |
| Eliminare / rifiutare | no | sì (eliminare) |

- Due impegni non possono sovrapporsi, chiunque li abbia assegnati (vincolo `nessuna_sovrapposizione`).
- Ogni creazione, modifica o eliminazione finisce in `impegni_storico` con autore e data.
- Possono registrarsi solo le quattro email in `utenti_autorizzati`; il ruolo viene da lì.

## Messa in funzione

### 1. Supabase
1. Crea un progetto su [supabase.com](https://supabase.com) (regione Europa).
2. In **SQL Editor** incolla ed esegui `supabase/migrations/0001_schema.sql`.
3. In **Authentication › Email Templates › Magic Link** sostituisci il corpo con un testo che contenga il codice, ad esempio:
   `Il tuo codice per Agenda Autista è: {{ .Token }}`
4. In **Authentication › SMTP Settings** abilita l'SMTP personalizzato con una casella Aruba (es. `agenda@oliodante.it`):
   host `smtps.aruba.it`, porta `465`, utente e password della casella.
   Senza questo passaggio Supabase invia pochissime email all'ora.
5. In **Project Settings › API** copia `Project URL` e la chiave `anon public`.

### 2. Vercel
1. Su [vercel.com](https://vercel.com) importa il repository `agenda-autista`.
2. Aggiungi le variabili d'ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
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
