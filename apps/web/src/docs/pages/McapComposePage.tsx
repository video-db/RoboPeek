import { ExamplePage } from '../shell/ExamplePage.tsx'
import { ComposedRecording } from '../examples/mcap/compose/ComposedRecording.tsx'
import playerCode from '../examples/mcap/compose/ComposedRecording.tsx?raw'
import partsCode from '../examples/mcap/compose/MyRecordingParts.tsx?raw'
import cssCode from '../examples/compose/compose.css?raw'

export function McapComposePage() {
  return (
    <ExamplePage
      step="2"
      title="Compose your player"
      pkg="@videodb/robopeek-react @videodb/robopeek-mcap"
      intro={
        <>
          <p>Build your own player from the library's parts and your own components. Inside one <code>McapPlayer</code>:</p>
          <ul>
            <li><b>Library parts:</b> <code>Player.Stage</code>, <code>Frames</code>, <code>Instruction</code>, <code>Transport</code>, <code>Scrubber</code>, <code>Tracks</code>, and <code>Topics</code> from <code>/mcap</code></li>
            <li><b>Your parts:</b> the header, the Play button, the speed chips, the live signal bars, and the tiles that replace one-value charts</li>
            <li><b>Shared state:</b> every part reads the same playback through <code>usePlayer()</code>. Positions are seconds, and <code>rate</code> is a speed multiplier</li>
          </ul>
        </>
      }
      files={[
        { name: 'ComposedRecording.tsx', code: playerCode },
        { name: 'MyRecordingParts.tsx', code: partsCode },
        { name: 'compose.css', code: cssCode },
      ]}
    >
      {(input) => <ComposedRecording source={input.source} />}
    </ExamplePage>
  )
}
