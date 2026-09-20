export const JOB = {
  routing: 'Routing',
  classifying: 'Classifying',
  scoring: 'Scoring',
  gating: 'Gating',
  eval: 'Evals',
  cost: 'Speed / cost',
  other: 'Other',
  unrelated: 'Not Jev',
} as const

export const JOB_CRITERIA = {
  routing: 'Sending easy vs hard work to different models or tools',
  classifying: 'Labelling tickets, messages, intent, or categories',
  scoring: 'Scoring, ranking, or filtering items (posts, tickets, leads)',
  gating: 'A yes/no gate before an LLM, a human, or an action',
  eval: 'Evaluating another model, agent, or piece of content',
  cost: 'Mostly a latency or price comparison, not a specific job',
  other: 'A Jev / System One use case that does not fit the others',
  unrelated: 'Not really about using Jev or TypeSafe System One',
} as const

export const CATEGORY = {
  support: 'Customer support',
  sales: 'Sales',
  marketing: 'Marketing',
  trust: 'Trust & safety',
  feeds: 'Search & feeds',
  agents: 'Agents & automation',
  ops: 'Operations',
  finance: 'Finance & risk',
  other: 'Other',
} as const

export const CATEGORY_CRITERIA = {
  support: 'Customer support, tickets, email, or chat',
  sales: 'Sales, leads, CRM, or outbound',
  marketing: 'Marketing, ads, content, or growth',
  trust: 'Trust & safety, spam, ads, moderation, or policy',
  feeds: 'Feeds, ranking, search, or recommendations',
  agents: 'Agents, tools, browsers, or multi-step automation',
  ops: 'Internal ops, routing, infra, or workflows',
  finance: 'Finance, risk, fraud, or underwriting',
  other: 'Some other business area',
} as const

export const CATEGORY_FILTERS = Object.keys(CATEGORY) as Array<keyof typeof CATEGORY>

export const TITLE = {
  doomscroll: 'A doomscroll filter',
  voice_browser: 'Voice-controlled browsing',
  computer_use: 'Computer-use with Jev in the loop',
  spreadsheet: 'Spreadsheets that score meaning',
  sentiment: 'Sentiment that decides buy / sell / hold',
  router: 'A cheap model router',
  classifier: 'Realtime classification',
  moderation: 'Feed and comment moderation',
  search: 'Search reranked by Jev',
  support: 'Support ticket triage',
  inbox: 'An inbox that decides',
  other: 'A Jev-powered build',
} as const

export const TITLE_CRITERIA = {
  doomscroll: 'Filtering or ranking a social feed to cut junk / ads / bait',
  voice_browser: 'Voice or speech driving a browser through Jev',
  computer_use: 'Clicking, typing, or controlling a computer/browser with Jev picking the next action',
  spreadsheet: 'A sheet or table where Jev fills scores, labels, or urgency',
  sentiment: 'Reading posts or news to output a trade or market decision',
  router: 'Sending easy vs hard work to different models',
  classifier: 'Labelling messages, tickets, or events in realtime',
  moderation: 'Spam, safety, ads, or policy decisions',
  search: 'Reranking search or recommendations',
  support: 'Triaging or routing customer support',
  inbox: 'Email or chat that auto-decides what to do',
  other: 'A real Jev build that does not match the titles above',
} as const

export function label(
  map: Record<string, string>,
  key: string | undefined,
  fallback = '—',
): string {
  if (!key) return fallback
  return map[key] ?? fallback
}
