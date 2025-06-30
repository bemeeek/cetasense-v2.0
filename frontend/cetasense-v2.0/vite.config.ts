import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    },
    port: 5173,
    host: 'localhost'
  },
  preview: {
    port: 5173,
    host: 'localhost'
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
    }
})
