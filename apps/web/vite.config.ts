import react from '@vitejs/plugin-react'
import { defaultClientConditions, defineConfig } from 'vite'
import { resolve } from 'node:path'

// Product homepage, developer guide, and standalone viewers.
// robopeek-source resolves workspace packages to their src/, so no package build is needed in dev.
// CSS @import ignores resolve.conditions, so the stylesheet needs its own alias.
export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ['robopeek-source', ...defaultClientConditions],
    alias: {
      '@videodb/robopeek-react/styles.css': resolve(import.meta.dirname, '../../packages/react/src/styles/styles.css'),
      '@videodb/robopeek-mcap-react/styles.css': resolve(import.meta.dirname, '../../packages/mcap-react/src/styles/styles.css'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        rlds: resolve(import.meta.dirname, 'RLDS/index.html'),
        viewer: resolve(import.meta.dirname, 'viewer.html'),
        episode: resolve(import.meta.dirname, 'episode.html'),
        mcap: resolve(import.meta.dirname, 'mcap.html'),
      },
    },
  },
})
