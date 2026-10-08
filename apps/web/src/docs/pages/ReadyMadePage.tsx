import { useState } from 'react'
import { ExamplePage } from '../shell/ExamplePage.tsx'
import { SETUP } from './setup.ts'
import { ShardViewerExample } from '../examples/ready-made/ShardViewerExample.tsx'
import { EpisodeViewerExample } from '../examples/ready-made/EpisodeViewerExample.tsx'
import shardCode from '../examples/ready-made/ShardViewerExample.tsx?raw'
import episodeCode from '../examples/ready-made/EpisodeViewerExample.tsx?raw'

const VIEWERS = {
  shard: { label: 'ShardViewer', note: 'whole shard, episode list + player', Component: ShardViewerExample },
  episode: { label: 'EpisodeViewer', note: 'one episode by number, Range reads', Component: EpisodeViewerExample },
}

export function ReadyMadePage() {
  const [which, setWhich] = useState<keyof typeof VIEWERS>('shard')
  const { Component } = VIEWERS[which]
  return (
    <ExamplePage
      step="1"
      title="Ready-made viewers"
      pkg="@videodb/robopeek-react"
      intro={<p>Use the components as they are: one line of JSX and one stylesheet import. Choose an input file and the viewer below opens it. Space plays, ← → step, ↑ ↓ change episode.</p>}
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
        { name: 'ShardViewerExample.tsx', code: shardCode },
        { name: 'EpisodeViewerExample.tsx', code: episodeCode },
        { name: 'main.tsx (setup)', code: SETUP },
      ]}
    >
      {(input) => <Component key={which} source={input.source} />}
    </ExamplePage>
  )
}
