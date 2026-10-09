import type { Source } from '@videodb/robopeek-rlds'
import { ShardViewer } from '@videodb/robopeek-react/rlds'

// Streams the whole shard: the episode list fills in as bytes arrive, the player shows the selected one.
// Styles come from one import in main.tsx: import '@videodb/robopeek-react/styles.css'
export function ShardViewerExample({ source }: { source: Source }) {
  return <ShardViewer source={source} defaultFps={10} />
}
