import { useEffect } from 'react'
import type { Source } from '@videodb/robopeek-mcap'
import { Player } from '@videodb/robopeek-react'
import { McapViewer, Topics, useCurrentRecording } from '@videodb/robopeek-react/mcap'
import type { Keys, Show } from '../../toggles/ConfigurableViewer.tsx'
import '../../toggles/toggles.css'

type Props = {
  source: Source
  show: Show
  /** Individual cameras, charts, metadata entries or topics switched off (filtered with `include`). */
  hidden: Set<string>
  onKeys?: (keys: Keys) => void
}

export function ConfigurableMcapViewer({ source, show, hidden, onKeys }: Props) {
  const visible = (key: string) => !hidden.has(key)
  // Skip a wrapper whose children are all off: an empty Stage still paints its dark background and padding.
  const transport = show.transport && [show.stepBack, show.play, show.stepForward, show.scrubber, show.counter].some(Boolean)
  const options = show.options && show.fps
  const stage = show.stage && (show.instruction || show.frames || transport || options)

  return (
    <McapViewer source={source} className={show.status ? undefined : 'hide-status'}>
      {onKeys && <ReportKeys onKeys={onKeys} />}
      {stage && <Player.Stage>
        {show.instruction && <Player.Instruction />}
        {show.frames && <Player.Frames include={visible} renderEmpty={() => null} />}
        {transport && (
          <Player.Transport>
            {show.stepBack && <Player.StepBack />}
            {show.play && <Player.Play />}
            {show.stepForward && <Player.StepForward />}
            {show.scrubber && <Player.Scrubber />}
            {show.counter && <Player.Counter />}
          </Player.Transport>
        )}
        {options && <Player.Options><Player.RateSelect /></Player.Options>}
      </Player.Stage>}
      {(show.tracks || show.metadata || show.topics) && (
        <Player.Tracks include={show.tracks ? visible : () => false}>
          {show.metadata && <Player.Metadata include={visible} />}
          {show.topics && <Topics include={visible} />}
        </Player.Tracks>
      )}
    </McapViewer>
  )
}

/** Tells the page which cameras / charts / metadata / topics the recording has, so it can list per-key toggles. */
function ReportKeys({ onKeys }: { onKeys: (keys: Keys) => void }) {
  const recording = useCurrentRecording()
  const cameras = Object.keys(recording.images).join()
  const tracks = Object.keys(recording.vectors).join()
  useEffect(() => {
    onKeys({
      cameras: Object.keys(recording.images),
      tracks: Object.keys(recording.vectors),
      metadata: Object.keys(recording.metadata),
      topics: [...recording.topics.keys()],
    })
  }, [recording, cameras, tracks, onKeys])
  return null
}
