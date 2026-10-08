import { useId, useRef, useState, type ReactNode } from 'react'
import { SAMPLES, fileInput, sampleInput, type Input } from '../../samples.ts'
import { useInput } from './Layout.tsx'
import { SourceBar } from '../../SourceBar.tsx'
import { DropTarget } from '../../DropTarget.tsx'
import { CodePanel, type CodeFile } from '../../CodeBlock.tsx'
import { Icon } from '../../ui.tsx'

type Props = { step: string; title: string; pkg: string; intro: ReactNode; files: CodeFile[]; controls?: ReactNode; aside?: ReactNode; children: (input: Input) => ReactNode }
export function ExamplePage({ step, title, pkg, intro, files, controls, aside, children }: Props) {
  const { input, setInput } = useInput()
  const [view, setView] = useState<'preview' | 'code'>('preview')
  const id = useId()
  const picker = useRef<HTMLInputElement>(null)
  return <article className="doc-page">
    <header className="page-head"><p className="eyebrow">Example {step}<span className="eyebrow-divider">/</span>{pkg}</p><h1>{title}</h1><div className="intro">{intro}</div></header>
    <DropTarget onFile={file => setInput(fileInput(file))} className="example-workspace">
      <div className="example-source"><label htmlFor={`${id}-dataset`}>Example dataset</label><select id={`${id}-dataset`} value={SAMPLES.some(s => s.id === input.key) ? input.key : 'custom'} onChange={e => { const sample = SAMPLES.find(s => s.id === e.target.value); if (sample) setInput(sampleInput(sample)) }}>{!SAMPLES.some(s => s.id === input.key) && <option value="custom">{input.label}</option>}{SAMPLES.map(s => <option key={s.id} value={s.id}>{s.dataset} · {s.size}</option>)}</select><span>{input.detail}</span></div>
      <details className="example-custom-source"><summary>Use your own URL or file<Icon name="chevron" /></summary><SourceBar key={input.key} fileRef={picker} currentFile={input.source instanceof File ? input.source : undefined} onOpen={src => setInput(typeof src === 'string' ? { source: src, label: 'Custom URL', detail: src, key: src } : fileInput(src))} /><p>Files are read locally. Remote URLs must allow CORS and are fetched as supplied.</p></details>
      {controls && <div className="example-controls">{controls}</div>}
      <div className={aside ? 'with-aside' : undefined}>
        {aside && <aside className="side-controls">{aside}</aside>}
        <section className="demo-output">
          <div className="demo-output-bar"><div className="demo-tabs" role="tablist" aria-label="Example view" onKeyDown={e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? 'preview' : e.key === 'End' ? 'code' : view === 'preview' ? 'code' : 'preview'; setView(next); e.currentTarget.querySelector<HTMLButtonElement>(`[data-view="${next}"]`)?.focus() } }}>{(['preview', 'code'] as const).map(v => <button key={v} type="button" id={`${id}-${v}-tab`} data-view={v} role="tab" aria-selected={view === v} aria-controls={`${id}-${v}`} tabIndex={view === v ? 0 : -1} onClick={() => setView(v)}><Icon name={v === 'preview' ? 'play' : 'code'} />{v === 'preview' ? 'Preview' : 'Code'}</button>)}</div><span>{view === 'preview' ? input.label : 'Copy, adapt, and make it yours'}</span></div>
          <div id={`${id}-preview`} role="tabpanel" aria-labelledby={`${id}-preview-tab`} hidden={view !== 'preview'}><div className="stage-frame" key={input.key}>{children(input)}</div></div>
          <div id={`${id}-code`} role="tabpanel" aria-labelledby={`${id}-code-tab`} hidden={view !== 'code'}><CodePanel files={files} /></div>
        </section>
      </div>
    </DropTarget>
    <p className="example-tip"><Icon name="code" />The Code tab contains the source files used by this example.</p>
  </article>
}
