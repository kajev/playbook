import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST

// Vite config docs: https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // @vitejs/plugin-react uses Babel for Fast Refresh during dev
    react(),
  ],
  resolve: {
    alias: {
      // Maps @/ to the src/ directory so imports are clean:
      // import { supabase } from '@/lib/supabase' instead of '../../../lib/supabase'
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Tauri-specific (Push 1):
  // Tauri uses its own terminal output; don't let Vite clear it
  clearScreen: false,

  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: 'ws', host, port: 5174 }
      : undefined,
    watch: {
      // Don't reload Vite when Tauri's Rust files rebuild
      ignored: ['**/src-tauri/**'],
    },
  },

  // Allow TAURI_ENV_* env vars to be exposed to client code
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
})
