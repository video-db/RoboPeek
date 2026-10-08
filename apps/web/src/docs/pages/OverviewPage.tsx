import { useState } from 'react'
import { InstallCommand, CodePanel } from '../../CodeBlock.tsx'
import { Icon } from '../../ui.tsx'
import { SAMPLES, sampleInput } from '../../samples.ts'
import { useInput } from '../shell/Layout.tsx'

const EXAMPLES = [
  { id: 'ready-made', icon: 'film', title: 'Ready-made viewers', text: 'An episode list, synchronized cameras, and signal charts. Add a source and start exploring.' },
  { id: 'mix-and-match', icon: 'layers', title: 'Compose your player', text: 'Combine built-in player parts with your own controls, all sharing one playback state.' },
  { id: 'rlds-only', icon: 'code', title: 'Build your own UI', text: 'Use the reader on its own. Take decoded episodes into any JavaScript interface.' },
  { id: 'styling', icon: 'sliders', title: 'Styling & themes', text: 'Try themes and tune colors, typography, and corners with a live token editor.' },
  { id: 'show-hide', icon: 'camera', title: 'Show & hide parts', text: 'Choose the cameras, signals, and controls your application needs.' },
] as const
export function OverviewPage() {
  const [pkg, setPkg] = useState<'react' | 'rlds'>('react')
  const { setInput } = useInput()
  return <article className="doc-page overview-page">
    <header className="page-head"><p className="eyebrow"><span className="status-dot" />Available now</p><h1>Robotics episodes,<br />right in your application.</h1><div className="intro"><p>The RLDS toolkit reads supported RLDS / TFDS TFRecord shards in the browser. Explore camera frames, actions, states, and instructions with a ready-made viewer, or build an interface of your own.</p></div><div className="doc-hero-actions"><a href="#ready-made" className="ui-button" data-variant="primary">Try a live example<Icon name="arrow" /></a><a href="/#playground" className="text-link">Open the playground<Icon name="external" /></a></div></header>
    <section className="doc-install-section"><div className="section-title"><span className="section-number">01</span><div><h2>Choose your starting point</h2><p>Both packages are available on npm. The React package includes the reader.</p></div></div><div className="package-choice" role="group" aria-label="Package to install"><button type="button" aria-pressed={pkg === 'react'} onClick={() => setPkg('react')}><Icon name="layers" /><div><strong>React components</strong><span>Viewers, player parts, hooks, and styles</span></div><Icon name={pkg === 'react' ? 'check' : 'chevron'} /></button><button type="button" aria-pressed={pkg === 'rlds'} onClick={() => setPkg('rlds')}><Icon name="terminal" /><div><strong>Framework-independent reader</strong><span>Decoded episodes, without a UI dependency</span></div><Icon name={pkg === 'rlds' ? 'check' : 'chevron'} /></button></div><InstallCommand pkg={`@videodb/robopeek-${pkg}`} /><CodePanel key={pkg} files={[{ name: pkg === 'react' ? 'DatasetPreview.tsx' : 'read-episodes.ts', code: pkg === 'react' ? REACT_CODE : READER_CODE }]} /></section>
    <section><div className="section-title"><span className="section-number">02</span><div><h2>Learn by changing a working example</h2><p>A live preview and its source code, side by side with the controls.</p></div></div><div className="example-link-grid">{EXAMPLES.map((e, i) => <a className="example-link" key={e.id} href={`#${e.id}`}><span className="example-link-icon"><Icon name={e.icon} /></span><div><span className="example-link-number">Example 0{i + 1}</span><h3>{e.title}</h3><p>{e.text}</p></div><Icon name="arrow" /></a>)}</div></section>
    <section><div className="section-title"><span className="section-number">03</span><div><h2>Start with real robotics data</h2><p>These sample excerpts are included. You can also use your own file or URL.</p></div></div><div className="doc-samples">{SAMPLES.slice(0, 3).map(s => <a href="#ready-made" key={s.id} onClick={() => setInput(sampleInput(s))}><img src={s.image} alt={`${s.dataset} observation`} loading="lazy" /><div><strong>{s.dataset}</strong><span>{s.category} · {s.size}</span></div><Icon name="arrow" /></a>)}</div></section>
    <section className="scope-note"><Icon name="file" /><div><h3>What is supported?</h3><p>RLDS / TFDS episodes stored in uncompressed TFRecord shards. Single-episode access requires HTTP Range support; remote sources must allow CORS. The reader may scan earlier records to locate an episode. MCAP support is planned.</p><a href="https://github.com/video-db/RoboPeek/blob/main/docs/guide.md#dataset-compatibility" target="_blank" rel="noreferrer">Dataset compatibility and limits<Icon name="external" /></a></div></section>
  </article>
}
const REACT_CODE = `import { ShardViewer } from '@videodb/robopeek-react'
import '@videodb/robopeek-react/styles.css'

export function DatasetPreview({ url }: { url: string }) {
  return (
    <div style={{ height: 640 }}>
      <ShardViewer source={url} />
    </div>
  )
}`
const READER_CODE = `import { streamEpisodes, episodeTitle } from '@videodb/robopeek-rlds'

// source can be a URL, a File, or a Blob.
export async function inspect(source: string | Blob) {
  for await (const episode of streamEpisodes(source)) {
    console.log(episode.index, episode.length)
    console.log(episodeTitle(episode))
    console.log(Object.keys(episode.images))
  }
}`
