import type { Source } from '@videodb/robopeek-rlds'

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

export type McapSample = { id: string; dataset: string; size: string; notes: string; category: string; image: string; url: string }
const HF = 'https://huggingface.co/datasets'
// Public recordings covering what the MCAP reader handles: H.264 video, JPEG + 16-bit depth, a ROS 2 bag, and a 1.3 GB file.
export const MCAP_SAMPLES: McapSample[] = [
  { id: 'gr00t', dataset: 'GR00T sim', size: '3 MB', notes: '3 cameras · H.264 video', category: 'Simulation', image: '/previews/mcap-gr00t.jpg', url: `${HF}/Voxel51/GR00T-X-Embodiment-Sim/resolve/main/data/bimanual_panda_gripper.Transport/episode_000000/episode.fo.mcap` },
  { id: 'robomind', dataset: 'RoboMIND Franka', size: '74 MB', notes: '3 cameras + 16-bit depth', category: 'Manipulation', image: '/previews/mcap-robomind.jpg', url: `${HF}/Voxel51/RoboMIND/resolve/main/data/franka/1022_111755/episode.fo.mcap` },
  { id: 'robotis', dataset: 'ROBOTIS AI Worker', size: '43 MB', notes: 'ROS 2 bag · joint states', category: 'Mobile manipulation', image: '/previews/mcap-robotis.jpg', url: `${HF}/RobotisSW/rosbag_test4/resolve/main/0_0.mcap` },
  { id: 'ikea', dataset: 'Humanoid IKEA assembly', size: '1.3 GB', notes: '7 cameras · streams under a memory budget', category: 'Humanoid', image: '/previews/mcap-ikea.jpg', url: `${HF}/Voxel51/2026-Humanoid-IKEA-Assembly-Challenge/resolve/main/data/episode_2026-05-14_13-10-27/episode.fo.mcap` },
]
