// Compatibility probe: loads each MCAP file (path or URL) and prints how every topic was classified.
// Usage: node scripts/inspect.ts <file-or-url> [… ]
import { openAsBlob } from 'node:fs'
import { openMcap, type Source } from '../src/index.ts'

const asSource = async (arg: string): Promise<Source> => (/^https?:/.test(arg) ? arg : await openAsBlob(arg))

for (const arg of process.argv.slice(2)) {
  try {
    const t = performance.now()
    const file = await openMcap(await asSource(arg))
    const rec = file.recording
    await file.load()
    console.log(`\n## ${arg.split('/').pop()}  (${rec.duration.toFixed(2)} s, ${file.indexed ? 'indexed' : 'stream only'}, ${(rec.frameBytes / 1e6).toFixed(1)} MB frames, ${Math.round(performance.now() - t)} ms)`)
    for (const info of rec.topics.values()) console.log(`  ${(info.kind ?? '?').padEnd(6)}  ${info.topic}  ${info.schema}  ×${info.count}${info.error ? `  ! ${info.error}` : ''}`)
    for (const [k, im] of Object.entries(rec.images)) console.log(`  image   ${k}  ${im.kind}${im.format ? ` ${im.format}` : ''} × ${im.times.length}, ${im.keys.filter(Boolean).length} keyframes, ${im.times[0]?.toFixed(3)}–${im.times.at(-1)?.toFixed(3)} s`)
    for (const [k, v] of Object.entries(rec.vectors)) console.log(`  vector  ${k}  [${v.dim}]${v.names ? ` (${v.names.slice(0, 4).join(', ')}…)` : ''} × ${v.times.length}`)
    for (const [k, tx] of Object.entries(rec.text)) console.log(`  text    ${k}  "${tx.values[0]?.slice(0, 60)}" × ${tx.values.length}`)
    for (const [k, m] of Object.entries(rec.metadata)) console.log(`  meta    ${k}  ${m.slice(0, 80).replace(/\s+/g, ' ')}`)
  } catch (e) {
    console.log(`\n## ${arg}  FAILED: ${(e as Error).stack}`)
  }
}
