import type { ReactNode } from 'react'
import { Badge, Button, Icon } from './ui.tsx'
import { SiteHeader } from './SiteChrome.tsx'

export const SAMPLE_URL =
  'https://huggingface.co/datasets/ArtemLykov/CognitiveDrone_dataset/resolve/main/data/rlds/train/cognitive_drone-train.tfrecord-00005-of-00128'

export function AppShell({ mode, url, episode = 0, sourceBar, children }: {
  mode: 'shard' | 'episode'
  url?: string
  episode?: number
  sourceBar: ReactNode
  children: ReactNode
}) {
  const single = mode === 'episode'
  return (
    <>
      <SiteHeader />
      <main className="workspace">
        <div className="workspace-heading">
          <div><h1>{single ? 'Episode viewer' : 'Dataset explorer'}</h1><p>{single ? 'Go straight to the episode you want to inspect.' : 'Explore camera frames, actions, and states from your RLDS datasets.'}</p></div>
          <nav className="view-switch" aria-label="Viewer mode">
            <a aria-current={!single ? 'page' : undefined} href={`/viewer.html${url ? `?url=${encodeURIComponent(url)}` : ''}`}><Icon name="layers" />Full dataset</a>
            <a aria-current={single ? 'page' : undefined} href={`/episode.html${url ? `?url=${encodeURIComponent(url)}&episode=${episode}` : ''}`}><Icon name="film" />Single episode</a>
          </nav>
        </div>
        <section className="viewer-card" aria-label={single ? 'Episode workspace' : 'Dataset workspace'}>
          {sourceBar}
          {children}
        </section>
      </main>
      <footer className="app-footer">
        <div className="keyboard-hints" aria-label="Player keyboard shortcuts">
          <span><kbd>Space</kbd> Play / pause</span>
          <span><kbd>←</kbd><kbd>→</kbd> Step</span>
          <span><kbd>Shift</kbd><kbd>←</kbd><kbd>→</kbd> Jump 10</span>
          <span><kbd>↑</kbd><kbd>↓</kbd> Episode</span>
        </div>
        <span className="footer-format">RLDS / TFRecord</span>
      </footer>
    </>
  )
}

export function Welcome({ single = false, onSample, onBrowse }: { single?: boolean; onSample: () => void; onBrowse: () => void }) {
  return (
    <div className="welcome">
      <div className="welcome-inner">
        <div className="welcome-heading">
          <span className="welcome-icon"><Icon name={single ? 'film' : 'layers'} /></span>
          <h2>{single ? 'One episode. Every detail.' : 'Your next insight starts with an episode.'}</h2>
          <p>{single ? 'Open a TFRecord file and choose an episode. Inspect its frames and signals without downloading the entire shard.' : 'Open a TFRecord shard to browse episodes and inspect what your robot sees and does, frame by frame.'}</p>
        </div>
        <button type="button" className="upload-zone" onClick={onBrowse}>
          <span className="upload-icon"><Icon name="upload" /></span>
          <strong>Drop your dataset here</strong>
          <span>or <span className="browse-link">browse files</span> on your computer</span>
          <span className="upload-format">RLDS datasets · TFRecord files</span>
        </button>
        <div className="sample-divider"><span>Just looking around?</span></div>
        <div className="sample-card">
          <span className="sample-icon"><Icon name="layers" /></span>
          <div className="sample-details"><strong>CognitiveDrone</strong><span>{single ? 'Preview episode 40 from a real dataset' : 'Explore a real robot-learning dataset'}</span></div>
          <Badge>{single ? 'Episode 40' : '82 MB'}</Badge>
          <Button onClick={onSample}>Try sample<Icon name="arrow" /></Button>
        </div>
        <p className="privacy-note"><Icon name="shield" />Local files stay on your device. Everything runs in your browser.</p>
      </div>
    </div>
  )
}
