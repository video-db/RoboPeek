import type { ComponentPropsWithRef } from 'react'
import type { Episode } from '@videodb/robopeek-rlds'
import { vectorAt } from './reader.ts'
import { cx, usePlayer, useFormatSource } from '../core/index.ts'
import { FLAG_KEYS } from './timeline.ts'

export type FlagsProps = Omit<ComponentPropsWithRef<'span'>, 'children'> & { keys?: string[] }

/** RLDS step flags as chips, lit on the steps where they're set. RLDS players only. */
export function Flags({ keys = FLAG_KEYS, className, ...rest }: FlagsProps) {
  const episode = useFormatSource<Episode>('rlds', 'Flags')
  const step = usePlayer((s) => Math.floor(s.position))
  const present = keys.filter((k) => episode.vectors[k])
  return (
    <span className={cx('rp-flags', className)} {...rest}>
      {present.map((k) => (
        <span key={k} className="rp-flag" data-on={!!vectorAt(episode.vectors[k], step)[0] || undefined}>{k.replace('is_', '')}</span>
      ))}
    </span>
  )
}
