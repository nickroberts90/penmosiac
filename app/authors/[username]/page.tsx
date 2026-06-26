'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile, Story, Chapter } from '@/types'
import { getRank, RANKS } from '@/types'
import { RANK_COLORS, TIER_COLORS, formatPoints, timeAgo } from '@/lib/utils'
import { Heart, BookOpen, Pencil, Star, ArrowLeft, MessageSquare, CheckCircle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

type ContributedChapter = Chapter & { story: Story }

export default function AuthorPage() {
  const { username } = useParams<{ username: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [author, setAuthor] = useState<Profile | null>(null)
  const [me, setMe] = useState<Profile | null>(null)
  const [myStories, setMyStories] = useState<Story[]>([])
  const [contributions, setContributions] = useState<ContributedChapter[]>([])
  const [tab, setTab] = useState<'stories' | 'contributions'>('stories')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [username])

  async function loadData() {
    // Get logged-in user
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setMe(p)
    }

    // Get the author being viewed
    const { data: a } = await supabase
      .from('profiles').select('*').eq('username', username).single()
    if (!a) { router.push('/'); return }
    setAuthor(a)

    // Their stories
    const { data: stories } = await supabase
      .from('stories')
      .select('*, chapters(*)')
      .eq('original_author', a.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setMyStories(stories || [])

    // Their contributions to other stories
    const { data: chaps } = await supabase
      .from('chapters')
      .select('*, story:stories(*)')
      .eq('author_id', a.id)
      .eq('status', 'done')
      .order('created_at', { ascending: false })

    const contrib = (chaps || []).filter(
      (ch: any) => ch.story?.original_author !== a.id
    ) as ContributedChapter[]
    setContributions(contrib)
    setLoading(false)
  }

  if (loading) return <><Navbar /><div className="text-center py-16 text-gray-400 text-sm">Loading…</div></>
  if (!author) return null

  const rank = getRank(author.lifetime_likes)
  const rankIdx = RANKS.findIndex(r => r.name === rank)
  const nextRank = RANKS[rankIdx + 1]
  const progress = nextRank
    ? Math.min(100, Math.round(((author.lifetime_likes - RANKS[rankIdx].min) / (nextRank.min - RANKS[rankIdx].min)) * 100))
    : 100
  const totalLikes = contributions.reduce((s, c) => s + c.likes_count, 0)
    + myStories.flatMap(s => s.chapters || []).reduce((s: number, c: any) => s + c.likes_count, 0)
  const isOwnProfile = me?.id === author.id

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/search" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft size={15} /> Back to search
        </Link>

        {/* Author header */}
        <div className="card mb-6">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="w-16 h-16 rounded-2xl bg-brand-100 text-brand-800 flex items-center justify-center text-2xl font-medium flex-shrink-0">
              {author.display_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-medium">{author.display_name}</h1>
                <span className={`badge ${RANK_COLORS[rank]}`}>{rank}</span>
                {author.sample_done && (
                  <span className="badge bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                    <CheckCircle size={10} /> Verified author
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-2">@{author.username}</p>
              {author.bio
                ? <p className="text-sm text-gray-600 leading-relaxed">{author.bio}</p>
                : <p className="text-sm text-gray-300 italic">No bio yet.</p>
              }
            </div>
            <div className="flex gap-3 flex-shrink-0 flex-wrap">
              {[
                { label: 'Lifetime likes', value: author.lifetime_likes },
                { label: 'Stories', value: myStories.length },
                { label: 'Contributions', value: contributions.length },
              ].map(s => (
                <div key={s.label} className="stat-card text-center min-w-[80px]">
                  <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                  <div className="text-lg font-medium">{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Rank progress */}
          <div className="mt-5 pt-5 border-t border-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">{rank} → {nextRank?.name ?? 'Max rank'}</span>
              <span className="text-xs text-gray-400">{author.lifetime_likes} / {nextRank?.min ?? '∞'} likes</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full">
              <div className="h-1.5 bg-brand-400 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Actions */}
          {!isOwnProfile && me && (
            <div className="mt-4 pt-4 border-t border-gray-50 flex gap-2">
              <Link
                href={`/messages?with=${author.username}`}
                className="btn btn-sm gap-1.5"
              >
                <MessageSquare size={13} /> Message {author.display_name.split(' ')[0]}
              </Link>
            </div>
          )}
          {isOwnProfile && (
            <div className="mt-4 pt-4 border-t border-gray-50">
              <Link href="/profile" className="btn btn-sm">Edit your profile</Link>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-100 mb-6">
          {[
            { id: 'stories' as const,       label: 'Stories',       count: myStories.length },
            { id: 'contributions' as const, label: 'Contributions', count: contributions.length },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-colors ${
                tab === t.id ? 'border-brand-400 text-brand-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Stories tab */}
        {tab === 'stories' && (
          myStories.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <BookOpen size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No stories started yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myStories.map(story => {
                const done = story.chapters?.filter((c: any) => c.status === 'done').length ?? 0
                const pct = Math.round((done / story.total_chapters) * 100)
                const likes = story.chapters?.reduce((s: number, c: any) => s + c.likes_count, 0) ?? 0
                return (
                  <Link key={story.id} href={`/stories/${story.id}`} className="card block hover:border-brand-200 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="font-medium">{story.title}</h3>
                        <p className="text-xs text-gray-400">{story.genre}</p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <span className={`badge ${TIER_COLORS[story.tier]}`}>{story.tier}</span>
                        {story.mature && <span className="badge bg-red-50 text-red-700 border-red-200">18+</span>}
                      </div>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full mb-2">
                      <div className="h-1 bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{done}/{story.total_chapters} chapters</span>
                      <span className="flex items-center gap-1"><Heart size={11} /> {likes}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        )}

        {/* Contributions tab */}
        {tab === 'contributions' && (
          contributions.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Pencil size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No chapter contributions yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contributions.map(ch => (
                <Link key={ch.id} href={`/stories/${ch.story_id}`} className="card block hover:border-brand-200 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Ch. {ch.chapter_num}</span>
                        <h3 className="font-medium text-sm">{ch.title}</h3>
                      </div>
                      <p className="text-xs text-gray-400">
                        in <span className="text-gray-600">{(ch.story as any)?.title}</span>
                        <span className="ml-2">{timeAgo(ch.created_at)}</span>
                      </p>
                      {ch.content && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">{ch.content}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Heart size={11} /> {ch.likes_count}</span>
                      {ch.avg_rating > 0 && <span className="flex items-center gap-1"><Star size={11} /> {ch.avg_rating.toFixed(1)}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </main>
    </>
  )
}
