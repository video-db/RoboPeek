import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// Two pages: the full shard viewer and the single-episode viewer.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        episode: resolve(import.meta.dirname, 'episode.html'),
      },
    },
  },
})
