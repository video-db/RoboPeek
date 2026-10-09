import type { Episode } from '@videodb/robopeek-rlds'
import { Player, type PlayerRootProps } from '../core/index.ts'
import { useEpisodeTimeline } from './timeline.ts'
import { Flags } from './Flags.tsx'

export type EpisodePlayerProps = Omit<PlayerRootProps, 'timeline'> & { episode: Episode }

/** `Player.Root` for one RLDS episode. No children → the default layout with step flags. */
export function EpisodePlayer({ episode, children, ...rest }: EpisodePlayerProps) {
  const timeline = useEpisodeTimeline(episode)
  return <Player.Root timeline={timeline} {...rest}>{children ?? <Player.DefaultLayout options={<Flags />} />}</Player.Root>
}
