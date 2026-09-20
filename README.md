# Jev use cases

Paste an X link. Jev names the build. The feed is real TypeSafe Jev cases from X — what people shipped, and who to follow. Tap a card to open the original post.

Not affiliated with TypeSafe AI. Follow [@withstephen1](https://x.com/withstephen1).

## Flow

1. Paste `x.com/.../status/...`
2. ScrapeCreators pulls the tweet
3. Jev cross-checks that it is a real build, then picks a title, job, and business category
4. Recaps, launch posts, and vague mentions stay out of the feed
5. Like a case. Sort latest or popular. Click through to X

## Quick start

```bash
cp .env.example .env.local
```

Fill:

- `SCRAPE_CREATORS_API_KEY` (or `SCRAPECREATORS_API_KEY`)
- `TYPESAFE_API_KEY` — Jev titles and the ingest gate. Without it, we fall back to a tweet snippet and skip the Jev title.
- `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY` — the server writes cases and likes straight to Supabase. The browser never sees the secret.

```bash
npm install
npm run dev
```

http://localhost:5173

Run [`schema.sql`](schema.sql) once in the **new** project’s SQL editor (SQL → New query → Run). Cursor’s Supabase login can point at a different org; that auth is not required.

## Storage

Supabase, written by the Vite server. No JSON store.

Likes are a toggle per browser. The same device remembers you in `localStorage`, so you can unlike and like again after a refresh. There is no login. A new browser, incognito window, or cleared site is a new voter.
