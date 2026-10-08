import { ExamplePage } from '../shell/ExamplePage.tsx'
import { CustomViewer } from '../examples/rlds-only/CustomViewer.tsx'
import viewerCode from '../examples/rlds-only/CustomViewer.tsx?raw'
import hookCode from '../examples/rlds-only/useShard.ts?raw'
import cssCode from '../examples/rlds-only/custom.css?raw'

export function RldsOnlyPage() {
  return (
    <ExamplePage
      step="3"
      title="Build your own UI"
      pkg="@videodb/robopeek-rlds"
      intro={
        <p>
          No RoboPeek components and no RoboPeek CSS. <code>streamEpisodes()</code> turns the shard into plain <code>Episode</code> objects
          (camera frames as PNG/JPEG bytes, vectors as typed arrays, text, metadata), and everything on screen is written in this example.
          The same reader works in Vue, Svelte, a worker or Node.
        </p>
      }
      files={[
        { name: 'useShard.ts', code: hookCode },
        { name: 'CustomViewer.tsx', code: viewerCode },
        { name: 'custom.css', code: cssCode },
      ]}
    >
      {(input) => <CustomViewer source={input.source} />}
    </ExamplePage>
  )
}
