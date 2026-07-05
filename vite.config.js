import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/chesstrainer/',
  plugins: [
    tailwindcss(),
    react()
  ],
  build: {
    minify: true,       // Aggressively minifies identifiers, syntax, and layout
    sourcemap: false,   // Explicitly disable sourcemaps so original JSX cannot be read in devtools
    cssMinify: true,
    chunkSizeWarningLimit: 1000
  }
})
