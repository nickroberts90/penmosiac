'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { StoryTemplate, Profile } from '@/types'
import { Lightbulb, PenSquare, ArrowRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

const GENRE_COLORS: Record<string, string> = {
  'Literary Fiction': 'bg-purple-50 text-purple-800 border-purple-200',
  'Mystery':          'bg-blue-50 text-blue-800 border-blue-200',
  'Sci-Fi':           'bg-teal-50 text-teal-800 border-teal-200',
  'Horror':           'bg-red-50 text-red-800 border-red-200',
  'Historical Fiction':'bg-amber-50 text-amber-800 border-amber-200',
}

export default function PromptsPage() {
  const supabase = createClient()
  const [templates, setTemplates] = useState<StoryTemplate[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(p)
      }
      const { data: t } = await supabase.from('story_templates').select('*').order('id')
      setTemplates(t || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={20} className="text-brand-400" />
            <h1 className="text-xl font-medium">Writing prompts</h1>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">
            Five prompts across five genres. New to the platform? Pick one and write your sample story to unlock bidding.
            Already approved? Keep these as reference — good prompts are worth coming back to.
          </p>
        </div>

        {loading && <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>}

        <div className="space-y-4">
          {templates.map((t, i) => (
            <div key={t.id} className="card hover:border-brand-200 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h2 className="font-medium text-base">{t.title}</h2>
                    <span className={`badge ${GENRE_COLORS[t.genre] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {t.genre}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{t.prompt}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA based on auth state */}
        <div className="mt-8 p-5 bg-brand-50 border border-brand-100 rounded-xl">
          {!profile ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-medium text-brand-800 mb-1">Ready to write?</div>
                <p className="text-sm text-brand-600">Create an account, pick a prompt, and submit your sample to unlock the platform.</p>
              </div>
              <Link href="/auth" className="btn btn-primary flex-shrink-0">
                Get started <ArrowRight size={14} />
              </Link>
            </div>
          ) : !profile.sample_done ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-medium text-brand-800 mb-1">Pick a prompt and write your sample</div>
                <p className="text-sm text-brand-600">One submission is all it takes to unlock bidding and story creation.</p>
              </div>
              <Link href="/sample" className="btn btn-primary flex-shrink-0">
                Write sample <PenSquare size={14} />
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-medium text-brand-800 mb-1">You're approved</div>
                <p className="text-sm text-brand-600">These prompts are yours to revisit whenever you need a creative spark.</p>
              </div>
              <Link href="/" className="btn btn-primary flex-shrink-0">
                Browse stories <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
