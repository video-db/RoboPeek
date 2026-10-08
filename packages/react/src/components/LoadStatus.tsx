import type { ComponentPropsWithRef } from 'react'
import { cx } from './cx.ts'

export type LoadStatusProps = ComponentPropsWithRef<'div'> & {
  phase: 'loading' | 'done' | 'cancelled' | 'error'
  /** Full source name or URL; the last path segment is shown. */
  source?: string
  loaded?: number
  total?: number
  error?: string
}

/** Thin progress strip: bar fills while loading; children add counts or notes. */
export function LoadStatus({ phase, source, loaded = 0, total, error, className, children, ...rest }: LoadStatusProps) {
  const pct = total ? Math.min(100, (loaded / total) * 100) : phase === 'loading' ? 0 : 100
  return (
    <div className={cx('rlds-status', className)} data-phase={phase} {...rest}>
      <div className="rlds-status-bar" style={{ width: `${pct}%` }} />
      <div className="rlds-status-text">
        {source && <span className="rlds-status-name" title={source}>{source.split('/').pop()}</span>}
        {children}
        {phase === 'cancelled' && <span className="rlds-status-note">Stopped</span>}
        {phase === 'error' && <span className="rlds-status-note" data-tone="error">{error}</span>}
      </div>
    </div>
  )
}
