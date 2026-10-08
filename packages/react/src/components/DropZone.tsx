import { useState, type ComponentPropsWithRef, type ReactNode } from 'react'
import { cx } from './cx.ts'

export type DropZoneProps = Omit<ComponentPropsWithRef<'div'>, 'onDrop'> & {
  onFile: (file: File) => void
  /** Overlay text while a file is dragged over. */
  label?: ReactNode
}

/** Accepts a dropped file anywhere inside; shows an overlay while dragging. */
export function DropZone({ onFile, label = 'Drop a TFRecord file to stream it', className, children, ...rest }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  return (
    <div
      className={cx('rlds-dropzone', className)}
      data-dragging={dragging || undefined}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false) }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) onFile(f)
      }}
      {...rest}
    >
      {children}
      {dragging && <div className="rlds-dropzone-overlay">{label}</div>}
    </div>
  )
}
