import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react'
import type { Source } from '@videodb/robopeek-rlds'
import { ShardViewer } from '@videodb/robopeek-react/rlds'
import { SiteHeader, SiteFooter } from './SiteChrome.tsx'
import { InstallCommand, CodePanel } from './CodeBlock.tsx'
import { SAMPLES, type Sample } from './samples.ts'
import { Icon } from './ui.tsx'
import { SourceBar } from './SourceBar.tsx'
import { DropTarget } from './DropTarget.tsx'
import ViewerApp from './ViewerApp.tsx'
import './site.css'

const DocsApp = lazy(() => import('./docs/DocsApp.tsx').then(module => ({ default: module.DocsApp })))

// Preserve existing shared links to /?url=… while giving / a product homepage.
export default function App() {
  // Static hosts may serve index.html for the extensionless documentation route.
  if (/^\/rlds\/?$/i.test(location.pathname)) {
    return <Suspense fallback={<div className="site-container" role="status">Loading the RLDS guide…</div>}><DocsApp /></Suspense>
  }
  return new URLSearchParams(location.search).has('url') ? <ViewerApp /> : <HomePage />
}

function HomePage() {
  const [source, setSource] = useState<Source>(SAMPLES[0].url)
  const [selected, setSelected] = useState<Sample | undefined>(SAMPLES[0])
  const [episode, setEpisode] = useState(0)
  const [previewVersion, setPreviewVersion] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const playgroundRef = useRef<HTMLElement>(null)
  const customSourceRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    // On a fresh navigation, the browser checks the fragment before React mounts.
    const scrollToPlayground = () => {
      const target = location.hash === '#custom-rlds' ? customSourceRef.current
        : location.hash === '#playground' ? playgroundRef.current : null
      target?.scrollIntoView({ block: 'start', behavior: 'instant' })
    }
    scrollToPlayground()
    window.addEventListener('hashchange', scrollToPlayground)
    return () => window.removeEventListener('hashchange', scrollToPlayground)
  }, [])
  const open = (next: Source) => {
    setSource(next)
    setEpisode(0)
    setSelected(SAMPLES.find(s => s.url === next))
    // Allow retrying the same URL after a network error, or reopening an updated file.
    setPreviewVersion(version => version + 1)
  }
  const scrollToPreview = () => previewRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
  const preview = (next: Source) => { open(next); scrollToPreview() }
  const choose = (sample: Sample, scroll = false) => {
    open(sample.url)
    if (scroll) scrollToPreview()
  }
  const url = typeof source === 'string' ? source : undefined
  return <div className="site-page">
    <SiteHeader />
    <main>
      <section className="hero site-container">
        <div className="hero-copy">
          <div className="eyebrow"><span className="status-dot" />Open-source robotics toolkit</div>
          <h1>A window into<br /><span>robotics datasets.</span></h1>
          <p>See what the robot sees. Explore its actions. Understand the episode.</p>
          <p className="hero-description">RoboPeek brings robotics data into your browser, with embeddable viewers and a lightweight reading library for your own applications.</p>
          <div className="hero-actions"><a className="ui-button" data-variant="primary" href="#playground">Explore the viewer<Icon name="arrow" /></a><a className="ui-button" href="/RLDS/"><Icon name="code" />Build with RoboPeek</a></div>
          <InstallCommand />
          <div className="hero-availability"><span><span className="status-dot" />RLDS available</span><span className="availability-separator" /><span>MCAP coming next</span></div>
        </div>
        <div className="hero-preview">
          <div className="hero-preview-top"><span><Icon name="film" />Inside a robotics episode</span><span className="ui-badge">RLDS</span></div>
          <div className="hero-camera"><img src="/previews/pusht.png" alt="A robot arm pushing a red T-shaped object on a work surface" width="320" height="240" fetchPriority="high" /><span className="camera-label"><span className="status-dot" />Scene camera</span><div className="inset-camera"><img src="/previews/pusht-camera-2.png" alt="The same Push-T episode from the wrist camera" width="320" height="240" /><span>Wrist camera</span></div></div>
          <div className="hero-preview-info"><div><strong>Push-T</strong><span>2 cameras<span>·</span>271 steps<span>·</span>Manipulation</span></div><button type="button" aria-label="Preview the Push-T dataset" onClick={() => choose(SAMPLES[2], true)}><Icon name="play" /></button></div>
          <div className="hero-preview-caption"><span>Real observations. Straight from the dataset.</span><Icon name="arrow" /></div>
        </div>
      </section>
      <div className="principles-band"><div className="site-container principles">
        <div><Icon name="file" /><div><h2>Read from the source</h2><p>Open supported dataset files directly.</p></div></div>
        <div><Icon name="shield" /><div><h2>Run in the browser</h2><p>Local files stay on your device.</p></div></div>
        <div><Icon name="code" /><div><h2>Make it part of your app</h2><p>Use a viewer, its parts, or just the reader.</p></div></div>
      </div></div>
      <section id="playground" ref={playgroundRef} className="playground site-container">
        <div className="section-heading"><div><p className="eyebrow">The playground</p><h2>Less setup. More understanding.</h2><p>Paste an RLDS link, open a local file, or explore a sample. No setup needed.</p></div><a className="text-link" href="/RLDS/">Explore the RLDS toolkit<Icon name="arrow" /></a></div>
        <div className="format-tabs" role="tablist" aria-label="Dataset format"><button type="button" id="rlds-tab" role="tab" aria-selected="true" aria-controls="rlds-playground"><Icon name="layers" />RLDS<span className="format-status">Available</span></button><button type="button" role="tab" aria-selected="false" disabled><Icon name="file" />MCAP<span className="ui-badge">Coming soon</span></button></div>
        <div id="rlds-playground" role="tabpanel" aria-labelledby="rlds-tab">
          <div className="format-intro"><div><h3>Explore RLDS datasets</h3><p>Browse TFRecord episodes with camera views, instructions, actions, and state.</p></div><span className="format-note">RLDS / TFDS · Uncompressed TFRecord</span></div>
          <div id="custom-rlds" ref={customSourceRef} className="custom-source" role="region" aria-labelledby="custom-rlds-title">
            <div className="custom-source-heading"><Icon name="link" /><div><h3 id="custom-rlds-title">Your RLDS link. Ready to preview.</h3><p>Take a quick look at your dataset before your next experiment.</p></div></div>
            <SourceBar key={source instanceof File ? source.name : url} defaultUrl={selected ? undefined : url} currentFile={source instanceof File ? source : undefined} fileRef={fileRef} onOpen={preview} submitLabel="Preview dataset" descriptionId="custom-rlds-help" />
            <p id="custom-rlds-help">Use a direct link to an uncompressed TFRecord shard, not a dataset page. The host must allow browser access (CORS). Local files stay on your device.</p>
          </div>
          <h4 className="sample-heading">Or explore a sample</h4>
          <div className="dataset-gallery">{SAMPLES.slice(0, 3).map(s => <button type="button" key={s.id} className="dataset-card" aria-pressed={selected?.id === s.id} onClick={() => choose(s)}><div className="dataset-image"><img src={s.image} alt={`${s.dataset} camera observation`} loading="lazy" /><span className="dataset-category">{s.category}</span><span className="dataset-selected"><Icon name={selected?.id === s.id ? 'check' : 'play'} /></span></div><div className="dataset-card-info"><div><strong>{s.dataset}</strong><span>{s.size}</span></div><p>{s.notes}</p></div></button>)}</div>
          <p className="sample-note">These are small excerpts of real datasets. Choose a card to load its preview.</p>
          <DropTarget className="playground-viewer" onFile={open}>
            <div className="preview-bar" ref={previewRef}><div><span className="status-dot" /><strong>{selected?.dataset ?? (source instanceof File ? source.name : 'Your dataset')}</strong><span className="preview-label">Live viewer</span></div>{url && <a className="text-link" href={`/viewer.html?url=${encodeURIComponent(url)}`}>Open full viewer<Icon name="external" /></a>}</div>
            <div className="home-viewer-frame"><ShardViewer key={previewVersion} source={source} selected={episode} onSelectedChange={setEpisode} specs={selected?.where === 'local' ? false : undefined} /></div>
          </DropTarget>
        </div>
      </section>
      <section className="build-section"><div className="site-container build-grid"><div><p className="eyebrow">Built to be embedded</p><h2>Your application.<br />Your way to peek.</h2><p>RoboPeek is an npm library, too. Drop in a ready-made React viewer, compose your own controls, or use the framework-independent reader.</p><a className="text-link" href="/RLDS/#ready-made">See live examples and source code<Icon name="arrow" /></a><div className="package-lines"><div><Icon name="layers" /><div><code>@videodb/robopeek-react</code><span>Viewers, composable parts, and React hooks for every format</span></div></div><div><Icon name="terminal" /><div><code>@videodb/robopeek-rlds</code> · <code>@videodb/robopeek-mcap</code><span>The readers, for any JavaScript application</span></div></div></div></div><CodePanel files={[{ name: 'DatasetPreview.tsx', code: QUICKSTART }]} /></div></section>
      <section className="roadmap site-container"><span className="roadmap-icon"><Icon name="layers" /></span><div><p className="eyebrow">On the roadmap</p><h2>Next up: MCAP.</h2><p>Explore RLDS episodes today. MCAP support will let you preview robot logs and sensor messages in the same place.</p></div><a className="ui-button" href="https://github.com/video-db/RoboPeek" target="_blank" rel="noreferrer">Follow development<Icon name="external" /></a></section>
    </main>
    <SiteFooter />
  </div>
}

const QUICKSTART = `import { ShardViewer } from '@videodb/robopeek-react/rlds'
import '@videodb/robopeek-react/styles.css'

export function DatasetPreview({ url }: { url: string }) {
  return (
    <div style={{ height: 640 }}>
      <ShardViewer source={url} />
    </div>
  )
}`
