import { supabase } from './supabase'

export type StatoNotifiche = 'non-supportate' | 'installa-app' | 'bloccate' | 'da-attivare' | 'attive'

const iOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const installata = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export async function statoNotifiche(): Promise<StatoNotifiche> {
  // Su iPhone le notifiche esistono solo nell'app aggiunta alla schermata Home.
  if (iOS() && !installata()) return 'installa-app'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'non-supportate'
  }
  if (Notification.permission === 'denied') return 'bloccate'
  const reg = await navigator.serviceWorker.ready
  const iscrizione = await reg.pushManager.getSubscription()
  return iscrizione && Notification.permission === 'granted' ? 'attive' : 'da-attivare'
}

function base64UrlInBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

// Chiede il permesso, iscrive il dispositivo e salva l'iscrizione per l'utente corrente.
export async function attivaNotifiche(): Promise<StatoNotifiche> {
  const permesso = await Notification.requestPermission()
  if (permesso !== 'granted') return permesso === 'denied' ? 'bloccate' : 'da-attivare'

  const { vapidPublicKey } = (await fetch('/api/notifica').then((r) => r.json())) as { vapidPublicKey: string | null }
  if (!vapidPublicKey) throw new Error('Notifiche non ancora configurate sul server.')

  const reg = await navigator.serviceWorker.ready
  let iscrizione = await reg.pushManager.getSubscription()
  try {
    iscrizione ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlInBytes(vapidPublicKey) })
  } catch {
    throw new Error('Questo browser non riesce ad attivare le notifiche push.')
  }
  const j = iscrizione.toJSON()
  const { error } = await supabase
    .from('push_iscrizioni')
    .upsert({ endpoint: j.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth }, { onConflict: 'endpoint' })
  if (error) throw new Error('Impossibile salvare l’iscrizione alle notifiche.')
  return 'attive'
}
