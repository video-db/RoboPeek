import { useEffect, useState } from 'react'
import { openMcap, sourceName, type McapFile, type Progress, type Source } from '@videodb/robopeek-mcap'

export type RecordingStatus = {
  phase: 'idle' | 'loading' | 'done' | 'error'
  source?: string
  loaded: number
  total?: number
  /** The file has a summary index and Range access: released frames can be fetched again. */
  indexed?: boolean
  error?: string
}

export type RecordingOptions = {
  /** Frame bytes kept in memory (default 512 MiB). */
  maxFrameBytes?: number
}

export const errorMessage = (e: unknown) =>
  e instanceof TypeError ? 'Network error. Check the URL, and that the server allows cross-origin requests.' : (e as Error).message

/**
 * Opens and streams one MCAP file. The recording fills in as bytes arrive; `version` changes (at most once per
 * frame) whenever it does, so read tracks alongside it.
 */
export function useRecording(src: Source | null | undefined, opts: RecordingOptions = {}) {
  const [file, setFile] = useState<McapFile>()
  const [status, setStatus] = useState<RecordingStatus>({ phase: 'idle', loaded: 0 })
  const [version, setVersion] = useState(0)
  const { maxFrameBytes } = opts

  useEffect(() => {
    setFile(undefined)
    if (src == null) {
      setStatus({ phase: 'idle', loaded: 0 })
      return
    }
    const ac = new AbortController()
    let raf = 0
    let progress: Progress = { loaded: 0 }
    let unsubscribe = () => {}
    setStatus({ phase: 'loading', source: sourceName(src), loaded: 0 })

    ;(async () => {
      try {
        const f = await openMcap(src, { signal: ac.signal, maxFrameBytes })
        if (ac.signal.aborted) return
        const flush = () => {
          raf = 0
          setVersion(f.recording.version)
          setStatus((s) => ({ ...s, ...progress }))
        }
        unsubscribe = f.recording.subscribe(() => { raf ||= requestAnimationFrame(flush) })
        setFile(f)
        setStatus((s) => ({ ...s, indexed: f.indexed, total: f.size }))
        await f.load({ signal: ac.signal, onProgress: (p) => { progress = p } })
        if (ac.signal.aborted) return
        cancelAnimationFrame(raf)
        flush()
        setStatus((s) => ({ ...s, phase: 'done' }))
      } catch (e) {
        if (ac.signal.aborted) return
        setStatus((s) => ({ ...s, phase: 'error', error: errorMessage(e) }))
      }
    })()

    return () => {
      ac.abort()
      cancelAnimationFrame(raf)
      unsubscribe()
    }
  }, [src, maxFrameBytes])

  return { file, recording: file?.recording, status, version }
}
