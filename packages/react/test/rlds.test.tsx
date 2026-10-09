import { useMemo, useRef, useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { Player, usePlayer, usePlayButton } from '../src/core/index.ts'
import { EpisodePlayer } from '../src/rlds/index.ts'
import { makeEpisode } from './fixtures.ts'

const ep = makeEpisode()

function StepText() {
  return <span>step {usePlayer((s) => s.position)}</span>
}

describe('controlled vs uncontrolled', () => {
  test('uncontrolled step starts at defaultPosition and moves', async () => {
    const screen = await render(
      <EpisodePlayer episode={ep} defaultPosition={2}>
        <Player.StepForward />
        <StepText />
      </EpisodePlayer>,
    )
    await expect.element(screen.getByText('step 2')).toBeInTheDocument()
    await screen.getByRole('button', { name: 'Next step' }).click()
    await expect.element(screen.getByText('step 3')).toBeInTheDocument()
  })

  test('controlled step reports changes but only moves when the prop does', async () => {
    const onPositionChange = vi.fn()
    const screen = await render(
      <EpisodePlayer episode={ep} position={5} onPositionChange={onPositionChange}>
        <Player.StepForward />
        <StepText />
      </EpisodePlayer>,
    )
    await screen.getByRole('button', { name: 'Next step' }).click()
    expect(onPositionChange).toHaveBeenCalledWith(6)
    await expect.element(screen.getByText('step 5')).toBeInTheDocument()
  })

  test('new episode resets uncontrolled step', async () => {
    const screen = await render(
      <EpisodePlayer episode={ep} defaultPosition={4}>
        <StepText />
      </EpisodePlayer>,
    )
    await screen.rerender(
      <EpisodePlayer episode={makeEpisode(1)} defaultPosition={0}>
        <StepText />
      </EpisodePlayer>,
    )
    await expect.element(screen.getByText('step 0')).toBeInTheDocument()
  })
})

describe('hotkeys', () => {
  test('only act while focus is inside the player', async () => {
    const screen = await render(
      <>
        <button>outside</button>
        <EpisodePlayer episode={ep} data-testid="root">
          <StepText />
        </EpisodePlayer>
      </>,
    )
    screen.getByRole('button', { name: 'outside' }).element().focus()
    await userEvent.keyboard('{ArrowRight}')
    await expect.element(screen.getByText('step 0')).toBeInTheDocument()

    ;(screen.getByTestId('root').element() as HTMLElement).focus()
    await userEvent.keyboard('{ArrowRight}{Shift>}{ArrowRight}{/Shift}')
    await expect.element(screen.getByText('step 9')).toBeInTheDocument()
  })

  test('hotkeys={false} disables them', async () => {
    const screen = await render(
      <EpisodePlayer episode={ep} hotkeys={false} data-testid="root" tabIndex={-1}>
        <StepText />
      </EpisodePlayer>,
    )
    ;(screen.getByTestId('root').element() as HTMLElement).focus()
    await userEvent.keyboard('{ArrowRight}')
    await expect.element(screen.getByText('step 0')).toBeInTheDocument()
  })
})

describe('per-part hooks and slots', () => {
  test('usePlayButton drives a custom element', async () => {
    function MyPlay() {
      const { playing, buttonProps } = usePlayButton()
      return <button {...buttonProps}>{playing ? 'Stop it' : 'Go'}</button>
    }
    const screen = await render(
      <EpisodePlayer episode={ep}>
        <Player.Transport>
          <MyPlay />
        </Player.Transport>
      </EpisodePlayer>,
    )
    await screen.getByRole('button', { name: 'Play' }).click()
    await expect.element(screen.getByRole('button', { name: 'Pause' })).toHaveTextContent('Stop it')
  })

  test('episode buttons are disabled without handlers', async () => {
    const screen = await render(
      <EpisodePlayer episode={ep} onNextEpisode={() => {}}>
        <Player.PrevEpisode />
        <Player.NextEpisode />
      </EpisodePlayer>,
    )
    await expect.element(screen.getByRole('button', { name: 'Previous episode' })).toBeDisabled()
    await expect.element(screen.getByRole('button', { name: 'Next episode' })).toBeEnabled()
  })

  test('renderItem receives the built-in element as fallback', async () => {
    const screen = await render(
      <EpisodePlayer episode={ep}>
        <Player.Tracks renderItem={(key, _t, fallback) => (key === 'action' ? <p>custom action</p> : fallback)} />
        <Player.Metadata renderItem={(key, _f, fallback) => (key.endsWith('file_path') ? fallback : null)} />
      </EpisodePlayer>,
    )
    await expect.element(screen.getByText('custom action')).toBeInTheDocument()
    await expect.element(screen.getByRole('heading', { name: 'observation/state' })).toBeInTheDocument()
    await expect.element(screen.getByText('ep0.npz')).toBeInTheDocument()
  })
})

describe('selectors', () => {
  test('a component selecting only the timeline does not re-render on step changes', async () => {
    const renders = { episode: 0, step: 0 }
    function EpisodeOnly() {
      usePlayer((s) => s.timeline)
      renders.episode++
      return null
    }
    function StepReader() {
      const step = usePlayer((s) => s.position)
      renders.step++
      return <span>step {step}</span>
    }
    function Harness() {
      const ref = useRef(null)
      return (
        <EpisodePlayer episode={ep} ref={ref}>
          <EpisodeOnly />
          <StepReader />
          <Player.StepForward />
        </EpisodePlayer>
      )
    }
    const screen = await render(<Harness />)
    const before = { ...renders }
    for (let i = 0; i < 3; i++) await screen.getByRole('button', { name: 'Next step' }).click()
    await expect.element(screen.getByText('step 3')).toBeInTheDocument()
    expect(renders.episode).toBe(before.episode)
    expect(renders.step).toBeGreaterThanOrEqual(before.step + 3)
  })
})

describe('auto-next', () => {
  function Shard({ lengths }: { lengths: number[] }) {
    const [n, setN] = useState(0)
    return (
      <EpisodePlayer
        episode={useMemo(() => makeEpisode(n, lengths[n]), [n, lengths])}
        defaultAutoNext
        defaultRate={60}
        onNextEpisode={n < lengths.length - 1 ? () => setN(n + 1) : undefined}
      >
        <Player.Play />
        <span>ep {n}</span>
        <StepText />
      </EpisodePlayer>
    )
  }

  test.each([
    ['same length', [10, 10]],
    ['different length', [10, 12]],
  ])('keeps playing into the next episode (%s)', async (_, lengths) => {
    const screen = await render(<Shard lengths={lengths} />)
    await screen.getByRole('button', { name: 'Play' }).click()
    await expect.element(screen.getByText('ep 1')).toBeInTheDocument()
    await expect.element(screen.getByText(`step ${lengths[1] - 1}`)).toBeInTheDocument()
  })
})
