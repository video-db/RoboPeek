import { ExamplePage } from '../shell/ExamplePage.tsx'
import { ComposedPlayer } from '../examples/compose/ComposedPlayer.tsx'
import playerCode from '../examples/compose/ComposedPlayer.tsx?raw'
import partsCode from '../examples/compose/MyParts.tsx?raw'
import cssCode from '../examples/compose/compose.css?raw'

export function MixAndMatchPage() {
  return (
    <ExamplePage
      step="2"
      title="Compose your player"
      pkg="@videodb/robopeek-react"
      intro={
        <>
          <p>Build your own player from the library's parts and your own components. Inside one <code>Player.Root</code>:</p>
          <ul>
            <li><b>Library parts:</b> <code>Player.Stage</code>, <code>Frames</code>, <code>Instruction</code>, <code>Transport</code>, <code>Scrubber</code>, <code>Tracks</code></li>
            <li><b>Your parts:</b> the header, the Play button, the speed chips, the live action bars, the metadata card, and the tiles that replace one-value charts</li>
            <li><b>Shared state:</b> every part reads the same playback through <code>usePlayer()</code>, so they stay in sync</li>
          </ul>
        </>
      }
      files={[
        { name: 'ComposedPlayer.tsx', code: playerCode },
        { name: 'MyParts.tsx', code: partsCode },
        { name: 'compose.css', code: cssCode },
      ]}
    >
      {(input) => <ComposedPlayer source={input.source} />}
    </ExamplePage>
  )
}
