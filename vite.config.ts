import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { reportOnlySecurityHeaders, securityHeaders } from './src/config/securityHeaders'

const isDevelopment = process.env.NODE_ENV === 'development'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), ...(isDevelopment ? [vueDevTools()] : [])],
  server: {
    // Keep local dev flexible while still surfacing CSP issues in browser consoles.
    headers: reportOnlySecurityHeaders,
  },
  preview: {
    // Enforced policy for production-like local validation (`npm run preview`).
    headers: securityHeaders,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
