import type { Episode } from '@videodb/robopeek-rlds'
import { Player, usePlayButton } from '@videodb/robopeek-react'
import { EpisodePlayer } from '@videodb/robopeek-react/rlds'

function MyPlay() {
  const { playing, buttonProps } = usePlayButton()
  return <button {...buttonProps} className="my-button">{playing ? 'Pause' : 'Play'}</button>
}

export const SwapOnePart = ({ episode }: { episode: Episode }) => (
  <EpisodePlayer episode={episode}>
    <Player.Frames />
    <Player.Transport>
      <Player.StepBack />
      <MyPlay />
      <Player.StepForward />
      <Player.Scrubber />
    </Player.Transport>
  </EpisodePlayer>
)
