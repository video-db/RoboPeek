import type { Recording } from '@videodb/robopeek-mcap'
import { Player, type PlayerRootProps } from '../core/index.ts'
import { useMcapTimeline } from './timeline.ts'
import { Topics } from './Topics.tsx'

export type McapPlayerProps = Omit<PlayerRootProps, 'timeline'> & { recording: Recording }

/** `Player.Root` for one MCAP recording. No children → the default layout with the topic list. */
export function McapPlayer({ recording, children, ...rest }: McapPlayerProps) {
  const timeline = useMcapTimeline(recording)
  return <Player.Root timeline={timeline} {...rest}>{children ?? <Player.DefaultLayout panels={<Topics />} />}</Player.Root>
}
