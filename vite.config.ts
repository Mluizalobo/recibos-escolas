import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Publicado como site de projeto no GitHub Pages, em /recibos-escolas/.
  base: '/recibos-escolas/',
  plugins: [react(), tailwindcss()],
})
