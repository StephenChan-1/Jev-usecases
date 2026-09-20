import type { IncomingMessage, ServerResponse } from 'node:http'

export const config = {
  maxDuration: 60,
}

function keys() {
  return {
    scrape:
      process.env.SCRAPE_CREATORS_API_KEY || process.env.SCRAPECREATORS_API_KEY,
    typesafe: process.env.TYPESAFE_API_KEY || process.env.JEV_API_KEY,
    supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseService: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }
}

export default async function handler(
  req: IncomingMessage & { query?: { path?: string | string[] } },
  res: ServerResponse,
): Promise<void> {
  try {
    const { handleApi } = await import('../server/http.ts')
    const url = req.url ?? '/'
    if (!url.startsWith('/api/')) {
      const query = url.includes('?') ? url.slice(url.indexOf('?')) : ''
      const parts = req.query?.path
      const joined = Array.isArray(parts) ? parts.join('/') : parts || 'cases'
      req.url = `/api/${joined}${query}`
    }
    const handled = await handleApi(req, res, keys())
    if (!handled) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: 'Not found.' }))
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.'
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: message }))
    }
  }
}
