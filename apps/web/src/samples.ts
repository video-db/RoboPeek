import type { Source } from '@videodb/robopeek-react'

export type Sample = {
  id: string; dataset: string; file: string; size: string; notes: string
  category: string; image?: string; episodes?: number; where: 'local' | 'remote'; url: string
}
const local = (name: string) => new URL(`/samples/${name}.tfrecord`, location.origin).href

// Complete, unmodified records from the demo's original shards. See public/samples/manifest.json.
export const SAMPLES: Sample[] = [
  { id: 'navigation', dataset: 'Berkeley navigation', file: 'navigation.tfrecord', size: '0.7 MB', notes: '3 episodes · position & yaw', category: 'Navigation', image: '/previews/navigation.png', episodes: 3, where: 'local', url: local('navigation') },
  { id: 'furniture', dataset: 'Furniture Bench', file: 'furniture.tfrecord', size: '13.5 MB', notes: '1 episode · 2 camera views', category: 'Assembly', image: '/previews/furniture-camera-2.jpg', episodes: 1, where: 'local', url: local('furniture') },
  { id: 'pusht', dataset: 'Push-T', file: 'pusht.tfrecord', size: '30.8 MB', notes: '1 episode · scene & wrist views', category: 'Manipulation', image: '/previews/pusht.png', episodes: 1, where: 'local', url: local('pusht') },
  { id: 'drone', dataset: 'CognitiveDrone', file: 'cognitive_drone-train.tfrecord-00005-of-00128', size: '82 MB', notes: 'Remote shard · simulated flight', category: 'Aerial robotics', where: 'remote', url: 'https://huggingface.co/datasets/ArtemLykov/CognitiveDrone_dataset/resolve/main/data/rlds/train/cognitive_drone-train.tfrecord-00005-of-00128' },
]
export type Input = { source: Source; label: string; detail: string; key: string }
export const sampleInput = (s: Sample): Input => ({ source: s.url, label: s.dataset, detail: `${s.size} · ${s.notes}`, key: s.id })
export const fileInput = (f: File): Input => ({ source: f, label: f.name, detail: `Local file · ${(f.size / 1e6).toFixed(1)} MB`, key: `file:${f.name}:${f.size}:${f.lastModified}` })
