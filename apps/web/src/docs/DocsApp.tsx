import { useEffect, useState } from 'react'
import { SiteHeader } from '../SiteChrome.tsx'
import { Icon } from '../ui.tsx'
import { SAMPLES, sampleInput } from '../samples.ts'
import { InputContext } from './shell/Layout.tsx'
import { OverviewPage } from './pages/OverviewPage.tsx'
import { ReadyMadePage } from './pages/ReadyMadePage.tsx'
import { MixAndMatchPage } from './pages/MixAndMatchPage.tsx'
import { RldsOnlyPage } from './pages/RldsOnlyPage.tsx'
import { StylingPage } from './pages/StylingPage.tsx'
import { TogglesPage } from './pages/TogglesPage.tsx'
import './docs.css'

const PAGES = [
  { id: 'overview', label: 'Overview', icon: 'book', Page: OverviewPage },
  { id: 'ready-made', label: 'Ready-made viewers', icon: 'film', Page: ReadyMadePage },
  { id: 'mix-and-match', label: 'Compose your player', icon: 'layers', Page: MixAndMatchPage },
  { id: 'rlds-only', label: 'Build your own UI', icon: 'code', Page: RldsOnlyPage },
  { id: 'styling', label: 'Styling & themes', icon: 'sliders', Page: StylingPage },
  { id: 'show-hide', label: 'Show & hide parts', icon: 'camera', Page: TogglesPage },
] as const
const currentPage = () => PAGES.find(p => p.id === location.hash.slice(1)) ?? PAGES[0]

export function DocsApp() {
  const [page, setPage] = useState(currentPage)
  const [input, setInput] = useState(() => sampleInput(SAMPLES[0]))
  useEffect(() => {
    const change = () => { setPage(currentPage()); window.scrollTo({ top: 0, behavior: 'instant' }) }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  useEffect(() => { document.title = `${page.label} · RLDS · RoboPeek` }, [page.label])
  const Page = page.Page
  return <div className="site-page docs-site"><SiteHeader docs />
    <div className="docs-layout">
      <aside className="docs-sidebar"><a className="docs-back" href="/"><Icon name="arrow" />Back to RoboPeek</a><div className="docs-sidebar-heading"><span>RLDS</span><span className="ui-badge">Developer guide</span></div><p className="sidebar-group-label">Get started & explore</p><nav aria-label="RLDS documentation">{PAGES.map(p => <a key={p.id} href={`#${p.id}`} aria-current={page.id === p.id ? 'page' : undefined}><Icon name={p.icon} />{p.label}</a>)}</nav><div className="sidebar-note"><Icon name="code" /><strong>Real examples. Real code.</strong><p>Every demo runs on the same packages you install.</p><a href="https://github.com/video-db/RoboPeek/tree/main/packages" target="_blank" rel="noreferrer">Browse the source<Icon name="external" /></a></div></aside>
      <main className="docs-content"><div className="docs-breadcrumb"><a href="/">RoboPeek</a><Icon name="chevron" /><a href="#overview">RLDS</a><Icon name="chevron" /><span>{page.label}</span></div><InputContext value={{ input, setInput }}><Page key={page.id} /></InputContext><div className="docs-page-footer"><span>RoboPeek · RLDS developer guide</span><a href="/#playground">Back to the playground<Icon name="arrow" /></a></div></main>
    </div>
  </div>
}
