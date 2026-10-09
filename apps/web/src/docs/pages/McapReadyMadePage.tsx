import { useState } from 'react'
import { ExamplePage } from '../shell/ExamplePage.tsx'
import { MCAP_SETUP } from './mcapSetup.ts'
import { McapViewerExample } from '../examples/mcap/ready-made/McapViewerExample.tsx'
import { McapPlayerExample } from '../examples/mcap/ready-made/McapPlayerExample.tsx'
import viewerCode from '../examples/mcap/ready-made/McapViewerExample.tsx?raw'
import playerCode from '../examples/mcap/ready-made/McapPlayerExample.tsx?raw'

const VIEWERS = {
  viewer: { label: 'McapViewer', note: 'a URL or File in, a player with topics out', Component: McapViewerExample },
  player: { label: 'McapPlayer', note: 'you load the recording, it plays it', Component: McapPlayerExample },
}

export function McapReadyMadePage() {
  const [which, setWhich] = useState<keyof typeof VIEWERS>('viewer')
  const { Component } = VIEWERS[which]
  return (
    <ExamplePage
      step="1"
      title="Ready-made viewer"
      pkg="@videodb/robopeek-react @videodb/robopeek-mcap"
      intro={<p>Use the components as they are: one line of JSX and one stylesheet import. Choose a recording and the viewer below opens it, playing while it downloads. Space plays, ← → step one frame, Shift jumps ten.</p>}
      controls={
        <div className="segmented" role="group" aria-label="Viewer type">
          {Object.entries(VIEWERS).map(([id, v]) => (
            <button key={id} aria-pressed={which === id} onClick={() => setWhich(id as keyof typeof VIEWERS)}>
              <code>{`<${v.label} />`}</code> <span className="muted">{v.note}</span>
            </button>
          ))}
        </div>
      }
      files={[
        { name: 'McapViewerExample.tsx', code: viewerCode },
        { name: 'McapPlayerExample.tsx', code: playerCode },
        { name: 'main.tsx (setup)', code: MCAP_SETUP },
      ]}
    >
      {(input) => <Component key={which} source={input.source} />}
    </ExamplePage>
  )
}
