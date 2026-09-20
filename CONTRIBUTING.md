# Contributing

Thanks for sharing a use case. Keep it short and honest.

## What makes a good case

- **One job** — e.g. “route easy vs hard requests,” not “our whole agent stack.”
- **A baseline** — name the model or approach you compared against.
- **Three signals** — quality verdict, latency numbers (even rough), relative cost.
- **Say where Jev loses** — mixed/worse is welcome.

## How to submit (MVP)

1. Fork the repo and create a branch: `case/short-name`
2. Add your entry to `src/data/usecases.ts`
3. Run `npm run build` to make sure TypeScript is happy
4. Open a PR with title: `case: your title`

Or use the **/contribute** page to generate JSON, then paste it into the array.

## Schema

```ts
{
  id: string              // url slug, kebab-case, unique
  title: string
  summary: string         // one sentence
  author: string
  tags: string[]
  status: 'idea' | 'prototype' | 'shipped'
  problem: string
  approach: string
  baselineModel: string
  comparison: {
    quality: { verdict: 'better' | 'similar' | 'mixed' | 'worse', notes: string }
    speed: { jevMs: number, baselineMs: number, notes: string }
    pricing: { relative: string, notes: string }
  }
  links?: { repo?: string, demo?: string, writeup?: string }
  createdAt: string       // YYYY-MM-DD
}
```

## Ground rules

- No secrets, API keys, or private customer data
- Numbers can be approximate; say so in notes
- Seed “example” authors can be replaced freely
