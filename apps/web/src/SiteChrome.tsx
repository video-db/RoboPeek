import { useState } from 'react'
import { Icon } from './ui.tsx'
import { VideoDBCredit } from './VideoDBCredit.tsx'
import './site.css'

export const REPO = 'https://github.com/video-db/RoboPeek'
export const MCAP_DOCS = `${REPO}/tree/main/packages/mcap#readme`
export function Brand() {
  return <a className="brand" href="/" aria-label="RoboPeek home"><img className="brand-mark" src="/robopeek-logo.png" alt="" width="44" height="44" /><strong>RoboPeek</strong></a>
}
export function SiteHeader({ docs = false }: { docs?: boolean }) {
  const [menu, setMenu] = useState(false)
  return <header className="site-header"><div className="site-header-inner">
    <Brand /><VideoDBCredit />
    <button type="button" className="mobile-menu-button" aria-label="Toggle navigation" aria-expanded={menu} aria-controls="site-navigation" onClick={() => setMenu(!menu)}><Icon name={menu ? 'close' : 'menu'} /></button>
    <nav id="site-navigation" className="site-nav" data-open={menu || undefined} aria-label="Main navigation">
      <a href="/#playground" onClick={() => setMenu(false)}>Playground</a>
      <a href="/RLDS/" aria-current={docs ? 'page' : undefined}>RLDS docs</a>
      <a href={MCAP_DOCS} target="_blank" rel="noreferrer">MCAP docs<Icon name="external" /></a>
      <a href={REPO} target="_blank" rel="noreferrer"><Icon name="github" />GitHub<Icon name="external" /></a>
      <a className="ui-button" data-variant="primary" href="/RLDS/#ready-made">Get started<Icon name="arrow" /></a>
    </nav>
  </div></header>
}
export function SiteFooter() {
  return <footer className="site-footer"><div className="site-footer-inner"><div><Brand /><p>Open-source tools for a closer look at robotics data.</p></div><nav aria-label="Footer"><a href="/RLDS/">RLDS docs</a><a href={MCAP_DOCS} target="_blank" rel="noreferrer">MCAP docs<Icon name="external" /></a><a href={REPO} target="_blank" rel="noreferrer">Source code<Icon name="external" /></a><VideoDBCredit /></nav></div></footer>
}
