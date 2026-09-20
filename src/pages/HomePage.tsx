import { useEffect, useMemo, useState } from 'react'
import { likeCase, listCases } from '../api.ts'
import { DropBar } from '../components/DropBar.tsx'
import { TweetCard } from '../components/TweetCard.tsx'
import type { CaseRecord, CaseSort } from '../../server/types.ts'
import { CATEGORY, CATEGORY_FILTERS, JOB, TITLE, label } from '../../server/taxonomy.ts'

function caseCategory(record: CaseRecord): string {
  return record.jev?.category || record.jev?.domain || 'other'
}

function matchesQuery(record: CaseRecord, query: string): boolean {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return true
  const jev = record.jev
  const haystack = [
    record.summary,
    record.text,
    record.author.name,
    record.author.handle,
    label(CATEGORY, jev?.category || jev?.domain, ''),
    label(JOB, jev?.job, ''),
    label(TITLE, jev?.title, ''),
    jev?.job,
    jev?.category,
    jev?.title,
  ]
    .join(' ')
    .toLowerCase()
  return terms.every((term) => haystack.includes(term))
}

export function HomePage() {
  const [cases, setCases] = useState<CaseRecord[] | null>(null)
  const [error, setError] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [sort, setSort] = useState<CaseSort>('latest')
  const [query, setQuery] = useState('')

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
    return cases.filter((entry) => {
      if (category !== 'all' && caseCategory(entry) !== category) return false
      return matchesQuery(entry, query)
    })
  }, [cases, category, query])

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
        <label className="find">
          <span className="sr-only">Search cases</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search topics, keywords"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
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
      <div className="chips categories" role="tablist" aria-label="Business categories">
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
          <h2>
            {query.trim()
              ? `No matches for “${query.trim()}”.`
              : `Nothing in ${label(CATEGORY, category)} yet.`}
          </h2>
          <p>
            {query.trim()
              ? 'Try another keyword, or clear search to see the full feed.'
              : 'Drop a link in that category, or switch back to All.'}
          </p>
        </div>
      ) : (
        <div className="feed">
          {visible.map((record) => (
            <TweetCard
              key={record.id}
              record={record}
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
