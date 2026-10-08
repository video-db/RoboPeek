import { useEffect, useRef, useState } from 'react'
import { ShardIndex, type Episode, type Progress, type Source } from '@videodb/robopeek-rlds'
import { errorMessage, resolveSpecs, type SpecsOption } from './specs.ts'

export type EpisodeStatus =
  | { phase: 'idle' }
  | { phase: 'loading'; n: number; progress?: Progress }
  | { phase: 'ready'; progress?: Progress }
  | { phase: 'error'; error: string }

/**
 * Fetches one episode by number without loading the rest of the shard (URLs need HTTP Range support).
 * The shard index is kept per source, so moving between episodes reuses what has been read.
 */
export function useEpisode(src: Source | null | undefined, n: number, opts: { specs?: SpecsOption } = {}) {
  const [episode, setEpisode] = useState<Episode>()
  const [status, setStatus] = useState<EpisodeStatus>({ phase: 'idle' })
  const [known, setKnown] = useState({ count: 0, complete: false })
  const shard = useRef<{ src: Source; index: Promise<ShardIndex> } | null>(null)
  const specsOpt = useRef(opts.specs ?? 'auto')
  specsOpt.current = opts.specs ?? 'auto'

  useEffect(() => {
    if (src == null) {
      setEpisode(undefined)
      setStatus({ phase: 'idle' })
      return
    }
    const ac = new AbortController()
    setStatus({ phase: 'loading', n })
    if (shard.current?.src !== src) {
      setKnown({ count: 0, complete: false })
      // Not tied to this effect's signal: the index outlives one request (and StrictMode's double run).
      shard.current = { src, index: resolveSpecs(src, specsOpt.current).then((specs) => ShardIndex.open(src, { specs })) }
    }
    const entry = shard.current
    ;(async () => {
      try {
        const index = await entry.index
        let progress: Progress | undefined
        const ep = await index.episode(n, {
          signal: ac.signal,
          onProgress: (p) => { progress = p; setStatus({ phase: 'loading', n, progress: p }) },
        })
        if (ac.signal.aborted) return
        setKnown({ count: index.entries.length, complete: index.complete })
        if (!ep) {
          const count = index.entries.length
          setEpisode(undefined)
          setStatus({ phase: 'error', error: `Episode ${n} does not exist. This shard has ${count} episodes (0–${count - 1}).` })
        } else {
          setEpisode(ep)
          setStatus({ phase: 'ready', progress })
        }
      } catch (e) {
        if (ac.signal.aborted) return
        if (shard.current === entry && !(await entry.index.catch(() => null))) shard.current = null
        setStatus({ phase: 'error', error: errorMessage(e) })
      }
    })()
    return () => ac.abort()
  }, [src, n])

  return { episode, status, known }
}
