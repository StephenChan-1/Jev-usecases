import { useEffect, useMemo, useState } from 'react'
import { likeCase, listCases } from '../api.ts'
import { DropBar } from '../components/DropBar.tsx'
import { TweetCard } from '../components/TweetCard.tsx'
import type { CaseRecord, CaseSort } from '../../server/types.ts'
import { CATEGORY, CATEGORY_FILTERS, label } from '../../server/taxonomy.ts'
import { cardSpans } from '../cardSpans.ts'

function caseCategory(record: CaseRecord): string {
  return record.jev?.category || record.jev?.domain || 'other'
}

export function HomePage() {
  const [cases, setCases] = useState<CaseRecord[] | null>(null)
  const [error, setError] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [sort, setSort] = useState<CaseSort>('latest')

  useEffect(() => {
    setCases(null)
    void listCases(sort)
      .then(setCases)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not load cases.')
        setCases([])
      })
  }, [sort])

  const visible = useMemo(() => {
    if (!cases) return []
    if (category === 'all') return cases
    return cases.filter((entry) => caseCategory(entry) === category)
  }, [cases, category])

  const spans = useMemo(
    () => cardSpans(visible.map((entry) => entry.id)),
    [visible],
  )

  function replaceCase(next: CaseRecord) {
    setCases((current) =>
      (current ?? []).map((entry) => (entry.id === next.id ? next : entry)),
    )
  }

  return (
    <>
      <div className="kicker">
        <span>Community cases</span>
        <span>{cases ? `${visible.length} of ${cases.length}` : 'loading'}</span>
      </div>
      <DropBar
        autoFocus
        onPosted={(record) =>
          setCases((current) => [
            record,
            ...(current ?? []).filter((entry) => entry.id !== record.id),
          ])
        }
      />
      <div className="toolbar">
        <div className="chips" role="tablist" aria-label="Business categories">
          <button
            className={category === 'all' ? 'on' : ''}
            onClick={() => setCategory('all')}
            type="button"
          >
            All
          </button>
          {CATEGORY_FILTERS.map((key) => (
            <button
              key={key}
              className={category === key ? 'on' : ''}
              onClick={() => setCategory(key)}
              type="button"
            >
              {label(CATEGORY, key)}
            </button>
          ))}
        </div>
        <div className="chips sort" role="tablist" aria-label="Sort">
          <button
            className={sort === 'latest' ? 'on' : ''}
            onClick={() => setSort('latest')}
            type="button"
          >
            Latest
          </button>
          <button
            className={sort === 'popular' ? 'on' : ''}
            onClick={() => setSort('popular')}
            type="button"
          >
            Popular
          </button>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {!cases ? (
        <p className="kicker">Loading cases…</p>
      ) : cases.length === 0 && !error ? (
        <div className="empty">
          <h2>Paste a Jev post from X.</h2>
          <p>Jev names the build. The card sends people back to the original post.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <h2>Nothing in {label(CATEGORY, category)} yet.</h2>
          <p>Drop a link in that category, or switch back to All.</p>
        </div>
      ) : (
        <div className="feed">
          {visible.map((record, index) => (
            <TweetCard
              key={record.id}
              record={record}
              span={spans[index] ?? 12}
              onLike={(id) => {
                void likeCase(id).then(replaceCase)
              }}
            />
          ))}
        </div>
      )}
    </>
  )
}
