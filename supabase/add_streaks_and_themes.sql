-- ============================================================
-- DAILY LOGIN STREAKS & THEME PREFERENCES
-- ============================================================

-- Track daily logins for streak bonuses
create table if not exists public.login_streaks (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.profiles(id) on delete cascade not null unique,
  last_login_date date not null default current_date,
  current_streak  integer not null default 1,
  longest_streak  integer not null default 1,
  total_logins    integer not null default 1,
  updated_at      timestamptz not null default now()
);

alter table public.login_streaks enable row level security;
create policy "streaks_select" on public.login_streaks for select using (auth.uid() = user_id);
create policy "streaks_insert" on public.login_streaks for insert with check (auth.uid() = user_id);
create policy "streaks_update" on public.login_streaks for update using (auth.uid() = user_id);

-- Add theme preference to profiles
alter table public.profiles add column if not exists theme text not null default 'default';

-- Handle daily login: award points, update streak
create or replace function public.handle_daily_login(p_user_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_streak      record;
  v_today       date := current_date;
  v_yesterday   date := current_date - interval '1 day';
  v_pts         integer := 0;
  v_new_streak  integer := 1;
  v_bonus       boolean := false;
  v_msg         text := '';
begin
  select * into v_streak from public.login_streaks where user_id = p_user_id;

  if v_streak is null then
    -- First ever login
    insert into public.login_streaks (user_id, last_login_date, current_streak, longest_streak, total_logins)
    values (p_user_id, v_today, 1, 1, 1);
    v_pts := 5;
    v_new_streak := 1;
    v_msg := 'Welcome! +5 points for signing in.';

  elsif v_streak.last_login_date = v_today then
    -- Already logged in today, no points
    return jsonb_build_object('points_earned', 0, 'streak', v_streak.current_streak, 'message', '', 'already_claimed', true);

  elsif v_streak.last_login_date = v_yesterday then
    -- Consecutive day — extend streak
    v_new_streak := v_streak.current_streak + 1;
    v_pts := 5;
    v_msg := format('+5 points! Day %s streak.', v_new_streak);

    -- 7-day bonus
    if v_new_streak % 7 = 0 then
      v_pts := v_pts + 10;
      v_bonus := true;
      v_msg := format('+15 points! 7-day streak bonus!', v_new_streak);
    end if;

    update public.login_streaks set
      last_login_date = v_today,
      current_streak  = v_new_streak,
      longest_streak  = greatest(longest_streak, v_new_streak),
      total_logins    = total_logins + 1,
      updated_at      = now()
    where user_id = p_user_id;

  else
    -- Streak broken
    v_new_streak := 1;
    v_pts := 5;
    v_msg := '+5 points for signing in. Streak reset.';

    update public.login_streaks set
      last_login_date = v_today,
      current_streak  = 1,
      total_logins    = total_logins + 1,
      updated_at      = now()
    where user_id = p_user_id;
  end if;

  -- Award points
  if v_pts > 0 then
    update public.profiles set points = points + v_pts where id = p_user_id;
  end if;

  return jsonb_build_object(
    'points_earned', v_pts,
    'streak',        v_new_streak,
    'bonus',         v_bonus,
    'message',       v_msg,
    'already_claimed', false
  );
end;
$$;
