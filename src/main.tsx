/**
 * main.tsx — Application entry point.
 * Push 7.5: SW registration now exposes "update available" via a global event
 * the topbar listens for. User can click to apply the update.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// ── PWA service worker registration with update detection ─────────────────
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // If a new SW is found, listen for it to finish installing.
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              // A controller already exists, so this new SW is an UPDATE.
              window.dispatchEvent(new CustomEvent('playbook:update-available'))
            }
          })
        })

        // Periodically poll for new versions while the app is open.
        // Every 60s is plenty; SW caches the request so it's cheap.
        setInterval(() => { registration.update().catch(() => {}) }, 60_000)
      })
      .catch((error) => {
        console.error('[Playbook] Service worker registration failed:', error)
      })

    // When the new SW takes control, reload once so the page picks up the
    // new bundle. Guarded so we don't reload twice.
    let reloaded = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return
      reloaded = true
      window.location.reload()
    })
  })
}
