// Funzione serverless su Vercel: riceve dal database (trigger notifica_impegno) le modifiche
// agli impegni e avvisa i destinatari con notifica push ed email (SMTP Aruba).
import nodemailer from 'nodemailer'
import webpush from 'web-push'

type Impegno = {
  titolo: string
  inizio: string
  fine: string
  luogo: string
  mezzo: string
  merce: string
  note: string
  stato: 'da_fare' | 'completato'
}

type Destinatario = {
  nome: string
  email: string
  ruolo: string
  iscrizioni: webpush.PushSubscription[]
}

export type Evento = {
  tipo: 'insert' | 'update' | 'delete'
  autore: string | null
  assegnato_da: string | null
  impegno: Impegno
  prima: Impegno | null
  destinatari: Destinatario[]
}

const SITO = 'https://agenda-autista-seven.vercel.app'

function quando(i: Impegno): string {
  const fmt = (d: string, o: Intl.DateTimeFormatOptions) =>
    new Date(d).toLocaleString('it-IT', { timeZone: 'Europe/Rome', ...o })
  const giorno = fmt(i.inizio, { weekday: 'long', day: 'numeric', month: 'long' })
  const ora = (d: string) => fmt(d, { hour: '2-digit', minute: '2-digit' })
  return `${giorno}, ${ora(i.inizio)}–${ora(i.fine)}`
}

const CAMPI: [keyof Impegno, string][] = [
  ['titolo', 'titolo'], ['luogo', 'luogo'], ['mezzo', 'mezzo'], ['merce', 'merce'], ['note', 'note'],
]

export function componiMessaggio(e: Evento): { titolo: string; testo: string } {
  const chi = e.autore ?? 'Qualcuno'
  const i = e.impegno
  if (e.tipo === 'insert') {
    return { titolo: `Nuovo impegno: ${i.titolo}`, testo: `${quando(i)} · assegnato da ${chi}` }
  }
  if (e.tipo === 'delete') {
    return { titolo: `Impegno eliminato: ${i.titolo}`, testo: `${chi} ha eliminato l’impegno di ${quando(i)}` }
  }
  const p = e.prima
  if (p && p.stato !== i.stato) {
    const azione = i.stato === 'completato' ? 'completato' : 'riaperto'
    return { titolo: `Impegno ${azione}: ${i.titolo}`, testo: `${chi} l’ha segnato come ${azione} · ${quando(i)}` }
  }
  const cambi: string[] = []
  if (p && (p.inizio !== i.inizio || p.fine !== i.fine)) cambi.push(`orario: ${quando(i)}`)
  for (const [k, nome] of CAMPI) if (p && p[k] !== i[k]) cambi.push(i[k] ? `${nome}: ${i[k]}` : `${nome} rimosso`)
  return {
    titolo: `Impegno modificato: ${i.titolo}`,
    testo: `${chi} ha cambiato ${cambi.length ? cambi.join(', ') : 'l’impegno'}`,
  }
}

function html(e: Evento, m: { titolo: string; testo: string }): string {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  const i = e.impegno
  const righe = [
    ['Quando', quando(i)], ['Luogo', i.luogo], ['Mezzo', i.mezzo], ['Merce', i.merce], ['Note', i.note],
    ['Assegnato da', e.assegnato_da ?? ''],
  ].filter(([, v]) => v)
  return `<div style="font-family:system-ui,sans-serif;color:#18201a">
<h2 style="margin:0 0 8px">${esc(m.titolo)}</h2>
<p style="margin:0 0 16px">${esc(m.testo)}</p>
<table style="border-collapse:collapse">${righe
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#555e52">${k}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`)
    .join('')}</table>
<p style="margin:20px 0 0"><a href="${SITO}" style="color:#3f4d1f">Apri Agenda Autista</a></p>
</div>`
}

function configuraPush(): boolean {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, SMTP_FROM } = process.env
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false
  webpush.setVapidDetails(`mailto:${SMTP_FROM ?? 'agenda@oliodante.it'}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  return true
}

function trasportoEmail() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  const porta = Number(SMTP_PORT ?? 465)
  return nodemailer.createTransport({
    host: SMTP_HOST, port: porta, secure: porta === 465, auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

// La chiave pubblica serve all'app per iscrivere il telefono alle notifiche.
export function GET(): Response {
  return Response.json({ vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? null })
}

export async function POST(request: Request): Promise<Response> {
  const segreto = process.env.WEBHOOK_SECRET
  if (!segreto || request.headers.get('authorization') !== `Bearer ${segreto}`) {
    return new Response('Non autorizzato', { status: 401 })
  }
  const evento = (await request.json()) as Evento
  const m = componiMessaggio(evento)
  const push = configuraPush()
  const posta = trasportoEmail()
  const esito = { push: 0, pushFallite: 0, email: 0, emailFallite: 0 }

  await Promise.all(
    evento.destinatari.flatMap((d) => [
      ...(push
        ? d.iscrizioni.map((s) =>
            webpush
              .sendNotification(s, JSON.stringify({ title: m.titolo, body: m.testo, url: '/' }), { TTL: 86400 })
              .then(() => esito.push++)
              .catch((err) => {
                esito.pushFallite++
                console.error('push', d.email, err?.statusCode ?? err)
              }),
          )
        : []),
      posta
        ? posta
            .sendMail({
              from: `Agenda Autista <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
              to: d.email,
              subject: m.titolo,
              text: `${m.testo}\n\n${SITO}`,
              html: html(evento, m),
            })
            .then(() => esito.email++)
            .catch((err) => {
              esito.emailFallite++
              console.error('email', d.email, err)
            })
        : Promise.resolve(),
    ]),
  )
  return Response.json(esito)
}
