import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward API calls to the backend during `npm run dev`.
      // In production, point this at wherever server.js is deployed
      // (or serve both behind the same reverse proxy).
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
})
