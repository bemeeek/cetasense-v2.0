import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: 'localhost',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        // biarkan prefix /api agar route di Go-Gateway tetap /api/...
        rewrite: (path) => path,  
      },
      '/localize': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        // biarkan prefix /localize agar route di Go-Gateway tetap /localize/...
        rewrite: (path) => path,  
      }
    }
  },
  preview: {
    host: 'localhost',
    port: 5173,
    // kalau mau preview juga pakai proxy, dup aplikasi server.proxy di sini:
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
  }
})
