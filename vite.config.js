import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
  plugins: [react()],
  server: {
    headers: {
      // El popup de Google (signInWithPopup) necesita poder cerrarse solo.
      // Sin esto Chrome avisa: "COOP policy would block the window.close call".
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    proxy: {
      '/api/judge0': {
        target: 'https://judge0-ce.p.rapidapi.com',
        changeOrigin: true,
        rewrite: () => '/submissions?base64_encoded=false&wait=true',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyRequest) => {
            proxyRequest.setHeader('X-RapidAPI-Key', env.RAPIDAPI_KEY || '');
            proxyRequest.setHeader('X-RapidAPI-Host', 'judge0-ce.p.rapidapi.com');
          });
        },
      },
    },
  },
  }
})
