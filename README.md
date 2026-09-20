# Jev Cases

Open-source hub for **real Jev use cases** — how TypeSafe’s System One model compares on **quality**, **speed**, and **pricing** versus other models.

Not affiliated with TypeSafe AI. Community-run MVP.

## Why this exists

People are shipping with Jev and comparing it to LLMs. This repo is a dead-simple place to share those write-ups so others can learn what works (and what doesn’t).

## MVP (intentionally tiny)

| Feature | How it works |
| --- | --- |
| Browse cases | Static list in `src/data/usecases.ts` |
| Case detail | Quality / speed / pricing panels |
| Contribute | Form → copy JSON → PR |
| Auth / DB | None |

## Quick start

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## Add a use case

1. Open **/contribute** in the app (or edit the file directly).
2. Append an object to the `usecases` array in [`src/data/usecases.ts`](src/data/usecases.ts).
3. Open a pull request.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Roadmap (after MVP)

Only if people actually use it:

- Split each case into `data/cases/*.json` for cleaner PRs
- GitHub Discussions / issue template as an alternate submit path
- Light search, more filters, RSS
- Optional “verified” flag for cases with public benches

## License

MIT
