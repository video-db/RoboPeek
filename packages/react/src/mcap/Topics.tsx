import type { ComponentPropsWithRef, ReactNode } from 'react'
import type { Recording, TopicInfo } from '@videodb/robopeek-mcap'
import { cx, usePlayer, useFormatSource, type Include } from '../core/index.ts'

export type TopicsProps = Omit<ComponentPropsWithRef<'section'>, 'children' | 'title'> & {
  include?: Include
  renderItem?: (info: TopicInfo, fallback: ReactNode) => ReactNode
  title?: ReactNode
}

const included = (key: string, include?: Include) => !include || (Array.isArray(include) ? include.includes(key) : include(key))

/** Every topic in the file with its schema, message count and how it is shown (or why it isn't). MCAP players only. */
export function Topics({ include, renderItem, title = 'Topics', className, ...rest }: TopicsProps) {
  const recording = useFormatSource<Recording>('mcap', 'Topics')
  usePlayer((s) => s.version)
  const list = [...recording.topics.values()].filter((t) => included(t.topic, include))
  if (!list.length) return null
  return (
    <section className={cx('rp-metadata', 'rp-topics', className)} {...rest}>
      <h3>{title}</h3>
      <dl>
        {list.map((t) => {
          const fallback = (
            <div key={t.topic} data-kind={t.kind}>
              <dt>{t.topic}</dt>
              <dd className="rp-mono">
                {t.schema || t.encoding} · {t.count.toLocaleString()} msgs · {t.kind === 'other' ? 'not shown' : t.kind ?? '…'}
                {t.error && <span data-tone="error"> · {t.error}</span>}
              </dd>
            </div>
          )
          return renderItem ? <Keyed key={t.topic}>{renderItem(t, fallback)}</Keyed> : fallback
        })}
      </dl>
    </section>
  )
}

const Keyed = ({ children }: { children: ReactNode }) => <>{children}</>
