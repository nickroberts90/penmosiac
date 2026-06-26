'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile, Story, Chapter, Bid } from '@/types'
import { canBid, TIER_BID_CAP } from '@/types'
import { TIER_COLORS, timeUntil, isUrgent } from '@/lib/utils'
import { Clock, Gavel, CheckCircle, ArrowUpDown } from 'lucide-react'
import Navbar from '@/components/Navbar'
import BidModal from '@/components/bid/BidModal'
import Link from 'next/link'

type BiddableChapter = { story: Story; chapter: Chapter; bids: Bid[]; myBid?: Bid }
type SortOption = 'time_asc' | 'time_desc' | 'most_bids' | 'highest_bid'

const SORT_LABELS: Record<SortOption, string> = {
  time_asc:    'Ending soonest',
  time_desc:   'Ending latest',
  most_bids:   'Most bids',
  highest_bid: 'Highest bid',
}

export default function BidsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [biddable, setBiddable] = useState<BiddableChapter[]>([])
  const [wonChapters, setWonChapters] = useState<{ story: Story; chapter: Chapter }[]>([])
  const [bidding, setBidding] = useState<BiddableChapter | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>('time_asc')
  const [now, setNow] = useState(Date.now())

  useEffect(() => { loadData() }, [])

  // Live-ticking clock so countdowns update every second without a full reload
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)

    const { data: chapters } = await supabase
      .from('chapters')
      .select('*, story:stories(*, author_profile:profiles!original_author(*))')
      .eq('status', 'bidding')
      .order('bid_deadline', { ascending: true })

    const { data: writing } = await supabase
      .from('chapters')
      .select('*, story:stories(*, author_profile:profiles!original_author(*))')
      .eq('status', 'writing')
      .eq('author_id', user.id)

    const items: BiddableChapter[] = []
    for (const ch of chapters || []) {
      const { data: bids } = await supabase
        .from('bids')
        .select('*, bidder_profile:profiles!bidder_id(*)')
        .eq('chapter_id', ch.id)
        .order('amount', { ascending: false })
      items.push({
        story: ch.story as unknown as Story,
        chapter: ch,
        bids: bids || [],
        myBid: (bids || []).find((b: Bid) => b.bidder_id === user.id),
      })
    }
    setBiddable(items)
    setWonChapters(writing?.map(ch => ({ story: ch.story as unknown as Story, chapter: ch })) || [])
    setLoading(false)
  }

  const sortedBiddable = useMemo(() => {
    const items = [...biddable]
    switch (sortBy) {
      case 'time_asc':
        return items.sort((a, b) => {
          const at = a.chapter.bid_deadline ? new Date(a.chapter.bid_deadline).getTime() : Infinity
          const bt = b.chapter.bid_deadline ? new Date(b.chapter.bid_deadline).getTime() : Infinity
          return at - bt
        })
      case 'time_desc':
        return items.sort((a, b) => {
          const at = a.chapter.bid_deadline ? new Date(a.chapter.bid_deadline).getTime() : -Infinity
          const bt = b.chapter.bid_deadline ? new Date(b.chapter.bid_deadline).getTime() : -Infinity
          return bt - at
        })
      case 'most_bids':
        return items.sort((a, b) => b.bids.length - a.bids.length)
      case 'highest_bid':
        return items.sort((a, b) => (b.bids[0]?.amount ?? 0) - (a.bids[0]?.amount ?? 0))
      default:
        return items
    }
  }, [biddable, sortBy])

  if (loading) return <><Navbar /><div className="text-center py-16 text-gray-400 text-sm">Loading…</div></>
  if (!profile) return null

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-xl font-medium mb-5">Active bidding</h1>

        {wonChapters.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base font-medium mb-3 flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Chapters you won</h2>
            {wonChapters.map(({ story, chapter }) => (
              <div key={chapter.id} className="card flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium">{story.title} — Ch. {chapter.chapter_num}</div>
                  <div className="text-xs text-gray-400">Due in {chapter.write_deadline ? timeUntil(chapter.write_deadline) : '?'}</div>
                </div>
                <a href="/mystories" className="btn btn-primary btn-sm">Go write</a>
              </div>
            ))}
          </div>
        )}

        {biddable.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            <Gavel size={28} className="mx-auto mb-3 opacity-30" />
            No chapters currently in bidding.
          </div>
        ) : (
          <>
            {/* Sort control */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-400">{biddable.length} open chapter{biddable.length !== 1 ? 's' : ''}</span>
              <div className="flex items-center gap-2">
                <ArrowUpDown size={13} className="text-gray-400" />
                <select
                  className="select text-sm py-1.5"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                >
                  {Object.entries(SORT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {sortedBiddable.map(({ story, chapter, bids, myBid }) => {
                const eligibility = canBid(profile, story)
                const topBid = bids[0]
                const deadline = chapter.bid_deadline
                const urgent = deadline ? new Date(deadline).getTime() - now < 6 * 3600 * 1000 : false
                const expired = deadline ? new Date(deadline).getTime() - now <= 0 : false

                return (
                  <Link
                    href={`/stories/${story.id}`}
                    key={chapter.id}
                    className="card block hover:border-brand-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="font-medium">{story.title} — Ch. {chapter.chapter_num}</div>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          <span className={`badge ${TIER_COLORS[story.tier]}`}>{story.tier}</span>
                          {story.mature && <span className="badge bg-red-50 text-red-700 border-red-200">18+</span>}
                          <span className="badge bg-gray-50 text-gray-500 border-gray-200">{story.genre}</span>
                        </div>
                      </div>
                      {deadline && (
                        <div className={`flex items-center gap-1 text-sm flex-shrink-0 font-medium tabular-nums ${
                          expired ? 'text-gray-400' : urgent ? 'text-red-500' : 'text-gray-500'
                        }`}>
                          <Clock size={13} /> {expired ? 'Closing…' : timeUntil(deadline)}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{story.guideline}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        {bids.length} bid{bids.length !== 1 ? 's' : ''} · Top: <strong>{topBid ? `${topBid.amount} pts` : 'none'}</strong>
                        {myBid && <span className="text-green-600 ml-2">✓ Your bid: {myBid.amount} pts</span>}
                      </div>
                      {eligibility.ok && !myBid ? (
                        <button
                          onClick={(e) => { e.preventDefault(); setBidding({ story, chapter, bids, myBid }) }}
                          className="btn btn-primary btn-sm"
                        >
                          <Gavel size={13} /> Bid
                        </button>
                      ) : !eligibility.ok ? (
                        <span className="text-xs text-gray-400">{eligibility.reason}</span>
                      ) : null}
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </main>

      {bidding && (
        <BidModal
          chapter={bidding.chapter}
          story={bidding.story}
          profile={profile}
          onClose={() => setBidding(null)}
          onBid={() => { setBidding(null); loadData() }}
        />
      )}
    </>
  )
}
