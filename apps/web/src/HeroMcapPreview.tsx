import { useEffect, useRef } from 'react'
import { formatTime } from '@videodb/robopeek-react'
import { useMcapTimeline, useRecording } from '@videodb/robopeek-react/mcap'
import { MCAP_SAMPLES } from './samples.ts'
import { Icon } from './ui.tsx'

const SAMPLE = MCAP_SAMPLES[0]
// Scene camera and one wrist camera; a frame a little into the task, where both arms are moving.
const SCENE = '/front-view-camera'
const WRIST = '/left-wrist-view-camera'
const AT = 0.4

/** The hero card for MCAP: frames drawn live from the GR00T recording (3 MB), nothing stored in the site. */
export function HeroMcapPreview({ onPlay }: { onPlay: () => void }) {
  const { recording, status } = useRecording(SAMPLE.url)
  const timeline = useMcapTimeline(recording)
  const done = status.phase === 'done'
  const cameras = recording ? Object.keys(recording.images).length : 3
  return <>
    <div className="hero-camera">
      {timeline && done ? <Camera timeline={timeline} topic={SCENE} /> : <div className="hero-camera-wait">{status.phase === 'error' ? status.error : `Loading ${SAMPLE.dataset} from Hugging Face · ${SAMPLE.size}`}</div>}
      <span className="camera-label"><span className="status-dot" />Scene camera</span>
      {timeline && done && <div className="inset-camera"><Camera timeline={timeline} topic={WRIST} /><span>Wrist camera</span></div>}
    </div>
    <div className="hero-preview-info"><div><strong>{SAMPLE.dataset}</strong><span>{cameras} cameras<span>·</span>{recording && done ? formatTime(recording.length) : '…'}<span>·</span>H.264 video</span></div><button type="button" aria-label={`Preview the ${SAMPLE.dataset} recording`} onClick={onPlay}><Icon name="play" /></button></div>
    <div className="hero-preview-caption"><span>Real messages. Straight from the recording.</span><Icon name="arrow" /></div>
  </>
}

function Camera({ timeline, topic }: { timeline: NonNullable<ReturnType<typeof useMcapTimeline>>; topic: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const track = timeline.images[topic]
    if (!track?.times.length) return
    let cancelled = false
    track.load(Math.floor(track.times.length * AT)).then((source) => {
      const canvas = ref.current
      if (cancelled || !source || !canvas) return
      const image = source as ImageBitmap | VideoFrame // what the MCAP adapter returns
      canvas.width = 'displayWidth' in image ? image.displayWidth : image.width
      canvas.height = 'displayHeight' in image ? image.displayHeight : image.height
      canvas.getContext('2d')!.drawImage(image, 0, 0)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [timeline, topic])
  return <canvas ref={ref} role="img" aria-label={`${topic} from the ${SAMPLE.dataset} recording`} />
}
