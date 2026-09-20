import { tweetToCase } from './normalize.ts'
import type { CaseRecord } from './types.ts'
import { canonicalTweetUrl, isTweetUrl } from './x.ts'

const ENDPOINT = 'https://api.scrapecreators.com/v1/twitter/tweet'

export async function decodeTweet(
  url: string,
  apiKey: string | undefined,
): Promise<CaseRecord> {
  if (!isTweetUrl(url)) {
    throw Object.assign(new Error('Paste a full X / Twitter status link.'), {
      status: 400,
    })
  }
  if (!apiKey) {
    throw Object.assign(
      new Error(
        'Add SCRAPE_CREATORS_API_KEY or SCRAPECREATORS_API_KEY to .env.local, then restart.',
      ),
      { status: 503 },
    )
  }

  const endpoint = new URL(ENDPOINT)
  endpoint.searchParams.set('url', canonicalTweetUrl(url))
  endpoint.searchParams.set('trim', 'false')

  let response: Response
  try {
    response = await fetch(endpoint, {
      headers: { 'x-api-key': apiKey },
      signal: AbortSignal.timeout(12_000),
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'network error'
    throw Object.assign(
      new Error(`Could not reach ScrapeCreators (${detail}).`),
      { status: 502 },
    )
  }
  const payload = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null

  if (!response.ok) {
    const message =
      (typeof payload?.error === 'string' && payload.error) ||
      (typeof payload?.message === 'string' && payload.message) ||
      `ScrapeCreators returned ${response.status}`
    throw Object.assign(new Error(message), { status: response.status })
  }

  return tweetToCase(payload, url)
}
