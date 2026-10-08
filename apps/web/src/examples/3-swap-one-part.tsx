import { Player, usePlayButton, type Episode } from '@robopeek/react'

function MyPlay() {
  const { playing, buttonProps } = usePlayButton()
  return <button {...buttonProps} className="my-button">{playing ? 'Pause' : 'Play'}</button>
}

export const SwapOnePart = ({ episode }: { episode: Episode }) => (
  <Player.Root episode={episode}>
    <Player.Frames />
    <Player.Transport>
      <Player.StepBack />
      <MyPlay />
      <Player.StepForward />
      <Player.Scrubber />
    </Player.Transport>
  </Player.Root>
)
