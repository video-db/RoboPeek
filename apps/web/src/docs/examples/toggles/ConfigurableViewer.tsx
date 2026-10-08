import { useEffect } from 'react'
import { Player, ShardViewer, usePlayer, type Source } from '@videodb/robopeek-react'
import './toggles.css'

export type Show = {
  // Viewer chrome: not props, hidden with CSS on public rp-* classes (see toggles.css)
  status: boolean
  drawer: boolean
  drawerFilter: boolean
  // Player parts: pass the ones you want as children; leave a part out and it isn't rendered
  stage: boolean
  instruction: boolean
  frames: boolean
  transport: boolean
  prevEpisode: boolean
  stepBack: boolean
  play: boolean
  stepForward: boolean
  nextEpisode: boolean
  scrubber: boolean
  counter: boolean
  options: boolean
  fps: boolean
  autoNext: boolean
  flags: boolean
  tracks: boolean
  metadata: boolean
}

export type Keys = { cameras: string[]; tracks: string[]; metadata: string[] }

type Props = {
  source: Source
  show: Show
  /** Individual cameras, charts or metadata entries switched off (filtered with `include`). */
  hidden: Set<string>
  onKeys?: (keys: Keys) => void
}

export function ConfigurableViewer({ source, show, hidden, onKeys }: Props) {
  const visible = (key: string) => !hidden.has(key)
  const chrome = [!show.status && 'hide-status', !show.drawer && 'hide-drawer', !show.drawerFilter && 'hide-drawer-filter']
  // Skip a wrapper whose children are all off: an empty Stage still paints its dark background and padding.
  const transport = show.transport && [show.prevEpisode, show.stepBack, show.play, show.stepForward, show.nextEpisode, show.scrubber, show.counter].some(Boolean)
  const options = show.options && [show.fps, show.autoNext, show.flags].some(Boolean)
  const stage = show.stage && (show.instruction || show.frames || transport || options)

  return (
    <ShardViewer source={source} defaultFps={10} className={chrome.filter(Boolean).join(' ')}>
      {onKeys && <ReportKeys onKeys={onKeys} />}
      {stage && <Player.Stage>
        {show.instruction && <Player.Instruction />}
        {show.frames && <Player.Frames include={visible} renderEmpty={() => null} />}
        {transport && (
          <Player.Transport>
            {show.prevEpisode && <Player.PrevEpisode />}
            {show.stepBack && <Player.StepBack />}
            {show.play && <Player.Play />}
            {show.stepForward && <Player.StepForward />}
            {show.nextEpisode && <Player.NextEpisode />}
            {show.scrubber && <Player.Scrubber />}
            {show.counter && <Player.Counter />}
          </Player.Transport>
        )}
        {options && (
          <Player.Options>
            {show.fps && <Player.FpsSelect />}
            {show.autoNext && <Player.AutoNext />}
            {show.flags && <Player.Flags />}
          </Player.Options>
        )}
      </Player.Stage>}
      {(show.tracks || show.metadata) && (
        <Player.Tracks include={show.tracks ? visible : () => false}>
          {show.metadata && <Player.Metadata include={visible} />}
        </Player.Tracks>
      )}
    </ShardViewer>
  )
}

/** Tells the page which cameras / charts / metadata the current episode has, so it can list per-key toggles. */
function ReportKeys({ onKeys }: { onKeys: (keys: Keys) => void }) {
  const episode = usePlayer((s) => s.episode)
  useEffect(() => {
    onKeys({
      cameras: Object.keys(episode.images),
      tracks: Object.keys(episode.vectors).filter((k) => !k.startsWith('is_')),
      metadata: Object.keys(episode.metadata),
    })
  }, [episode, onKeys])
  return null
}
