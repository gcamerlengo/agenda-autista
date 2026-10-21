import { useEffect, useState } from 'react'

export function useSchermoLargo(minimo = 760): boolean {
  const query = `(min-width: ${minimo}px)`
  const [largo, setLargo] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const cambia = () => setLargo(m.matches)
    m.addEventListener('change', cambia)
    return () => m.removeEventListener('change', cambia)
  }, [query])
  return largo
}
