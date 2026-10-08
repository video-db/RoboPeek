import { useEffect, useId, useState } from 'react'
import { Icon } from './ui.tsx'

export function CopyButton({ text, label = 'Copy code' }: { text: string; label?: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  useEffect(() => { if (status === 'idle') return; const timer = setTimeout(() => setStatus('idle'), 2500); return () => clearTimeout(timer) }, [status])
  return <button type="button" className="copy-button" aria-label={status === 'copied' ? 'Copied' : label} onClick={async () => {
    try { await navigator.clipboard.writeText(text); setStatus('copied') } catch { setStatus('error') }
  }}><Icon name={status === 'copied' ? 'check' : 'copy'} /><span aria-live="polite">{status === 'copied' ? 'Copied' : status === 'error' ? 'Select and copy' : 'Copy'}</span></button>
}

function Highlight({ code }: { code: string }) {
  const parts = code.split(/(\/\/[^\n]*|'[^'\n]*'|"[^"\n]*"|`[^`]*`|\b(?:import|from|export|default|function|return|const|let|async|await|for|of|if|type|true|false|null)\b)/g)
  return <>{parts.map((part, i) => {
    const kind = part.startsWith('//') ? 'comment' : /^['"`]/.test(part) ? 'string' : /^(import|from|export|default|function|return|const|let|async|await|for|of|if|type|true|false|null)$/.test(part) ? 'keyword' : undefined
    return kind ? <span key={i} className={`syntax-${kind}`}>{part}</span> : part
  })}</>
}

export type CodeFile = { name: string; code: string }
export function CodePanel({ files }: { files: CodeFile[] }) {
  const [active, setActive] = useState(0)
  const id = useId()
  const file = files[active] ?? files[0]
  return <section className="code-panel" aria-label="Example source code">
    <div className="code-panel-bar">
      <div className="code-file-tabs" role="tablist" aria-label="Source files" onKeyDown={(e) => {
        const next = e.key === 'ArrowRight' ? (active + 1) % files.length : e.key === 'ArrowLeft' ? (active - 1 + files.length) % files.length : e.key === 'Home' ? 0 : e.key === 'End' ? files.length - 1 : undefined
        if (next === undefined) return
        e.preventDefault(); setActive(next); e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
      }}>
        {files.map((f, i) => <button type="button" key={f.name} role="tab" id={`${id}-tab-${i}`} aria-controls={`${id}-panel`} tabIndex={active === i ? 0 : -1} aria-selected={active === i} onClick={() => setActive(i)}>{f.name}</button>)}
      </div>
      <CopyButton text={file.code.trimEnd()} />
    </div>
    <pre id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${active}`} tabIndex={0}><code><Highlight code={file.code.trimEnd()} /></code></pre>
  </section>
}

export function InstallCommand({ pkg = '@videodb/robopeek-react' }: { pkg?: string }) {
  const [manager, setManager] = useState<'npm' | 'pnpm'>('npm')
  const command = `${manager} ${manager === 'npm' ? 'i' : 'add'} ${pkg}`
  return <div className="install-command">
    <div className="install-top"><div role="group" aria-label="Package manager">{(['npm', 'pnpm'] as const).map(m => <button type="button" key={m} aria-pressed={manager === m} onClick={() => setManager(m)}>{m}</button>)}</div><CopyButton text={command} label="Copy install command" /></div>
    <code><span aria-hidden="true">$</span> {command}</code>
  </div>
}
