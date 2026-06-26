'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Profile, Story } from '@/types'
import { getRank } from '@/types'
import { RANK_COLORS, TIER_COLORS } from '@/lib/utils'
import { Trophy, Heart, BookOpen, Pencil, Star, Crown } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

type AuthorRow = Profile & { total_likes: number; chapters_written: number; stories_started: number }
type StoryRow  = Story  & { total_likes: number; done_chapters: number }

export default function LeaderboardPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'authors' | 'stories'>('authors')
  const [authors, setAuthors] = useState<AuthorRow[]>([])
  const [stories, setStories] = useState<StoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setMe(data.user.id) })
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    // Top authors by lifetime likes
    const { data: authorData } = await supabase
      .from('profiles')
      .select('*')
      .order('lifetime_likes', { ascending: false })
      .limit(20)

    // Enrich with chapter counts
    const enriched: AuthorRow[] = []
    for (const a of authorData || []) {
      const { count: chapCount } = await supabase
        .from('chapters').select('id', { count: 'exact', head: true })
        .eq('author_id', a.id).eq('status', 'done')
      const { count: storyCount } = await supabase
        .from('stories').select('id', { count: 'exact', head: true })
        .eq('original_author', a.id)
      enriched.push({ ...a, total_likes: a.lifetime_likes, chapters_written: chapCount ?? 0, stories_started: storyCount ?? 0 })
    }
    setAuthors(enriched)

    // Top stories by total chapter likes
    const { data: storyData } = await supabase
      .from('stories')
      .select('*, author_profile:profiles!original_author(*), chapters(*)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50)

    const storyRows: StoryRow[] = (storyData || []).map(s => ({
      ...s,
      total_likes: (s.chapters || []).reduce((sum: number, c: any) => sum + c.likes_count, 0),
      done_chapters: (s.chapters || []).filter((c: any) => c.status === 'done').length,
    })).sort((a, b) => b.total_likes - a.total_likes).slice(0, 20)
    setStories(storyRows)

    setLoading(false)
  }

  const medal = (i: number) => {
    if (i === 0) return <Crown size={16} className="text-amber-400" />
    if (i === 1) return <Trophy size={14} className="text-gray-400" />
    if (i === 2) return <Trophy size={14} className="text-amber-700" />
    return <span className="text-xs text-gray-400 font-medium w-4 text-center">{i + 1}</span>
  }

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Trophy size={20} className="text-amber-500" />
          <h1 className="text-xl font-medium">Leaderboard</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-100 mb-6">
          {[
            { id: 'authors' as const, label: 'Top authors', icon: Star },
            { id: 'stories' as const, label: 'Top stories', icon: BookOpen },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${
                tab === t.id ? 'border-brand-400 text-brand-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>}

        {/* Authors leaderboard */}
        {!loading && tab === 'authors' && (
          <div className="space-y-2">
            {authors.map((a, i) => {
              const rank = getRank(a.lifetime_likes)
              const isMe = a.id === me
              return (
                <Link
                  key={a.id}
                  href={`/authors/${a.username}`}
                  className={`card flex items-center gap-4 hover:border-brand-200 transition-colors ${isMe ? 'border-brand-200 bg-brand-50/30' : ''}`}
                >
                  {/* Position */}
                  <div className="w-8 flex items-center justify-center flex-shrink-0">
                    {medal(i)}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-800 flex items-center justify-center font-medium flex-shrink-0">
                    {a.display_name[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{a.display_name}</span>
                      {isMe && <span className="text-xs text-brand-500">(you)</span>}
                      <span className={`badge text-xs ${RANK_COLORS[rank]}`}>{rank}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      @{a.username} · {a.stories_started} stor{a.stories_started !== 1 ? 'ies' : 'y'} · {a.chapters_written} chapter{a.chapters_written !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Likes */}
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 font-medium text-sm justify-end">
                      <Heart size={13} className="text-red-400" /> {a.total_likes.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">lifetime likes</div>
                  </div>
                </Link>
              )
            })}

            {authors.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">No authors yet.</div>
            )}
          </div>
        )}

        {/* Stories leaderboard */}
        {!loading && tab === 'stories' && (
          <div className="space-y-2">
            {stories.map((s, i) => {
              const pct = Math.round((s.done_chapters / s.total_chapters) * 100)
              return (
                <Link
                  key={s.id}
                  href={`/stories/${s.id}`}
                  className="card flex items-start gap-4 hover:border-brand-200 transition-colors"
                >
                  {/* Position */}
                  <div className="w-8 flex items-center justify-center flex-shrink-0 pt-1">
                    {medal(i)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm">{s.title}</span>
                      <span className={`badge ${TIER_COLORS[s.tier]}`}>{s.tier}</span>
                      {s.mature && <span className="badge bg-red-50 text-red-700 border-red-200">18+</span>}
                      <span className="badge bg-gray-50 text-gray-500 border-gray-200">{s.genre}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                      by {(s.author_profile as any)?.display_name} · {s.done_chapters}/{s.total_chapters} chapters
                    </p>
                    <div className="h-1 bg-gray-100 rounded-full w-32">
                      <div className="h-1 bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {/* Likes */}
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 font-medium text-sm justify-end">
                      <Heart size={13} className="text-red-400" /> {s.total_likes.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">total likes</div>
                  </div>
                </Link>
              )
            })}

            {stories.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">No stories yet.</div>
            )}
          </div>
        )}
      </main>
    </>
  )
}
