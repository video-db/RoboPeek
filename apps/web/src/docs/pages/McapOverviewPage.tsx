import { useState } from 'react'
import { InstallCommand, CodePanel } from '../../CodeBlock.tsx'
import { Icon } from '../../ui.tsx'
import { MCAP_SAMPLES, sampleInput } from '../../samples.ts'
import { useInput } from '../shell/Layout.tsx'

const EXAMPLES = [
  { id: 'ready-made', icon: 'film', title: 'Ready-made viewer', text: 'Every camera, signal chart and topic of a recording. Add a source and start exploring.' },
  { id: 'mix-and-match', icon: 'layers', title: 'Compose your player', text: 'Combine built-in player parts with your own controls, all sharing one playback state.' },
  { id: 'mcap-only', icon: 'code', title: 'Build your own UI', text: 'Use the reader on its own. Take decoded recordings into any JavaScript interface.' },
  { id: 'styling', icon: 'sliders', title: 'Styling & themes', text: 'Try themes and tune colors, typography, and corners with a live token editor.' },
  { id: 'show-hide', icon: 'camera', title: 'Show & hide parts', text: 'Choose the cameras, signals, topics, and controls your application needs.' },
] as const
export function McapOverviewPage() {
  const [pkg, setPkg] = useState<'react' | 'mcap'>('react')
  const { setInput } = useInput()
  return <article className="doc-page overview-page">
    <header className="page-head"><p className="eyebrow"><span className="status-dot" />Available now</p><h1>Robot recordings,<br />right in your application.</h1><div className="intro"><p>The MCAP toolkit reads MCAP recordings in the browser: ROS 1, ROS 2, protobuf and JSON messages. Watch every camera and chart every signal on one timeline with a ready-made viewer, or build an interface of your own.</p></div><div className="doc-hero-actions"><a href="#ready-made" className="ui-button" data-variant="primary">Try a live example<Icon name="arrow" /></a><a href="/#mcap" className="text-link">Open the playground<Icon name="external" /></a></div></header>
    <section className="doc-install-section"><div className="section-title"><span className="section-number">01</span><div><h2>Choose your starting point</h2><p>Both packages are on npm. The React components need the reader installed next to them; the reader works on its own.</p></div></div><div className="package-choice" role="group" aria-label="Package to install"><button type="button" aria-pressed={pkg === 'react'} onClick={() => setPkg('react')}><Icon name="layers" /><div><strong>React components</strong><span>Viewers, player parts, hooks, and styles</span></div><Icon name={pkg === 'react' ? 'check' : 'chevron'} /></button><button type="button" aria-pressed={pkg === 'mcap'} onClick={() => setPkg('mcap')}><Icon name="terminal" /><div><strong>Framework-independent reader</strong><span>Decoded recordings, without a UI dependency</span></div><Icon name={pkg === 'mcap' ? 'check' : 'chevron'} /></button></div><InstallCommand pkg={pkg === 'react' ? '@videodb/robopeek-react @videodb/robopeek-mcap' : '@videodb/robopeek-mcap'} /><CodePanel key={pkg} files={[{ name: pkg === 'react' ? 'RecordingPreview.tsx' : 'read-recording.ts', code: pkg === 'react' ? REACT_CODE : READER_CODE }]} /></section>
    <section><div className="section-title"><span className="section-number">02</span><div><h2>Learn by changing a working example</h2><p>A live preview and its source code, side by side with the controls.</p></div></div><div className="example-link-grid">{EXAMPLES.map((e, i) => <a className="example-link" key={e.id} href={`#${e.id}`}><span className="example-link-icon"><Icon name={e.icon} /></span><div><span className="example-link-number">Example 0{i + 1}</span><h3>{e.title}</h3><p>{e.text}</p></div><Icon name="arrow" /></a>)}</div></section>
    <section><div className="section-title"><span className="section-number">03</span><div><h2>Start with real robot recordings</h2><p>Public recordings, streamed from Hugging Face. You can also use your own file or URL.</p></div></div><div className="doc-samples">{MCAP_SAMPLES.map(s => <a href="#ready-made" key={s.id} onClick={() => setInput(sampleInput(s))}><div><strong>{s.dataset}</strong><span>{s.size} · {s.notes}</span></div><Icon name="arrow" /></a>)}</div></section>
    <section className="scope-note"><Icon name="file" /><div><h3>What is supported?</h3><p>MCAP files with ROS 1, ROS 2 (CDR), protobuf or JSON messages, in zstd- or lz4-compressed chunks. Cameras can be JPEG/PNG, raw pixels, 16-bit depth or H.264 video. Remote files must allow CORS; with HTTP Range support they open from their index and stay under a memory budget. Not yet: <code>ros2idl</code> schemas, FlatBuffers, CBOR, and H.265 / VP9 / AV1 video.</p><a href="https://github.com/video-db/RoboPeek/tree/main/packages/mcap#readme" target="_blank" rel="noreferrer">The MCAP reader's documentation<Icon name="external" /></a></div></section>
  </article>
}
const REACT_CODE = `import { McapViewer } from '@videodb/robopeek-react/mcap'
import '@videodb/robopeek-react/styles.css'

export function RecordingPreview({ url }: { url: string }) {
  return (
    <div style={{ height: 640 }}>
      <McapViewer source={url} />
    </div>
  )
}`
const READER_CODE = `import { readMcap } from '@videodb/robopeek-mcap'

// source can be a URL, a File, or a Blob.
export async function inspect(source: string | Blob) {
  const recording = await readMcap(source)
  console.log(recording.length, 'seconds')
  console.log(Object.keys(recording.images)) // camera topics
  console.log(Object.keys(recording.vectors)) // signals
  for (const t of recording.topics.values()) console.log(t.topic, t.schema, t.kind)
}`
