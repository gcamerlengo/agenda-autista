import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'
import { aggiungiMesi, conOra, inizioGiorno, inizioMese, ora, perOra } from './lib/date'
import { MEZZI, type Impegno } from './lib/tipi'
import { spiegaErrore } from './lib/useImpegni'
import CampoLuogo from './CampoLuogo'
import Dettatura from './Dettatura'
import MeseCalendario from './MeseCalendario'

type Props = {
  impegno: Impegno | null // null = nuovo
  giornoIniziale: Date
  onChiudi: () => void
  onSalvato: () => void
}

type Conflitto = Pick<Impegno, 'titolo' | 'inizio' | 'fine'>

export default function FormImpegno({ impegno, giornoIniziale, onChiudi, onSalvato }: Props) {
  const [titolo, setTitolo] = useState(impegno?.titolo ?? '')
  const [giorno, setGiorno] = useState(() => inizioGiorno(giornoIniziale))
  const [mese, setMese] = useState(() => inizioMese(giornoIniziale))
  const [oraInizio, setOraInizio] = useState(impegno ? perOra(impegno.inizio) : '09:00')
  const [oraFine, setOraFine] = useState(impegno ? perOra(impegno.fine) : '10:00')
  const inizio = conOra(giorno, oraInizio).getTime()
  const fine = conOra(giorno, oraFine).getTime()
  const [luogo, setLuogo] = useState(impegno?.luogo ?? '')
  const [mezzo, setMezzo] = useState(impegno?.mezzo ?? MEZZI[0])
  const [merce, setMerce] = useState(impegno?.merce ?? '')
  const [note, setNote] = useState(impegno?.note ?? '')
  const [conflitto, setConflitto] = useState<Conflitto | null>(null)
  const [errore, setErrore] = useState('')
  const [attesa, setAttesa] = useState(false)

  const orarioValido = new Date(fine) > new Date(inizio)

  const conflittoVisibile = orarioValido ? conflitto : null

  // Controllo immediato delle sovrapposizioni; il database lo garantisce comunque al salvataggio.
  useEffect(() => {
    if (!orarioValido) return
    let attuale = true
    let q = supabase
      .from('impegni')
      .select('titolo, inizio, fine')
      .lt('inizio', new Date(fine).toISOString())
      .gt('fine', new Date(inizio).toISOString())
      .limit(1)
    if (impegno) q = q.neq('id', impegno.id)
    q.then(({ data }) => {
      if (attuale) setConflitto((data?.[0] as Conflitto) ?? null)
    })
    return () => {
      attuale = false
    }
  }, [inizio, fine, orarioValido, impegno])

  async function salva(e: FormEvent) {
    e.preventDefault()
    setErrore('')
    setAttesa(true)
    const valori = {
      titolo: titolo.trim(),
      inizio: new Date(inizio).toISOString(),
      fine: new Date(fine).toISOString(),
      luogo: luogo.trim(),
      mezzo,
      merce: merce.trim(),
      note: note.trim(),
    }
    const { error } = impegno
      ? await supabase.from('impegni').update(valori).eq('id', impegno.id)
      : await supabase.from('impegni').insert(valori)
    setAttesa(false)
    if (error) setErrore(spiegaErrore(error.code, error.message))
    else onSalvato()
  }

  return (
    <div className="pannello-sfondo" role="dialog" aria-modal="true" aria-labelledby="titolo-form">
      <form className="pannello" onSubmit={salva}>
        <div className="pannello-testa">
          <h2 id="titolo-form">{impegno ? 'Modifica impegno' : 'Nuovo impegno'}</h2>
          <button type="button" className="secondario" onClick={onChiudi}>Annulla</button>
        </div>
        <label>
          Titolo
          <input required value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Consegna cliente" />
        </label>
        <div className="campo">
          <span className="etichetta-campo">Giorno</span>
          <MeseCalendario
            mese={mese}
            onMese={(d) => setMese(aggiungiMesi(mese, d))}
            scelto={giorno}
            onScegli={(d) => {
              setGiorno(inizioGiorno(d))
              setMese(inizioMese(d))
            }}
          />
        </div>
        <div className="due-colonne">
          <label>
            Dalle
            <input type="time" required value={oraInizio} onChange={(e) => setOraInizio(e.target.value)} />
          </label>
          <label>
            Alle
            <input type="time" required value={oraFine} onChange={(e) => setOraFine(e.target.value)} />
          </label>
        </div>
        {!orarioValido && <p role="alert" className="avviso">L’orario di fine deve essere dopo quello di inizio.</p>}
        {conflittoVisibile && (
          <div role="alert" className="avviso">
            <strong>Orario già occupato</strong>
            <span>
              Dalle {ora(conflittoVisibile.inizio)} alle {ora(conflittoVisibile.fine)} Stefano ha già “{conflittoVisibile.titolo}”.
            </span>
          </div>
        )}
        <CampoLuogo valore={luogo} onCambia={setLuogo} />
        <label>
          Mezzo
          <select value={mezzo} onChange={(e) => setMezzo(e.target.value)}>
            {[...new Set([...MEZZI, mezzo])].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          Merce
          <input value={merce} onChange={(e) => setMerce(e.target.value)} />
        </label>
        <label>
          Note per Stefano
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <Dettatura onTesto={(t) => setNote((n) => (n.trim() ? `${n.trimEnd()} ${t}` : t))} />
        {errore && <p role="alert" className="errore">{errore}</p>}
        <button className="primario" disabled={attesa || !!conflittoVisibile || !orarioValido}>
          {conflittoVisibile ? 'Scegli un altro orario' : attesa ? 'Salvataggio…' : 'Salva'}
        </button>
      </form>
    </div>
  )
}
