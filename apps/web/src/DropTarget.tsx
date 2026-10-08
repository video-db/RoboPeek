import { useState, type ReactNode } from 'react'

/** Accepts a dropped file anywhere inside; shows an overlay while dragging. */
export function DropTarget({ onFile, className, children }: { onFile: (f: File) => void; className?: string; children: ReactNode }) {
  const [dragging, setDragging] = useState(false)
  return (
    <div
      className={className}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false) }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) onFile(f)
      }}
    >
      {children}
      {dragging && <div className="drop-overlay">Drop a TFRecord file to stream it</div>}
    </div>
  )
}
