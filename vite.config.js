import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // El popup de Google (signInWithPopup) necesita poder cerrarse solo.
      // Sin esto Chrome avisa: "COOP policy would block the window.close call".
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})
