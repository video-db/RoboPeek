export const SAMPLE_URL =
  'https://huggingface.co/datasets/ArtemLykov/CognitiveDrone_dataset/resolve/main/data/rlds/train/cognitive_drone-train.tfrecord-00005-of-00128'

export function Brand({ sub }: { sub: string }) {
  return (
    <div className="brand">
      <strong>RoboPeek</strong>
      <span>{sub}</span>
    </div>
  )
}
