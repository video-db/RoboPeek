import { useState } from 'react'
import { EpisodeViewer, type Source } from '@videodb/robopeek-react'

// Opens one episode by number without downloading the rest (local files, or URLs with HTTP Range support).
export function EpisodeViewerExample({ source }: { source: Source }) {
  const [episode, setEpisode] = useState(0)
  return <EpisodeViewer source={source} episode={episode} onEpisodeChange={setEpisode} defaultFps={10} />
}
