import type { CaseMedia, CaseRecord } from './types.ts'
import { canonicalTweetUrl, extractTweetId } from './x.ts'

type Json = Record<string, unknown>

function asRecord(value: unknown): Json | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Json)
    : null
}

function pickUser(raw: Json): Json | null {
  const core = asRecord(raw.core)
  const userResults = asRecord(core?.user_results)
  const result = asRecord(userResults?.result)
  if (result) return result
  const user = asRecord(raw.user)
  if (user) return user
  return asRecord(raw.author)
}

function pickLegacy(raw: Json): Json {
  return asRecord(raw.legacy) ?? raw
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replaceAll(',', ''))
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function isoFromTwitterDate(value: unknown): string {
  if (typeof value !== 'string' || !value) return new Date().toISOString()
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return new Date().toISOString()
  return new Date(parsed).toISOString()
}

function biggerAvatar(url: string): string {
  return url.replace('_normal.', '_400x400.')
}

function extractMedia(legacy: Json): CaseMedia[] {
  const entities = asRecord(legacy.extended_entities) ?? asRecord(legacy.entities)
  const media = entities?.media
  if (!Array.isArray(media)) return []

  const items: CaseMedia[] = []
  for (const entry of media) {
    const item = asRecord(entry)
    if (!item) continue
    const type = str(item.type)
    const still = str(item.media_url_https) || str(item.media_url)
    if (type === 'video' || type === 'animated_gif') {
      const info = asRecord(item.video_info)
      const variants = Array.isArray(info?.variants) ? info.variants : []
      const mp4s = variants
        .map((variant) => asRecord(variant))
        .filter((variant): variant is Json => {
          if (!variant) return false
          return str(variant.content_type) === 'video/mp4'
        })
        .sort((a, b) => num(b.bitrate) - num(a.bitrate))
      const best = mp4s[0]
      items.push({
        type: type === 'animated_gif' ? 'gif' : 'video',
        url: str(best?.url) || still,
        poster: still || undefined,
      })
      continue
    }
    if (still) items.push({ type: 'photo', url: still })
  }
  return items
}

function decodeEntities(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
}

function pickText(tweet: Json, legacy: Json): string {
  const note = asRecord(tweet.note_tweet)
  const noteResults = asRecord(note?.note_tweet_results)
  const noteResult = asRecord(noteResults?.result)
  const long =
    str(noteResult?.text) ||
    str(asRecord(tweet.note_tweet)?.text) ||
    str(tweet.full_text)
  return decodeEntities(
    long || str(legacy.full_text) || str(legacy.text) || str(tweet.text),
  )
}

export function tweetToCase(raw: unknown, sourceUrl: string): CaseRecord {
  const root = asRecord(raw)
  if (!root) throw new Error('Unexpected tweet payload')

  const tweet = asRecord(root.data) ?? asRecord(root.tweet) ?? root
  const user = pickUser(tweet)
  const userLegacy = asRecord(user?.legacy) ?? {}
  const userCore = asRecord(user?.core) ?? {}
  const avatar = asRecord(user?.avatar) ?? {}
  const verification = asRecord(user?.verification) ?? {}
  const legacy = pickLegacy(tweet)
  const tweetId =
    str(tweet.rest_id) ||
    str(legacy.id_str) ||
    extractTweetId(sourceUrl) ||
    ''

  if (!tweetId) throw new Error('Could not read tweet id')

  const handle =
    str(userCore.screen_name) ||
    str(userLegacy.screen_name) ||
    str(user?.username)
  const photo =
    str(avatar.image_url) || str(userLegacy.profile_image_url_https)
  const views = asRecord(tweet.views)

  return {
    id: tweetId,
    url: canonicalTweetUrl(sourceUrl, handle, tweetId),
    text: pickText(tweet, legacy),
    summary: '',
    communityLikes: 0,
    createdAt: isoFromTwitterDate(legacy.created_at ?? tweet.created_at),
    submittedAt: new Date().toISOString(),
    author: {
      name: str(userCore.name) || str(userLegacy.name) || str(user?.name) || 'Unknown',
      handle,
      avatar: biggerAvatar(photo),
      verified: Boolean(
        user?.is_blue_verified || userLegacy.verified || verification.verified,
      ),
    },
    stats: {
      likes: num(legacy.favorite_count ?? tweet.favorite_count),
      replies: num(legacy.reply_count),
      reposts: num(legacy.retweet_count),
      views: views?.count != null ? num(views.count) : null,
    },
    media: extractMedia(legacy),
  }
}
