import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Route /api calls to the local Express server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      // Route /groq calls to local groq function
      '/groq': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/groq/, '/.netlify/functions/groq')
      }
    }
  },
  build: {
    outDir: 'build',
    emptyOutDir: true
  }
})
