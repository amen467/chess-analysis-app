import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const isDevelopment = process.env.NODE_ENV === 'development'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), ...(isDevelopment ? [vueDevTools()] : [])],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
