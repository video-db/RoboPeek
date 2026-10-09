import { Player } from '@videodb/robopeek-react'
import { EpisodePlayer, useEpisode } from '@videodb/robopeek-react/rlds'

export function MineInsideYours({ url, n }: { url: string; n: number }) {
  const { episode } = useEpisode(url, n)
  if (!episode) return null
  return (
    <EpisodePlayer episode={episode} className="my-layout">
      <aside className="my-sidebar"><Player.Frames include={['observation/image']} /></aside>
      <footer className="my-footer"><Player.Scrubber /><Player.Counter /></footer>
    </EpisodePlayer>
  )
}
