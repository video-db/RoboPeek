import type { Source } from '@videodb/robopeek-mcap'
import { McapPlayer, useRecording } from '@videodb/robopeek-react/mcap'

// You own the loading (here useRecording, with a 256 MB frame budget); McapPlayer only plays.
// Released frames come back over HTTP Range when the playhead reaches them.
export function McapPlayerExample({ source }: { source: Source }) {
  const { recording, status } = useRecording(source, { maxFrameBytes: 256e6 })
  if (status.phase === 'error') return <p className="rp-waiting" data-tone="error">{status.error}</p>
  if (!recording || recording.origin === undefined) return <p className="rp-waiting">Opening {status.source}…</p>
  return <McapPlayer recording={recording} loading={status.phase === 'loading'} />
}
