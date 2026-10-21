export type Ruolo = 'autista' | 'logistica' | 'stabilimento' | 'amministrazione'

export type Utente = {
  id: string
  email: string
  nome: string
  ruolo: Ruolo
}

export type Impegno = {
  id: string
  titolo: string
  inizio: string
  fine: string
  luogo: string
  mezzo: string
  merce: string
  note: string
  stato: 'da_fare' | 'completato'
  assegnato_da: string
  creato_il: string
  aggiornato_il: string
  aggiornato_da: string | null
}

export const NOMI_RUOLO: Record<Ruolo, string> = {
  autista: 'Autista',
  logistica: 'Logistica',
  stabilimento: 'Stabilimento',
  amministrazione: 'Amministrazione',
}

export const puoAssegnare = (r: Ruolo) => r !== 'autista'
