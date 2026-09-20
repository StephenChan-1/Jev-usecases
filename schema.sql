-- Direct writes from the Vite server with the service role key.
-- Anon has no policies, so the publishable key cannot read or write.

create table if not exists cases (
  id text primary key,
  url text not null unique,
  text text not null,
  summary text not null default '',
  created_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  community_likes integer not null default 0,
  author jsonb not null,
  stats jsonb not null,
  media jsonb not null default '[]'::jsonb,
  jev jsonb
);

create table if not exists case_votes (
  client_id text not null,
  case_id text not null references cases(id) on delete cascade,
  primary key (client_id, case_id)
);

create index if not exists cases_submitted_at_idx on cases (submitted_at desc);
create index if not exists cases_likes_idx on cases (community_likes desc);
create index if not exists cases_category_idx on cases ((jev->>'category'));

alter table cases enable row level security;
alter table case_votes enable row level security;
