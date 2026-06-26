'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile, Story, Chapter } from '@/types'
import { getRank } from '@/types'
import { RANK_COLORS, TIER_COLORS, formatPoints, timeUntil } from '@/lib/utils'
import { Pencil, AlertTriangle, Coins, Heart, Zap, Bell, Gavel, Clock } from 'lucide-react'
import Navbar from '@/components/Navbar'
import WriteChapterModal from '@/components/chapter/WriteChapterModal'
import Link from 'next/link'

export default function MyStoriesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [myStories, setMyStories] = useState<Story[]>([])
  const [followedStories, setFollowedStories] = useState<Story[]>([])
  const [writingChapters, setWritingChapters] = useState<{ story: Story; chapter: Chapter }[]>([])
  const [activeBids, setActiveBids] = useState<{ story: Story; chapter: Chapter; myAmount: number }[]>([])
  const [writing, setWriting] = useState<{ story: Story; chapter: Chapter } | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'mine' | 'following'>('mine')
  const [now, setNow] = useState(Date.now())

  useEffect(() => { loadData() }, [])

  // Live-ticking clock for countdowns
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)

    // Stories I started
    const { data: stories } = await supabase
      .from('stories')
      .select('*, author_profile:profiles!original_author(*), chapters(*)')
      .eq('original_author', user.id)
      .order('created_at', { ascending: false })
    setMyStories(stories || [])

    // Chapters I need to write
    const { data: myChapters } = await supabase
      .from('chapters').select('story_id').eq('author_id', user.id)
    const storyIds = [...new Set((myChapters || []).map((r: any) => r.story_id))]

    const toWrite: { story: Story; chapter: Chapter }[] = []
    if (storyIds.length > 0) {
      const { data: contribStories } = await supabase
        .from('stories').select('*, chapters(*)').in('id', storyIds)
      for (const s of contribStories || []) {
        for (const ch of s.chapters || []) {
          if (ch.status === 'writing' && ch.author_id === user.id) {
            toWrite.push({ story: s, chapter: ch })
          }
        }
      }
    }
    setWritingChapters(toWrite)

    // Chapters I currently have an active bid on
    const { data: myBids } = await supabase
      .from('bids')
      .select('*, chapter:chapters(*, story:stories(*, author_profile:profiles!original_author(*)))')
      .eq('bidder_id', user.id)
      .eq('status', 'active')

    const bidItems: { story: Story; chapter: Chapter; myAmount: number }[] = []
    for (const b of myBids || []) {
      const ch = b.chapter as any
      if (ch?.status === 'bidding' && ch.story) {
        bidItems.push({ story: ch.story, chapter: ch, myAmount: b.amount })
      }
    }
    setActiveBids(bidItems)

    // Stories I'm following
    const { data: follows } = await supabase
      .from('story_follows')
      .select('story_id')
      .eq('user_id', user.id)
    const followIds = (follows || []).map((f: any) => f.story_id)
    if (followIds.length > 0) {
      const { data: followed } = await supabase
        .from('stories')
        .select('*, author_profile:profiles!original_author(*), chapters(*)')
        .in('id', followIds)
        .order('created_at', { ascending: false })
      setFollowedStories(followed || [])
    }

    setLoading(false)
  }

  async function forfeitChapter(story: Story, chapter: Chapter) {
    if (!profile) return
    if (!confirm('Forfeit this chapter? You will receive a strike and lose your staked points.')) return
    await supabase.rpc('handle_missed_deadline', { p_chapter_id: chapter.id })
    loadData()
  }

  if (loading) return <><Navbar /><div className="text-center py-16 text-gray-400 text-sm">Loading…</div></>
  if (!profile) return null

  const rank = getRank(profile.lifetime_likes)

  const StoryCard = ({ story }: { story: Story }) => {
    const done = story.chapters?.filter((c: any) => c.status === 'done').length ?? 0
    const pct = Math.round((done / story.total_chapters) * 100)
    const totalLikes = story.chapters?.reduce((s: number, c: any) => s + c.likes_count, 0) ?? 0
    const biddingCh = story.chapters?.find((c: any) => c.status === 'bidding')
    return (
      <Link href={`/stories/${story.id}`} className="card block hover:border-brand-200 transition-colors">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-medium">{story.title}</h3>
              <span className={`badge ${TIER_COLORS[story.tier]}`}>{story.tier}</span>
              <span className={`badge ${story.status === 'complete' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                {story.status === 'complete' ? 'Complete' : 'Active'}
              </span>
            </div>
            <p className="text-xs text-gray-400">{story.genre} · by {(story as any).author_profile?.display_name}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
            <Heart size={12} /> {totalLikes}
          </div>
        </div>
        <div className="h-1 bg-gray-100 rounded-full mb-2">
          <div className="h-1 bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{done}/{story.total_chapters} chapters published</span>
          {biddingCh && <span className="text-brand-500 flex items-center gap-1"><Gavel size={11} /> Bidding open</span>}
        </div>
      </Link>
    )
  }

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-xl font-medium mb-5">My Stories</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="stat-card"><div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Heart size={12} /> Total likes</div><div className="text-2xl font-medium">{profile.lifetime_likes}</div></div>
          <div className="stat-card"><div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Coins size={12} /> Points</div><div className="text-2xl font-medium">{formatPoints(profile.points)}</div></div>
          <div className="stat-card"><div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Zap size={12} /> Rank</div><div className="mt-0.5"><span className={`badge ${RANK_COLORS[rank]}`}>{rank}</span></div></div>
        </div>

        {profile.strikes > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5 flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle size={15} /> {profile.strikes}/3 strikes.
            {profile.strikes >= 3 ? ' Bidding suspended for 30 days.' : ' One more miss and bidding will be suspended.'}
          </div>
        )}

        {/* Active countdowns — everything with a live clock you're personally involved in */}
        {(() => {
          type CountdownItem = {
            story: Story
            label: string
            deadline: string
            urgent: boolean
            kind: 'write' | 'bid'
            href: string
          }

          const items: CountdownItem[] = []

          for (const { story, chapter } of writingChapters) {
            if (chapter.write_deadline) {
              items.push({
                story,
                label: `Ch. ${chapter.chapter_num} due`,
                deadline: chapter.write_deadline,
                urgent: new Date(chapter.write_deadline).getTime() - now < 24 * 3600 * 1000,
                kind: 'write',
                href: `/stories/${story.id}`,
              })
            }
          }
          for (const { story, chapter, myAmount } of activeBids) {
            if (chapter.bid_deadline) {
              items.push({
                story,
                label: `Bid: ${myAmount} pts on Ch. ${chapter.chapter_num}`,
                deadline: chapter.bid_deadline,
                urgent: new Date(chapter.bid_deadline).getTime() - now < 6 * 3600 * 1000,
                kind: 'bid',
                href: `/stories/${story.id}`,
              })
            }
          }
          // Stories I originated that currently have bidding open
          for (const s of myStories) {
            const biddingCh = s.chapters?.find((c: any) => c.status === 'bidding')
            if (biddingCh?.bid_deadline) {
              items.push({
                story: s,
                label: `Your story — bidding open on Ch. ${biddingCh.chapter_num}`,
                deadline: biddingCh.bid_deadline,
                urgent: new Date(biddingCh.bid_deadline).getTime() - now < 6 * 3600 * 1000,
                kind: 'bid',
                href: `/stories/${s.id}`,
              })
            }
          }

          items.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())

          if (items.length === 0) return null

          return (
            <div className="mb-6">
              <h2 className="text-base font-medium mb-3">Active countdowns</h2>
              <div className="space-y-2">
                {items.map((item, i) => {
                  const msLeft = new Date(item.deadline).getTime() - now
                  const expired = msLeft <= 0
                  return (
                    <Link
                      key={i}
                      href={item.href}
                      className="card flex items-center justify-between gap-3 hover:border-brand-200 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{item.story.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                          {item.kind === 'write' ? <Pencil size={11} /> : <Gavel size={11} />}
                          {item.label}
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 text-sm font-medium tabular-nums flex-shrink-0 ${
                        expired ? 'text-gray-400' : item.urgent ? 'text-red-500' : 'text-gray-600'
                      }`}>
                        <Clock size={13} /> {expired ? 'Ending…' : timeUntil(item.deadline)}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Chapters to write */}
        {writingChapters.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base font-medium mb-3">Chapters to write</h2>
            <div className="space-y-2">
              {writingChapters.map(({ story, chapter }) => (
                <div key={chapter.id} className="card flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{story.title} — Ch. {chapter.chapter_num}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{chapter.write_deadline ? `Due in ${timeUntil(chapter.write_deadline)}` : 'No deadline'}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setWriting({ story, chapter })} className="btn btn-primary btn-sm"><Pencil size={13} /> Write</button>
                    <button onClick={() => forfeitChapter(story, chapter)} className="btn btn-danger btn-sm">Forfeit</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-100 mb-5">
          {[
            { id: 'mine' as const,      label: 'My stories',      icon: Pencil, count: myStories.length },
            { id: 'following' as const, label: 'Following',        icon: Bell,   count: followedStories.length },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${tab === t.id ? 'border-brand-400 text-brand-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              <t.icon size={14} /> {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>
            </button>
          ))}
        </div>

        {tab === 'mine' && (
          myStories.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm mb-3">You haven't started any stories yet.</p>
              <Link href="/" className="btn btn-primary btn-sm">Start a story</Link>
            </div>
          ) : (
            <div className="space-y-3">{myStories.map(s => <StoryCard key={s.id} story={s} />)}</div>
          )
        )}

        {tab === 'following' && (
          followedStories.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Bell size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm mb-3">You're not following any stories yet.</p>
              <Link href="/" className="btn btn-primary btn-sm">Browse stories</Link>
            </div>
          ) : (
            <div className="space-y-3">{followedStories.map(s => <StoryCard key={s.id} story={s} />)}</div>
          )
        )}
      </main>

      {writing && (
        <WriteChapterModal
          chapter={writing.chapter} story={writing.story}
          onClose={() => setWriting(null)}
          onSubmit={() => { setWriting(null); loadData() }}
        />
      )}
    </>
  )
}
