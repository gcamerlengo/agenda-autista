import { useMemo, useState } from 'react'
import { aggiungiGiorni, etichettaSettimana, GIORNI_BREVI, giornoLungo, inizioSettimana, ora, oreDecimali, stessoGiorno } from './lib/date'
import { COLORI_RUOLO, NOMI_RUOLO, type Impegno, type Ruolo, type Utente } from './lib/tipi'
import { useSchermoLargo } from './lib/useLarghezza'
import MeseCalendario from './MeseCalendario'

const ORA_INIZIO = 6
const ORA_FINE = 20
const ALTEZZA_ORA = 56

export type Modo = 'giorno' | 'settimana'

type Props = {
  modo: Modo
  onModo: (m: Modo) => void
  giorno: Date
  onGiorno: (d: Date) => void
  mese: Date
  onMese: (delta: number) => void
  onOggi: () => void
  impegni: Impegno[]
  utenti: Map<string, Utente>
  onApri: (i: Impegno) => void
}

type Filtro = 'tutti' | Exclude<Ruolo, 'autista'>

export default function Calendario({ modo, onModo, giorno, onGiorno, mese, onMese, onOggi, impegni, utenti, onApri }: Props) {
  const largo = useSchermoLargo()
  const [filtro, setFiltro] = useState<Filtro>('tutti')
  const oggi = new Date()
  const lunedi = useMemo(() => inizioSettimana(giorno), [giorno])

  const giorni = useMemo(() => Array.from({ length: 7 }, (_, i) => aggiungiGiorni(lunedi, i)), [lunedi])
  const visibili = impegni.filter((i) => filtro === 'tutti' || utenti.get(i.assegnato_da)?.ruolo === filtro)
  const delGiorno = (g: Date) => visibili.filter((i) => stessoGiorno(new Date(i.inizio), g))
  const ruoloDi = (i: Impegno): Ruolo => utenti.get(i.assegnato_da)?.ruolo ?? 'logistica'

  const listaGiorno = (
    <>
      <h3 className="titolo-giorno">{giornoLungo(giorno)}</h3>
      <div className="lista">
        {delGiorno(giorno).length === 0 && <p className="vuoto">Nessun impegno in questo giorno</p>}
        {delGiorno(giorno).map((imp) => {
          const r = ruoloDi(imp)
          const c = COLORI_RUOLO[r]
          return (
            <button key={imp.id} className={`scheda${imp.stato === 'completato' ? ' completato' : ''}`} onClick={() => onApri(imp)}>
              <div className="riga">
                <strong>{ora(imp.inizio)} – {ora(imp.fine)}</strong>
                <span className="etichetta" style={{ background: c.fondo, color: c.testo }}>{NOMI_RUOLO[r]}</span>
              </div>
              <span className="titolo">{imp.titolo}</span>
              {imp.luogo && <span className="dettaglio">Luogo: {imp.luogo}</span>}
              {(imp.mezzo || imp.merce) && (
                <span className="dettaglio">{[imp.mezzo && `Mezzo: ${imp.mezzo}`, imp.merce && `Merce: ${imp.merce}`].filter(Boolean).join(' · ')}</span>
              )}
            </button>
          )
        })}
      </div>
    </>
  )

  return (
    <section className="calendario">
      <div className="barra">
        <div className="modi" role="group" aria-label="Vista">
          <button aria-pressed={modo === 'giorno'} onClick={() => onModo('giorno')}>Giorno</button>
          <button aria-pressed={modo === 'settimana'} onClick={() => onModo('settimana')}>Settimana</button>
        </div>
        <div className="navigazione">
          {modo === 'settimana' && (
            <button className="secondario icona" aria-label="Settimana precedente" onClick={() => onGiorno(aggiungiGiorni(giorno, -7))}>‹</button>
          )}
          <button className="secondario" onClick={onOggi}>Oggi</button>
          {modo === 'settimana' && (
            <button className="secondario icona" aria-label="Settimana successiva" onClick={() => onGiorno(aggiungiGiorni(giorno, 7))}>›</button>
          )}
        </div>
      </div>
      {modo === 'settimana' && <h2 className="titolo-settimana">{etichettaSettimana(lunedi)}</h2>}

      <div className="filtri" role="group" aria-label="Filtra per chi ha assegnato">
        {(['tutti', 'logistica', 'stabilimento', 'amministrazione', 'presidente'] as Filtro[]).map((f) => (
          <button
            key={f}
            aria-pressed={filtro === f}
            className={`filtro filtro-${f}`}
            onClick={() => setFiltro(f)}
          >
            {f === 'tutti' ? 'Tutti' : NOMI_RUOLO[f]}
          </button>
        ))}
      </div>

      {modo === 'giorno' ? (
        <div className="vista-giorno">
          <MeseCalendario mese={mese} onMese={onMese} scelto={giorno} onScegli={onGiorno} conteggio={(d) => delGiorno(d).length} />
          <div className="orario-giorno">{listaGiorno}</div>
        </div>
      ) : largo ? (
        <div className="griglia-contenitore">
          <div className="griglia">
            <div className="intestazione-vuota" />
            {giorni.map((g, i) => (
              <div key={i} className={`intestazione${stessoGiorno(g, oggi) ? ' oggi' : ''}`}>
                <span>{GIORNI_BREVI[i]}</span>
                <strong>{g.getDate()}</strong>
              </div>
            ))}
            <div className="ore" style={{ height: (ORA_FINE - ORA_INIZIO) * ALTEZZA_ORA }}>
              {Array.from({ length: ORA_FINE - ORA_INIZIO }, (_, h) => (
                <span key={h} style={{ top: h * ALTEZZA_ORA }}>{String(ORA_INIZIO + h).padStart(2, '0')}:00</span>
              ))}
            </div>
            {giorni.map((g, i) => (
              <div key={i} className={`colonna${i >= 5 ? ' weekend' : ''}`} style={{ height: (ORA_FINE - ORA_INIZIO) * ALTEZZA_ORA }}>
                {delGiorno(g).map((imp) => {
                  const inizio = Math.max(oreDecimali(new Date(imp.inizio)), ORA_INIZIO)
                  const fineData = new Date(imp.fine)
                  const fine = stessoGiorno(fineData, g) ? Math.min(oreDecimali(fineData), ORA_FINE) : ORA_FINE
                  const c = COLORI_RUOLO[ruoloDi(imp)]
                  return (
                    <button
                      key={imp.id}
                      className={`blocco${imp.stato === 'completato' ? ' completato' : ''}`}
                      style={{
                        top: (inizio - ORA_INIZIO) * ALTEZZA_ORA + 2,
                        height: Math.max((fine - inizio) * ALTEZZA_ORA - 4, 28),
                        background: c.fondo, borderColor: c.bordo, color: c.testo,
                      }}
                      onClick={() => onApri(imp)}
                    >
                      <span className="ora">{ora(imp.inizio)} – {ora(imp.fine)}</span>
                      <strong>{imp.titolo}</strong>
                      <span>{[imp.luogo, imp.mezzo].filter(Boolean).join(' · ')}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="giorni">
            {giorni.map((g, i) => {
              const n = delGiorno(g).length
              return (
                <button
                  key={i}
                  aria-pressed={stessoGiorno(g, giorno)}
                  aria-label={`${giornoLungo(g)}, ${n} impegni`}
                  className={`giorno${stessoGiorno(g, oggi) ? ' oggi' : ''}`}
                  onClick={() => onGiorno(g)}
                >
                  <span>{GIORNI_BREVI[i]}</span>
                  <strong>{g.getDate()}</strong>
                  <small>{n ? `${n} imp.` : ' '}</small>
                </button>
              )
            })}
          </div>
          {listaGiorno}
        </>
      )}
    </section>
  )
}
