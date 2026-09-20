import type { IncomingMessage, ServerResponse } from 'node:http'
import { configureDb } from './db.ts'
import { summarizeWithJev, isBuilderCase } from './jev.ts'
import { decodeTweet } from './scrape.ts'
import { getCase, listCases, toggleLike, upsertCase } from './store.ts'
import type { ApiKeys, CaseSort } from './types.ts'
import { extractTweetId } from './x.ts'

async function ingest(url: string, keys: ApiKeys) {
  const existingId = extractTweetId(url)
  if (existingId) {
    const existing = await getCase(existingId)
    if (existing) return existing
  }
  const decoded = await decodeTweet(url, keys.scrape)
  const summarised = await summarizeWithJev(decoded, keys.typesafe)
  if (!isBuilderCase(summarised)) {
    throw Object.assign(
      new Error(
        'Jev cross-check failed. This does not look like someone building with Jev.',
      ),
      { status: 422 },
    )
  }
  return upsertCase(summarised)
}

type Json = Record<string, unknown>

async function readJson(req: IncomingMessage): Promise<Json> {
  const preloaded = (req as IncomingMessage & { body?: unknown }).body
  if (typeof preloaded === 'string' && preloaded.trim()) {
    try {
      return JSON.parse(preloaded) as Json
    } catch {
      throw Object.assign(new Error('Body must be JSON.'), { status: 400 })
    }
  }
  if (preloaded && typeof preloaded === 'object' && !Buffer.isBuffer(preloaded)) {
    return preloaded as Json
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Json
  } catch {
    throw Object.assign(new Error('Body must be JSON.'), { status: 400 })
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function errorStatus(error: unknown): number {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number((error as { status: unknown }).status)
    if (Number.isFinite(status)) return status
  }
  return 500
}

function sortParam(value: string | null): CaseSort {
  return value === 'popular' ? 'popular' : 'latest'
}

export async function handleApi(
  req: IncomingMessage,
  res: ServerResponse,
  keys: ApiKeys,
): Promise<boolean> {
  const url = new URL(req.url ?? '/', 'http://local')
  if (!url.pathname.startsWith('/api/')) return false
  configureDb(keys)

  try {
    if (req.method === 'GET' && url.pathname === '/api/cases') {
      send(res, 200, {
        cases: await listCases(
          sortParam(url.searchParams.get('sort')),
          url.searchParams.get('clientId') ?? undefined,
        ),
      })
      return true
    }

    const like = url.pathname.match(/^\/api\/cases\/(\d+)\/like$/)
    if (req.method === 'POST' && like) {
      const body = await readJson(req)
      const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : ''
      if (!clientId) {
        send(res, 400, { error: 'Missing clientId.' })
        return true
      }
      send(res, 200, { case: await toggleLike(like[1] ?? '', clientId) })
      return true
    }

    const one = url.pathname.match(/^\/api\/cases\/(\d+)$/)
    if (req.method === 'GET' && one) {
      const record = await getCase(one[1], url.searchParams.get('clientId') ?? undefined)
      if (!record) {
        send(res, 404, { error: 'Case not found.' })
        return true
      }
      send(res, 200, { case: record })
      return true
    }

    if (req.method === 'POST' && url.pathname === '/api/cases') {
      const body = await readJson(req)
      const tweetUrl = typeof body.url === 'string' ? body.url : ''
      const saved = await ingest(tweetUrl, keys)
      send(res, 201, { case: saved })
      return true
    }

    send(res, 404, { error: 'Not found.' })
    return true
  } catch (error) {
    send(res, errorStatus(error), {
      error: error instanceof Error ? error.message : 'Request failed.',
    })
    return true
  }
}
