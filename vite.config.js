import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8089,
    cors: true,
    proxy: {
      '/basic-api': {
        target: 'https://platform.jingzeer.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/basic-api/, '')
      },
      '/oss-api': {
        target: 'https://pic.jingzeer.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/oss-api/, '')
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 8089
  }
})
