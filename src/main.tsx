import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Quando esce una nuova versione l'app si ricarica da sola. Il controllo avviene all'apertura
// e ogni volta che si torna sull'app (sul telefono resta spesso aperta in background).
registerSW({
  immediate: true,
  onRegisteredSW(_url, registrazione) {
    if (!registrazione) return
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registrazione.update()
    })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
