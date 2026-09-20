import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { db } from './db.ts'
import type { CaseRecord } from './types.ts'
import { upsertCase } from './store.ts'

let seeded = false

export async function seedCases(): Promise<void> {
  if (seeded) return
  const { count, error } = await db()
    .from('cases')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  if ((count ?? 0) > 0) {
    seeded = true
    return
  }

  const file = path.resolve(process.cwd(), 'data/cases.json')
  const parsed = JSON.parse(await readFile(file, 'utf8')) as CaseRecord[]
  for (const record of parsed) {
    await upsertCase({ ...record, communityLikes: record.communityLikes ?? 0 })
  }
  seeded = true
  console.log(`[jev] seeded ${parsed.length} cases into Supabase`)
}
