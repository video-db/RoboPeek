import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  plugins: [react()],
  // Run workspace packages from source, as apps/web does.
  resolve: { conditions: ['robopeek-source', 'module', 'browser', 'development|production'] },
  test: {
    browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: 'chromium' }] },
  },
})
