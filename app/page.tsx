'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Story, Profile, StoryTier, StoryTemplate } from '@/types'
import { TIER_COLORS, timeUntil, isUrgent, truncate } from '@/lib/utils'
import { Clock, Plus, BookOpen, Lightbulb, ArrowRight, HelpCircle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import CreateStoryModal from '@/components/story/CreateStoryModal'
import Tutorial from '@/components/onboarding/Tutorial'
import Link from 'next/link'

const TIERS: (StoryTier | 'All')[] = ['All', 'Open', 'Established', 'Advanced', 'Elite']

const GENRE_COLORS: Record<string, string> = {
  'Literary Fiction':  'bg-purple-50 text-purple-800 border-purple-200',
  'Mystery':           'bg-blue-50 text-blue-800 border-blue-200',
  'Sci-Fi':            'bg-teal-50 text-teal-800 border-teal-200',
  'Horror':            'bg-red-50 text-red-800 border-red-200',
  'Historical Fiction':'bg-amber-50 text-amber-800 border-amber-200',
}

export default function DiscoverPage() {
  const supabase = createClient()
  const router = useRouter()
  const [stories, setStories] = useState<Story[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [templates, setTemplates] = useState<StoryTemplate[]>([])
  const [tierFilter, setTierFilter] = useState<StoryTier | 'All'>('All')
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showTutorial, setShowTutorial] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => { checkAuthThenLoad() }, [tierFilter])

  async function checkAuthThenLoad() {
    const { data: { user } } = await supabase.auth.getUser()

    // Logged-out visitors go to sign up/in first.
    // ?browse=1 lets them skip straight to a read-only story feed instead.
    const params = new URLSearchParams(window.location.search)
    const browsing = params.get('browse') === '1'

    if (!user && !browsing) {
      router.push('/auth')
      return
    }

    setCheckingAuth(false)
    loadData(user?.id)
  }

  async function loadData(userId?: string) {
    setLoading(true)
    if (userId) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(p)
      // Show tutorial automatically for new users who haven't completed their sample
      if (p && !p.sample_done) {
        const seen = localStorage.getItem(`tutorial_seen_${userId}`)
        if (!seen) setShowTutorial(true)
      }
    }

    let q = supabase
      .from('stories')
      .select(`*, author_profile:profiles!original_author(*), chapters(*)`)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (tierFilter !== 'All') q = q.eq('tier', tierFilter)
    const { data } = await q
    setStories(data || [])

    const { data: t } = await supabase.from('story_templates').select('*').order('id')
    setTemplates(t || [])

    setLoading(false)
  }

  const showPrompts = !profile || !profile.sample_done

  if (checkingAuth) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading…</div>
  }

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* Browsing banner for logged-out visitors who chose "just browsing" */}
        {!profile && (
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-6 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-medium text-brand-800">You're browsing as a guest</p>
              <p className="text-xs text-brand-600 mt-0.5">Sign up to like chapters, bid on stories, and start writing.</p>
            </div>
            <Link href="/auth" className="btn btn-primary btn-sm flex-shrink-0">
              Sign up free <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {/* Prompts section — shown to logged-out users and those without sample approval */}
        {showPrompts && templates.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lightbulb size={18} className="text-brand-400" />
                <h2 className="text-lg font-medium">Writing prompts</h2>
              </div>
              <Link href="/prompts" className="text-sm text-brand-500 hover:underline flex items-center gap-1">
                View all <ArrowRight size={13} />
              </Link>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {!profile
                ? 'New here? Pick a prompt below to write your sample story and unlock the platform.'
                : 'Pick one of these prompts to write your sample story and unlock bidding.'}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t, i) => (
                <div key={t.id} className="card flex flex-col gap-2 hover:border-brand-200 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className={`badge ${GENRE_COLORS[t.genre] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {t.genre}
                    </span>
                  </div>
                  <div className="font-medium text-sm">{t.title}</div>
                  <p className="text-xs text-gray-500 leading-relaxed flex-1">{truncate(t.prompt, 120)}</p>
                  <Link
                    href={profile ? '/sample' : '/auth'}
                    className="btn btn-sm btn-primary mt-1 justify-center"
                  >
                    {profile ? 'Write this' : 'Sign up to write'} <ArrowRight size={12} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stories section */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-medium">Stories</h1>
          <div className="flex items-center gap-2">
            {profile && (
              <button
                onClick={() => setShowTutorial(true)}
                className="btn btn-sm text-gray-400 border-transparent hover:text-brand-500"
                title="Open tutorial"
              >
                <HelpCircle size={16} />
              </button>
            )}
            {profile ? (
              <button onClick={() => setCreating(true)} className="btn btn-primary">
                <Plus size={15} /> Start a story
              </button>
            ) : (
              <Link href="/auth" className="btn btn-primary"><Plus size={15} /> Start a story</Link>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mb-5">
          {TIERS.map(t => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                tierFilter === t ? 'bg-brand-50 text-brand-800 border-brand-200 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >{t}</button>
          ))}
        </div>

        {loading && <div className="text-center py-12 text-gray-400 text-sm">Loading stories…</div>}

        {!loading && stories.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No stories yet in this tier. Be the first.</p>
          </div>
        )}

        <div className="space-y-3">
          {stories.map(story => {
            const biddingCh = story.chapters?.find(c => c.status === 'bidding')
            const doneCh = story.chapters?.filter(c => c.status === 'done').length ?? 0
            const pct = Math.round((doneCh / story.total_chapters) * 100)

            return (
              <Link
                key={story.id}
                href={`/stories/${story.id}`}
                className="card cursor-pointer hover:border-brand-200 transition-colors block"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h2 className="font-medium text-base">{story.title}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">by {story.author_profile?.display_name}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                    <span className={`badge ${TIER_COLORS[story.tier]}`}>{story.tier}</span>
                    {story.mature && <span className="badge bg-red-50 text-red-700 border-red-200">18+</span>}
                    <span className="badge bg-gray-50 text-gray-600 border-gray-200">{story.genre}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mb-3 leading-relaxed">{truncate(story.guideline, 120)}</p>

                <div className="h-1 bg-gray-100 rounded-full mb-2">
                  <div className="h-1 bg-brand-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{doneCh}/{story.total_chapters} chapters</span>
                  {biddingCh?.bid_deadline ? (
                    <span className={`flex items-center gap-1 ${isUrgent(biddingCh.bid_deadline) ? 'text-red-500' : ''}`}>
                      <Clock size={11} /> Bidding: {timeUntil(biddingCh.bid_deadline)}
                    </span>
                  ) : <span>No active bidding</span>}
                </div>
              </Link>
            )
          })}
        </div>
      </main>

      {creating && profile && (
        <CreateStoryModal
          profile={profile}
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); loadData() }}
        />
      )}

      {showTutorial && profile && (
        <Tutorial
          profile={profile}
          onClose={() => {
            setShowTutorial(false)
            localStorage.setItem(`tutorial_seen_${profile.id}`, '1')
          }}
          onComplete={() => {
            setShowTutorial(false)
            localStorage.setItem(`tutorial_seen_${profile.id}`, '1')
          }}
        />
      )}
    </>
  )
}

