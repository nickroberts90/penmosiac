# chapter&verse

Collaborative serialized fiction with a bid-to-write economy.

---

## Setup (30 minutes start to finish)

### 1. Install dependencies

```bash
cd chapterverse
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (pick any region, set a database password)
3. Wait ~2 minutes for it to provision
4. Go to **SQL Editor** in the left sidebar
5. Paste the entire contents of `supabase/schema.sql` and click **Run**
6. Go to **Settings → API**
7. Copy your **Project URL** and **anon public** key

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and paste your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=any-random-string-you-make-up
```

### 4. Configure Supabase Auth

In your Supabase dashboard:
1. Go to **Authentication → URL Configuration**
2. Set **Site URL** to `http://localhost:3000`
3. Add `http://localhost:3000/api/auth/callback` to **Redirect URLs**

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How the app works

### User flow
1. Sign up → get 50 starting points
2. Pick a sample story template → write it → submit for admin review
3. Admin approves → you can now bid and create stories
4. Create a story: write chapter 1, set guidelines, open bidding for chapter 2
5. Authors bid points on open chapter slots — 48hr window
6. Highest bid wins — losers get their points back in full
7. Winning author has 1 week to write their chapter
8. Miss the deadline → strike added, next-highest bidder gets the slot
9. 3 strikes → 30-day bidding suspension
10. Readers like chapters → author earns points (diminishing returns: 1pt / 0.5pt / 0.25pt)
11. Original author always writes chapter 1 and the final chapter

### Ranks (lifetime likes, never lost)
| Rank | Likes needed |
|------|-------------|
| Apprentice | 0 |
| Journeyman | 50 |
| Novelist | 200 |
| Wordsmith | 500 |
| Luminary | 1,000 |

### Story tiers & bid caps
| Tier | Min rank | Bid cap |
|------|----------|---------|
| Open | Any | 50 pts |
| Established | Journeyman+ | 100 pts |
| Advanced | Novelist+ | 200 pts |
| Elite | Wordsmith+ | 400 pts |

---

## Admin

Visit `/admin` to:
- Review and approve/reject sample story submissions
- Add test points to users
- Clear strikes
- Manage users

In production, add a role check to the admin page so only admins can access it.

---

## Deploying to Vercel (free)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → import your repo
3. Add all your `.env.local` variables in Vercel's Environment Variables settings
4. Add `CRON_SECRET` as an env var
5. Deploy

For the bid-closing cron job, add a `vercel.json` at the root:

```json
{
  "crons": [
    {
      "path": "/api/cron/close-bids",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Update your Supabase Auth redirect URL to your Vercel domain when you go live.

---

## Project structure

```
chapterverse/
├── app/
│   ├── page.tsx              # Discover (homepage)
│   ├── mystories/page.tsx    # My stories & chapters to write
│   ├── bids/page.tsx         # All active bidding
│   ├── messages/page.tsx     # Private messaging
│   ├── sample/page.tsx       # Sample story submission
│   ├── admin/page.tsx        # Admin panel
│   ├── auth/page.tsx         # Login / signup
│   └── api/
│       ├── auth/callback/    # Supabase auth redirect handler
│       └── cron/close-bids/  # Auto-close expired bidding
├── components/
│   ├── Navbar.tsx
│   ├── story/
│   │   ├── CreateStoryModal.tsx
│   │   └── StoryModal.tsx
│   ├── bid/
│   │   └── BidModal.tsx
│   └── chapter/
│       └── WriteChapterModal.tsx
├── lib/
│   ├── supabase.ts           # Browser client
│   ├── supabase-server.ts    # Server client (App Router)
│   └── utils.ts              # Helpers, formatting
├── types/
│   └── index.ts              # All TypeScript types + game logic constants
└── supabase/
    └── schema.sql            # Full database schema — run this first
```

---

## What's not built yet (next phases)

- [ ] Real-time bid updates (Supabase Realtime subscriptions)
- [ ] 1–3 star chapter ratings UI
- [ ] Age verification gate for mature content
- [ ] Notifications (new bid, chapter submitted, you won)
- [ ] Author profile pages
- [ ] Story complete flow (after final chapter submitted)
- [ ] Admin role gating (currently any logged-in user can access /admin)
- [ ] Email notifications via Supabase Edge Functions
