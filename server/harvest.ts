import { readFileSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { configureDb } from './db.ts'
import { isBuilderCase, summarizeWithJev } from './jev.ts'
import { decodeTweet } from './scrape.ts'
import { getCase, listCases, upsertCase } from './store.ts'
import type { ApiKeys, CaseRecord } from './types.ts'

const STATUS_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/(?:[A-Za-z0-9_]+|i\/web)\/status\/(\d+)/i

const HANDLES = [
  'MichaelLee04',
  'moritzkremb',
  'kylejeong',
  'dabit3',
  'brainstormity',
  'robj3d3',
  'hackgoofer',
  'typesafeai',
]

const QUERIES = [
  'Jev typesafe "I built" site:x.com',
  'Jev typesafe "we built" site:x.com',
  'Jev typesafe demo site:x.com',
  'Jev "using Jev" site:x.com',
  'Jev Stagehand site:x.com',
  'Jev classifier site:x.com',
  'Jev routing site:x.com',
  'Jev doomscroll site:x.com',
  '"typesafeai" Jev built site:x.com',
  'Jev browser use site:x.com',
]

function loadEnv(): ApiKeys & { scrape: string; typesafe: string } {
  const raw = readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8')
  const env: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    if (!line.includes('=') || line.trim().startsWith('#')) continue
    const at = line.indexOf('=')
    env[line.slice(0, at).trim()] = line.slice(at + 1).trim().replace(/^['"]|['"]$/g, '')
  }
  const scrape = env.SCRAPE_CREATORS_API_KEY || env.SCRAPECREATORS_API_KEY || ''
  const typesafe = env.TYPESAFE_API_KEY || env.JEV_API_KEY || ''
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseService = env.SUPABASE_SERVICE_ROLE_KEY
  if (!scrape || !typesafe || !supabaseUrl || !supabaseService) {
    throw new Error('Missing scrape, Jev, or Supabase keys in .env.local')
  }
  return { scrape, typesafe, supabaseUrl, supabaseService }
}

async function scrapeGet(apiKey: string, pathname: string, params: Record<string, string>) {
  const url = new URL(`https://api.scrapecreators.com${pathname}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const response = await fetch(url, {
    headers: { 'x-api-key': apiKey },
    signal: AbortSignal.timeout(12_000),
  })
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' ? payload.error : `ScrapeCreators ${response.status}`,
    )
  }
  return payload ?? {}
}

function collectStatusUrls(value: unknown, into: Map<string, string>): void {
  if (typeof value === 'string') {
    const match = value.match(STATUS_RE)
    if (match?.[1]) {
      const id = match[1]
      if (!into.has(id)) into.set(id, `https://x.com/i/web/status/${id}`)
    }
    return
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectStatusUrls(entry, into)
    return
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const id =
      (typeof record.rest_id === 'string' && record.rest_id) ||
      (typeof record.id_str === 'string' && record.id_str) ||
      (typeof record.id === 'string' && /^\d{5,}$/.test(record.id) ? record.id : '')
    const text =
      (typeof record.full_text === 'string' && record.full_text) ||
      (typeof record.text === 'string' && record.text) ||
      ''
    if (id && /jev|typesafe/i.test(text)) {
      if (!into.has(id)) into.set(id, `https://x.com/i/web/status/${id}`)
    }
    for (const child of Object.values(record)) collectStatusUrls(child, into)
  }
}

function looksLikeBuild(text: string): boolean {
  const t = text.toLowerCase()
  if (!/\bjev\b|typesafe/.test(t)) return false
  if (/waitlist|for the jev waitlist/.test(t)) return false
  if (/\b(thoughts on|hyped launch|just dropped|just launched)\b/.test(t) && !/\bbuilt\b/.test(t)) {
    return false
  }
  return (
    /\b(i|we|i've|we've|i am|we're)\s+(built|building|made|making|shipped|wired|ran|using)\b/.test(t) ||
    /\b(built|building|shipped)\b.{0,40}\bjev\b/.test(t) ||
    /\bjev\b.{0,40}\b(built|building|filter|router|classif|score|triage|browser|voice|spreadsheet|doomscroll)\b/.test(
      t,
    ) ||
    /using jev|with jev|jev \+|calls jev|send .+ to jev|jev (lets|reads|decides|returns)/.test(t)
  )
}

async function restoreOriginals(): Promise<number> {
  const file = path.resolve(process.cwd(), 'data/cases.json')
  const parsed = JSON.parse(await readFile(file, 'utf8')) as CaseRecord[]
  let restored = 0
  for (const record of parsed) {
    const existing = await getCase(record.id)
    if (existing) continue
    await upsertCase({ ...record, communityLikes: record.communityLikes ?? 0 })
    restored += 1
  }
  return restored
}

async function main() {
  const keys = loadEnv()
  configureDb(keys)
  const restored = await restoreOriginals()
  console.log(`restored_missing_originals ${restored}`)
  const known = new Set((await listCases('latest')).map((entry) => entry.id))
  const deadline = Date.now() + 8 * 60 * 1000

  const found = new Map<string, string>()
  for (const query of QUERIES) {
    try {
      const data = await scrapeGet(keys.scrape, '/v1/google/search', {
        query,
        region: 'US',
      })
      collectStatusUrls(data, found)
      console.log(`google ${query} total=${found.size}`)
    } catch (error) {
      console.log(`google_fail ${query} ${error instanceof Error ? error.message : error}`)
    }
  }

  for (const handle of HANDLES) {
    try {
      const data = await scrapeGet(keys.scrape, '/v1/twitter/user-tweets', {
        handle,
        trim: 'false',
      })
      collectStatusUrls(data, found)
      console.log(`user ${handle} total=${found.size}`)
    } catch (error) {
      console.log(`user_fail ${handle} ${error instanceof Error ? error.message : error}`)
    }
  }

  const targetNew = 50
  const maxJev = 40
  let scraped = 0
  let jevCalls = 0
  let stored = 0
  let skippedExisting = 0
  let rejected = 0
  const accepted: string[] = []

  for (const [id, url] of found) {
    if (Date.now() > deadline) {
      console.log('time_budget_hit')
      break
    }
    if (stored >= targetNew) break
    if (jevCalls >= maxJev) break
    if (known.has(id)) {
      skippedExisting += 1
      continue
    }
    try {
      const decoded = await decodeTweet(url, keys.scrape)
      scraped += 1
      if (!looksLikeBuild(decoded.text)) {
        rejected += 1
        continue
      }
      const summarised = await summarizeWithJev(decoded, keys.typesafe)
      jevCalls += 1
      if (!isBuilderCase(summarised)) {
        rejected += 1
        continue
      }
      await upsertCase(summarised)
      known.add(id)
      stored += 1
      accepted.push(`${summarised.author.handle} ${summarised.summary}`)
      console.log(`kept ${stored} @${summarised.author.handle} ${summarised.summary}`)
    } catch (error) {
      console.log(`drop ${id} ${error instanceof Error ? error.message : error}`)
    }
  }

  const feed = await listCases('latest')
  console.log(
    JSON.stringify(
      {
        restored,
        discovered: found.size,
        scraped,
        jevCalls,
        storedNew: stored,
        skippedExisting,
        rejected,
        feedSize: feed.length,
        accepted,
      },
      null,
      2,
    ),
  )

  await writeFile(
    path.resolve(process.cwd(), 'data/cases.json'),
    `${JSON.stringify(feed, (key, value) => (key === 'liked' ? undefined : value), 2)}\n`,
  )
}

await main()
