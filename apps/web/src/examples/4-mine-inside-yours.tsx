import { Player, useEpisode } from '@robopeek/react'

export function MineInsideYours({ url, n }: { url: string; n: number }) {
  const { episode } = useEpisode(url, n)
  if (!episode) return null
  return (
    <Player.Root episode={episode} className="my-layout">
      <aside className="my-sidebar"><Player.Frames include={['observation/image']} /></aside>
      <footer className="my-footer"><Player.Scrubber /><Player.Counter /></footer>
    </Player.Root>
  )
}
