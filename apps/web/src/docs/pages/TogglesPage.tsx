import { useCallback, useState, type ReactNode } from 'react'
import { ExamplePage } from '../shell/ExamplePage.tsx'
import { ConfigurableViewer, type Keys, type Show } from '../examples/toggles/ConfigurableViewer.tsx'
import viewerCode from '../examples/toggles/ConfigurableViewer.tsx?raw'
import cssCode from '../examples/toggles/toggles.css?raw'

const ALL_ON: Show = {
  status: true, drawer: true, drawerFilter: true,
  stage: true, instruction: true, frames: true,
  transport: true, prevEpisode: true, stepBack: true, play: true, stepForward: true, nextEpisode: true, scrubber: true, counter: true,
  options: true, fps: true, autoNext: true, flags: true,
  tracks: true, metadata: true,
}

const TRANSPORT = [['prevEpisode', 'PrevEpisode'], ['stepBack', 'StepBack'], ['play', 'Play'], ['stepForward', 'StepForward'], ['nextEpisode', 'NextEpisode'], ['scrubber', 'Scrubber'], ['counter', 'Counter']] as const
const OPTIONS = [['fps', 'FpsSelect'], ['autoNext', 'AutoNext'], ['flags', 'Flags']] as const

export function TogglesPage() {
  const [show, setShow] = useState(ALL_ON)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [keys, setKeys] = useState<Keys>({ cameras: [], tracks: [], metadata: [] })
  const onKeys = useCallback((k: Keys) => setKeys((old) => (JSON.stringify(old) === JSON.stringify(k) ? old : k)), [])

  const flip = (k: keyof Show) => setShow((s) => ({ ...s, [k]: !s[k] }))
  const flipKey = (k: string) => setHidden((h) => { const n = new Set(h); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const part = (k: keyof Show, label: ReactNode, children?: ReactNode, off?: boolean) => (
    <Toggle checked={show[k]} disabled={off} onChange={() => flip(k)} label={label}>{children}</Toggle>
  )
  const perKey = (list: string[], off: boolean) =>
    list.map((k) => <Toggle key={k} checked={!hidden.has(k)} disabled={off} onChange={() => flipKey(k)} label={<span className="key">{k}</span>} />)

  return (
    <ExamplePage
      step="5"
      title="Show and hide parts"
      pkg="@videodb/robopeek-react"
      intro={
        <p>
          The default <code>ShardViewer</code>, where every switch below takes one part out. The player parts are left out by not passing
          them as children, and single cameras, charts or metadata entries are filtered with <code>include</code>. The viewer's own chrome
          (status strip, episode drawer) has no props, so it's hidden with CSS on its public classes. The first <b>Code</b> tab  shows
          the JSX for the current switches.
        </p>
      }
      aside={
        <section className="panel">
          <h2 className="panel-title">
            <span className="badge">Show</span> What the viewer renders
            <button className="link toggles-reset" onClick={() => { setShow(ALL_ON); setHidden(new Set()) }}>Show everything</button>
          </h2>
          <div className="toggles">
            <fieldset>
              <legend>Viewer chrome <span className="via">CSS</span></legend>
              {part('status', 'Load status strip')}
              {part('drawer', 'Episode drawer', part('drawerFilter', 'Filter field', undefined, !show.drawer))}
            </fieldset>
            <fieldset>
              <legend><code>Player.Stage</code> <span className="via">children</span></legend>
              {part('stage', <code>Stage</code>, <>
                {part('instruction', <code>Instruction</code>, undefined, !show.stage)}
                {part('frames', <code>Frames</code>, perKey(keys.cameras, !show.stage || !show.frames), !show.stage)}
                {part('transport', <code>Transport</code>, TRANSPORT.map(([k, l]) => <span key={k}>{part(k, <code>{l}</code>, undefined, !show.stage || !show.transport)}</span>), !show.stage)}
                {part('options', <code>Options</code>, OPTIONS.map(([k, l]) => <span key={k}>{part(k, <code>{l}</code>, undefined, !show.stage || !show.options)}</span>), !show.stage)}
              </>)}
            </fieldset>
            <fieldset>
              <legend><code>Player.Tracks</code> <span className="via">include</span></legend>
              {part('tracks', <code>Tracks</code> , perKey(keys.tracks, !show.tracks))}
              {part('metadata', <code>Metadata</code>, perKey(keys.metadata, !show.metadata))}
            </fieldset>
          </div>
        </section>
      }
      files={[
        { name: 'Current switches (JSX)', code: jsx(show, hidden) },
        { name: 'ConfigurableViewer.tsx', code: viewerCode },
        { name: 'toggles.css', code: cssCode },
      ]}
    >
      {(input) => <ConfigurableViewer source={input.source} show={show} hidden={hidden} onKeys={onKeys} />}
    </ExamplePage>
  )
}

function Toggle({ checked, disabled, onChange, label, children }: { checked: boolean; disabled?: boolean; onChange: () => void; label: ReactNode; children?: ReactNode }) {
  return (
    <div className="toggle">
      <label data-disabled={disabled || undefined}>
        <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
        {label}
      </label>
      {children && <div className="toggle-children">{children}</div>}
    </div>
  )
}

/** The JSX the current switches correspond to. */
function jsx(show: Show, hidden: Set<string>) {
  const list = (names: readonly (readonly [keyof Show, string])[], ind: string) =>
    names.filter(([k]) => show[k]).map(([, l]) => `${ind}<Player.${l} />`).join('\n')
  const inc = hidden.size ? ` include={(k) => !hidden.has(k)}` : ''
  const chrome = (['status', 'drawer', 'drawerFilter'] as const).filter((k) => !show[k])
  const transport = show.transport && TRANSPORT.some(([k]) => show[k])
  const options = show.options && OPTIONS.some(([k]) => show[k])
  const stage = show.stage && (show.instruction || show.frames || transport || options)
  const lines = [`<ShardViewer source={source}${chrome.length ? ` className="${chrome.map((k) => `hide-${k.replace('drawerFilter', 'drawer-filter')}`).join(' ')}"` : ''}>`]
  if (stage) {
    lines.push('  <Player.Stage>')
    if (show.instruction) lines.push('    <Player.Instruction />')
    if (show.frames) lines.push(`    <Player.Frames${inc} renderEmpty={() => null} />`)
    if (transport) lines.push('    <Player.Transport>', list(TRANSPORT, '      '), '    </Player.Transport>')
    if (options) lines.push('    <Player.Options>', list(OPTIONS, '      '), '    </Player.Options>')
    lines.push('  </Player.Stage>')
  }
  if (show.tracks || show.metadata) {
    lines.push(`  <Player.Tracks include={${show.tracks ? (hidden.size ? '(k) => !hidden.has(k)' : '() => true') : '() => false'}}>`)
    if (show.metadata) lines.push(`    <Player.Metadata${inc} />`)
    lines.push('  </Player.Tracks>')
  }
  if (!stage && !show.tracks && !show.metadata) lines.push('  <></>')
  lines.push('</ShardViewer>')
  if (hidden.size) lines.unshift(`const hidden = new Set(${JSON.stringify([...hidden])})`, '')
  return lines.filter(Boolean).join('\n')
}
