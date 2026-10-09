import { describe, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { Player, usePlayer } from '../src/core/index.ts'
import { McapPlayer, McapViewer } from '../src/mcap/index.ts'
import { makeRecording, pngBytes } from './mcap-fixtures.ts'
import { ros2File } from '../../mcap/test/fixtures.ts'

const rec = makeRecording()

function TimeText() {
  return <span>t {usePlayer((s) => s.position).toFixed(2)}</span>
}

describe('time-based playback', () => {
  test('steps move along message times', async () => {
    const screen = await render(
      <McapPlayer recording={rec} defaultPosition={0.25}>
        <Player.StepBack />
        <Player.StepForward />
        <TimeText />
      </McapPlayer>,
    )
    await screen.getByRole('button', { name: 'Next frame' }).click()
    await expect.element(screen.getByText('t 0.30')).toBeInTheDocument()
    await screen.getByRole('button', { name: 'Previous frame' }).click()
    await expect.element(screen.getByText('t 0.20')).toBeInTheDocument()
  })

  test('between frames, one step back lands on the frame being shown', async () => {
    const screen = await render(
      <McapPlayer recording={rec} defaultPosition={0.25}>
        <Player.StepBack />
        <TimeText />
      </McapPlayer>,
    )
    await screen.getByRole('button', { name: 'Previous frame' }).click()
    await expect.element(screen.getByText('t 0.20')).toBeInTheDocument()
  })

  test('plays in real time and stops at the end', async () => {
    const onEnd = vi.fn()
    const screen = await render(
      <McapPlayer recording={rec} defaultPosition={1.7} defaultRate={2} onPlayingChange={onEnd}>
        <Player.Play />
        <TimeText />
      </McapPlayer>,
    )
    await screen.getByRole('button', { name: 'Play' }).click()
    await expect.element(screen.getByText('t 1.90')).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    expect(onEnd).toHaveBeenLastCalledWith(false)
  })

  test('controlled time reports changes but only moves when the prop does', async () => {
    const onPositionChange = vi.fn()
    const screen = await render(
      <McapPlayer recording={rec} position={0.5} onPositionChange={onPositionChange}>
        <Player.StepForward />
        <TimeText />
      </McapPlayer>,
    )
    await screen.getByRole('button', { name: 'Next frame' }).click()
    expect(onPositionChange).toHaveBeenCalledWith(0.6)
    await expect.element(screen.getByText('t 0.50')).toBeInTheDocument()
  })

  test('hotkeys: arrows step, Shift jumps 10, End goes to the end', async () => {
    const screen = await render(
      <McapPlayer recording={rec} data-testid="root">
        <TimeText />
      </McapPlayer>,
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
    const screen = await render(<McapPlayer recording={rec} />)
    await expect.element(screen.getByText('task', { exact: true })).toBeInTheDocument()
    await expect.element(screen.getByText(/^0:00\.00/)).toBeInTheDocument()
    await expect.element(screen.getByRole('heading', { name: '/state' })).toBeInTheDocument()
    await expect.element(screen.getByRole('heading', { name: 'Topics' })).toBeInTheDocument()
    await expect.element(screen.getByText('No camera views in this recording.')).toBeInTheDocument()
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
