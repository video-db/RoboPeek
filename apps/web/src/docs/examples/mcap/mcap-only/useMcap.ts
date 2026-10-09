import { useEffect, useState } from 'react'
import { openMcap, type Progress, type Recording, type Source } from '@videodb/robopeek-mcap'

/** Everything here is plain @videodb/robopeek-mcap: no React components or styles from RoboPeek. */
export function useMcap(source: Source) {
  const [recording, setRecording] = useState<Recording>()
  const [version, setVersion] = useState(0)
  const [progress, setProgress] = useState<Progress>({ loaded: 0 })
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading')
  const [error, setError] = useState<string>()

  useEffect(() => {
    const ac = new AbortController()
    let unsubscribe = () => {}
    ;(async () => {
      try {
        // openMcap reads the summary (topics, duration); load() then streams the messages in.
        const file = await openMcap(source, { signal: ac.signal })
        unsubscribe = file.recording.subscribe(() => setVersion(file.recording.version))
        setRecording(file.recording)
        await file.load({ signal: ac.signal, onProgress: setProgress })
        if (!ac.signal.aborted) setState('done')
      } catch (e) {
        if (ac.signal.aborted) return
        setError((e as Error).message)
        setState('error')
      }
    })()
    return () => {
      ac.abort()
      unsubscribe()
    }
  }, [source])

  // version changes whenever the recording grows, so components re-read its tracks.
  return { recording, version, progress, state, error }
}
