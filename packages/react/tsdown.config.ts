import { readFile, writeFile } from 'node:fs/promises'
import { defineConfig } from 'tsdown'

const sheets = ['structure', 'theme']

export default defineConfig({
  // Three entry points; only rlds/mcap import a format reader. Shared core code lands in one chunk, so every entry
  // sees the same PlayerContext.
  entry: { index: 'src/core/index.ts', rlds: 'src/rlds/index.ts', mcap: 'src/mcap/index.ts' },
  dts: true,
  platform: 'browser',
  banner: { js: "'use client';" },
  exports: {
    devExports: 'robopeek-source',
    customExports: (exports, { isPublish }) => {
      for (const s of ['styles', ...sheets]) {
        const dist = `./dist/${s}.css`
        exports[`./${s}.css`] = isPublish ? dist : { 'robopeek-source': `./src/styles/${s}.css`, default: dist }
      }
      return exports
    },
  },
  hooks: {
    // styles.css is the two sheets concatenated, so consumers never resolve a nested @import.
    'build:done': async () => {
      const parts = await Promise.all(sheets.map((s) => readFile(`src/styles/${s}.css`, 'utf8')))
      await Promise.all(sheets.map((s, i) => writeFile(`dist/${s}.css`, parts[i])))
      await writeFile('dist/styles.css', parts.join('\n'))
    },
  },
})
