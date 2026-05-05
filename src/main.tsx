/**
 * main.tsx — Application entry point
 *
 * This is the first file Vite loads. It:
 * 1. Imports the global CSS (Tailwind + custom styles)
 * 2. Renders the React app into the #root div in index.html
 * 3. Registers the PWA service worker (production only)
 *
 * React.StrictMode wraps the app during development only.
 * It intentionally double-invokes render functions and effects to
 * surface side effects and deprecated API usage early.
 * It has no effect in production builds.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Import global CSS — must be imported here so Tailwind styles are bundled
import './index.css'

// Mount React into the #root div from index.html.
// The non-null assertion (!) is safe here because we control index.html
// and know #root always exists. TypeScript would otherwise complain that
// getElementById can return null.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

/**
 * Service worker registration (Push 0).
 *
 * Registers /sw.js so the browser treats Playbook as a real PWA:
 *   - enables the "Install" prompt on Chrome/Edge/Android
 *   - lets iOS Safari produce a proper standalone app from "Add to Home Screen"
 *   - is a prerequisite for Web Push notifications (added in Push 10)
 *
 * We only register in production. In dev, Vite's HMR and an active service
 * worker can fight each other — the SW caches stale modules and the page
 * stops reflecting code changes. Production-only avoids that entirely, and
 * the install prompt only matters on the deployed site anyway.
 */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[Playbook] Service worker registered:', registration.scope)
      })
      .catch((error) => {
        console.error('[Playbook] Service worker registration failed:', error)
      })
  })
}
