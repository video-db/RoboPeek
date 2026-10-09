import { useState } from 'react'
import type { Source } from '@videodb/robopeek-rlds'
import { EpisodeViewer } from '@videodb/robopeek-react/rlds'

// Opens one episode by number without downloading the rest (local files, or URLs with HTTP Range support).
export function EpisodeViewerExample({ source }: { source: Source }) {
  const [episode, setEpisode] = useState(0)
  return <EpisodeViewer source={source} episode={episode} onEpisodeChange={setEpisode} defaultFps={10} />
}
