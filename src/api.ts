import type { CaseRecord, CaseSort } from '../server/types.ts'
import { clientId } from './clientId.ts'

async function parse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
  } & T
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`)
  }
  return payload
}

export async function listCases(sort: CaseSort = 'latest'): Promise<CaseRecord[]> {
  const query = new URLSearchParams({ sort, clientId: clientId() })
  const payload = await parse<{ cases: CaseRecord[] }>(
    await fetch(`/api/cases?${query}`),
  )
  return payload.cases
}

export async function getCase(id: string): Promise<CaseRecord> {
  const query = new URLSearchParams({ clientId: clientId() })
  const payload = await parse<{ case: CaseRecord }>(
    await fetch(`/api/cases/${id}?${query}`),
  )
  return payload.case
}

export async function ingestCase(url: string): Promise<CaseRecord> {
  const payload = await parse<{ case: CaseRecord }>(
    await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }),
  )
  return payload.case
}

export async function likeCase(id: string): Promise<CaseRecord> {
  const payload = await parse<{ case: CaseRecord }>(
    await fetch(`/api/cases/${id}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: clientId() }),
    }),
  )
  return payload.case
}
