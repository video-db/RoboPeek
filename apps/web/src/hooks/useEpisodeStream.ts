import { useCallback, useEffect, useRef, useState } from 'react'
import { streamEpisodes, type Episode, type Progress, type Source } from '@rlds-viewer/core'

export type StreamStatus = {
  phase: 'idle' | 'loading' | 'done' | 'cancelled' | 'error'
  source?: string
  loaded: number
  total?: number
  error?: string
}

const sourceName = (src: Source) => (src instanceof File ? src.name : String(src))

/** Streams a shard into React state, batching episode/progress updates to one render per frame. */
export function useEpisodeStream() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [status, setStatus] = useState<StreamStatus>({ phase: 'idle', loaded: 0 })
  const active = useRef<AbortController | null>(null)

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
      for await (const ep of streamEpisodes(src, { signal: ac.signal, onProgress: (p) => { progress = p; schedule() } })) {
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
      const msg = e instanceof TypeError ? 'Network error. Check the URL, and that the server allows cross-origin requests.' : (e as Error).message
      setStatus((s) => ({ ...s, phase: 'error', error: msg }))
    }
  }, [])

  const cancel = useCallback(() => {
    active.current?.abort()
    setStatus((s) => (s.phase === 'loading' ? { ...s, phase: 'cancelled' } : s))
  }, [])

  return { episodes, status, load, cancel }
}
