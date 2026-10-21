import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { aggiungiGiorni } from './date'
import type { Impegno } from './tipi'

// Impegni della settimana, aggiornati in tempo reale quando qualcuno li cambia.
export function useImpegni(lunedi: Date) {
  const [impegni, setImpegni] = useState<Impegno[]>([])
  const [errore, setErrore] = useState('')

  const ricarica = useCallback(async () => {
    const { data, error } = await supabase
      .from('impegni')
      .select('*')
      .lt('inizio', aggiungiGiorni(lunedi, 7).toISOString())
      .gt('fine', lunedi.toISOString())
      .order('inizio')
    if (error) setErrore('Impossibile caricare gli impegni.')
    else {
      setErrore('')
      setImpegni(data as Impegno[])
    }
  }, [lunedi])

  useEffect(() => {
    ricarica()
    const canale = supabase
      .channel('impegni')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'impegni' }, () => ricarica())
      .subscribe()
    return () => {
      supabase.removeChannel(canale)
    }
  }, [ricarica])

  return { impegni, errore, ricarica }
}

// Messaggio leggibile per gli errori del database al salvataggio.
export function spiegaErrore(codice: string | undefined, messaggio: string): string {
  if (codice === '23P01') return 'Orario già occupato: Stefano ha già un impegno in quella fascia.'
  if (codice === '23514') return 'L’orario di fine deve essere dopo quello di inizio.'
  if (codice === '42501') return 'Non hai il permesso per questa operazione.'
  return messaggio
}
