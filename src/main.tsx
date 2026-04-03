/**
 * main.tsx — Application entry point
 *
 * This is the first file Vite loads. It:
 * 1. Imports the global CSS (Tailwind + custom styles)
 * 2. Renders the React app into the #root div in index.html
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
