import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  base: './', // Needed for Electron file:// protocol
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'main/dist',       // Output path Electron will load from
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // Optional: for cleaner imports
    },
  },
})
