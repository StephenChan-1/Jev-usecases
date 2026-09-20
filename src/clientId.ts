const KEY = 'jev-usecases-client'

export function clientId(): string {
  const existing = localStorage.getItem(KEY)
  if (existing) return existing
  const next = crypto.randomUUID()
  localStorage.setItem(KEY, next)
  return next
}
