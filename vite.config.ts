import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Publicado na Vercel, na raiz do domínio (ex: recibos-escolas.vercel.app).
  base: '/',
  plugins: [react(), tailwindcss()],
})
