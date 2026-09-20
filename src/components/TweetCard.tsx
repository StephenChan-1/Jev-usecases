import type { CaseRecord } from '../../server/types.ts'
import { CATEGORY, JOB, TITLE, label } from '../../server/taxonomy.ts'
import { compactNumber, relativeTime } from '../format.ts'

export function TweetCard({
  record,
  span,
  onLike,
}: {
  record: CaseRecord
  span: number
  onLike: (id: string) => void
}) {
  const excerpt = record.text.replace(/\s+/g, ' ').trim()
  const photo = record.media.find((item) => item.type === 'photo') ?? record.media[0]
  const jev = record.jev
  const headline =
    (jev?.title && jev.title !== 'other' ? label(TITLE, jev.title, '') : '') ||
    record.summary ||
    excerpt

  return (
    <article className={`card span-${span}`}>
      <a className="card-body" href={record.url} target="_blank" rel="noreferrer">
        <div className="tags">
          <span>{label(CATEGORY, jev?.category || jev?.domain, 'Category')}</span>
          <span>{label(JOB, jev?.job, 'Job')}</span>
        </div>
        <p className="summary">{headline}</p>
        <div className="who">
          {record.author.avatar ? <img src={record.author.avatar} alt="" /> : <span />}
          <div>
            <strong>
              {record.author.name}
              {record.author.verified ? ' ✓' : ''}
            </strong>
            <small>@{record.author.handle}</small>
          </div>
          <time dateTime={record.createdAt}>{relativeTime(record.createdAt)}</time>
        </div>
        {excerpt ? <p className="text">{excerpt}</p> : null}
        {photo ? (
          <div className="media">
            <img src={photo.type === 'photo' ? photo.url : photo.poster || photo.url} alt="" />
          </div>
        ) : null}
      </a>
      <div className="stats">
        <button
          className={record.liked ? 'like on' : 'like'}
          type="button"
          onClick={() => onLike(record.id)}
          aria-pressed={Boolean(record.liked)}
        >
          {record.liked ? 'Liked' : 'Like'} · {compactNumber(record.communityLikes)}
        </button>
        <a href={record.url} target="_blank" rel="noreferrer">
          Open on X →
        </a>
      </div>
    </article>
  )
}
