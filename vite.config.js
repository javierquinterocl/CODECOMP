import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
     
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    proxy: {
      // 54321 con `supabase functions serve`; 8000 con `deno run`
      // Cambiar con: API_PROXY=http://127.0.0.1:8000 npm run dev
      '/api': {
        target: process.env.API_PROXY || 'http://127.0.0.1:54321/functions/v1',
        changeOrigin: true,
      },
    },
  },
})
