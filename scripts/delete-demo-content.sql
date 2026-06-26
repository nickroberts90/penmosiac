-- ============================================================
-- DELETE ALL DEMO CONTENT
-- Run this in the Supabase SQL editor whenever you want to wipe
-- the 8 fake authors and 5 seeded stories cleanly.
-- ============================================================

-- Chapters and stories cascade-delete bids/likes/ratings automatically
-- via the foreign key constraints already in schema.sql, so deleting
-- the stories is enough to clean up everything attached to them.

delete from public.stories where is_demo = true;

-- This also clears any chapters/bids/likes attached to demo stories
-- via the original schema's "on delete cascade" foreign keys.

-- Now remove the demo auth users themselves (this also cascades to
-- their profiles via the auth.users -> profiles foreign key).
-- Supabase requires deleting via the Auth admin API or dashboard for
-- auth.users rows — the line below only works if run with sufficient
-- privileges (e.g. via the SQL editor logged in as postgres/service role).

delete from auth.users
where email like '%@demo.penmosaic.internal';

-- Sanity check — should return 0 rows after the above runs successfully
select count(*) as remaining_demo_profiles from public.profiles where is_demo = true;
select count(*) as remaining_demo_stories  from public.stories  where is_demo = true;
