export const GIORNI_BREVI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export function inizioSettimana(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const giorno = (r.getDay() + 6) % 7 // lunedì = 0
  r.setDate(r.getDate() - giorno)
  return r
}

export function aggiungiGiorni(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function stessoGiorno(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function ora(d: Date | string): string {
  return new Date(d).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function giornoLungo(d: Date | string): string {
  return new Date(d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function dataEOra(d: Date | string): string {
  return new Date(d).toLocaleString('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function etichettaSettimana(lunedi: Date): string {
  const domenica = aggiungiGiorni(lunedi, 6)
  const fine = domenica.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
  const inizio = lunedi.getMonth() === domenica.getMonth()
    ? String(lunedi.getDate())
    : lunedi.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
  return `${inizio} – ${fine}`
}

// Valore per <input type="datetime-local"> nell'ora locale.
export function perInput(d: Date | string): string {
  const x = new Date(d)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`
}

export function oreDecimali(d: Date): number {
  return d.getHours() + d.getMinutes() / 60
}
