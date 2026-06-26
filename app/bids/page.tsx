'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile, Story, Chapter, Bid } from '@/types'
import { canBid, TIER_BID_CAP } from '@/types'
import { TIER_COLORS, timeUntil, isUrgent } from '@/lib/utils'
import { Clock, Gavel, CheckCircle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import BidModal from '@/components/bid/BidModal'

type BiddableChapter = { story: Story; chapter: Chapter; bids: Bid[]; myBid?: Bid }

export default function BidsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [biddable, setBiddable] = useState<BiddableChapter[]>([])
  const [wonChapters, setWonChapters] = useState<{ story: Story; chapter: Chapter }[]>([])
  const [bidding, setBidding] = useState<BiddableChapter | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

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

        {biddable.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            <Gavel size={28} className="mx-auto mb-3 opacity-30" />
            No chapters currently in bidding.
          </div>
        )}

        <div className="space-y-3">
          {biddable.map(({ story, chapter, bids, myBid }) => {
            const eligibility = canBid(profile, story)
            const topBid = bids[0]
            const urgent = chapter.bid_deadline ? isUrgent(chapter.bid_deadline) : false

            return (
              <div key={chapter.id} className="card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="font-medium">{story.title} — Ch. {chapter.chapter_num}</div>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      <span className={`badge ${TIER_COLORS[story.tier]}`}>{story.tier}</span>
                      {story.mature && <span className="badge bg-red-50 text-red-700 border-red-200">18+</span>}
                      <span className="badge bg-gray-50 text-gray-500 border-gray-200">{story.genre}</span>
                    </div>
                  </div>
                  {chapter.bid_deadline && (
                    <div className={`flex items-center gap-1 text-sm flex-shrink-0 ${urgent ? 'text-red-500' : 'text-gray-400'}`}>
                      <Clock size={13} /> {timeUntil(chapter.bid_deadline)}
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
                    <button onClick={() => setBidding({ story, chapter, bids, myBid })} className="btn btn-primary btn-sm">
                      <Gavel size={13} /> Bid
                    </button>
                  ) : !eligibility.ok ? (
                    <span className="text-xs text-gray-400">{eligibility.reason}</span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
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
