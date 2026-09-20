import { useState, type FormEvent } from 'react'
import { ingestCase } from '../api.ts'
import type { CaseRecord } from '../../server/types.ts'

export function DropBar({
  autoFocus = false,
  onPosted,
}: {
  autoFocus?: boolean
  onPosted?: (record: CaseRecord) => void
}) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const saved = await ingestCase(url)
      setUrl('')
      onPosted?.(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that link.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <form className="drop" onSubmit={(event) => void onSubmit(event)}>
        <input
          autoFocus={autoFocus}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Paste an x.com/status/… link to a Jev build"
          aria-label="X post URL"
          inputMode="url"
          autoComplete="url"
        />
        <button disabled={busy || !url.trim()} type="submit">
          {busy ? 'Summarising…' : 'Add to feed'}
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </>
  )
}
