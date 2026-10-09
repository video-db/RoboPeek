import { useEffect, useRef, type ComponentPropsWithRef, type ReactNode } from 'react'
import type { Source } from '@videodb/robopeek-mcap'
import { useRecording } from '../hooks/useRecording.ts'
import { LoadStatus } from '../components/LoadStatus.tsx'
import { cx } from '../components/cx.ts'
import { Root, mergeRefs, type ColorScheme, type PlayerRootProps } from '../player/parts.tsx'
import { formatTime } from '../player/hooks.ts'

const mb = (n: number) => (n / 1e6).toFixed(1)

export type McapViewerProps = Omit<ComponentPropsWithRef<'div'>, 'children'> & {
  /** The recording: a URL or a File. null shows `empty`. Choosing the file is the host's job. */
  source: Source | null
  /** Frame bytes kept in memory (default 512 MiB). Indexed files over HTTP Range fetch released frames back. */
  maxFrameBytes?: number
  defaultSpeed?: number
  colorScheme?: ColorScheme
  /** Focus the viewer on mount so hotkeys work before the first click. */
  autoFocus?: boolean
  /** Shown while `source` is null. */
  empty?: ReactNode
  /** Passed through to `Player.Root` (e.g. `onNextEpisode` to step through a list of files). */
  playerProps?: Partial<PlayerRootProps>
  /** Your player layout (parts inside the viewer's `Player.Root`). Omitted → default `<Player>`. */
  children?: ReactNode
}

/** One MCAP file, playable while it downloads. */
export function McapViewer({
  source,
  maxFrameBytes,
  defaultSpeed,
  colorScheme,
  autoFocus,
  empty,
  playerProps,
  children,
  className,
  ref,
  ...rest
}: McapViewerProps) {
  const { recording, status } = useRecording(source, { maxFrameBytes })
  const own = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoFocus) own.current?.focus()
  }, [autoFocus])

  const loading = status.phase === 'loading'
  const started = recording?.origin !== undefined

  return (
    <div
      ref={mergeRefs(own, ref)}
      className={cx('rp-viewer', 'rp-mcap-viewer', className)}
      data-rp-scheme={colorScheme}
      tabIndex={-1}
      {...rest}
    >
      {status.phase !== 'idle' && (
        <LoadStatus phase={status.phase} source={status.source} loaded={status.loaded} total={status.total} error={status.error}>
          {recording && (
            <span className="rp-mono">
              {recording.topics.size} topics · {formatTime(recording.length)} · {mb(status.loaded)}
              {status.total ? ` of ${mb(status.total)}` : ''} MB
            </span>
          )}
          {recording?.framesLost && (
            <span className="rp-status-note">Over the memory budget: later frames were not kept (the server has no Range support).</span>
          )}
        </LoadStatus>
      )}
      {status.phase === 'idle' ? (
        empty
      ) : recording && started ? (
        <div className="rp-mcap-viewer-body">
          <Root recording={recording} loading={loading} defaultSpeed={defaultSpeed} hotkeys={own} {...playerProps}>
            {children}
          </Root>
        </div>
      ) : (
        <div className="rp-waiting" data-tone={status.phase === 'error' ? 'error' : undefined}>
          {status.phase === 'error' ? status.error : status.phase === 'done' ? 'This file has no messages.' : 'Reading the recording…'}
        </div>
      )}
    </div>
  )
}
