import { useState } from 'react'
import { ExamplePage } from '../shell/ExamplePage.tsx'
import { PRESETS, ThemedViewer, type Tokens } from '../examples/styling/ThemedViewer.tsx'
import viewerCode from '../examples/styling/ThemedViewer.tsx?raw'
import themesCode from '../examples/styling/themes.css?raw'

const FONTS = { Inter: "'Inter', system-ui, sans-serif", 'JetBrains Mono': "'JetBrains Mono', monospace", Georgia: 'Georgia, serif' }

export function StylingPage() {
  const [presetId, setPresetId] = useState('default')
  const [tokens, setTokens] = useState<Tokens>({})
  const preset = PRESETS.find((p) => p.id === presetId)!
  const set = (k: keyof Tokens, v: string) => setTokens((t) => ({ ...t, [k]: v }))
  const css = Object.entries(tokens).map(([k, v]) => `  ${k}: ${v};`).join('\n')

  return (
    <ExamplePage
      step="4"
      title="Styling"
      pkg="@videodb/robopeek-react @videodb/robopeek-rlds"
      intro={
        <p>
          The same <code>ShardViewer</code> in different looks. Start with the smallest change that gets you there: a prop (<code>colorScheme</code>),
          then <code>--rp-*</code> tokens, then CSS on the public <code>rp-*</code> classes. Pick a preset, then adjust tokens on top of it.
        </p>
      }
      controls={
        <section className="panel">
          <h2 className="panel-title"><span className="badge">Theme</span> {preset.how}</h2>
          <div className="segmented" role="group" aria-label="Theme preset">
            {PRESETS.map((p) => (
              <button key={p.id} aria-pressed={p.id === presetId} onClick={() => setPresetId(p.id)}>{p.label}</button>
            ))}
          </div>
          <div className="tokens">
            <label>--rp-accent <input type="color" value={tokens['--rp-accent'] ?? (presetId === 'terminal' ? '#22c55e' : presetId === 'indigo' ? '#4f46e5' : '#27272a')} onChange={(e) => { set('--rp-accent', e.currentTarget.value); set('--rp-stage-accent', e.currentTarget.value) }} /></label>
            <label>--rp-stage <input type="color" value={tokens['--rp-stage'] ?? (presetId === 'terminal' ? '#000000' : presetId === 'indigo' ? '#1e1b4b' : '#18181b')} onChange={(e) => set('--rp-stage', e.currentTarget.value)} /></label>
            <label>--rp-series-0 <input type="color" value={tokens['--rp-series-0'] ?? (presetId === 'terminal' ? '#22c55e' : presetId === 'indigo' ? '#4f46e5' : '#0075ff')} onChange={(e) => set('--rp-series-0', e.currentTarget.value)} /></label>
            <label>
              --rp-radius-card
              <input type="range" min={0} max={24} value={parseInt(tokens['--rp-radius-card'] ?? (presetId === 'terminal' ? '0' : '8'))} onChange={(e) => { set('--rp-radius-card', `${e.currentTarget.value}px`); set('--rp-radius', `${Math.round(Number(e.currentTarget.value) / 2)}px`) }} />
            </label>
            <label>
              --rp-font-sans
              <select value={Object.entries(FONTS).find(([, v]) => v === tokens['--rp-font-sans'])?.[0] ?? 'Inter'} onChange={(e) => set('--rp-font-sans', FONTS[e.currentTarget.value as keyof typeof FONTS])}>
                {Object.keys(FONTS).map((f) => <option key={f}>{f}</option>)}
              </select>
            </label>
            <button className="link" disabled={!css} onClick={() => setTokens({})}>Reset tokens</button>
          </div>
        </section>
      }
      files={[
        { name: 'Your tokens (CSS)', code: css ? `/* The tokens you set, as CSS */\n.my-viewer {\n${css}\n}` : '/* Change a token above and its CSS shows up here. */' },
        { name: 'ThemedViewer.tsx', code: viewerCode },
        { name: 'themes.css', code: themesCode },
      ]}
    >
      {(input) => <ThemedViewer source={input.source} preset={preset} tokens={tokens} />}
    </ExamplePage>
  )
}
