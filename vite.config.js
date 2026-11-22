import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Em desenvolvimento o Vite roda na 5173 e encaminha /api para o servidor
// Express (npm run dev:api) na porta 3000.
const API = process.env.API_URL || 'http://127.0.0.1:3000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: API, changeOrigin: true },
      '/healthz': { target: API, changeOrigin: true },
    },
  },
})
