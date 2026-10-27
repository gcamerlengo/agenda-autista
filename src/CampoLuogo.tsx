import { useEffect, useState } from 'react'

type Props = {
  valore: string
  onCambia: (v: string) => void
}

let comuni: Promise<string[]> | null = null

// Elenco dei 7.904 comuni italiani ("Nome (SIGLA)"), scaricato una volta sola al primo uso.
function caricaComuni(): Promise<string[]> {
  comuni ??= fetch('/comuni.json')
    .then((r) => r.json() as Promise<string[]>)
    .catch(() => {
      comuni = null
      return []
    })
  return comuni
}

const normalizza = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// Campo Luogo: dalle prime lettere suggerisce i comuni; resta libero per indirizzi o nomi di clienti.
export default function CampoLuogo({ valore, onCambia }: Props) {
  const [elenco, setElenco] = useState<string[]>([])
  const [aperto, setAperto] = useState(false)

  useEffect(() => {
    if (aperto && elenco.length === 0) caricaComuni().then(setElenco)
  }, [aperto, elenco.length])

  const cerca = normalizza(valore)
  const suggerimenti =
    aperto && cerca.length >= 2
      ? elenco.filter((c) => normalizza(c).startsWith(cerca) && c !== valore).slice(0, 8)
      : []

  return (
    <div className="campo luogo">
      <label>
        Luogo
        <input
          value={valore}
          autoComplete="off"
          placeholder="Scrivi le prime lettere del comune"
          onChange={(e) => {
            onCambia(e.target.value)
            setAperto(true)
          }}
          onFocus={() => setAperto(true)}
          onBlur={() => setTimeout(() => setAperto(false), 150)}
        />
      </label>
      {suggerimenti.length > 0 && (
        <ul className="suggerimenti" role="listbox" aria-label="Comuni">
          {suggerimenti.map((c) => (
            <li key={c}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onCambia(c)
                  setAperto(false)
                }}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
