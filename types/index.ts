export type Rank = 'Apprentice' | 'Journeyman' | 'Novelist' | 'Wordsmith' | 'Luminary'
export type StoryTier = 'Open' | 'Established' | 'Advanced' | 'Elite'
export type StoryStatus = 'active' | 'complete' | 'removed'
export type ChapterStatus = 'done' | 'bidding' | 'writing' | 'locked'
export type BidStatus = 'active' | 'won' | 'lost' | 'forfeited'
export type SampleStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  points: number
  lifetime_likes: number
  strikes: number
  suspended_until: string | null
  sample_done: boolean
  age_verified: boolean
  theme: string
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Story {
  id: string
  title: string
  genre: string
  tier: StoryTier
  mature: boolean
  total_chapters: number
  guideline: string
  original_author: string
  status: StoryStatus
  created_at: string
  updated_at: string
  // joined
  author_profile?: Profile
  chapters?: Chapter[]
}

export interface Chapter {
  id: string
  story_id: string
  chapter_num: number
  title: string | null
  content: string | null
  author_id: string | null
  status: ChapterStatus
  likes_count: number
  avg_rating: number
  rating_count: number
  bid_deadline: string | null
  write_deadline: string | null
  draft_title: string | null
  draft_content: string | null
  draft_saved_at: string | null
  created_at: string
  updated_at: string
  // joined
  author_profile?: Profile
  bids?: Bid[]
  user_liked?: boolean
  user_rated?: number | null
}

export interface Bid {
  id: string
  chapter_id: string
  bidder_id: string
  amount: number
  pitch: string | null
  status: BidStatus
  created_at: string
  // joined
  bidder_profile?: Profile
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  read: boolean
  created_at: string
  sender_profile?: Profile
  recipient_profile?: Profile
}

export interface SampleSubmission {
  id: string
  user_id: string
  template_id: string
  content: string
  status: SampleStatus
  admin_note: string | null
  submitted_at: string
  reviewed_at: string | null
}

export interface StoryTemplate {
  id: string
  title: string
  genre: string
  prompt: string
}

export const RANKS: { name: Rank; min: number }[] = [
  { name: 'Apprentice', min: 0 },
  { name: 'Journeyman', min: 50 },
  { name: 'Novelist', min: 200 },
  { name: 'Wordsmith', min: 500 },
  { name: 'Luminary', min: 1000 },
]

export const TIER_MIN_RANK: Record<StoryTier, number> = {
  Open: 0,
  Established: 1,
  Advanced: 2,
  Elite: 3,
}

export const TIER_BID_CAP: Record<StoryTier, number> = {
  Open: 50,
  Established: 100,
  Advanced: 200,
  Elite: 400,
}

export function getRank(lifetimeLikes: number): Rank {
  let rank: Rank = 'Apprentice'
  for (const r of RANKS) {
    if (lifetimeLikes >= r.min) rank = r.name
  }
  return rank
}

export function getRankIndex(lifetimeLikes: number): number {
  let idx = 0
  for (let i = 0; i < RANKS.length; i++) {
    if (lifetimeLikes >= RANKS[i].min) idx = i
  }
  return idx
}

export function canBid(
  profile: Profile,
  story: Story
): { ok: boolean; reason?: string } {
  if (!profile.sample_done) return { ok: false, reason: 'Complete a sample story first' }
  if (profile.strikes >= 3) return { ok: false, reason: 'Bidding suspended (3 strikes)' }
  if (profile.suspended_until && new Date(profile.suspended_until) > new Date()) {
    return { ok: false, reason: 'Account temporarily suspended' }
  }
  if (profile.id === story.original_author) return { ok: false, reason: 'You are the original author' }
  const rankIdx = getRankIndex(profile.lifetime_likes)
  const tierMin = TIER_MIN_RANK[story.tier]
  if (rankIdx < tierMin) {
    return { ok: false, reason: `Requires ${RANKS[tierMin].name}+ rank` }
  }
  return { ok: true }
}
// cache bust 1782491722
