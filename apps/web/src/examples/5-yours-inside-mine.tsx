import { Player, ShardViewer, readText, usePlayer } from '@robopeek/react'

function MyMetadataCard() {
  const episode = usePlayer((s) => s.episode)
  return <aside>{readText(episode.metadata['episode_metadata/file_path'])?.[0] ?? `Episode ${episode.index}`}</aside>
}

export const YoursInsideMine = ({ url }: { url: string }) => (
  <ShardViewer source={url}>
    <Player.Stage />
    <MyMetadataCard />
    <Player.Tracks renderItem={(key, _track, fallback) => (key === 'action' ? <p>my action plot</p> : fallback)} />
  </ShardViewer>
)
