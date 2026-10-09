import type { Source } from '@videodb/robopeek-mcap'
import { Player } from '@videodb/robopeek-react'
import { McapPlayer, Topics, useRecording } from '@videodb/robopeek-react/mcap'
import { BigPlay, CurrentSignal, RecordingHeader, ScalarTile, SpeedChips } from './MyRecordingParts.tsx'
import '../../compose/compose.css'

// Library parts (Player.*, Topics) and your own components (from MyRecordingParts.tsx) side by side in one
// McapPlayer. Everything inside it shares one playback state.
export function ComposedRecording({ source }: { source: Source }) {
  const { recording, status } = useRecording(source)
  if (!recording || recording.origin === undefined) return <p className="mm-wait">{status.phase === 'error' ? status.error : 'Opening the recording…'}</p>

  return (
    <McapPlayer recording={recording} loading={status.phase === 'loading'} className="mm-player">
      <RecordingHeader />

      <div className="mm-main">
        <Player.Stage>
          <Player.Instruction />
          <Player.Frames />
          <Player.Transport>
            <Player.StepBack />
            <BigPlay />
            <Player.StepForward />
            <Player.Scrubber />
            <Player.Counter />
          </Player.Transport>
          <SpeedChips />
        </Player.Stage>

        <div className="mm-side">
          <CurrentSignal />
          <Topics title="Topics in this file" />
        </div>
      </div>

      {/* Built-in charts; one-value tracks swapped for your own tile. */}
      <Player.Tracks renderItem={(key, track, fallback) => (track.dim === 1 ? <ScalarTile name={key} track={track} /> : fallback)} />
    </McapPlayer>
  )
}
