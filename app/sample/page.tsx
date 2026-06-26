'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile, StoryTemplate } from '@/types'
import { BookOpen, CheckCircle } from 'lucide-react'
import Navbar from '@/components/Navbar'

export default function SamplePage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [templates, setTemplates] = useState<StoryTemplate[]>([])
  const [selected, setSelected] = useState<StoryTemplate | null>(null)
  const [content, setContent] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)
    const { data: t } = await supabase.from('story_templates').select('*')
    setTemplates(t || [])
    // Check if already submitted
    const { data: sub } = await supabase.from('sample_submissions').select('*').eq('user_id', user.id).single()
    if (sub) setSubmitted(true)
    setLoading(false)
  }

  async function submit() {
    if (!selected || !content.trim() || !profile) return
    if (content.trim().length < 200) { setError('Write at least 200 characters'); return }
    setSubmitting(true)
    await supabase.from('sample_submissions').insert({
      user_id: profile.id,
      template_id: selected.id,
      content: content.trim(),
      status: 'pending',
    })
    setSubmitted(true)
    setSubmitting(false)
  }

  if (loading) return <><Navbar /><div className="text-center py-16 text-gray-400 text-sm">Loading…</div></>

  if (profile?.sample_done) return (
    <>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <CheckCircle size={40} className="mx-auto mb-3 text-green-500" />
        <h1 className="text-xl font-medium mb-2">Sample approved</h1>
        <p className="text-gray-500 text-sm mb-4">You're cleared to bid on stories and start your own.</p>
        <a href="/" className="btn btn-primary">Browse stories</a>
      </main>
    </>
  )

  if (submitted) return (
    <>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-3">📬</div>
        <h1 className="text-xl font-medium mb-2">Submission received</h1>
        <p className="text-gray-500 text-sm">An admin will review your sample story. You'll be approved shortly.</p>
      </main>
    </>
  )

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-medium mb-1">Write a sample story</h1>
        <p className="text-gray-500 text-sm mb-6">Pick a template prompt, write your story, and submit for review. Once approved, you can bid on chapters and start your own stories.</p>

        {!selected ? (
          <div className="space-y-3">
            {templates.map(t => (
              <div
                key={t.id}
                onClick={() => setSelected(t)}
                className="card cursor-pointer hover:border-brand-200 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <BookOpen size={18} className="text-brand-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm mb-1">{t.title} <span className="badge bg-gray-50 text-gray-500 border-gray-200 ml-1">{t.genre}</span></div>
                    <p className="text-sm text-gray-500 leading-relaxed">{t.prompt}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div className="card mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-sm">{selected.title}</div>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{selected.prompt}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-700 ml-3 flex-shrink-0">Change</button>
              </div>
            </div>
            <div className="field">
              <label className="label">Your story</label>
              <textarea
                className="textarea"
                rows={14}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write your story here… (500–1000 words recommended)"
              />
              <div className="text-xs text-gray-400 mt-1">{content.split(/\s+/).filter(Boolean).length} words</div>
            </div>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setSelected(null)} className="btn">Back</button>
              <button onClick={submit} disabled={submitting} className="btn btn-primary">
                {submitting ? 'Submitting…' : 'Submit for review'}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
