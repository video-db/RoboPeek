import { readText } from '@videodb/robopeek-rlds'
import { Player } from '@videodb/robopeek-react'
import { ShardViewer, useCurrentEpisode } from '@videodb/robopeek-react/rlds'

function MyMetadataCard() {
  const episode = useCurrentEpisode()
  return <aside>{readText(episode.metadata['episode_metadata/file_path'])?.[0] ?? `Episode ${episode.index}`}</aside>
}

export const YoursInsideMine = ({ url }: { url: string }) => (
  <ShardViewer source={url}>
    <Player.Stage />
    <MyMetadataCard />
    <Player.Tracks renderItem={(key, _track, fallback) => (key === 'action' ? <p>my action plot</p> : fallback)} />
  </ShardViewer>
)
