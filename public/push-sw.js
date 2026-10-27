// Gestione delle notifiche push, caricata dal service worker generato da vite-plugin-pwa.
self.addEventListener('push', (event) => {
  const dati = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(dati.title || 'Agenda Autista', {
      body: dati.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: dati.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((finestre) => {
      for (const f of finestre) if ('focus' in f) return f.focus()
      return self.clients.openWindow(url)
    }),
  )
})
