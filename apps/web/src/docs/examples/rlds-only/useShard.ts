import { useEffect, useState } from 'react'
import { loadFeatureSpecs, streamEpisodes, type Episode, type Progress, type Source } from '@videodb/robopeek-rlds'

/** Everything here is plain @videodb/robopeek-rlds: no React components or styles from RoboPeek. */
export function useShard(source: Source) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [progress, setProgress] = useState<Progress>({ loaded: 0 })
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading')
  const [error, setError] = useState<string>()

  useEffect(() => {
    const ac = new AbortController()
    ;(async () => {
      try {
        // A URL shard may have a features.json next to it that restores tensor shapes; files don't.
        const specs = typeof source === 'string' ? await loadFeatureSpecs(source, ac.signal) : undefined
        for await (const ep of streamEpisodes(source, { specs, signal: ac.signal, onProgress: setProgress })) {
          setEpisodes((list) => [...list, ep])
        }
        if (!ac.signal.aborted) setState('done')
      } catch (e) {
        if (ac.signal.aborted) return
        setError((e as Error).message)
        setState('error')
      }
    })()
    return () => ac.abort()
  }, [source])

  return { episodes, progress, state, error }
}
