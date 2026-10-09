import { useRef, useState } from 'react'
import type { Source } from '@videodb/robopeek-mcap'
import { McapViewer } from '@videodb/robopeek-react/mcap'
import { DropTarget } from './DropTarget.tsx'

const HF = 'https://huggingface.co/datasets'
// Public recordings covering the formats the reader handles: H.264 video, JPEG + PNG depth, ROS 2 CDR, and a 1.3 GB file.
const SAMPLES = [
  { label: 'GR00T sim · H.264 video · 3 MB', url: `${HF}/Voxel51/GR00T-X-Embodiment-Sim/resolve/main/data/bimanual_panda_gripper.Transport/episode_000000/episode.fo.mcap` },
  { label: 'RoboMIND Franka · JPEG + depth · 74 MB', url: `${HF}/Voxel51/RoboMIND/resolve/main/data/franka/1022_111755/episode.fo.mcap` },
  { label: 'ROBOTIS AI Worker · ROS 2 bag · 43 MB', url: `${HF}/RobotisSW/rosbag_test4/resolve/main/0_0.mcap` },
  { label: 'Humanoid IKEA assembly · 7 cameras · 1.3 GB', url: `${HF}/Voxel51/2026-Humanoid-IKEA-Assembly-Challenge/resolve/main/data/episode_2026-05-14_13-10-27/episode.fo.mcap` },
]

export default function McapApp() {
  const [source, setSource] = useState<Source | null>(() => new URLSearchParams(location.search).get('url'))
  const [url, setUrl] = useState(typeof source === 'string' ? source : '')
  const fileRef = useRef<HTMLInputElement>(null)
  // ?budget=<MB> caps frame memory, to exercise release-and-refetch on smaller files.
  const budget = Number(new URLSearchParams(location.search).get('budget')) * 1e6 || undefined
  const open = (src: Source) => {
    setSource(src)
    if (typeof src === 'string') setUrl(src)
    history.replaceState(null, '', typeof src === 'string' ? `?url=${encodeURIComponent(src)}${budget ? `&budget=${budget / 1e6}` : ''}` : location.pathname)
  }

  return (
    <DropTarget className="mcap-app" onFile={open}>
      <form className="mcap-source" onSubmit={(e) => { e.preventDefault(); if (url.trim()) open(url.trim()) }}>
        <strong>MCAP</strong>
        <input type="url" aria-label="MCAP URL" placeholder="Paste an .mcap URL" spellCheck={false} value={url} onChange={(e) => setUrl(e.target.value)} />
        <button type="submit" disabled={!url.trim()}>Open</button>
        <button type="button" onClick={() => fileRef.current?.click()}>Open file</button>
        <input ref={fileRef} type="file" accept=".mcap" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) open(f); e.target.value = '' }} />
      </form>
      <McapViewer
        source={source}
        maxFrameBytes={budget}
        autoFocus
        empty={
          <div className="mcap-empty">
            <p>Open or drop an .mcap file, or try a public recording:</p>
            <ul>{SAMPLES.map((s) => <li key={s.url}><button type="button" onClick={() => open(s.url)}>{s.label}</button></li>)}</ul>
          </div>
        }
      />
    </DropTarget>
  )
}
