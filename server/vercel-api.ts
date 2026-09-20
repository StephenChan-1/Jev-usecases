import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleApi } from './http.ts'
import type { ApiKeys } from './types.ts'

export const config = {
  maxDuration: 60,
}

function keys(): ApiKeys {
  return {
    scrape:
      process.env.SCRAPE_CREATORS_API_KEY || process.env.SCRAPECREATORS_API_KEY,
    typesafe: process.env.TYPESAFE_API_KEY || process.env.JEV_API_KEY,
    supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseService: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = req.url ?? '/'
  if (!url.startsWith('/api/')) {
    const query = url.includes('?') ? url.slice(url.indexOf('?')) : ''
    const path = url.split('?')[0] ?? ''
    req.url = path.startsWith('/api') ? `${path}${query}` : `/api${path}${query}`
  }
  const handled = await handleApi(req, res, keys())
  if (!handled) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Not found.' }))
  }
}
