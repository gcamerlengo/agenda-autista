import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { configurato, supabase } from './lib/supabase'
import { aggiungiGiorni, inizioSettimana } from './lib/date'
import { NOMI_RUOLO, puoAssegnare, type Impegno, type Utente } from './lib/tipi'
import { useImpegni } from './lib/useImpegni'
import Accesso from './Accesso'
import Calendario from './Calendario'
import Dettaglio from './Dettaglio'
import FormImpegno from './FormImpegno'
import PulsanteNotifiche from './PulsanteNotifiche'

type Vista = { tipo: 'nessuna' } | { tipo: 'dettaglio'; id: string } | { tipo: 'form'; impegno: Impegno | null }

export default function App() {
  const [sessione, setSessione] = useState<Session | null>(null)
  const [caricamento, setCaricamento] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessione(data.session)
      setCaricamento(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessione(s))
    return () => data.subscription.unsubscribe()
  }, [])

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
  return <Agenda sessione={sessione} />
}

function Agenda({ sessione }: { sessione: Session }) {
  const [utenti, setUtenti] = useState<Map<string, Utente>>(new Map())
  const [lunedi, setLunedi] = useState(() => inizioSettimana(new Date()))
  const [vista, setVista] = useState<Vista>({ tipo: 'nessuna' })
  const { impegni, errore, ricarica } = useImpegni(lunedi)

  useEffect(() => {
    supabase
      .from('utenti')
      .select('*')
      .then(({ data }) => setUtenti(new Map((data as Utente[] | null ?? []).map((u) => [u.id, u]))))
  }, [])

  const io = utenti.get(sessione.user.id)
  const aperto = useMemo(
    () => (vista.tipo === 'dettaglio' ? impegni.find((i) => i.id === vista.id) : undefined),
    [vista, impegni],
  )

  function cambiaSettimana(delta: number | 'oggi') {
    setLunedi(delta === 'oggi' ? inizioSettimana(new Date()) : aggiungiGiorni(lunedi, delta * 7))
  }

  return (
    <main className="home">
      <header>
        <div>
          <p className="sottotitolo">{io ? `${io.nome} · ${NOMI_RUOLO[io.ruolo]}` : sessione.user.email}</p>
          <h1>Agenda di Stefano</h1>
        </div>
        <div className="azioni-testa">
          {io && puoAssegnare(io.ruolo) && (
            <button className="primario" onClick={() => setVista({ tipo: 'form', impegno: null })}>+ Nuovo impegno</button>
          )}
          <button className="secondario" onClick={() => supabase.auth.signOut()}>Esci</button>
        </div>
      </header>

      <PulsanteNotifiche />
      {errore && <p role="alert" className="errore">{errore}</p>}
      {io && !io.ruolo && <p className="errore">Profilo non trovato.</p>}

      <Calendario
        key={lunedi.toISOString()}
        lunedi={lunedi}
        impegni={impegni}
        utenti={utenti}
        onSettimana={cambiaSettimana}
        onApri={(i) => setVista({ tipo: 'dettaglio', id: i.id })}
      />

      {aperto && io && (
        <Dettaglio
          impegno={aperto}
          io={io}
          utenti={utenti}
          onChiudi={() => setVista({ tipo: 'nessuna' })}
          onModifica={() => setVista({ tipo: 'form', impegno: aperto })}
          onCambiato={ricarica}
        />
      )}
      {vista.tipo === 'form' && (
        <FormImpegno
          impegno={vista.impegno}
          giornoIniziale={vista.impegno ? new Date(vista.impegno.inizio) : new Date()}
          onChiudi={() => setVista(vista.impegno ? { tipo: 'dettaglio', id: vista.impegno.id } : { tipo: 'nessuna' })}
          onSalvato={() => {
            ricarica()
            // Dopo il salvataggio si torna al calendario: tornando al dettaglio il tocco su "Salva"
            // finiva spesso sul pulsante di stato e segnava l'impegno come completato.
            setVista({ tipo: 'nessuna' })
          }}
        />
      )}
    </main>
  )
}
