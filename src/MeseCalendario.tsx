import { grigliaMese, GIORNI_BREVI, giornoLungo, nomeMese, stessoGiorno } from './lib/date'

type Props = {
  mese: Date
  onMese: (delta: number) => void
  scelto: Date
  onScegli: (d: Date) => void
  conteggio?: (d: Date) => number
}

// Calendario mensile: il giorno di oggi è contornato, quello scelto è pieno.
export default function MeseCalendario({ mese, onMese, scelto, onScegli, conteggio }: Props) {
  const oggi = new Date()
  return (
    <div className="mese">
      <div className="mese-testa">
        <button type="button" className="secondario icona" aria-label="Mese precedente" onClick={() => onMese(-1)}>‹</button>
        <strong>{nomeMese(mese)}</strong>
        <button type="button" className="secondario icona" aria-label="Mese successivo" onClick={() => onMese(1)}>›</button>
      </div>
      <div className="mese-griglia">
        {GIORNI_BREVI.map((g) => (
          <span key={g} className="mese-nome">{g}</span>
        ))}
        {grigliaMese(mese).map((d) => {
          const n = conteggio?.(d) ?? 0
          const classi = [
            'mese-giorno',
            d.getMonth() !== mese.getMonth() && 'fuori',
            stessoGiorno(d, oggi) && 'oggi',
          ].filter(Boolean).join(' ')
          return (
            <button
              type="button"
              key={d.toISOString()}
              className={classi}
              aria-pressed={stessoGiorno(d, scelto)}
              aria-label={`${giornoLungo(d)}${n ? `, ${n} impegni` : ''}`}
              onClick={() => onScegli(d)}
            >
              {d.getDate()}
              {n > 0 && <span className="punto" aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
