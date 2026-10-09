import { useEffect, useState } from 'react'
import { SiteHeader } from '../SiteChrome.tsx'
import { Icon } from '../ui.tsx'
import { MCAP_SAMPLES, SAMPLES, sampleInput } from '../samples.ts'
import { InputContext, type DocsFormat } from './shell/Layout.tsx'
import { OverviewPage } from './pages/OverviewPage.tsx'
import { ReadyMadePage } from './pages/ReadyMadePage.tsx'
import { MixAndMatchPage } from './pages/MixAndMatchPage.tsx'
import { RldsOnlyPage } from './pages/RldsOnlyPage.tsx'
import { StylingPage } from './pages/StylingPage.tsx'
import { TogglesPage } from './pages/TogglesPage.tsx'
import { McapOverviewPage } from './pages/McapOverviewPage.tsx'
import { McapReadyMadePage } from './pages/McapReadyMadePage.tsx'
import { McapComposePage } from './pages/McapComposePage.tsx'
import { McapOnlyPage } from './pages/McapOnlyPage.tsx'
import './docs.css'

const GUIDES = {
  rlds: {
    label: 'RLDS',
    samples: SAMPLES,
    pages: [
      { id: 'overview', label: 'Overview', icon: 'book', Page: OverviewPage },
      { id: 'ready-made', label: 'Ready-made viewers', icon: 'film', Page: ReadyMadePage },
      { id: 'mix-and-match', label: 'Compose your player', icon: 'layers', Page: MixAndMatchPage },
      { id: 'rlds-only', label: 'Build your own UI', icon: 'code', Page: RldsOnlyPage },
      { id: 'styling', label: 'Styling & themes', icon: 'sliders', Page: StylingPage },
      { id: 'show-hide', label: 'Show & hide parts', icon: 'camera', Page: TogglesPage },
    ],
  },
  mcap: {
    label: 'MCAP',
    samples: MCAP_SAMPLES,
    pages: [
      { id: 'overview', label: 'Overview', icon: 'book', Page: McapOverviewPage },
      { id: 'ready-made', label: 'Ready-made viewer', icon: 'film', Page: McapReadyMadePage },
      { id: 'mix-and-match', label: 'Compose your player', icon: 'layers', Page: McapComposePage },
      { id: 'mcap-only', label: 'Build your own UI', icon: 'code', Page: McapOnlyPage },
      { id: 'styling', label: 'Styling & themes', icon: 'sliders', Page: StylingPage },
      { id: 'show-hide', label: 'Show & hide parts', icon: 'camera', Page: TogglesPage },
    ],
  },
} as const
type Guide = (typeof GUIDES)[DocsFormat]
const pageFor = (guide: Guide) => guide.pages.find(p => p.id === location.hash.slice(1)) ?? guide.pages[0]

export function DocsApp({ format }: { format: DocsFormat }) {
  const guide = GUIDES[format]
  const [page, setPage] = useState(() => pageFor(guide))
  const [input, setInput] = useState(() => sampleInput(guide.samples[0]))
  useEffect(() => {
    const change = () => { setPage(pageFor(guide)); window.scrollTo({ top: 0, behavior: 'instant' }) }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [guide])
  useEffect(() => { document.title = `${page.label} · ${guide.label} · RoboPeek` }, [page.label, guide.label])
  const Page = page.Page
  return <div className="site-page docs-site"><SiteHeader docs={format} />
    <div className="docs-layout">
      <aside className="docs-sidebar"><a className="docs-back" href="/"><Icon name="arrow" />Back to RoboPeek</a><div className="docs-sidebar-heading"><span>{guide.label}</span><span className="ui-badge">Developer guide</span></div><p className="sidebar-group-label">Get started & explore</p><nav aria-label={`${guide.label} documentation`}>{guide.pages.map(p => <a key={p.id} href={`#${p.id}`} aria-current={page.id === p.id ? 'page' : undefined}><Icon name={p.icon} />{p.label}</a>)}</nav><div className="sidebar-note"><Icon name="code" /><strong>Real examples. Real code.</strong><p>Every demo runs on the same packages you install.</p><a href="https://github.com/video-db/RoboPeek/tree/main/packages" target="_blank" rel="noreferrer">Browse the source<Icon name="external" /></a></div></aside>
      <main className="docs-content"><div className="docs-breadcrumb"><a href="/">RoboPeek</a><Icon name="chevron" /><a href="#overview">{guide.label}</a><Icon name="chevron" /><span>{page.label}</span></div><InputContext value={{ format, samples: guide.samples, input, setInput }}><Page key={page.id} /></InputContext><div className="docs-page-footer"><span>RoboPeek · {guide.label} developer guide</span><a href={format === 'mcap' ? '/#mcap' : '/#playground'}>Back to the playground<Icon name="arrow" /></a></div></main>
    </div>
  </div>
}
