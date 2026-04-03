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
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      },
      '/fotmob-images': {
        target: 'https://images.fotmob.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fotmob-images/, ''),
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
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
