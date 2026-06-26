'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Profile, Story, Chapter, Bid } from '@/types'
import { canBid } from '@/types'
import { TIER_COLORS, RANK_COLORS, timeUntil, isUrgent } from '@/lib/utils'
import { getRank } from '@/types'
import { X, Heart, Clock, Lock, CheckCircle, Gavel, Pencil, ChevronLeft, BookOpen } from 'lucide-react'
import BidModal from '@/components/bid/BidModal'
import WriteChapterModal from '@/components/chapter/WriteChapterModal'

export default function StoryModal({
  story, profile, onClose, onUpdate
}: { story: Story; profile: Profile; onClose: () => void; onUpdate: () => void }) {
  const supabase = createClient()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [biddingChapter, setBiddingChapter] = useState<Chapter | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [bidding, setBidding] = useState(false)
  const [writing, setWriting] = useState<Chapter | null>(null)
  const [reading, setReading] = useState<Chapter | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadChapters() }, [story.id])

  async function loadChapters() {
    const { data: chs } = await supabase
      .from('chapters')
      .select('*, author_profile:profiles!author_id(*)')
      .eq('story_id', story.id)
      .order('chapter_num')
    setChapters(chs || [])

    const biddingCh = (chs || []).find(c => c.status === 'bidding')
    setBiddingChapter(biddingCh || null)

    if (biddingCh) {
      const { data: bidData } = await supabase
        .from('bids')
        .select('*, bidder_profile:profiles!bidder_id(*)')
        .eq('chapter_id', biddingCh.id)
        .order('amount', { ascending: false })
      setBids(bidData || [])
    }
    setLoading(false)
  }

  async function likeChapter(ch: Chapter) {
    await supabase.rpc('handle_like', { p_chapter_id: ch.id, p_liker_id: profile.id })
    loadChapters()
    onUpdate()
  }

  const statusIcon = {
    done: <CheckCircle size={14} className="text-green-500" />,
    bidding: <Gavel size={14} className="text-brand-400" />,
    writing: <Pencil size={14} className="text-amber-500" />,
    locked: <Lock size={14} className="text-gray-300" />,
  }

  const myBid = biddingChapter ? bids.find(b => b.bidder_id === profile.id) : null
  const bidEligibility = canBid(profile, story)
  const doneChapters = chapters.filter(c => c.status === 'done')

  // ── Reading view ─────────────────────────────────────────
  if (reading) {
    const idx = doneChapters.findIndex(c => c.id === reading.id)
    const prev = doneChapters[idx - 1] ?? null
    const next = doneChapters[idx + 1] ?? null

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl border border-gray-100 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
          {/* Reader header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <button
              onClick={() => setReading(null)}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              <ChevronLeft size={16} /> Back to chapters
            </button>
            <span className="text-xs text-gray-400">{story.title}</span>
            <button onClick={onClose} className="btn btn-sm border-transparent text-gray-400">
              <X size={16} />
            </button>
          </div>

          {/* Chapter content */}
          <div className="flex-1 overflow-y-auto px-8 py-7">
            <div className="max-w-prose mx-auto">
              <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
                Chapter {reading.chapter_num}
              </p>
              <h2 className="text-2xl font-medium mb-1">{reading.title}</h2>
              {reading.author_profile && (
                <p className="text-sm text-gray-400 mb-8">
                  by {reading.author_profile.display_name}
                </p>
              )}
              <div className="prose prose-gray text-gray-700 leading-relaxed text-[16px]"
                style={{ lineHeight: '1.85' }}>
                {reading.content?.split('\n').map((para, i) =>
                  para.trim() ? <p key={i} className="mb-5">{para}</p> : null
                )}
              </div>
            </div>
          </div>

          {/* Reader footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
            <button
              onClick={() => prev && setReading(prev)}
              disabled={!prev}
              className="btn btn-sm disabled:opacity-30"
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <div className="flex items-center gap-3">
              {reading.author_id !== profile.id && (
                <button
                  onClick={() => likeChapter(reading)}
                  className="btn btn-sm gap-1.5 hover:text-red-500 hover:border-red-200 transition-colors"
                >
                  <Heart size={14} /> {reading.likes_count} likes
                </button>
              )}
              <span className="text-xs text-gray-400">
                Ch. {reading.chapter_num} of {doneChapters.length} published
              </span>
            </div>

            <button
              onClick={() => next && setReading(next)}
              disabled={!next}
              className="btn btn-sm disabled:opacity-30"
            >
              Next <ChevronLeft size={14} className="rotate-180" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Chapter list view ────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-100 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-medium text-lg">{story.title}</h2>
              <span className={`badge ${TIER_COLORS[story.tier]}`}>{story.tier}</span>
              {story.mature && <span className="badge bg-red-50 text-red-700 border-red-200">18+</span>}
              <span className="badge bg-gray-50 text-gray-500 border-gray-200">{story.genre}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">by {story.author_profile?.display_name}</p>
          </div>
          <button onClick={onClose} className="btn btn-sm border-transparent text-gray-400"><X size={16} /></button>
        </div>

        <div className="p-5">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800 mb-5">
            <strong>Guideline:</strong> {story.guideline}
          </div>

          {/* Read from start CTA */}
          {doneChapters.length > 0 && (
            <button
              onClick={() => setReading(doneChapters[0])}
              className="btn btn-primary w-full justify-center mb-5"
            >
              <BookOpen size={15} /> Read from chapter 1
            </button>
          )}

          {/* Chapter list */}
          <h3 className="text-sm font-medium text-gray-700 mb-3">Chapters</h3>
          <div className="space-y-0 divide-y divide-gray-50 mb-5">
            {chapters.map(ch => (
              <div key={ch.id} className="flex items-center gap-3 py-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                  ch.status === 'done'    ? 'bg-green-50 text-green-700 border border-green-100' :
                  ch.status === 'bidding' ? 'bg-brand-50 text-brand-700 border border-brand-100' :
                  ch.status === 'writing' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                  'bg-gray-50 text-gray-300 border border-gray-100'
                }`}>{ch.chapter_num}</div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                    {statusIcon[ch.status]}
                    {ch.status === 'done'
                      ? <button onClick={() => setReading(ch)} className="hover:text-brand-600 hover:underline transition-colors text-left">{ch.title || `Chapter ${ch.chapter_num}`}</button>
                      : <span>{ch.title || `Chapter ${ch.chapter_num}`}</span>
                    }
                    {(ch.chapter_num === 1 || ch.chapter_num === story.total_chapters) && (
                      <span className="text-xs text-brand-400">(original author)</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {ch.author_profile && <span>{ch.author_profile.display_name} · </span>}
                    {ch.status === 'done' && `${ch.likes_count} likes · ${ch.avg_rating > 0 ? ch.avg_rating.toFixed(1) + '★' : 'not rated'}`}
                    {ch.status === 'bidding' && ch.bid_deadline && (
                      <span className={isUrgent(ch.bid_deadline) ? 'text-red-500' : ''}>
                        {bids.length} bids · <Clock size={10} className="inline" /> {timeUntil(ch.bid_deadline)}
                      </span>
                    )}
                    {ch.status === 'writing' && ch.write_deadline && `Due in ${timeUntil(ch.write_deadline)}`}
                    {ch.status === 'locked' && 'Waiting'}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {ch.status === 'done' && (
                    <button onClick={() => setReading(ch)} className="btn btn-sm">Read</button>
                  )}
                  {ch.status === 'done' && ch.author_id !== profile.id && (
                    <button onClick={() => likeChapter(ch)} className="btn btn-sm gap-1 text-gray-400 hover:text-red-500">
                      <Heart size={13} />
                    </button>
                  )}
                  {ch.status === 'writing' && ch.author_id === profile.id && (
                    <button onClick={() => setWriting(ch)} className="btn btn-primary btn-sm">Write</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Active bidding */}
          {biddingChapter && (
            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Chapter {biddingChapter.chapter_num} — Active bids
              </h3>
              {!bidEligibility.ok && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-800 mb-3">
                  <Lock size={13} className="inline mr-1" />{bidEligibility.reason}
                </div>
              )}
              {bids.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No bids yet. Be first!</p>
              ) : (
                <div className="space-y-0 divide-y divide-gray-50 mb-3">
                  {bids.map((bid, i) => (
                    <div key={bid.id} className="flex items-center gap-3 py-2.5">
                      <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-800 flex items-center justify-center text-xs font-medium">{i + 1}</div>
                      <div className="w-7 h-7 rounded-full bg-brand-50 text-brand-800 flex items-center justify-center text-sm font-medium">
                        {bid.bidder_profile?.display_name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium flex items-center gap-1.5">
                          {bid.bidder_profile?.display_name}
                          <span className={`badge text-xs ${RANK_COLORS[getRank(bid.bidder_profile?.lifetime_likes || 0)]}`}>
                            {getRank(bid.bidder_profile?.lifetime_likes || 0)}
                          </span>
                        </div>
                        {bid.pitch && <p className="text-xs text-gray-400 mt-0.5 italic">"{bid.pitch}"</p>}
                      </div>
                      <div className="text-sm font-medium text-brand-600">{bid.amount} pts</div>
                    </div>
                  ))}
                </div>
              )}
              {bidEligibility.ok && !myBid && (
                <button onClick={() => setBidding(true)} className="btn btn-primary w-full justify-center">
                  Place a bid on chapter {biddingChapter.chapter_num}
                </button>
              )}
              {myBid && (
                <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-green-700">
                  ✓ Your bid: {myBid.amount} pts staked
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {bidding && biddingChapter && (
        <BidModal
          chapter={biddingChapter}
          story={story}
          profile={profile}
          onClose={() => setBidding(false)}
          onBid={() => { setBidding(false); loadChapters(); onUpdate() }}
        />
      )}

      {writing && (
        <WriteChapterModal
          chapter={writing}
          story={story}
          onClose={() => setWriting(null)}
          onSubmit={() => { setWriting(null); loadChapters(); onUpdate() }}
        />
      )}
    </div>
  )
}
