import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
})
