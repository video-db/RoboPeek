import type { Source } from '@videodb/robopeek-mcap'
import { McapViewer } from '@videodb/robopeek-react/mcap'

// Opens the file, plays it while it downloads, and lists every topic. A URL or a File both work.
// Styles come from one import in main.tsx: import '@videodb/robopeek-react/styles.css'
export function McapViewerExample({ source }: { source: Source }) {
  return <McapViewer source={source} />
}
