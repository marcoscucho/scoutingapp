import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5180,
    proxy: {
      '/sheets-proxy': {
        target: 'https://docs.google.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sheets-proxy/, ''),
        followRedirects: true,
      },
      '/fotmob-proxy': {
        target: 'https://pub.fotmob.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fotmob-proxy/, ''),
      },
      '/fotmob-www': {
        target: 'https://www.fotmob.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fotmob-www/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
          'Referer': 'https://www.fotmob.com/',
        },
      },
      '/espn-proxy': {
        target: 'https://site.api.espn.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/espn-proxy/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
        },
      },
      '/fotmob-images': {
        target: 'https://images.fotmob.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fotmob-images/, ''),
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      },
      '/promiedos-proxy': {
        target: 'https://www.promiedos.com.ar',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/promiedos-proxy/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'es-AR,es;q=0.9',
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - separate large dependencies
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['jspdf', 'html2canvas'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
