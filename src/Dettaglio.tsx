import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { dataEOra, ora } from './lib/date'
import { COLORI_RUOLO, NOMI_RUOLO, puoEliminare, type Impegno, type Utente } from './lib/tipi'
import { spiegaErrore } from './lib/useImpegni'

type Voce = {
  id: number
  utente_id: string | null
  azione: 'creato' | 'modificato' | 'eliminato'
  prima: Partial<Impegno> | null
  dopo: Partial<Impegno> | null
  quando: string
}

const CAMPI: [keyof Impegno, string][] = [
  ['titolo', 'titolo'], ['inizio', 'inizio'], ['fine', 'fine'], ['luogo', 'luogo'],
  ['mezzo', 'mezzo'], ['merce', 'merce'], ['note', 'note'], ['stato', 'stato'],
]

function descrivi(v: Voce): string {
  if (v.azione !== 'modificato' || !v.prima || !v.dopo) return v.azione === 'creato' ? 'Ha creato l’impegno' : 'Ha eliminato l’impegno'
  const cambi = CAMPI.filter(([k]) => v.prima![k] !== v.dopo![k]).map(([k, nome]) => {
    if (k === 'stato') return v.dopo!.stato === 'completato' ? 'segnato come completato' : 'riaperto'
    if (k === 'inizio' || k === 'fine') return `${nome} ${ora(v.prima![k] as string)} → ${ora(v.dopo![k] as string)}`
    return `${nome} cambiato`
  })
  return cambi.length ? cambi.join(', ') : 'Nessuna modifica visibile'
}

type Props = {
  impegno: Impegno
  io: Utente
  utenti: Map<string, Utente>
  onChiudi: () => void
  onModifica: () => void
  onCambiato: () => void
}

export default function Dettaglio({ impegno, io, utenti, onChiudi, onModifica, onCambiato }: Props) {
  const [storico, setStorico] = useState<Voce[]>([])
  const [errore, setErrore] = useState('')
  const assegnatore = utenti.get(impegno.assegnato_da)
  const colori = COLORI_RUOLO[assegnatore?.ruolo ?? 'logistica']
  const completato = impegno.stato === 'completato'

  useEffect(() => {
    supabase
      .from('impegni_storico')
      .select('*')
      .eq('impegno_id', impegno.id)
      .order('quando')
      .then(({ data }) => setStorico((data as Voce[]) ?? []))
  }, [impegno])

  async function cambiaStato() {
    const { error } = await supabase
      .from('impegni')
      .update({ stato: completato ? 'da_fare' : 'completato' })
      .eq('id', impegno.id)
    if (error) setErrore(spiegaErrore(error.code, error.message))
    else onCambiato()
  }

  async function elimina() {
    if (!window.confirm('Eliminare questo impegno?')) return
    const { error } = await supabase.from('impegni').delete().eq('id', impegno.id)
    if (error) setErrore(spiegaErrore(error.code, error.message))
    else {
      onCambiato()
      onChiudi()
    }
  }

  return (
    <div className="pannello-sfondo" role="dialog" aria-modal="true" aria-labelledby="titolo-dettaglio">
      <div className="pannello">
        <div className="pannello-testa">
          <span className="etichetta" style={{ background: colori.fondo, color: colori.testo }}>
            {assegnatore ? NOMI_RUOLO[assegnatore.ruolo] : 'Assegnatore'}
          </span>
          <button className="secondario" onClick={onChiudi}>Chiudi</button>
        </div>
        <h2 id="titolo-dettaglio">{impegno.titolo}</h2>
        <span className={`stato${completato ? ' fatto' : ''}`}>{completato ? 'Completato' : 'Da fare'}</span>
        <dl className="campi">
          <div><dt>Quando</dt><dd>{dataEOra(impegno.inizio)} – {ora(impegno.fine)}</dd></div>
          <div><dt>Luogo</dt><dd>{impegno.luogo || '—'}</dd></div>
          <div><dt>Mezzo</dt><dd>{impegno.mezzo || '—'}</dd></div>
          <div><dt>Merce</dt><dd>{impegno.merce || '—'}</dd></div>
        </dl>
        {impegno.note && <p className="note">{impegno.note}</p>}
        <p className="dettaglio">Assegnato da {assegnatore?.nome ?? '—'}</p>

        <h3>Storico modifiche</h3>
        <ul className="storico">
          {storico.map((v) => (
            <li key={v.id}>
              <span>{utenti.get(v.utente_id ?? '')?.nome ?? 'Sistema'}: {descrivi(v)}</span>
              <small>{dataEOra(v.quando)}</small>
            </li>
          ))}
        </ul>

        {errore && <p role="alert" className="errore">{errore}</p>}
        <div className="azioni">
          <button className="primario" onClick={onModifica}>Modifica</button>
          <button className="secondario" onClick={cambiaStato}>{completato ? 'Riapri' : 'Segna come fatto'}</button>
        </div>
        {puoEliminare(io, impegno) ? (
          <button className="pericolo" onClick={elimina}>Elimina impegno</button>
        ) : (
          <p className="dettaglio centrato">Gli impegni non si possono rifiutare: puoi modificarli e segnarli come completati.</p>
        )}
      </div>
    </div>
  )
}
