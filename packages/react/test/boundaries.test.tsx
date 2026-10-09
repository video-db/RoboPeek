// Crossing a boundary (wrong data for the player, a format's part in another format's player) must fail with a
// message that says what to do instead.
import { Component, type ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { Player, steps, type Timeline } from '../src/core/index.ts'
import { EpisodePlayer, Flags } from '../src/rlds/index.ts'
import { McapPlayer, Topics } from '../src/mcap/index.ts'
import { makeEpisode } from './fixtures.ts'
import { makeRecording } from './mcap-fixtures.ts'

class Catch extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {}
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    return this.state.error ? <pre>{this.state.error.message}</pre> : this.props.children
  }
}

async function errorOf(node: ReactNode) {
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
  const screen = await render(<Catch>{node}</Catch>)
  await expect.poll(() => screen.container.querySelector('pre')).toBeTruthy()
  quiet.mockRestore()
  return screen.container.querySelector('pre')?.textContent ?? ''
}

describe('wrong data for Player.Root', () => {
  test('an RLDS Episode points to useEpisodeTimeline', async () => {
    const msg = await errorOf(<Player timeline={makeEpisode() as unknown as Timeline} />)
    expect(msg).toContain('got an RLDS Episode')
    expect(msg).toContain("import { useEpisodeTimeline } from '@videodb/robopeek-react/rlds'")
  })

  test('an MCAP Recording points to useMcapTimeline', async () => {
    const msg = await errorOf(<Player timeline={makeRecording() as unknown as Timeline} />)
    expect(msg).toContain('got an MCAP Recording')
    expect(msg).toContain("import { useMcapTimeline } from '@videodb/robopeek-react/mcap'")
  })

  test('anything else names the ways to build a Timeline', async () => {
    const msg = await errorOf(<Player timeline={{} as Timeline} />)
    expect(msg).toContain('needs a Timeline')
  })
})

describe("a format's part in another format's player", () => {
  test('<Flags> (RLDS) in an MCAP player', async () => {
    const msg = await errorOf(<McapPlayer recording={makeRecording()}><Flags /></McapPlayer>)
    expect(msg).toContain("<Flags> comes from '@videodb/robopeek-react/rlds'")
    expect(msg).toContain("shows a 'mcap' timeline")
  })

  test('<Topics> (MCAP) in an RLDS player', async () => {
    const msg = await errorOf(<EpisodePlayer episode={makeEpisode()}><Topics /></EpisodePlayer>)
    expect(msg).toContain("<Topics> comes from '@videodb/robopeek-react/mcap'")
    expect(msg).toContain("shows a 'rlds' timeline")
  })
})

test('the core player needs no format package: a hand-built timeline plays', async () => {
  const times = steps(5)
  const timeline: Timeline = {
    format: 'custom',
    unit: 'step',
    end: 4,
    images: {},
    vectors: { torque: { times, dim: 1, data: [0, 1, 2, 3, 4] } },
    text: { goal: { times, values: Array(5).fill('stack the cups') } },
    metadata: { robot: 'demo' },
  }
  const screen = await render(<Player timeline={timeline} />)
  await expect.element(screen.getByText('stack the cups')).toBeInTheDocument()
  await expect.element(screen.getByRole('heading', { name: 'torque' })).toBeInTheDocument()
  await expect.element(screen.getByText('demo')).toBeInTheDocument()
})
