'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile, Story, Chapter, Bid } from '@/types'
import { canBid } from '@/types'
import { getRank } from '@/types'
import { TIER_COLORS, RANK_COLORS, timeUntil, isUrgent, timeAgo } from '@/lib/utils'
import {
  BookOpen, Heart, Clock, Lock, CheckCircle, Gavel,
  Pencil, ChevronLeft, ChevronRight, Share2, ArrowLeft, Bell, BellOff, ChevronDown
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import BidModal from '@/components/bid/BidModal'
import WriteChapterModal from '@/components/chapter/WriteChapterModal'
import Link from 'next/link'

export default function StoryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [story, setStory] = useState<Story | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [reading, setReading] = useState<Chapter | null>(null)
  const [bidding, setBidding] = useState(false)
  const [writing, setWriting] = useState<Chapter | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [showGuideline, setShowGuideline] = useState(false)

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)

      // Check if following
      const { data: follow } = await supabase
        .from('story_follows')
        .select('id')
        .eq('user_id', user.id)
        .eq('story_id', id)
        .single()
      setFollowing(!!follow)
    }

    const { data: s } = await supabase
      .from('stories')
      .select('*, author_profile:profiles!original_author(*)')
      .eq('id', id)
      .single()
    if (!s) { router.push('/'); return }
    setStory(s)

    const { data: chs } = await supabase
      .from('chapters')
      .select('*, author_profile:profiles!author_id(*)')
      .eq('story_id', id)
      .order('chapter_num')
    setChapters(chs || [])

    const biddingCh = (chs || []).find((c: Chapter) => c.status === 'bidding')
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
    if (!profile) return
    await supabase.rpc('handle_like', { p_chapter_id: ch.id, p_liker_id: profile.id })
    loadData()
  }

  async function toggleFollow() {
    if (!profile || !story) return
    setFollowLoading(true)
    if (following) {
      await supabase.from('story_follows')
        .delete().eq('user_id', profile.id).eq('story_id', story.id)
      setFollowing(false)
    } else {
      await supabase.from('story_follows')
        .insert({ user_id: profile.id, story_id: story.id })
      setFollowing(true)
    }
    setFollowLoading(false)
  }

  function shareStory() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <><Navbar /><div className="text-center py-16 text-gray-400 text-sm">Loading…</div></>
  if (!story) return null

  const doneChapters = chapters.filter(c => c.status === 'done')
  const biddingCh = chapters.find(c => c.status === 'bidding')
  const writingCh = chapters.find(c => c.status === 'writing' && profile && c.author_id === profile.id)
  const done = doneChapters.length
  const pct = Math.round((done / story.total_chapters) * 100)
  const totalLikes = doneChapters.reduce((sum, c) => sum + c.likes_count, 0)
  const myBid = biddingCh ? bids.find(b => b.bidder_id === profile?.id) : null
  const bidEligibility = profile && story ? canBid(profile, story) : { ok: false, reason: 'Sign in to bid' }

  // ── Reader ────────────────────────────────────────────────
  if (reading) {
    const idx = doneChapters.findIndex(c => c.id === reading.id)
    const prev = doneChapters[idx - 1] ?? null
    const next = doneChapters[idx + 1] ?? null

    return (
      <>
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8 text-sm">
            <button
              onClick={() => setReading(null)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft size={15} /> Back to story
            </button>
            <span className="text-gray-400">{story.title}</span>
          </div>

          <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Chapter {reading.chapter_num}</p>
          <h1 className="text-3xl font-medium mb-2 leading-tight">{reading.title}</h1>
          {reading.author_profile && (
            <p className="text-sm text-gray-400 mb-4">
              by{' '}
              <Link href={`/authors/${reading.author_profile.username}`} className="hover:text-brand-600 hover:underline">
                {reading.author_profile.display_name}
              </Link>
            </p>
          )}

          {/* Guideline toggle — off by default */}
          <button
            onClick={() => setShowGuideline(!showGuideline)}
            className="text-xs text-gray-400 hover:text-brand-500 flex items-center gap-1 mb-10 transition-colors"
          >
            <ChevronDown size={12} className={`transition-transform ${showGuideline ? 'rotate-180' : ''}`} />
            Story guideline
          </button>
          {showGuideline && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-10 text-sm text-blue-900 leading-relaxed">
              {story.guideline}
            </div>
          )}

          <div className="text-[19px] text-gray-700 leading-[1.95] space-y-5">
            {reading.content?.split('\n').map((para, i) =>
              para.trim() ? <p key={i}>{para}</p> : null
            )}
          </div>

          <div className="mt-12 pt-6 border-t border-gray-100 flex items-center justify-between">
            <button onClick={() => prev && setReading(prev)} disabled={!prev} className="btn disabled:opacity-30">
              <ChevronLeft size={15} /> Previous
            </button>
            <div className="flex items-center gap-3">
              {profile && reading.author_id !== profile.id && (
                <button onClick={() => likeChapter(reading)} className="btn gap-1.5 hover:text-red-500 hover:border-red-200 transition-colors">
                  <Heart size={14} /> {reading.likes_count}
                </button>
              )}
            </div>
            <button onClick={() => next ? setReading(next) : setReading(null)} disabled={!next} className="btn disabled:opacity-30">
              {next ? <>Next <ChevronRight size={15} /></> : 'Done'}
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── Story overview ────────────────────────────────────────
  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft size={15} /> All stories
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">

            {/* Header */}
            <div>
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div>
                  <h1 className="text-3xl font-medium leading-tight mb-2">{story.title}</h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge ${TIER_COLORS[story.tier]}`}>{story.tier}</span>
                    {story.mature && <span className="badge bg-red-50 text-red-700 border-red-200">18+</span>}
                    <span className="badge bg-gray-50 text-gray-500 border-gray-200">{story.genre}</span>
                    <span className={`badge ${story.status === 'complete' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      {story.status === 'complete' ? 'Complete' : 'In progress'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {profile && (
                    <button
                      onClick={toggleFollow}
                      disabled={followLoading}
                      className={`btn btn-sm gap-1.5 ${following ? 'bg-brand-50 text-brand-700 border-brand-200' : ''}`}
                    >
                      {following ? <><BellOff size={13} /> Following</> : <><Bell size={13} /> Follow</>}
                    </button>
                  )}
                  <button onClick={shareStory} className="btn btn-sm gap-1.5">
                    <Share2 size={13} /> {copied ? 'Copied!' : 'Share'}
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-500">
                Started by{' '}
                <Link href={`/authors/${(story.author_profile as any)?.username}`} className="text-gray-700 font-medium hover:text-brand-600 hover:underline">
                  {(story.author_profile as any)?.display_name}
                </Link>
                {' · '}{timeAgo(story.created_at)}
              </p>
            </div>

            {/* Guideline */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
              <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-2">Story guideline</p>
              <p className="text-sm text-blue-900 leading-relaxed">{story.guideline}</p>
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{done} of {story.total_chapters} chapters published</span>
                <span className="text-gray-400 flex items-center gap-1"><Heart size={13} /> {totalLikes} total likes</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div className="h-2 bg-brand-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {doneChapters.length > 0 && (
              <button onClick={() => setReading(doneChapters[0])} className="btn btn-primary w-full justify-center py-3 text-base">
                <BookOpen size={17} /> Read from chapter 1
              </button>
            )}

            {/* Chapter list */}
            <div className="card">
              <h2 className="font-medium mb-4">Chapters</h2>
              <div className="divide-y divide-gray-50">
                {chapters.map(ch => (
                  <div key={ch.id} className="flex items-center gap-3 py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                      ch.status === 'done'    ? 'bg-green-50 text-green-700 border border-green-100' :
                      ch.status === 'bidding' ? 'bg-brand-50 text-brand-700 border border-brand-100' :
                      ch.status === 'writing' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                      'bg-gray-50 text-gray-300 border border-gray-100'
                    }`}>{ch.chapter_num}</div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
                        {ch.status === 'done' ? (
                          <button onClick={() => setReading(ch)} className="hover:text-brand-600 hover:underline text-left">
                            {ch.title ?? `Chapter ${ch.chapter_num}`}
                          </button>
                        ) : (
                          <span className="text-gray-400">{ch.title ?? `Chapter ${ch.chapter_num}`}</span>
                        )}
                        {(ch.chapter_num === 1 || ch.chapter_num === story.total_chapters) && (
                          <span className="text-xs text-brand-400">(original author)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {(ch as any).author_profile && (
                          <Link href={`/authors/${(ch as any).author_profile.username}`} className="hover:text-brand-500 hover:underline">
                            {(ch as any).author_profile.display_name}
                          </Link>
                        )}
                        {ch.status === 'done' && <><span>·</span><span>{ch.likes_count} likes</span>{ch.avg_rating > 0 && <><span>·</span><span>{ch.avg_rating.toFixed(1)}★</span></>}</>}
                        {ch.status === 'bidding' && ch.bid_deadline && (
                          <span className={`flex items-center gap-1 ${isUrgent(ch.bid_deadline) ? 'text-red-500' : ''}`}>
                            <Clock size={10} /> {bids.length} bids · {timeUntil(ch.bid_deadline)} left
                          </span>
                        )}
                        {ch.status === 'writing' && ch.write_deadline && <span>Due in {timeUntil(ch.write_deadline)}</span>}
                        {ch.status === 'locked' && <span>Waiting</span>}
                      </div>
                    </div>

                    <div className="flex gap-1.5 flex-shrink-0">
                      {ch.status === 'done' && <button onClick={() => setReading(ch)} className="btn btn-sm">Read</button>}
                      {ch.status === 'done' && profile && ch.author_id !== profile.id && (
                        <button onClick={() => likeChapter(ch)} className="btn btn-sm text-gray-400 hover:text-red-500"><Heart size={13} /></button>
                      )}
                      {ch.status === 'writing' && profile && ch.author_id === profile.id && (
                        <button onClick={() => setWriting(ch)} className="btn btn-primary btn-sm">Write</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {biddingCh && (
              <div className="card">
                <h3 className="font-medium text-sm mb-1">Chapter {biddingCh.chapter_num} — Bidding open</h3>
                {biddingCh.bid_deadline && (
                  <p className={`text-xs mb-3 flex items-center gap-1 ${isUrgent(biddingCh.bid_deadline) ? 'text-red-500' : 'text-gray-400'}`}>
                    <Clock size={12} /> {timeUntil(biddingCh.bid_deadline)} remaining
                  </p>
                )}
                {bids.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {bids.slice(0, 5).map((bid, i) => (
                      <div key={bid.id} className="flex items-center gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-700 text-xs flex items-center justify-center font-medium flex-shrink-0">{i + 1}</span>
                        <span className="flex-1 truncate text-xs">{(bid.bidder_profile as any)?.display_name}</span>
                        <span className="font-medium text-brand-600 text-xs">{bid.amount} pts</span>
                      </div>
                    ))}
                  </div>
                )}
                {bids.length === 0 && <p className="text-xs text-gray-400 mb-3">No bids yet — be first.</p>}
                {!profile ? (
                  <Link href="/auth" className="btn btn-primary w-full justify-center btn-sm">Sign in to bid</Link>
                ) : bidEligibility.ok && !myBid ? (
                  <button onClick={() => setBidding(true)} className="btn btn-primary w-full justify-center btn-sm">
                    <Gavel size={13} /> Place a bid
                  </button>
                ) : !bidEligibility.ok ? (
                  <p className="text-xs text-gray-400 text-center">{bidEligibility.reason}</p>
                ) : myBid ? (
                  <div className="bg-green-50 border border-green-100 rounded-lg p-2 text-xs text-green-700 text-center">
                    ✓ Your bid: {myBid.amount} pts staked
                  </div>
                ) : null}
              </div>
            )}

            {writingCh && (
              <div className="card bg-amber-50 border-amber-100">
                <p className="text-sm font-medium text-amber-800 mb-1">Your chapter is due</p>
                <p className="text-xs text-amber-600 mb-3">Chapter {writingCh.chapter_num} · {writingCh.write_deadline ? timeUntil(writingCh.write_deadline) + ' left' : ''}</p>
                <button onClick={() => setWriting(writingCh)} className="btn btn-primary btn-sm w-full justify-center">
                  <Pencil size={13} /> Write now
                </button>
              </div>
            )}

            {/* Follow card */}
            {profile && (
              <div className="card text-center">
                <Bell size={20} className={`mx-auto mb-2 ${following ? 'text-brand-400' : 'text-gray-300'}`} />
                <p className="text-sm font-medium mb-1">{following ? 'Following this story' : 'Follow this story'}</p>
                <p className="text-xs text-gray-400 mb-3">
                  {following ? 'You\'ll be notified when new chapters are published.' : 'Get notified when new chapters are published.'}
                </p>
                <button
                  onClick={toggleFollow}
                  disabled={followLoading}
                  className={`btn btn-sm w-full justify-center ${following ? 'btn-danger' : 'btn-primary'}`}
                >
                  {following ? <><BellOff size={13} /> Unfollow</> : <><Bell size={13} /> Follow</>}
                </button>
              </div>
            )}

            <div className="card">
              <h3 className="font-medium text-sm mb-3">About this story</h3>
              <div className="space-y-2 text-sm divide-y divide-gray-50">
                {[
                  { label: 'Author', value: (story.author_profile as any)?.display_name },
                  { label: 'Genre', value: story.genre },
                  { label: 'Progress', value: `${done}/${story.total_chapters} chapters` },
                  { label: 'Total likes', value: totalLikes },
                  { label: 'Started', value: timeAgo(story.created_at) },
                ].map(row => (
                  <div key={row.label} className="flex justify-between py-2">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="text-gray-800">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {bidding && biddingCh && profile && (
        <BidModal chapter={biddingCh} story={story} profile={profile}
          onClose={() => setBidding(false)} onBid={() => { setBidding(false); loadData() }} />
      )}
      {writing && story && (
        <WriteChapterModal chapter={writing} story={story}
          onClose={() => setWriting(null)} onSubmit={() => { setWriting(null); loadData() }} />
      )}
    </>
  )
}
