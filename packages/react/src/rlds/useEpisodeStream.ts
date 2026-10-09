import { useCallback, useEffect, useRef, useState } from 'react'
import type { Episode, Progress, Source } from '@videodb/robopeek-rlds'
import { streamEpisodes } from './reader.ts'
import { errorMessage, resolveSpecs, sourceName, type SpecsOption } from './specs.ts'

export type StreamStatus = {
  phase: 'idle' | 'loading' | 'done' | 'cancelled' | 'error'
  source?: string
  loaded: number
  total?: number
  error?: string
}

/** Streams a shard into React state, batching episode/progress updates to one render per frame. */
export function useEpisodeStream(opts: { specs?: SpecsOption } = {}) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [status, setStatus] = useState<StreamStatus>({ phase: 'idle', loaded: 0 })
  const active = useRef<AbortController | null>(null)
  const specsOpt = useRef(opts.specs ?? 'auto')
  specsOpt.current = opts.specs ?? 'auto'

  useEffect(() => () => active.current?.abort(), [])

  const load = useCallback(async (src: Source) => {
    active.current?.abort()
    const ac = new AbortController()
    active.current = ac
    setEpisodes([])
    setStatus({ phase: 'loading', source: sourceName(src), loaded: 0 })

    const buf: Episode[] = []
    let progress: Progress = { loaded: 0 }
    let raf = 0
    const flush = () => {
      raf = 0
      if (active.current !== ac) return
      setEpisodes(buf.slice())
      setStatus((s) => ({ ...s, ...progress }))
    }
    const schedule = () => { raf ||= requestAnimationFrame(flush) }

    try {
      const specs = await resolveSpecs(src, specsOpt.current, ac.signal)
      for await (const ep of streamEpisodes(src, { signal: ac.signal, specs, onProgress: (p) => { progress = p; schedule() } })) {
        buf.push(ep)
        schedule()
      }
      cancelAnimationFrame(raf)
      flush()
      if (!ac.signal.aborted) setStatus((s) => ({ ...s, phase: 'done' }))
    } catch (e) {
      if (ac.signal.aborted) return
      cancelAnimationFrame(raf)
      flush()
      setStatus((s) => ({ ...s, phase: 'error', error: errorMessage(e) }))
    }
  }, [])

  const cancel = useCallback(() => {
    active.current?.abort()
    setStatus((s) => (s.phase === 'loading' ? { ...s, phase: 'cancelled' } : s))
  }, [])

  const reset = useCallback(() => {
    active.current?.abort()
    setEpisodes([])
    setStatus({ phase: 'idle', loaded: 0 })
  }, [])

  return { episodes, status, load, cancel, reset }
}
