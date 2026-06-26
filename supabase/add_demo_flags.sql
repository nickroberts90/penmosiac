-- Tags for demo/seed content so it can be identified and deleted cleanly later.

alter table public.profiles add column if not exists is_demo boolean not null default false;
alter table public.stories  add column if not exists is_demo boolean not null default false;
alter table public.chapters add column if not exists is_demo boolean not null default false;

create index if not exists idx_profiles_is_demo on public.profiles(is_demo);
create index if not exists idx_stories_is_demo  on public.stories(is_demo);
create index if not exists idx_chapters_is_demo on public.chapters(is_demo);
