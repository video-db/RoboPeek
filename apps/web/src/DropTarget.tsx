import { useState, type ReactNode } from 'react'
import { Icon } from './ui.tsx'

/** Accepts a dropped file anywhere inside; shows an overlay while dragging. */
export function DropTarget({ onFile, className, label = 'TFRecord', children }: { onFile: (f: File) => void; className?: string; label?: string; children: ReactNode }) {
  const [dragging, setDragging] = useState(false)
  return (
    <div className={className}
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true) } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false) }}
      onDragEnd={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) onFile(f)
      }}
    >
      {children}
      {dragging && <div className="drop-overlay"><div><Icon name="upload" /><strong>Drop your {label} file</strong><span>Release to open it in the viewer</span></div></div>}
    </div>
  )
}
