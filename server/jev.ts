import type { CaseRecord, JevSummary } from './types.ts'
import {
  CATEGORY_CRITERIA,
  JOB_CRITERIA,
  TITLE,
  TITLE_CRITERIA,
  label,
} from './taxonomy.ts'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function pickChoice(answers: Record<string, unknown>, key: string): string {
  const node = asRecord(answers[key])
  const choice = node?.choice ?? node?.value
  return typeof choice === 'string' ? choice : ''
}

function pickNoul(answers: Record<string, unknown>, key: string): number {
  const node = asRecord(answers[key])
  const value = node?.noul ?? node?.probability
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function pickScore(answers: Record<string, unknown>, key: string): number {
  const node = asRecord(answers[key])
  const value = node?.score
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function firstSentence(record: CaseRecord): string {
  const text = record.text.replace(/\s+/g, ' ').trim()
  if (!text) return `A Jev build from @${record.author.handle || 'unknown'}`
  const sentence = text.split(/(?<=[.!?])\s/)[0] ?? text
  return sentence.length > 90 ? `${sentence.slice(0, 87)}…` : sentence
}

export function isBuilderCase(record: CaseRecord): boolean {
  const jev = record.jev
  if (!jev) return false
  if (jev.job === 'unrelated') return false
  const built = jev.built ?? (jev.isUseCase >= 0.5 ? 0.55 : 0)
  if (jev.usefulness < 2.5) return false
  if (built < 0.28) return false
  if (jev.isUseCase < 0.35) return false
  if ((jev.isRecap ?? 0) >= 0.45) return false
  return true
}

function compose(record: CaseRecord, jev: JevSummary): string {
  if (!isBuilderCase({ ...record, jev })) {
    return `From @${record.author.handle || 'unknown'} — not a Jev build.`
  }
  const title = label(TITLE, jev.title, '')
  if (jev.title && jev.title !== 'other' && title) return title
  return firstSentence(record)
}

export async function summarizeWithJev(
  record: CaseRecord,
  apiKey: string | undefined,
): Promise<CaseRecord> {
  if (!apiKey) {
    return { ...record, summary: firstSentence(record) }
  }

  try {
    const response = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
        model: 'jev-latest',
        state: {
          author: record.author.name,
          handle: record.author.handle,
          tweet: record.text,
        },
        questions: {
          is_use_case: {
            type: 'noul',
            instructions:
              'Did someone actually run Jev on a real workflow in this post?',
          },
          built: {
            type: 'noul',
            instructions:
              'Did they show a product, demo, or script that calls Jev and say what it does?',
          },
          is_recap: {
            type: 'noul',
            instructions:
              'Is this launch news, funding, vague hype, or a random Jev mention with no build?',
          },
          job: {
            type: 'choice',
            instructions: 'What is Jev doing? unrelated if it is not a Jev build.',
            criteria: JOB_CRITERIA,
          },
          category: {
            type: 'choice',
            instructions:
              'Which business function is this for? feeds = ranking/filters. agents = browser/computer-use.',
            criteria: CATEGORY_CRITERIA,
          },
          title: {
            type: 'choice',
            instructions:
              'Pick the feed title a builder would scan. It must name the thing they built, not the category. Use other only if none fit.',
            criteria: TITLE_CRITERIA,
          },
          usefulness: {
            type: 'score',
            instructions:
              'How useful is this as a real Jev use case for someone deciding what to build?',
            criteria: [
              'Random or off-topic',
              'Jev is mentioned, nothing was built',
              'A build is hinted at, details are thin',
              'A clear artifact with some how-it-works',
              'You could rebuild it from this post',
            ],
          },
        },
      }),
    })

    const payload = (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null
    if (!response.ok) {
      return { ...record, summary: firstSentence(record) }
    }

    const answers = asRecord(payload?.answers) ?? {}
    const category = pickChoice(answers, 'category') || 'other'
    const jev: JevSummary = {
      job: pickChoice(answers, 'job') || 'other',
      category,
      domain: category,
      title: pickChoice(answers, 'title') || 'other',
      isUseCase: pickNoul(answers, 'is_use_case'),
      built: pickNoul(answers, 'built'),
      isRecap: pickNoul(answers, 'is_recap'),
      usefulness: pickScore(answers, 'usefulness'),
      model: typeof payload?.model === 'string' ? payload.model : 'jev-latest',
    }

    return { ...record, summary: compose(record, jev), jev }
  } catch {
    return { ...record, summary: firstSentence(record) }
  }
}
