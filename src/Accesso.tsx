import { useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'

// Accesso con codice a 6 cifre via email: funziona anche dentro l'app installata
// su iPhone, dove un link aprirebbe Safari invece dell'app.
export default function Accesso() {
  const [email, setEmail] = useState('')
  const [codice, setCodice] = useState('')
  const [inviato, setInviato] = useState(false)
  const [errore, setErrore] = useState('')
  const [attesa, setAttesa] = useState(false)

  async function inviaCodice(e: FormEvent) {
    e.preventDefault()
    setErrore('')
    setAttesa(true)
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase() })
    setAttesa(false)
    if (error) setErrore('Email non abilitata o errore di invio. Controlla l’indirizzo.')
    else setInviato(true)
  }

  async function verifica(e: FormEvent) {
    e.preventDefault()
    setErrore('')
    setAttesa(true)
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: codice.trim(),
      type: 'email',
    })
    setAttesa(false)
    if (error) setErrore('Codice non valido o scaduto.')
  }

  return (
    <main className="accesso">
      <img src="/icon.svg" alt="" width="72" height="72" />
      <h1>Agenda Autista</h1>
      {!inviato ? (
        <form onSubmit={inviaCodice}>
          <label>
            Email aziendale
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome.cognome@oliodante.it"
            />
          </label>
          <button className="primario" disabled={attesa}>
            {attesa ? 'Invio…' : 'Ricevi il codice'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifica}>
          <p>Abbiamo inviato un codice a <strong>{email}</strong>.</p>
          <label>
            Codice
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={codice}
              onChange={(e) => setCodice(e.target.value)}
              placeholder="123456"
            />
          </label>
          <button className="primario" disabled={attesa}>
            {attesa ? 'Verifica…' : 'Entra'}
          </button>
          <button type="button" className="secondario" onClick={() => setInviato(false)}>
            Cambia email
          </button>
        </form>
      )}
      {errore && <p role="alert" className="errore">{errore}</p>}
    </main>
  )
}
