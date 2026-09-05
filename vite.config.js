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
      '/api/adaptive': {
        target: 'http://127.0.0.1:5001/codecompc/us-central1',
        changeOrigin: true,
        rewrite: () => '/adaptiveSubmission',
      },
      '/api/problems': {
        target: 'http://127.0.0.1:5001/codecompc/us-central1',
        changeOrigin: true,
        rewrite: (path) => {
          const query = path.includes('?') ? path.slice(path.indexOf('?')) : '';
          const detail = path.match(/^\/api\/problems\/([^/?]+)/);
          return detail
            ? `/problemDetail?number=${encodeURIComponent(detail[1])}${query}`
            : `/problems${query}`;
        },
      },
      '/api/progress': {
        target: 'http://127.0.0.1:5001/codecompc/us-central1',
        changeOrigin: true,
        rewrite: () => '/progress',
      },
      '/api/recommendations': {
        target: 'http://127.0.0.1:5001/codecompc/us-central1',
        changeOrigin: true,
        rewrite: (path) => path.includes('?') ? `/recommendations${path.slice(path.indexOf('?'))}` : '/recommendations',
      },
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
