import { useState } from 'react'
import type { Source } from '@videodb/robopeek-rlds'
import { Player } from '@videodb/robopeek-react'
import { EpisodePlayer, useEpisode } from '@videodb/robopeek-react/rlds'
import { BigPlay, CurrentAction, EpisodeCard, EpisodeHeader, ScalarTile, SpeedChips } from './MyParts.tsx'
import './compose.css'

// Library parts (Player.*) and your own components (from MyParts.tsx) side by side in one EpisodePlayer.
// Everything inside it shares one playback state.
export function ComposedPlayer({ source }: { source: Source }) {
  const [n, setN] = useState(0)
  const { episode, status, known } = useEpisode(source, n) // one episode at a time, no full download
  if (!episode || status.phase !== 'ready') return <p className="mm-wait">{status.phase === 'error' ? status.error : `Loading episode ${n}…`}</p>

  const last = known.complete ? known.count - 1 : Infinity
  return (
    <EpisodePlayer
      episode={episode}
      defaultRate={10}
      className="mm-player"
      onPrevEpisode={n > 0 ? () => setN(n - 1) : undefined}
      onNextEpisode={n < last ? () => setN(n + 1) : undefined}
    >
      <EpisodeHeader />

      <div className="mm-main">
        <Player.Stage>
          <Player.Instruction />
          <Player.Frames />
          <Player.Transport>
            <Player.PrevEpisode />
            <Player.StepBack />
            <BigPlay />
            <Player.StepForward />
            <Player.NextEpisode />
            <Player.Scrubber />
            <Player.Counter />
          </Player.Transport>
          <SpeedChips />
        </Player.Stage>

        <div className="mm-side">
          <CurrentAction />
          <EpisodeCard />
        </div>
      </div>

      {/* Built-in charts, minus language embeddings; 1-d tracks swapped for your own tile. */}
      <Player.Tracks
        include={(key) => !key.includes('embedding')}
        renderItem={(key, track, fallback) => (track.dim === 1 ? <ScalarTile name={key} track={track} /> : fallback)}
      />
    </EpisodePlayer>
  )
}
