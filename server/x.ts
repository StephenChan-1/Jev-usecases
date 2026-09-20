const STATUS_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/(?:[A-Za-z0-9_]+|i\/web)\/status\/(\d+)/i

export function extractTweetId(input: string): string | null {
  const trimmed = input.trim()
  const match = trimmed.match(STATUS_RE)
  if (match?.[1]) return match[1]
  if (/^\d{5,}$/.test(trimmed)) return trimmed
  return null
}

export function canonicalTweetUrl(url: string, handle?: string, id?: string): string {
  const tweetId = id ?? extractTweetId(url)
  if (!tweetId) return url.trim()
  const screen = handle ? handle.replace(/^@/, '') : 'i/web'
  return `https://x.com/${screen}/status/${tweetId}`
}

export function isTweetUrl(input: string): boolean {
  return extractTweetId(input) !== null
}
