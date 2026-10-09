// Fails when a built entry reaches a package it must not: the root entry imports no format reader, and each format
// entry imports only its own. Follows relative imports into shared chunks, for both .js and .d.ts output.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const ALLOWED = {
  index: ['react', 'react/jsx-runtime'],
  rlds: ['react', 'react/jsx-runtime', '@videodb/robopeek-rlds'],
  mcap: ['react', 'react/jsx-runtime', '@videodb/robopeek-mcap'],
}
// Static imports and re-exports only; strings inside code (error messages) don't count.
const IMPORT = /^\s*(?:import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']/gm

function reach(file, seen = new Set(), bare = new Set()) {
  if (seen.has(file)) return bare
  seen.add(file)
  for (const m of readFileSync(file, 'utf8').matchAll(IMPORT)) {
    const spec = m[1] ?? m[2]
    // Declaration files import siblings as './chunk.js'; the file on disk is './chunk.d.ts'.
    if (spec.startsWith('.')) reach(join(dirname(file), file.endsWith('.d.ts') ? spec.replace(/\.js$/, '.d.ts') : spec), seen, bare)
    else bare.add(spec)
  }
  return bare
}

let failed = false
for (const [entry, allowed] of Object.entries(ALLOWED)) {
  for (const file of [`dist/${entry}.js`, `dist/${entry}.d.ts`]) {
    const bad = [...reach(file)].filter((s) => !allowed.includes(s))
    if (bad.length) {
      failed = true
      console.error(`✗ ${file} reaches ${bad.join(', ')}; '${entry}' may only use ${allowed.join(', ')}.`)
    } else console.log(`✓ ${file}`)
  }
}
process.exit(failed ? 1 : 0)
