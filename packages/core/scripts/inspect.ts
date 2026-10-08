// Compatibility probe: loads episode 0 of each shard URL and prints how core classified every key.
// Usage: node scripts/inspect.ts <shard-url> [<shard-url> …]   (uses the sibling features.json when present)
import { ShardIndex, loadFeatureSpecs, formatFeature, episodeTitle } from '../src/index.ts'

for (const url of process.argv.slice(2)) {
  const name = url.split('/').slice(-3, -2)[0] ?? url
  try {
    const t = performance.now()
    const specs = await loadFeatureSpecs(url)
    const idx = await ShardIndex.open(url, { specs })
    let read = 0
    const ep = await idx.episode(0, { onProgress: (p) => (read = p.loaded) })
    if (!ep) throw new Error('no episode 0')
    console.log(`\n## ${name}  (${ep.length} steps, ${(read / 1e6).toFixed(1)} MB, ${Math.round(performance.now() - t)} ms, specs: ${specs ? specs.size : 'none'}, title: "${episodeTitle(ep) ?? ''}")`)
    for (const [k, im] of Object.entries(ep.images)) console.log(`  image   ${k}  ${im.kind === 'encoded' ? `${im.mime} × ${im.frames.length}` : `raw ${im.shape.join('×')}`}`)
    for (const [k, v] of Object.entries(ep.vectors)) console.log(`  vector  ${k}  [${v.shape.join(',')}]`)
    for (const [k, t] of Object.entries(ep.text)) console.log(`  text    ${k}  "${t[0]?.slice(0, 60)}"`)
    for (const [k, m] of Object.entries(ep.metadata)) console.log(`  meta    ${k}  ${formatFeature(m).slice(0, 80)}`)
  } catch (e) {
    console.log(`\n## ${name}  FAILED: ${(e as Error).message}`)
  }
}
