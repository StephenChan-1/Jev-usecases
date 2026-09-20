import { readFileSync } from 'node:fs'
import path from 'node:path'
import { configureDb } from './db.ts'
import { isBuilderCase, summarizeWithJev } from './jev.ts'
import { decodeTweet } from './scrape.ts'
import { getCase, upsertCase } from './store.ts'
import { extractTweetId } from './x.ts'

function loadEnv() {
  const raw = readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8')
  const env: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    if (!line.includes('=') || line.trim().startsWith('#')) continue
    const at = line.indexOf('=')
    env[line.slice(0, at).trim()] = line.slice(at + 1).trim().replace(/^['"]|['"]$/g, '')
  }
  return {
    scrape: env.SCRAPE_CREATORS_API_KEY || env.SCRAPECREATORS_API_KEY,
    typesafe: env.TYPESAFE_API_KEY,
    supabaseUrl: env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseService: env.SUPABASE_SERVICE_ROLE_KEY,
  }
}

const urls = process.argv.slice(2)
if (!urls.length) {
  console.error('pass tweet urls')
  process.exit(1)
}

const keys = loadEnv()
configureDb(keys)

for (const url of urls) {
  const id = extractTweetId(url)
  if (id) {
    const already = await getCase(id)
    if (already) {
      console.log('exists', already.summary)
      continue
    }
  }
  const decoded = await decodeTweet(url, keys.scrape)
  const summarised = await summarizeWithJev(decoded, keys.typesafe)
  console.log(decoded.id, JSON.stringify(summarised.jev))
  if (!isBuilderCase(summarised)) {
    console.log('rejected', url)
    continue
  }
  await upsertCase(summarised)
  console.log('kept', summarised.summary)
}
