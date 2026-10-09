import { ExamplePage } from '../shell/ExamplePage.tsx'
import { CustomRecordingViewer } from '../examples/mcap/mcap-only/CustomRecordingViewer.tsx'
import viewerCode from '../examples/mcap/mcap-only/CustomRecordingViewer.tsx?raw'
import hookCode from '../examples/mcap/mcap-only/useMcap.ts?raw'
import cssCode from '../examples/rlds-only/custom.css?raw'
import extraCss from '../examples/mcap/mcap-only/recording.css?raw'

export function McapOnlyPage() {
  return (
    <ExamplePage
      step="3"
      title="Build your own UI"
      pkg="@videodb/robopeek-mcap"
      intro={
        <p>
          No RoboPeek components and no RoboPeek CSS. <code>openMcap()</code> turns the file into a <code>Recording</code> that fills in as
          bytes arrive: camera topics with their frames (JPEG/PNG bytes, raw pixels or H.264), signals as numbers against time, text,
          and metadata. Everything on screen is written in this example. The same reader works in Vue, Svelte, a worker or Node.
        </p>
      }
      files={[
        { name: 'useMcap.ts', code: hookCode },
        { name: 'CustomRecordingViewer.tsx', code: viewerCode },
        { name: 'custom.css', code: cssCode },
        { name: 'recording.css', code: extraCss },
      ]}
    >
      {(input) => <CustomRecordingViewer source={input.source} />}
    </ExamplePage>
  )
}
