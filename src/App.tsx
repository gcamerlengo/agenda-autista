import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { configurato, supabase } from './lib/supabase'
import { NOMI_RUOLO, type Utente } from './lib/tipi'
import Accesso from './Accesso'

export default function App() {
  const [sessione, setSessione] = useState<Session | null>(null)
  const [utente, setUtente] = useState<Utente | null>(null)
  const [caricamento, setCaricamento] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessione(data.session)
      setCaricamento(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessione(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sessione) {
      setUtente(null)
      return
    }
    supabase
      .from('utenti')
      .select('*')
      .eq('id', sessione.user.id)
      .single()
      .then(({ data }) => setUtente(data as Utente | null))
  }, [sessione])

  if (!configurato) {
    return (
      <main className="accesso">
        <h1>Configurazione mancante</h1>
        <p>Imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (vedi README).</p>
      </main>
    )
  }
  if (caricamento) return null
  if (!sessione) return <Accesso />

  return (
    <main className="home">
      <header>
        <div>
          <p className="sottotitolo">
            {utente ? `${utente.nome} · ${NOMI_RUOLO[utente.ruolo]}` : sessione.user.email}
          </p>
          <h1>Agenda di Stefano</h1>
        </div>
        <button className="secondario" onClick={() => supabase.auth.signOut()}>
          Esci
        </button>
      </header>
      <p>Accesso riuscito. Il calendario arriva nel prossimo passo.</p>
    </main>
  )
}
