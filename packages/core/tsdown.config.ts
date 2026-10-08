import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  // Writes package.json exports; the rlds-source condition lets the monorepo run on src/ without a build.
  exports: { devExports: 'rlds-source' },
})
