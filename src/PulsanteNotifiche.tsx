import { useEffect, useState } from 'react'
import { attivaNotifiche, statoNotifiche, type StatoNotifiche } from './lib/notifiche'

const SPIEGAZIONI: Partial<Record<StatoNotifiche, string>> = {
  'installa-app': 'Per ricevere le notifiche su iPhone aggiungi l’app alla schermata Home e aprila da lì.',
  bloccate: 'Le notifiche sono bloccate: riattivale dalle impostazioni del browser o del telefono.',
}

export default function PulsanteNotifiche() {
  const [stato, setStato] = useState<StatoNotifiche | null>(null)
  const [errore, setErrore] = useState('')
  const [attesa, setAttesa] = useState(false)

  useEffect(() => {
    statoNotifiche().then(setStato).catch(() => setStato('non-supportate'))
  }, [])

  async function attiva() {
    setErrore('')
    setAttesa(true)
    try {
      setStato(await attivaNotifiche())
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Attivazione non riuscita.')
    }
    setAttesa(false)
  }

  if (!stato || stato === 'attive' || stato === 'non-supportate') return null
  return (
    <div className="banner-notifiche" role="status">
      {stato === 'da-attivare' ? (
        <>
          <span>Ricevi un avviso quando un impegno viene assegnato o cambiato.</span>
          <button className="primario" onClick={attiva} disabled={attesa}>
            {attesa ? 'Attivazione…' : 'Attiva notifiche'}
          </button>
        </>
      ) : (
        <span>{SPIEGAZIONI[stato]}</span>
      )}
      {errore && <span className="errore">{errore}</span>}
    </div>
  )
}
