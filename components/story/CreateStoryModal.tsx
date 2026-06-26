'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Profile, StoryTier } from '@/types'
import { TIER_MIN_RANK, getRankIndex, RANKS } from '@/types'
import { X } from 'lucide-react'

const GENRES = [
  'Fantasy',
  'Science Fiction',
  'Mystery',
  'Thriller',
  'Horror',
  'Literary Fiction',
  'Historical Fiction',
  'Romance',
  'Adventure',
  'Crime',
  'Dystopian',
  'Magical Realism',
  'Western',
  'Noir',
  'Satire',
  'Young Adult',
]

const TIERS: StoryTier[] = ['Open', 'Established', 'Advanced', 'Elite']

export default function CreateStoryModal({
  profile, onClose, onCreated
}: { profile: Profile; onClose: () => void; onCreated: () => void }) {
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('Fantasy')
  const [totalChapters, setTotalChapters] = useState(5)
  const [tier, setTier] = useState<StoryTier>('Open')
  const [mature, setMature] = useState(false)
  const [guideline, setGuideline] = useState('')
  const [ch1Title, setCh1Title] = useState('')
  const [ch1Content, setCh1Content] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title || !guideline || !ch1Title || !ch1Content) {
      setError('All fields are required'); return
    }
    const rankIdx = getRankIndex(profile.lifetime_likes)
    const tierMin = TIER_MIN_RANK[tier]
    if (rankIdx < tierMin) {
      setError(`You need ${RANKS[tierMin].name}+ rank to start ${tier} tier stories`); return
    }
    if (!profile.sample_done) {
      setError('Complete a sample story before starting your own'); return
    }

    setLoading(true)
    // Create story
    const { data: story, error: storyErr } = await supabase
      .from('stories')
      .insert({ title, genre, tier, mature, total_chapters: totalChapters, guideline, original_author: profile.id })
      .select()
      .single()

    if (storyErr || !story) { setError(storyErr?.message || 'Failed to create story'); setLoading(false); return }

    // Create chapter 1 (done)
    const chapters = [{
      story_id: story.id, chapter_num: 1, title: ch1Title, content: ch1Content,
      author_id: profile.id, status: 'done'
    }]
    // Create chapter 2 (bidding)
    chapters.push({
      story_id: story.id, chapter_num: 2, title: null as unknown as string, content: null as unknown as string,
      author_id: null as unknown as string, status: 'bidding',
      // @ts-ignore
      bid_deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString()
    })
    // Middle chapters (locked)
    for (let i = 3; i < totalChapters; i++) {
      chapters.push({ story_id: story.id, chapter_num: i, title: null as unknown as string, content: null as unknown as string, author_id: null as unknown as string, status: 'locked' })
    }
    // Last chapter (locked, reserved for original author)
    chapters.push({ story_id: story.id, chapter_num: totalChapters, title: null as unknown as string, content: null as unknown as string, author_id: profile.id, status: 'locked' })

    await supabase.from('chapters').insert(chapters)
    setLoading(false)
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-100 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-medium text-lg">Start a new story</h2>
          <button onClick={onClose} className="btn btn-sm border-transparent text-gray-400"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-0">
          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label className="label">Title</label>
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Story title" />
            </div>
            <div className="field">
              <label className="label">Genre</label>
              <select className="select" value={genre} onChange={e => setGenre(e.target.value)}>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label className="label">Total chapters</label>
              <select className="select" value={totalChapters} onChange={e => setTotalChapters(Number(e.target.value))}>
                {[4,5,6].map(n => <option key={n} value={n}>{n} chapters</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">Story tier</label>
              <select className="select" value={tier} onChange={e => setTier(e.target.value as StoryTier)}>
                {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label className="label">Mature content (18+)</label>
            <select className="select" value={mature ? 'yes' : 'no'} onChange={e => setMature(e.target.value === 'yes')}>
              <option value="no">No</option>
              <option value="yes">Yes — age-gated</option>
            </select>
          </div>
          <div className="field">
            <label className="label">Story guideline</label>
            <textarea className="textarea" rows={3} value={guideline} onChange={e => setGuideline(e.target.value)} placeholder="How do you see this story unfolding? What tone, themes, arc? This guides future chapter authors." />
          </div>
          <div className="field">
            <label className="label">Chapter 1 title</label>
            <input className="input" value={ch1Title} onChange={e => setCh1Title(e.target.value)} placeholder="Opening chapter title" />
          </div>
          <div className="field">
            <label className="label">Chapter 1</label>
            <textarea className="textarea" rows={7} value={ch1Content} onChange={e => setCh1Content(e.target.value)} placeholder="Write your opening chapter…" />
          </div>
          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Publishing…' : 'Publish ch. 1 & open bidding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
