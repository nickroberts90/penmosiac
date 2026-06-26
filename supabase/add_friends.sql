-- ============================================================
-- FRIENDS SYSTEM
-- ============================================================

create table if not exists public.friendships (
  id           uuid primary key default uuid_generate_v4(),
  requester_id uuid references public.profiles(id) on delete cascade not null,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique(requester_id, recipient_id)
);

create index on public.friendships(requester_id);
create index on public.friendships(recipient_id);
create index on public.friendships(status);

alter table public.friendships enable row level security;

create policy "friendships_select" on public.friendships for select using (
  auth.uid() = requester_id or auth.uid() = recipient_id
);
create policy "friendships_insert" on public.friendships for insert with check (
  auth.uid() = requester_id
);
create policy "friendships_update" on public.friendships for update using (
  auth.uid() = recipient_id or auth.uid() = requester_id
);
create policy "friendships_delete" on public.friendships for delete using (
  auth.uid() = requester_id or auth.uid() = recipient_id
);

-- Helper: are two users friends? (accepted, either direction)
create or replace function public.are_friends(user_a uuid, user_b uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
    and (
      (requester_id = user_a and recipient_id = user_b) or
      (requester_id = user_b and recipient_id = user_a)
    )
  );
$$;

-- Helper: are two users co-authors on the same currently-active story?
create or replace function public.are_active_costory_authors(user_a uuid, user_b uuid)
returns boolean language sql stable as $$
  select exists (
    select 1
    from public.chapters c1
    join public.chapters c2 on c1.story_id = c2.story_id
    join public.stories s on s.id = c1.story_id
    where c1.author_id = user_a
      and c2.author_id = user_b
      and s.status = 'active'
      and user_a != user_b
  );
$$;

-- Combined check used before allowing a message to be sent
create or replace function public.can_message(sender uuid, recipient uuid)
returns boolean language sql stable as $$
  select public.are_friends(sender, recipient)
      or public.are_active_costory_authors(sender, recipient);
$$;

-- Update messages RLS to enforce the rule at the database level too
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert with check (
  auth.uid() = sender_id and public.can_message(sender_id, recipient_id)
);
