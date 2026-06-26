-- ============================================================
-- CHAPTERVERSE DATABASE SCHEMA
-- Run this in your Supabase SQL editor (supabase.com/dashboard)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  username     text unique not null,
  display_name text not null,
  bio          text,
  points       integer not null default 50,         -- starting balance
  lifetime_likes integer not null default 0,        -- drives rank
  strikes      integer not null default 0,
  suspended_until timestamptz,
  sample_done  boolean not null default false,
  age_verified boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Rank is computed from lifetime_likes (no stored column needed)
-- Apprentice: 0+  Journeyman: 50+  Novelist: 200+  Wordsmith: 500+  Luminary: 1000+

-- ============================================================
-- STORIES
-- ============================================================
create table public.stories (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  genre           text not null,
  tier            text not null check (tier in ('Open','Established','Advanced','Elite')),
  mature          boolean not null default false,
  total_chapters  integer not null check (total_chapters between 4 and 6),
  guideline       text not null,
  original_author uuid references public.profiles(id) on delete cascade not null,
  status          text not null default 'active' check (status in ('active','complete','removed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- CHAPTERS
-- ============================================================
create table public.chapters (
  id           uuid primary key default uuid_generate_v4(),
  story_id     uuid references public.stories(id) on delete cascade not null,
  chapter_num  integer not null,
  title        text,
  content      text,
  author_id    uuid references public.profiles(id) on delete set null,
  status       text not null default 'locked'
               check (status in ('done','bidding','writing','locked')),
  likes_count  integer not null default 0,
  avg_rating   numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  bid_deadline timestamptz,                         -- when bidding closes
  write_deadline timestamptz,                       -- when writing is due
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(story_id, chapter_num)
);

-- ============================================================
-- BIDS
-- ============================================================
create table public.bids (
  id          uuid primary key default uuid_generate_v4(),
  chapter_id  uuid references public.chapters(id) on delete cascade not null,
  bidder_id   uuid references public.profiles(id) on delete cascade not null,
  amount      integer not null check (amount >= 1),
  pitch       text,
  status      text not null default 'active'
              check (status in ('active','won','lost','forfeited')),
  created_at  timestamptz not null default now(),
  unique(chapter_id, bidder_id)                     -- one bid per author per chapter
);

-- ============================================================
-- LIKES
-- ============================================================
create table public.likes (
  id          uuid primary key default uuid_generate_v4(),
  chapter_id  uuid references public.chapters(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  created_at  timestamptz not null default now(),
  unique(chapter_id, user_id)                       -- one like per user per chapter
);

-- ============================================================
-- RATINGS (1-3 stars)
-- ============================================================
create table public.ratings (
  id          uuid primary key default uuid_generate_v4(),
  chapter_id  uuid references public.chapters(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  stars       integer not null check (stars between 1 and 3),
  created_at  timestamptz not null default now(),
  unique(chapter_id, user_id)
);

-- ============================================================
-- MESSAGES
-- ============================================================
create table public.messages (
  id          uuid primary key default uuid_generate_v4(),
  sender_id   uuid references public.profiles(id) on delete cascade not null,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  content     text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- SAMPLE STORIES (template submissions for unlocking bidding)
-- ============================================================
create table public.sample_submissions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references public.profiles(id) on delete cascade not null,
  template_id  text not null,
  content      text not null,
  status       text not null default 'pending'
               check (status in ('pending','approved','rejected')),
  admin_note   text,
  submitted_at timestamptz not null default now(),
  reviewed_at  timestamptz
);

-- ============================================================
-- STRIKES LOG
-- ============================================================
create table public.strike_log (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  reason      text not null,
  chapter_id  uuid references public.chapters(id) on delete set null,
  issued_at   timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index on public.stories(original_author);
create index on public.stories(status);
create index on public.stories(tier);
create index on public.chapters(story_id);
create index on public.chapters(author_id);
create index on public.chapters(status);
create index on public.bids(chapter_id);
create index on public.bids(bidder_id);
create index on public.likes(chapter_id);
create index on public.likes(user_id);
create index on public.messages(sender_id);
create index on public.messages(recipient_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.stories enable row level security;
alter table public.chapters enable row level security;
alter table public.bids enable row level security;
alter table public.likes enable row level security;
alter table public.ratings enable row level security;
alter table public.messages enable row level security;
alter table public.sample_submissions enable row level security;
alter table public.strike_log enable row level security;

-- Profiles: anyone can read, only owner can update
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Stories: anyone can read, authenticated users can insert, author can update
create policy "stories_select" on public.stories for select using (true);
create policy "stories_insert" on public.stories for insert with check (auth.uid() = original_author);
create policy "stories_update" on public.stories for update using (auth.uid() = original_author);

-- Chapters: anyone can read, authenticated users can insert (winning bidder/original author)
create policy "chapters_select" on public.chapters for select using (true);
create policy "chapters_insert" on public.chapters for insert with check (auth.role() = 'authenticated');
create policy "chapters_update" on public.chapters for update using (auth.role() = 'authenticated');

-- Bids: bidder can see own bids, story author can see all bids on their story
create policy "bids_select" on public.bids for select using (
  auth.uid() = bidder_id or
  exists (
    select 1 from public.chapters c
    join public.stories s on s.id = c.story_id
    where c.id = bids.chapter_id and s.original_author = auth.uid()
  )
);
create policy "bids_insert" on public.bids for insert with check (auth.uid() = bidder_id);
create policy "bids_update" on public.bids for update using (auth.role() = 'authenticated');

-- Likes: anyone can read counts, authenticated users can like
create policy "likes_select" on public.likes for select using (true);
create policy "likes_insert" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_delete" on public.likes for delete using (auth.uid() = user_id);

-- Ratings: same as likes
create policy "ratings_select" on public.ratings for select using (true);
create policy "ratings_insert" on public.ratings for insert with check (auth.uid() = user_id);

-- Messages: only sender and recipient can see
create policy "messages_select" on public.messages for select using (
  auth.uid() = sender_id or auth.uid() = recipient_id
);
create policy "messages_insert" on public.messages for insert with check (auth.uid() = sender_id);
create policy "messages_update" on public.messages for update using (auth.uid() = recipient_id);

-- Sample submissions: user sees own, admin sees all (handle admin via service role)
create policy "samples_select" on public.sample_submissions for select using (auth.uid() = user_id);
create policy "samples_insert" on public.sample_submissions for insert with check (auth.uid() = user_id);

-- Strike log: user sees own
create policy "strikes_select" on public.strike_log for select using (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Compute rank from lifetime_likes
create or replace function public.get_rank(lifetime_likes integer)
returns text language sql immutable as $$
  select case
    when lifetime_likes >= 1000 then 'Luminary'
    when lifetime_likes >= 500  then 'Wordsmith'
    when lifetime_likes >= 200  then 'Novelist'
    when lifetime_likes >= 50   then 'Journeyman'
    else 'Apprentice'
  end;
$$;

-- Compute points earned from a like (diminishing returns)
create or replace function public.points_for_like(current_likes integer)
returns numeric language sql immutable as $$
  select case
    when current_likes < 10 then 1.0
    when current_likes < 50 then 0.5
    else 0.25
  end;
$$;

-- Handle a like: update chapter count, author likes + points
create or replace function public.handle_like(p_chapter_id uuid, p_liker_id uuid)
returns void language plpgsql security definer as $$
declare
  v_author_id uuid;
  v_current_likes integer;
  v_pts numeric;
begin
  select author_id into v_author_id from public.chapters where id = p_chapter_id;
  if v_author_id is null or v_author_id = p_liker_id then
    raise exception 'Cannot like your own chapter or chapter has no author';
  end if;

  insert into public.likes (chapter_id, user_id) values (p_chapter_id, p_liker_id);

  update public.chapters set likes_count = likes_count + 1 where id = p_chapter_id;

  select lifetime_likes into v_current_likes from public.profiles where id = v_author_id;
  v_pts := public.points_for_like(v_current_likes);

  update public.profiles
  set lifetime_likes = lifetime_likes + 1,
      points = points + v_pts
  where id = v_author_id;
end;
$$;

-- Close bidding: pick winner, refund losers, set chapter to writing
create or replace function public.close_bidding(p_chapter_id uuid)
returns void language plpgsql security definer as $$
declare
  v_winner record;
  v_bid record;
begin
  select b.*, p.points as bidder_points
  into v_winner
  from public.bids b
  join public.profiles p on p.id = b.bidder_id
  where b.chapter_id = p_chapter_id and b.status = 'active'
  order by b.amount desc
  limit 1;

  if v_winner is null then
    -- No bids: reopen bidding for another 48h
    update public.chapters
    set bid_deadline = now() + interval '48 hours'
    where id = p_chapter_id;
    return;
  end if;

  -- Mark winner
  update public.bids set status = 'won' where id = v_winner.id;

  -- Refund all losers
  for v_bid in
    select * from public.bids
    where chapter_id = p_chapter_id and status = 'active' and id != v_winner.id
  loop
    update public.profiles set points = points + v_bid.amount where id = v_bid.bidder_id;
    update public.bids set status = 'lost' where id = v_bid.id;
  end loop;

  -- Assign chapter to winner, open writing window
  update public.chapters
  set status = 'writing',
      author_id = v_winner.bidder_id,
      write_deadline = now() + interval '7 days'
  where id = p_chapter_id;
end;
$$;

-- Handle missed deadline: forfeit, add strike, pass to next bidder
create or replace function public.handle_missed_deadline(p_chapter_id uuid)
returns void language plpgsql security definer as $$
declare
  v_chapter record;
  v_next_bidder record;
  v_strikes integer;
begin
  select * into v_chapter from public.chapters where id = p_chapter_id;

  -- Add strike to delinquent author
  insert into public.strike_log (user_id, reason, chapter_id)
  values (v_chapter.author_id, 'Missed writing deadline', p_chapter_id);

  update public.profiles
  set strikes = strikes + 1
  where id = v_chapter.author_id
  returning strikes into v_strikes;

  -- Suspend if 3 strikes
  if v_strikes >= 3 then
    update public.profiles
    set suspended_until = now() + interval '30 days'
    where id = v_chapter.author_id;
  end if;

  -- Mark their bid as forfeited (points dissolve — no refund)
  update public.bids set status = 'forfeited'
  where chapter_id = p_chapter_id and bidder_id = v_chapter.author_id;

  -- Find next highest bidder
  select * into v_next_bidder
  from public.bids
  where chapter_id = p_chapter_id and status = 'lost'
  order by amount desc
  limit 1;

  if v_next_bidder is not null then
    -- Give slot to next bidder (they already got refunded, re-deduct their stake)
    update public.profiles set points = points - v_next_bidder.amount where id = v_next_bidder.bidder_id;
    update public.bids set status = 'won' where id = v_next_bidder.id;
    update public.chapters
    set author_id = v_next_bidder.bidder_id,
        write_deadline = now() + interval '7 days'
    where id = p_chapter_id;
  else
    -- No next bidder: reopen bidding
    update public.chapters
    set status = 'bidding',
        author_id = null,
        bid_deadline = now() + interval '48 hours'
    where id = p_chapter_id;
  end if;
end;
$$;

-- ============================================================
-- SEED: SAMPLE STORY TEMPLATES
-- ============================================================
create table if not exists public.story_templates (
  id    text primary key,
  title text not null,
  genre text not null,
  prompt text not null
);

insert into public.story_templates (id, title, genre, prompt) values
('template_001', 'The Last Voicemail', 'Literary Fiction',
 'A woman discovers her deceased mother left her a voicemail the night she died — one she never listened to. Write a short story (500–1000 words) about the moment she finally presses play, and what she hears.'),
('template_002', 'Room 214', 'Mystery',
 'A hotel housekeeper finds a packed suitcase, a plane ticket, and a half-eaten meal in a room that was checked out three days ago — but no guest was ever reported missing. Write a short story (500–1000 words) from her perspective as she decides what to do.'),
('template_003', 'First Contact, Wrong Number', 'Sci-Fi',
 'An alien transmission meant for Earth''s governments is accidentally intercepted by a bored overnight radio technician in rural Nebraska. Write a short story (500–1000 words) about what the message says and what he does next.'),
('template_004', 'The Neighbor''s Light', 'Horror',
 'Your neighbor''s porch light has been on for six weeks straight. You''ve never seen them leave. You''ve never seen anyone go in. Write a short story (500–1000 words) about the night you finally knock on the door.'),
('template_005', 'The Translator', 'Historical Fiction',
 'Paris, 1944. A French woman working as a translator for the German occupation is handed a document she was never meant to see. Write a short story (500–1000 words) about the choice she makes in the next ten minutes.')
on conflict do nothing;
