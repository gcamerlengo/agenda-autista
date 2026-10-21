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

export const COLORI_RUOLO: Record<Ruolo, { testo: string; fondo: string; bordo: string }> = {
  autista: { testo: '#3f4d1f', fondo: '#edf0e1', bordo: '#b8c394' },
  logistica: { testo: '#1f5fa8', fondo: '#e6eef8', bordo: '#9db9dd' },
  stabilimento: { testo: '#4b5a22', fondo: '#edf0e1', bordo: '#b8c394' },
  amministrazione: { testo: '#6b3fa0', fondo: '#f0e9f7', bordo: '#c9b3e3' },
}

export const MEZZI = ['Auto aziendale', 'Furgone', 'Camion']
