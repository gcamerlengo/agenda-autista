import { useEffect, useRef, useState } from 'react'

type Riconoscimento = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start: () => void
  stop: () => void
}

type Costruttore = new () => Riconoscimento

function riconoscimento(): Costruttore | undefined {
  const w = window as unknown as { SpeechRecognition?: Costruttore; webkitSpeechRecognition?: Costruttore }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

// Pulsante per dettare le note a voce (in italiano). Dove il browser non lo permette,
// ricorda che si può usare il microfono della tastiera del telefono.
export default function Dettatura({ onTesto }: { onTesto: (t: string) => void }) {
  const [ascolto, setAscolto] = useState(false)
  const [errore, setErrore] = useState('')
  const rif = useRef<Riconoscimento | null>(null)
  const R = riconoscimento()

  useEffect(() => () => rif.current?.stop(), [])

  if (!R) return <p className="aiuto">Per dettare tocca il microfono sulla tastiera del telefono.</p>

  function avvia() {
    setErrore('')
    const r = new R!()
    r.lang = 'it-IT'
    r.interimResults = false
    r.continuous = false
    r.onresult = (e) => {
      const testo = Array.from(e.results, (x) => x[0].transcript).join(' ').trim()
      if (testo) onTesto(testo)
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setErrore('Consenti l’uso del microfono per dettare.')
      else if (e.error !== 'no-speech' && e.error !== 'aborted') setErrore('Dettatura non riuscita, riprova.')
    }
    r.onend = () => setAscolto(false)
    rif.current = r
    r.start()
    setAscolto(true)
  }

  return (
    <div className="dettatura">
      <button type="button" className="secondario" aria-pressed={ascolto} onClick={() => (ascolto ? rif.current?.stop() : avvia())}>
        {ascolto ? '■ Ferma' : '🎤 Detta le note'}
      </button>
      {ascolto && <span className="aiuto">In ascolto… parla ora</span>}
      {errore && <span className="errore">{errore}</span>}
    </div>
  )
}
