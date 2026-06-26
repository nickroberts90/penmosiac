'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile, Story, Chapter, SampleSubmission, StoryTemplate } from '@/types'
import { getRank, RANKS } from '@/types'
import { RANK_COLORS, TIER_COLORS, formatPoints, timeAgo } from '@/lib/utils'
import {
  Heart, BookOpen, Pencil, CheckCircle, Star, AlertTriangle,
  Edit2, Save, X, Gavel, Lightbulb, Clock, XCircle, Flame
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

type ContributedChapter = Chapter & { story: Story }
type SampleWithTemplate = SampleSubmission & { template?: StoryTemplate }

const GENRE_COLORS: Record<string, string> = {
  'Literary Fiction':   'bg-purple-50 text-purple-800 border-purple-200',
  'Mystery':            'bg-blue-50 text-blue-800 border-blue-200',
  'Sci-Fi':             'bg-teal-50 text-teal-800 border-teal-200',
  'Horror':             'bg-red-50 text-red-800 border-red-200',
  'Historical Fiction': 'bg-amber-50 text-amber-800 border-amber-200',
}

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [myStories, setMyStories] = useState<Story[]>([])
  const [contributions, setContributions] = useState<ContributedChapter[]>([])
  const [samples, setSamples] = useState<SampleWithTemplate[]>([])
  const [templates, setTemplates] = useState<Record<string, StoryTemplate>>({})
  const [streak, setStreak] = useState<{ current_streak: number; longest_streak: number; total_logins: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'stories' | 'contributions' | 'samples' | 'stats'>('stories')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: p } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)
    setDisplayName(p?.display_name || '')
    setBio(p?.bio || '')

    // Stories I started
    const { data: stories } = await supabase
      .from('stories')
      .select('*, chapters(*)')
      .eq('original_author', user.id)
      .order('created_at', { ascending: false })
    setMyStories(stories || [])

    // Chapters I wrote in other people's stories
    const { data: myChapters } = await supabase
      .from('chapters')
      .select('*, story:stories(*)')
      .eq('author_id', user.id)
      .eq('status', 'done')
      .neq('chapter_num', 1)
      .order('created_at', { ascending: false })
    const contrib = (myChapters || []).filter(
      (ch: any) => ch.story?.original_author !== user.id
    ) as ContributedChapter[]
    setContributions(contrib)

    // Sample submissions
    const { data: subs } = await supabase
      .from('sample_submissions')
      .select('*')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })

    // Load templates for lookup
    const { data: tmpl } = await supabase.from('story_templates').select('*')
    const tmplMap: Record<string, StoryTemplate> = {}
    for (const t of tmpl || []) tmplMap[t.id] = t
    setTemplates(tmplMap)

    const subsWithTemplate = (subs || []).map(s => ({
      ...s,
      template: tmplMap[s.template_id],
    }))
    setSamples(subsWithTemplate)

    // Login streak
    const { data: streakData } = await supabase
      .from('login_streaks')
      .select('current_streak, longest_streak, total_logins')
      .eq('user_id', user.id)
      .single()
    setStreak(streakData)

    setLoading(false)
  }

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    await supabase.from('profiles').update({
      display_name: displayName.trim() || profile.display_name,
      bio: bio.trim(),
    }).eq('id', profile.id)
    setSaving(false)
    setEditing(false)
    loadData()
  }

  if (loading) return <><Navbar /><div className="text-center py-16 text-gray-400 text-sm">Loading…</div></>
  if (!profile) return null

  const rank = getRank(profile.lifetime_likes)
  const rankIdx = RANKS.findIndex(r => r.name === rank)
  const nextRank = RANKS[rankIdx + 1]
  const progress = nextRank
    ? Math.min(100, Math.round(((profile.lifetime_likes - RANKS[rankIdx].min) / (nextRank.min - RANKS[rankIdx].min)) * 100))
    : 100

  const totalLikes = contributions.reduce((sum, ch) => sum + ch.likes_count, 0)
    + myStories.flatMap(s => s.chapters || []).reduce((sum, ch) => sum + ch.likes_count, 0)
  const totalChaptersWritten = contributions.length
    + myStories.reduce((sum, s) => sum + (s.chapters?.filter(c => c.status === 'done').length || 0), 0)
  const avgRating = (() => {
    const rated = contributions.filter(ch => ch.avg_rating > 0)
    if (!rated.length) return null
    return (rated.reduce((sum, ch) => sum + ch.avg_rating, 0) / rated.length).toFixed(1)
  })()

  const approvedSample = samples.find(s => s.status === 'approved')
  const pendingSample = samples.find(s => s.status === 'pending')

  const TABS = [
    { id: 'stories' as const,       label: 'My stories',    icon: BookOpen,  count: myStories.length },
    { id: 'contributions' as const, label: 'Contributions', icon: Pencil,    count: contributions.length },
    { id: 'samples' as const,       label: 'Sample work',   icon: Lightbulb, count: samples.length },
    { id: 'stats' as const,         label: 'Stats',         icon: Star,      count: null },
  ]

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* Profile header */}
        <div className="card mb-6">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="w-16 h-16 rounded-2xl bg-brand-100 text-brand-800 flex items-center justify-center text-2xl font-medium flex-shrink-0">
              {profile.display_name[0]}
            </div>

            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-3">
                  <div className="field">
                    <label className="label">Display name</label>
                    <input className="input max-w-xs" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="label">Bio</label>
                    <textarea
                      className="textarea" rows={3} value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Tell other authors a bit about yourself…"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveProfile} disabled={saving} className="btn btn-primary btn-sm">
                      <Save size={13} /> {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditing(false)} className="btn btn-sm">
                      <X size={13} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-xl font-medium">{profile.display_name}</h1>
                    <span className={`badge ${RANK_COLORS[rank]}`}>{rank}</span>
                    {profile.strikes >= 3 && <span className="badge bg-red-50 text-red-700 border-red-200">Suspended</span>}
                  </div>
                  <p className="text-sm text-gray-400 mb-2">@{profile.username}</p>
                  {profile.bio
                    ? <p className="text-sm text-gray-600 leading-relaxed mb-3">{profile.bio}</p>
                    : <p className="text-sm text-gray-300 italic mb-3">No bio yet.</p>
                  }
                  <button onClick={() => setEditing(true)} className="btn btn-sm">
                    <Edit2 size={13} /> Edit profile
                  </button>
                </>
              )}
            </div>

            {!editing && (
              <div className="flex gap-3 flex-wrap flex-shrink-0">
                {[
                  { label: 'Points',  value: formatPoints(profile.points) },
                  { label: 'Likes',   value: profile.lifetime_likes },
                  { label: 'Stories', value: myStories.length },
                ].map(s => (
                  <div key={s.label} className="stat-card text-center min-w-[72px]">
                    <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                    <div className="text-lg font-medium">{s.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!editing && (
            <div className="mt-5 pt-5 border-t border-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-medium">{rank} → {nextRank?.name ?? 'Max rank'}</span>
                <span className="text-xs text-gray-400">{profile.lifetime_likes} / {nextRank?.min ?? '∞'} likes</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full">
                <div className="h-1.5 bg-brand-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Alerts */}
        {profile.strikes > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5 flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle size={15} />
            {profile.strikes}/3 strikes.
            {profile.strikes >= 3 ? ' Bidding suspended for 30 days.' : ' One more miss and bidding will be suspended.'}
          </div>
        )}
        {!profile.sample_done && (
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-5 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-brand-700">
              <Lightbulb size={15} />
              {pendingSample ? 'Your sample is under review — approval usually takes under 24 hours.' : 'Write a sample story to unlock bidding and story creation.'}
            </div>
            {!pendingSample && <Link href="/sample" className="btn btn-primary btn-sm flex-shrink-0">Write sample</Link>}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-100 mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-brand-400 text-brand-700 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.count !== null && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── MY STORIES ── */}
        {activeTab === 'stories' && (
          <div>
            {myStories.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <BookOpen size={28} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm mb-3">You haven't started any stories yet.</p>
                <Link href="/" className="btn btn-primary btn-sm">Start a story</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myStories.map(story => {
                  const done = story.chapters?.filter(c => c.status === 'done').length ?? 0
                  const pct = Math.round((done / story.total_chapters) * 100)
                  const totalStoryLikes = story.chapters?.reduce((sum, c) => sum + c.likes_count, 0) ?? 0
                  const biddingCh = story.chapters?.find(c => c.status === 'bidding')
                  return (
                    <div key={story.id} className="card hover:border-brand-200 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-medium">{story.title}</h3>
                            <span className={`badge ${TIER_COLORS[story.tier]}`}>{story.tier}</span>
                            <span className={`badge ${story.status === 'complete' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                              {story.status === 'complete' ? 'Complete' : 'Active'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{story.genre}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                          <Heart size={12} /> {totalStoryLikes}
                        </div>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full mb-2">
                        <div className="h-1 bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{done}/{story.total_chapters} chapters published</span>
                        {biddingCh && <span className="text-brand-500 flex items-center gap-1"><Gavel size={11} /> Bidding open</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CONTRIBUTIONS ── */}
        {activeTab === 'contributions' && (
          <div>
            {contributions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Pencil size={28} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm mb-3">You haven't written any chapters in other stories yet.</p>
                <Link href="/bids" className="btn btn-primary btn-sm">Browse open bids</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {contributions.map(ch => (
                  <div key={ch.id} className="card hover:border-brand-200 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Ch. {ch.chapter_num}</span>
                          <h3 className="font-medium text-sm">{ch.title}</h3>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                          in <span className="text-gray-600">{(ch.story as any)?.title}</span>
                          {ch.created_at && <span className="ml-2">{timeAgo(ch.created_at)}</span>}
                        </p>
                        {ch.content && (
                          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{ch.content}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Heart size={12} /> {ch.likes_count}</span>
                        {ch.avg_rating > 0 && <span className="flex items-center gap-1"><Star size={12} /> {ch.avg_rating.toFixed(1)}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SAMPLE WORK ── */}
        {activeTab === 'samples' && (
          <div>
            <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm text-gray-500 leading-relaxed">
              Sample stories are written from platform prompts and reviewed by an admin before your account is approved to bid and create stories. They're kept here as a permanent part of your writing history.
            </div>

            {samples.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Lightbulb size={28} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm mb-3">No sample submissions yet.</p>
                <Link href="/sample" className="btn btn-primary btn-sm">Write your sample</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {samples.map(sub => {
                  const statusConfig = {
                    approved: { label: 'Approved', icon: CheckCircle, cls: 'bg-green-50 text-green-700 border-green-200', iconCls: 'text-green-500' },
                    pending:  { label: 'Under review', icon: Clock, cls: 'bg-amber-50 text-amber-700 border-amber-200', iconCls: 'text-amber-500' },
                    rejected: { label: 'Not approved', icon: XCircle, cls: 'bg-red-50 text-red-700 border-red-200', iconCls: 'text-red-400' },
                  }[sub.status]

                  return (
                    <div key={sub.id} className="card">
                      {/* Sample header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-medium text-sm">
                              {sub.template?.title ?? 'Sample story'}
                            </h3>
                            {sub.template && (
                              <span className={`badge text-xs ${GENRE_COLORS[sub.template.genre] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                {sub.template.genre}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            Submitted {timeAgo(sub.submitted_at)}
                            {sub.reviewed_at && ` · Reviewed ${timeAgo(sub.reviewed_at)}`}
                          </p>
                        </div>
                        <span className={`badge ${statusConfig.cls} flex-shrink-0 flex items-center gap-1`}>
                          <statusConfig.icon size={11} />
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* Prompt used */}
                      {sub.template && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <p className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wide">Prompt</p>
                          <p className="text-xs text-gray-600 leading-relaxed">{sub.template.prompt}</p>
                        </div>
                      )}

                      {/* Their writing */}
                      <div className="border border-gray-100 rounded-lg p-4">
                        <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">Your story</p>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{sub.content}</p>
                        <p className="text-xs text-gray-300 mt-3">
                          {sub.content.trim().split(/\s+/).filter(Boolean).length} words
                        </p>
                      </div>

                      {/* Admin note if rejected */}
                      {sub.status === 'rejected' && sub.admin_note && (
                        <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-700">
                          <strong>Feedback:</strong> {sub.admin_note}
                        </div>
                      )}

                      {/* Retry if rejected */}
                      {sub.status === 'rejected' && (
                        <div className="mt-3">
                          <Link href="/sample" className="btn btn-sm btn-primary">
                            Try a different prompt
                          </Link>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STATS ── */}
        {activeTab === 'stats' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Total likes received', value: totalLikes, icon: Heart },
                { label: 'Chapters written',     value: totalChaptersWritten, icon: Pencil },
                { label: 'Stories started',      value: myStories.length, icon: BookOpen },
                { label: 'Avg chapter rating',   value: avgRating ? `${avgRating}★` : '—', icon: Star },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="stat-card">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <Icon size={12} /> {label}
                  </div>
                  <div className="text-2xl font-medium">{value}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 className="text-sm font-medium mb-4">Rank progress</h3>
              <div className="space-y-3">
                {RANKS.map(r => {
                  const achieved = profile.lifetime_likes >= r.min
                  const isCurrent = r.name === rank
                  return (
                    <div key={r.name} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${achieved ? 'bg-brand-400' : 'bg-gray-200'}`} />
                      <span className={`badge ${RANK_COLORS[r.name]} w-28 justify-center`}>{r.name}</span>
                      <span className="text-xs text-gray-400">{r.min.toLocaleString()} likes</span>
                      {isCurrent && <span className="text-xs text-brand-500 font-medium">← current</span>}
                      {achieved && !isCurrent && <CheckCircle size={13} className="text-green-400" />}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2"><Flame size={15} className="text-amber-500" /> Login streak</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Current streak', value: streak ? `${streak.current_streak} days` : '—' },
                  { label: 'Longest streak', value: streak ? `${streak.longest_streak} days` : '—' },
                  { label: 'Total logins',   value: streak ? streak.total_logins : '—' },
                ].map(s => (
                  <div key={s.label} className="stat-card text-center">
                    <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                    <div className="text-lg font-medium">{s.value}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">+5 pts every day you sign in · +10 bonus on day 7 and every 7th day after</p>
            </div>

            <div className="card">
              <h3 className="text-sm font-medium mb-4">Account</h3>
              <div className="space-y-0 text-sm divide-y divide-gray-50">
                {[
                  { label: 'Username',      value: `@${profile.username}` },
                  { label: 'Sample story',  value: profile.sample_done ? 'Approved' : pendingSample ? 'Under review' : 'Not submitted', valueClass: profile.sample_done ? 'text-green-600' : pendingSample ? 'text-amber-600' : 'text-gray-400' },
                  { label: 'Strikes',       value: `${profile.strikes}/3`, valueClass: profile.strikes > 0 ? 'text-red-500' : 'text-gray-400' },
                  { label: 'Member since',  value: new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) },
                ].map(row => (
                  <div key={row.label} className="flex justify-between py-2.5">
                    <span className="text-gray-500">{row.label}</span>
                    <span className={row.valueClass ?? 'text-gray-800'}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </>
  )
}
