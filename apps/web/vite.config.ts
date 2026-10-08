import react from '@vitejs/plugin-react'
import { defaultClientConditions, defineConfig } from 'vite'
import { resolve } from 'node:path'

// Two pages: the full shard viewer and the single-episode viewer.
// robopeek-source resolves workspace packages to their src/, so no package build is needed in dev.
// CSS @import ignores resolve.conditions, so the stylesheet needs its own alias.
export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ['robopeek-source', ...defaultClientConditions],
    alias: { '@robopeek/react/styles.css': resolve(import.meta.dirname, '../../packages/react/src/styles/styles.css') },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        episode: resolve(import.meta.dirname, 'episode.html'),
      },
    },
  },
})
