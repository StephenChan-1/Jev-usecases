import { db } from './db.ts'
import { isBuilderCase } from './jev.ts'
import type { CaseRecord, CaseSort, JevSummary } from './types.ts'

type CaseRow = {
  id: string
  url: string
  text: string
  summary: string
  created_at: string
  submitted_at: string
  community_likes: number
  author: CaseRecord['author']
  stats: CaseRecord['stats']
  media: CaseRecord['media']
  jev: JevSummary | null
}

function fail(message: string, status = 500): never {
  const missing = message.includes('PGRST205') || message.includes("Could not find the table")
  throw Object.assign(
    new Error(
      missing
        ? 'Supabase tables are missing. Run schema.sql in this project’s SQL editor, then restart.'
        : message,
    ),
    { status },
  )
}

function asRecord(row: CaseRow, liked: boolean): CaseRecord {
  return {
    id: row.id,
    url: row.url,
    text: row.text,
    summary: row.summary,
    createdAt: row.created_at,
    submittedAt: row.submitted_at,
    communityLikes: row.community_likes ?? 0,
    liked,
    author: row.author,
    stats: row.stats,
    media: row.media ?? [],
    jev: row.jev ?? undefined,
  }
}

function toRow(record: CaseRecord, likes: number): CaseRow {
  return {
    id: record.id,
    url: record.url,
    text: record.text,
    summary: record.summary,
    created_at: record.createdAt,
    submitted_at: record.submittedAt,
    community_likes: likes,
    author: record.author,
    stats: record.stats,
    media: record.media,
    jev: record.jev ?? null,
  }
}

async function likedIds(clientId?: string): Promise<Set<string>> {
  if (!clientId) return new Set()
  const { data, error } = await db()
    .from('case_votes')
    .select('case_id')
    .eq('client_id', clientId)
  if (error) fail(error.message)
  return new Set((data ?? []).map((row) => String(row.case_id)))
}

export async function listCases(
  sort: CaseSort = 'latest',
  clientId?: string,
): Promise<CaseRecord[]> {
  const query = db().from('cases').select('*')
  const ordered =
    sort === 'popular'
      ? query
          .order('community_likes', { ascending: false })
          .order('submitted_at', { ascending: false })
      : query.order('submitted_at', { ascending: false })

  const [{ data, error }, mine] = await Promise.all([ordered, likedIds(clientId)])
  if (error) fail(error.message)

  return ((data ?? []) as CaseRow[])
    .map((row) => asRecord(row, mine.has(row.id)))
    .filter((entry) => isBuilderCase(entry))
}

export async function getCase(
  id: string,
  clientId?: string,
): Promise<CaseRecord | null> {
  const [{ data, error }, mine] = await Promise.all([
    db().from('cases').select('*').eq('id', id).maybeSingle(),
    likedIds(clientId),
  ])
  if (error) fail(error.message)
  if (!data) return null
  return asRecord(data as CaseRow, mine.has(id))
}

export async function upsertCase(record: CaseRecord): Promise<CaseRecord> {
  const { data: existing, error: readError } = await db()
    .from('cases')
    .select('community_likes')
    .eq('id', record.id)
    .maybeSingle()
  if (readError) fail(readError.message)

  const likes = existing?.community_likes ?? record.communityLikes ?? 0
  const { error } = await db()
    .from('cases')
    .upsert(toRow(record, likes), { onConflict: 'id' })
  if (error) fail(error.message)

  const saved = await getCase(record.id)
  if (!saved) fail('Failed to save case.')
  return saved
}

export async function toggleLike(
  id: string,
  clientId: string,
): Promise<CaseRecord> {
  const current = await getCase(id, clientId)
  if (!current) fail('Case not found.', 404)

  if (current.liked) {
    const { error } = await db()
      .from('case_votes')
      .delete()
      .eq('client_id', clientId)
      .eq('case_id', id)
    if (error) fail(error.message)
  } else {
    const { error } = await db()
      .from('case_votes')
      .insert({ client_id: clientId, case_id: id })
    if (error) fail(error.message)
  }

  const { count, error: countError } = await db()
    .from('case_votes')
    .select('*', { count: 'exact', head: true })
    .eq('case_id', id)
  if (countError) fail(countError.message)

  const { error: updateError } = await db()
    .from('cases')
    .update({ community_likes: count ?? 0 })
    .eq('id', id)
  if (updateError) fail(updateError.message)

  const saved = await getCase(id, clientId)
  if (!saved) fail('Case not found.', 404)
  return saved
}
