import { describe, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { McapViewer, Player, usePlayer } from '../src/index.ts'
import { makeRecording, pngBytes } from './fixtures.ts'
import { ros2File } from '../../mcap/test/fixtures.ts'

const rec = makeRecording()

function TimeText() {
  return <span>t {usePlayer((s) => s.time).toFixed(2)}</span>
}

describe('time-based playback', () => {
  test('steps move along message times', async () => {
    const screen = await render(
      <Player.Root recording={rec} defaultTime={0.25}>
        <Player.StepBack />
        <Player.StepForward />
        <TimeText />
      </Player.Root>,
    )
    await screen.getByRole('button', { name: 'Next frame' }).click()
    await expect.element(screen.getByText('t 0.30')).toBeInTheDocument()
    await screen.getByRole('button', { name: 'Previous frame' }).click()
    await expect.element(screen.getByText('t 0.20')).toBeInTheDocument()
  })

  test('between frames, one step back lands on the frame being shown', async () => {
    const screen = await render(
      <Player.Root recording={rec} defaultTime={0.25}>
        <Player.StepBack />
        <TimeText />
      </Player.Root>,
    )
    await screen.getByRole('button', { name: 'Previous frame' }).click()
    await expect.element(screen.getByText('t 0.20')).toBeInTheDocument()
  })

  test('plays in real time and stops at the end', async () => {
    const onEnd = vi.fn()
    const screen = await render(
      <Player.Root recording={rec} defaultTime={1.7} defaultSpeed={2} onPlayingChange={onEnd}>
        <Player.Play />
        <TimeText />
      </Player.Root>,
    )
    await screen.getByRole('button', { name: 'Play' }).click()
    await expect.element(screen.getByText('t 1.90')).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    expect(onEnd).toHaveBeenLastCalledWith(false)
  })

  test('controlled time reports changes but only moves when the prop does', async () => {
    const onTimeChange = vi.fn()
    const screen = await render(
      <Player.Root recording={rec} time={0.5} onTimeChange={onTimeChange}>
        <Player.StepForward />
        <TimeText />
      </Player.Root>,
    )
    await screen.getByRole('button', { name: 'Next frame' }).click()
    expect(onTimeChange).toHaveBeenCalledWith(0.6)
    await expect.element(screen.getByText('t 0.50')).toBeInTheDocument()
  })

  test('hotkeys: arrows step, Shift jumps 10, End goes to the end', async () => {
    const screen = await render(
      <Player.Root recording={rec} data-testid="root">
        <TimeText />
      </Player.Root>,
    )
    ;(screen.getByTestId('root').element() as HTMLElement).focus()
    await userEvent.keyboard('{ArrowRight}{Shift>}{ArrowRight}{/Shift}')
    await expect.element(screen.getByText('t 1.10')).toBeInTheDocument()
    await userEvent.keyboard('{End}')
    await expect.element(screen.getByText('t 1.90')).toBeInTheDocument()
  })
})

describe('default layout', () => {
  test('instruction, counter, one chart per field group, and the topic list', async () => {
    const screen = await render(<Player recording={rec} />)
    await expect.element(screen.getByText('task', { exact: true })).toBeInTheDocument()
    await expect.element(screen.getByText(/^0:00\.00/)).toBeInTheDocument()
    await expect.element(screen.getByRole('heading', { name: '/state' })).toBeInTheDocument()
    await expect.element(screen.getByRole('heading', { name: 'Topics' })).toBeInTheDocument()
    await expect.element(screen.getByText('No camera topics in this recording.')).toBeInTheDocument()
  })
})

describe('McapViewer', () => {
  test('loads a ROS 2 file and draws its camera', async () => {
    const file = new File([await ros2File({ frame: await pngBytes() })], 'demo.mcap')
    const screen = await render(<div style={{ height: 800 }}><McapViewer source={file} /></div>)
    await expect.element(screen.getByText('demo.mcap')).toBeInTheDocument()
    await expect.element(screen.getByText('pick up the cup')).toBeInTheDocument()
    await expect.element(screen.getByText('4×4 · png')).toBeInTheDocument()
    await expect.element(screen.getByRole('heading', { name: '/joint_states/position' })).toBeInTheDocument()
  })

  test('null source shows `empty`', async () => {
    const screen = await render(<McapViewer source={null} empty={<p>pick a file</p>} />)
    await expect.element(screen.getByText('pick a file')).toBeInTheDocument()
  })
})
