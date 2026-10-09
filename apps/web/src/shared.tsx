import type { ReactNode } from 'react'
import { Badge, Button, Icon } from './ui.tsx'
import { SiteHeader } from './SiteChrome.tsx'

export const SAMPLE_URL =
  'https://huggingface.co/datasets/ArtemLykov/CognitiveDrone_dataset/resolve/main/data/rlds/train/cognitive_drone-train.tfrecord-00005-of-00128'

type Mode = 'shard' | 'episode' | 'mcap'

const SHELL = {
  shard: { title: 'Dataset explorer', text: 'Explore camera frames, actions, and states from your RLDS datasets.', format: 'RLDS / TFRecord' },
  episode: { title: 'Episode viewer', text: 'Go straight to the episode you want to inspect.', format: 'RLDS / TFRecord' },
  mcap: { title: 'Recording viewer', text: 'Explore cameras, signals, and messages from your MCAP recordings.', format: 'MCAP · ROS 1 · ROS 2 · protobuf · JSON' },
}

export function AppShell({ mode, url, episode = 0, sourceBar, children }: {
  mode: Mode
  url?: string
  episode?: number
  sourceBar: ReactNode
  children: ReactNode
}) {
  const shell = SHELL[mode]
  return (
    <>
      <SiteHeader />
      <main className="workspace">
        <div className="workspace-heading">
          <div><h1>{shell.title}</h1><p>{shell.text}</p></div>
          {mode !== 'mcap' && <nav className="view-switch" aria-label="Viewer mode">
            <a aria-current={mode === 'shard' ? 'page' : undefined} href={`/viewer.html${url ? `?url=${encodeURIComponent(url)}` : ''}`}><Icon name="layers" />Full dataset</a>
            <a aria-current={mode === 'episode' ? 'page' : undefined} href={`/episode.html${url ? `?url=${encodeURIComponent(url)}&episode=${episode}` : ''}`}><Icon name="film" />Single episode</a>
          </nav>}
        </div>
        <section className="viewer-card" aria-label={mode === 'mcap' ? 'Recording workspace' : mode === 'episode' ? 'Episode workspace' : 'Dataset workspace'}>
          {sourceBar}
          {children}
        </section>
      </main>
      <footer className="app-footer">
        <div className="keyboard-hints" aria-label="Player keyboard shortcuts">
          <span><kbd>Space</kbd> Play / pause</span>
          <span><kbd>←</kbd><kbd>→</kbd> Step</span>
          <span><kbd>Shift</kbd><kbd>←</kbd><kbd>→</kbd> Jump 10</span>
          {mode !== 'mcap' && <span><kbd>↑</kbd><kbd>↓</kbd> Episode</span>}
        </div>
        <span className="footer-format">{shell.format}</span>
      </footer>
    </>
  )
}

const WELCOME = {
  shard: {
    icon: 'layers', title: 'Your next insight starts with an episode.',
    text: 'Open a TFRecord shard to browse episodes and inspect what your robot sees and does, frame by frame.',
    files: 'RLDS datasets · TFRecord files', sample: 'CognitiveDrone', sampleText: 'Explore a real robot-learning dataset', badge: '82 MB',
  },
  episode: {
    icon: 'film', title: 'One episode. Every detail.',
    text: 'Open a TFRecord file and choose an episode. Inspect its frames and signals without downloading the entire shard.',
    files: 'RLDS datasets · TFRecord files', sample: 'CognitiveDrone', sampleText: 'Preview episode 40 from a real dataset', badge: 'Episode 40',
  },
  mcap: {
    icon: 'film', title: 'Every topic. One timeline.',
    text: 'Open an MCAP recording to watch its cameras and chart its signals, aligned in time. Large files play while they download.',
    files: 'MCAP recordings · .mcap files', sample: 'GR00T sim', sampleText: 'Three H.264 cameras from a simulated robot', badge: '3 MB',
  },
} as const

export function Welcome({ mode = 'shard', onSample, onBrowse }: { mode?: Mode; onSample: () => void; onBrowse: () => void }) {
  const w = WELCOME[mode]
  return (
    <div className="welcome">
      <div className="welcome-inner">
        <div className="welcome-heading">
          <span className="welcome-icon"><Icon name={w.icon} /></span>
          <h2>{w.title}</h2>
          <p>{w.text}</p>
        </div>
        <button type="button" className="upload-zone" onClick={onBrowse}>
          <span className="upload-icon"><Icon name="upload" /></span>
          <strong>{mode === 'mcap' ? 'Drop your recording here' : 'Drop your dataset here'}</strong>
          <span>or <span className="browse-link">browse files</span> on your computer</span>
          <span className="upload-format">{w.files}</span>
        </button>
        <div className="sample-divider"><span>Just looking around?</span></div>
        <div className="sample-card">
          <span className="sample-icon"><Icon name={w.icon} /></span>
          <div className="sample-details"><strong>{w.sample}</strong><span>{w.sampleText}</span></div>
          <Badge>{w.badge}</Badge>
          <Button onClick={onSample}>Try sample<Icon name="arrow" /></Button>
        </div>
        <p className="privacy-note"><Icon name="shield" />Local files stay on your device. Everything runs in your browser.</p>
      </div>
    </div>
  )
}
