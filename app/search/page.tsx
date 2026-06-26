'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Story, Profile } from '@/types'
import { TIER_COLORS, truncate, timeAgo } from '@/lib/utils'
import { Search, BookOpen, Users, SlidersHorizontal, X } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

const GENRES = [
  'All genres','Fantasy','Science Fiction','Mystery','Thriller','Horror',
  'Literary Fiction','Historical Fiction','Romance','Adventure','Crime',
  'Dystopian','Magical Realism','Western','Noir','Satire','Young Adult',
]
const TIERS = ['All tiers','Open','Established','Advanced','Elite']
const STATUSES = ['All','Active','Complete']
const SORT_OPTIONS = [
  { value: 'newest',    label: 'Newest first' },
  { value: 'oldest',   label: 'Oldest first' },
  { value: 'most_liked', label: 'Most liked' },
  { value: 'az',       label: 'A–Z' },
]

export default function SearchPage() {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'stories' | 'authors'>('stories')
  const [genre, setGenre] = useState('All genres')
  const [tier, setTier] = useState('All tiers')
  const [status, setStatus] = useState('All')
  const [sort, setSort] = useState('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [stories, setStories] = useState<Story[]>([])
  const [authors, setAuthors] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async () => {
    setLoading(true)
    if (mode === 'stories') {
      let q = supabase
        .from('stories')
        .select('*, author_profile:profiles!original_author(*), chapters(*)')

      if (query.trim()) q = q.ilike('title', `%${query}%`)
      if (genre !== 'All genres') q = q.eq('genre', genre)
      if (tier !== 'All tiers') q = q.eq('tier', tier)
      if (status === 'Active') q = q.eq('status', 'active')
      if (status === 'Complete') q = q.eq('status', 'complete')

      if (sort === 'newest') q = q.order('created_at', { ascending: false })
      else if (sort === 'oldest') q = q.order('created_at', { ascending: true })
      else if (sort === 'az') q = q.order('title', { ascending: true })

      const { data } = await q.limit(30)
      let results = data || []

      if (sort === 'most_liked') {
        results = results.sort((a, b) => {
          const aLikes = (a.chapters || []).reduce((s: number, c: any) => s + c.likes_count, 0)
          const bLikes = (b.chapters || []).reduce((s: number, c: any) => s + c.likes_count, 0)
          return bLikes - aLikes
        })
      }
      setStories(results)
    } else {
      let q = supabase.from('profiles').select('*')
      if (query.trim()) q = q.or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
      q = q.order('lifetime_likes', { ascending: false }).limit(30)
      const { data } = await q
      setAuthors(data || [])
    }
    setLoading(false)
  }, [query, mode, genre, tier, status, sort])

  useEffect(() => {
    const t = setTimeout(search, 300)
    return () => clearTimeout(t)
  }, [search])

  const clearFilters = () => {
    setGenre('All genres'); setTier('All tiers'); setStatus('All'); setSort('newest')
  }
  const hasFilters = genre !== 'All genres' || tier !== 'All tiers' || status !== 'All' || sort !== 'newest'

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-xl font-medium mb-5">Search</h1>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 pr-4 text-base"
            placeholder={mode === 'stories' ? 'Search stories by title…' : 'Search authors by name or username…'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Mode + filter toggle */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setMode('stories')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${mode === 'stories' ? 'bg-brand-50 text-brand-800 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
            ><BookOpen size={14} /> Stories</button>
            <button
              onClick={() => setMode('authors')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border-l border-gray-200 transition-colors ${mode === 'authors' ? 'bg-brand-50 text-brand-800 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
            ><Users size={14} /> Authors</button>
          </div>

          {mode === 'stories' && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn btn-sm gap-1.5 ${hasFilters ? 'bg-brand-50 text-brand-700 border-brand-200' : ''}`}
            >
              <SlidersHorizontal size={13} /> Filters
              {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
            </button>
          )}
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-700">Clear all</button>
          )}
        </div>

        {/* Filters panel */}
        {showFilters && mode === 'stories' && (
          <div className="card mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="field mb-0">
              <label className="label">Genre</label>
              <select className="select text-sm" value={genre} onChange={e => setGenre(e.target.value)}>
                {GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="field mb-0">
              <label className="label">Tier</label>
              <select className="select text-sm" value={tier} onChange={e => setTier(e.target.value)}>
                {TIERS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field mb-0">
              <label className="label">Status</label>
              <select className="select text-sm" value={status} onChange={e => setStatus(e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="field mb-0">
              <label className="label">Sort by</label>
              <select className="select text-sm" value={sort} onChange={e => setSort(e.target.value)}>
                {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Results */}
        {loading && <div className="text-center py-12 text-gray-400 text-sm">Searching…</div>}

        {!loading && mode === 'stories' && (
          <div>
            {stories.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <BookOpen size={28} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">{query ? `No stories found for "${query}"` : 'No stories yet.'}</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-3">{stories.length} result{stories.length !== 1 ? 's' : ''}</p>
                <div className="space-y-3">
                  {stories.map(story => {
                    const done = story.chapters?.filter((c: any) => c.status === 'done').length ?? 0
                    const pct = Math.round((done / story.total_chapters) * 100)
                    const likes = story.chapters?.reduce((s: number, c: any) => s + c.likes_count, 0) ?? 0
                    return (
                      <Link key={story.id} href={`/stories/${story.id}`} className="card block hover:border-brand-200 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h3 className="font-medium">{story.title}</h3>
                            <p className="text-xs text-gray-400 mt-0.5">by {(story.author_profile as any)?.display_name}</p>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                            <span className={`badge ${TIER_COLORS[story.tier]}`}>{story.tier}</span>
                            {story.mature && <span className="badge bg-red-50 text-red-700 border-red-200">18+</span>}
                            <span className="badge bg-gray-50 text-gray-500 border-gray-200">{story.genre}</span>
                            <span className={`badge ${story.status === 'complete' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                              {story.status === 'complete' ? 'Complete' : 'Active'}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">{truncate(story.guideline, 110)}</p>
                        <div className="h-1 bg-gray-100 rounded-full mb-2">
                          <div className="h-1 bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>{done}/{story.total_chapters} chapters · {likes} likes</span>
                          <span>{timeAgo(story.created_at)}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {!loading && mode === 'authors' && (
          <div>
            {authors.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users size={28} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">{query ? `No authors found for "${query}"` : 'No authors yet.'}</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-3">{authors.length} result{authors.length !== 1 ? 's' : ''}</p>
                <div className="space-y-2">
                  {authors.map(author => (
                    <Link key={author.id} href={`/authors/${author.username}`} className="card block hover:border-brand-200 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-800 flex items-center justify-center font-medium flex-shrink-0">
                          {author.display_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{author.display_name}</div>
                          <div className="text-xs text-gray-400">@{author.username}</div>
                          {author.bio && <p className="text-xs text-gray-500 mt-0.5 truncate">{author.bio}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-medium">{author.lifetime_likes}</div>
                          <div className="text-xs text-gray-400">likes</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </>
  )
}
