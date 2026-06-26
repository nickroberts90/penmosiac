'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import type { Profile, StoryTemplate } from '@/types'
import {
  X, BookOpen, Gavel, Heart, Star, Coins, ChevronRight,
  ChevronLeft, Pencil, CheckCircle, Lightbulb, Users, Trophy
} from 'lucide-react'

interface TutorialProps {
  profile: Profile
  onClose: () => void
  onComplete: () => void
}

const STEPS = [
  'welcome',
  'how_it_works',
  'points',
  'ranks',
  'sample_intro',
  'sample_write',
  'done',
] as const

type Step = typeof STEPS[number]

export default function Tutorial({ profile, onClose, onComplete }: TutorialProps) {
  const supabase = createClient()
  const [step, setStep] = useState<Step>('welcome')
  const [templates, setTemplates] = useState<StoryTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<StoryTemplate | null>(null)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [wordCount, setWordCount] = useState(0)

  useEffect(() => {
    supabase.from('story_templates').select('*').order('id').then(({ data }) => {
      setTemplates(data || [])
    })
  }, [])

  useEffect(() => {
    setWordCount(content.trim().split(/\s+/).filter(Boolean).length)
  }, [content])

  const stepIndex = STEPS.indexOf(step)
  const totalSteps = STEPS.length

  function next() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }
  function prev() {
    const idx = STEPS.indexOf(step)
    if (idx > 0) setStep(STEPS[idx - 1])
  }

  async function submitSample() {
    if (!selectedTemplate || !content.trim()) return
    if (wordCount < 100) { setError('Write at least 100 words to continue.'); return }
    setSubmitting(true)
    setError('')

    const { error: err } = await supabase.from('sample_submissions').insert({
      user_id: profile.id,
      template_id: selectedTemplate.id,
      content: content.trim(),
      status: 'pending',
    })

    if (err) { setError(err.message); setSubmitting(false); return }
    setSubmitted(true)
    setSubmitting(false)
    setStep('done')
  }

  const GENRE_COLORS: Record<string, string> = {
    'Literary Fiction':  'bg-purple-50 text-purple-800 border-purple-200',
    'Mystery':           'bg-blue-50 text-blue-800 border-blue-200',
    'Sci-Fi':            'bg-teal-50 text-teal-800 border-teal-200',
    'Horror':            'bg-red-50 text-red-800 border-red-200',
    'Historical Fiction':'bg-amber-50 text-amber-800 border-amber-200',
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-100 w-full max-w-2xl shadow-xl flex flex-col"
        style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-medium">
              {stepIndex + 1}
            </div>
            <div className="flex gap-1">
              {STEPS.map((s, i) => (
                <div key={s} className={`h-1 rounded-full transition-all ${
                  i <= stepIndex ? 'bg-brand-400' : 'bg-gray-100'
                }`} style={{ width: i === stepIndex ? '24px' : '8px' }} />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-sm border-transparent text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── WELCOME ── */}
          {step === 'welcome' && (
            <div className="px-8 py-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-5">
                <BookOpen size={28} className="text-brand-400" />
              </div>
              <h1 className="text-2xl font-medium mb-3">
                Welcome to Penmosaic
              </h1>
              <p className="text-gray-500 leading-relaxed mb-6 max-w-md mx-auto">
                This is a platform for collaborative fiction. Authors write stories together —
                one chapter at a time — by bidding for the chance to write each new chapter.
              </p>
              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
                {[
                  { icon: Pencil, label: 'Write chapters' },
                  { icon: Gavel, label: 'Bid on stories' },
                  { icon: Heart, label: 'Earn likes' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <Icon size={20} className="mx-auto mb-1.5 text-brand-400" />
                    <div className="text-xs text-gray-600 font-medium">{label}</div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-400">This will take about 5 minutes.</p>
            </div>
          )}

          {/* ── HOW IT WORKS ── */}
          {step === 'how_it_works' && (
            <div className="px-8 py-8">
              <h2 className="text-xl font-medium mb-2">How a story gets written</h2>
              <p className="text-gray-500 text-sm mb-7">Every story on the platform follows the same structure.</p>

              <div className="space-y-4">
                {[
                  {
                    num: '1',
                    color: 'bg-brand-50 text-brand-700 border-brand-100',
                    title: 'An author starts a story',
                    desc: 'They write the opening chapter, set the total chapter count (4–6), and write a guideline explaining how they see the story unfolding. They also write the final chapter — so the ending is always theirs.'
                  },
                  {
                    num: '2',
                    color: 'bg-amber-50 text-amber-700 border-amber-100',
                    title: 'Other authors bid to write the next chapter',
                    desc: 'A 48-hour bidding window opens. Authors stake points to claim the next chapter slot. The highest bid wins. If you lose, your points come back in full.'
                  },
                  {
                    num: '3',
                    color: 'bg-green-50 text-green-700 border-green-100',
                    title: 'The winner writes their chapter',
                    desc: 'The winning author has one week to write and submit their chapter. Once they do, bidding opens for the next chapter — and the cycle continues.'
                  },
                  {
                    num: '4',
                    color: 'bg-purple-50 text-purple-700 border-purple-100',
                    title: 'Readers like chapters, authors earn points',
                    desc: 'Every like on your chapter earns you points. Those points let you bid on future chapters. The better you write, the more you can bid.'
                  },
                ].map(item => (
                  <div key={item.num} className="flex gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 border ${item.color}`}>
                      {item.num}
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-1">{item.title}</div>
                      <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── POINTS ── */}
          {step === 'points' && (
            <div className="px-8 py-8">
              <h2 className="text-xl font-medium mb-2">The points economy</h2>
              <p className="text-gray-500 text-sm mb-6">Points are how you earn the right to write.</p>

              <div className="space-y-3 mb-6">
                <div className="card bg-gray-50 border-gray-100 flex items-start gap-3">
                  <Coins size={18} className="text-brand-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm mb-0.5">You start with 50 points</div>
                    <p className="text-sm text-gray-500">Every new account gets 50 points to start bidding with.</p>
                  </div>
                </div>
                <div className="card bg-gray-50 border-gray-100 flex items-start gap-3">
                  <Heart size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm mb-0.5">Likes earn you points</div>
                    <p className="text-sm text-gray-500">When readers like your chapters, you earn points. Early likes earn 1pt each. As your total likes grow, each new like earns slightly less — this keeps the economy balanced between new and established authors.</p>
                  </div>
                </div>
                <div className="card bg-gray-50 border-gray-100 flex items-start gap-3">
                  <Gavel size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm mb-0.5">Bidding stakes points, not spends them</div>
                    <p className="text-sm text-gray-500">When you bid, your points are staked. If you lose, they come back. If you win, they're spent. If you win but miss your deadline, they're forfeited and you receive a strike.</p>
                  </div>
                </div>
                <div className="card bg-gray-50 border-gray-100 flex items-start gap-3">
                  <Trophy size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm mb-0.5">3 strikes suspends your bidding</div>
                    <p className="text-sm text-gray-500">Miss three deadlines and you'll be suspended from bidding for 30 days. Write what you commit to.</p>
                  </div>
                </div>
              </div>

              <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm text-brand-700">
                <strong>Your current balance:</strong> {profile.points % 1 === 0 ? profile.points : profile.points.toFixed(1)} points
              </div>
            </div>
          )}

          {/* ── RANKS ── */}
          {step === 'ranks' && (
            <div className="px-8 py-8">
              <h2 className="text-xl font-medium mb-2">Ranks & story tiers</h2>
              <p className="text-gray-500 text-sm mb-6">Your rank grows with your lifetime likes — and it never goes down.</p>

              <div className="space-y-2 mb-7">
                {[
                  { rank: 'Apprentice', likes: '0+', color: 'bg-gray-100 text-gray-700', desc: 'Starting rank. Can bid on Open tier stories.' },
                  { rank: 'Journeyman', likes: '50+', color: 'bg-blue-100 text-blue-800', desc: 'Unlocks Established tier stories.' },
                  { rank: 'Novelist', likes: '200+', color: 'bg-green-100 text-green-800', desc: 'Unlocks Advanced tier stories.' },
                  { rank: 'Wordsmith', likes: '500+', color: 'bg-purple-100 text-purple-800', desc: 'Unlocks Elite tier stories.' },
                  { rank: 'Luminary', likes: '1,000+', color: 'bg-orange-100 text-orange-800', desc: 'The highest rank on the platform.' },
                ].map(r => (
                  <div key={r.rank} className="flex items-center gap-3">
                    <span className={`badge ${r.color} w-28 justify-center flex-shrink-0`}>{r.rank}</span>
                    <span className="text-xs text-gray-400 w-12 flex-shrink-0">{r.likes} likes</span>
                    <span className="text-sm text-gray-500">{r.desc}</span>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-medium mb-2">Story tiers explained</p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  When an author creates a story they set its tier. Open stories welcome everyone.
                  Higher tiers are restricted to authors who've earned the rank — this protects
                  experienced authors' stories from inexperienced writers, while giving newer
                  authors their own space to grow.
                </p>
              </div>
            </div>
          )}

          {/* ── SAMPLE INTRO ── */}
          {step === 'sample_intro' && (
            <div className="px-8 py-8">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-5">
                <Lightbulb size={24} className="text-amber-500" />
              </div>
              <h2 className="text-xl font-medium mb-2">Before you can bid, write a sample</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                To keep the quality high on the platform, every author writes one short sample story
                before they can bid or start their own stories. An admin reviews it and approves your account.
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">Pick one of five genre prompts</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">Write a short story (500–1000 words recommended)</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">Submit — an admin reviews and approves within 24 hours</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">Once approved, you can bid on any story and start your own</p>
                </div>
              </div>

              {profile.sample_done ? (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle size={16} /> Your sample is already approved — you're good to go!
                </div>
              ) : (
                <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm text-brand-700">
                  Let's write your sample now. Click Next to choose a prompt.
                </div>
              )}
            </div>
          )}

          {/* ── SAMPLE WRITE ── */}
          {step === 'sample_write' && (
            <div className="px-6 py-6">
              {!selectedTemplate ? (
                <>
                  <h2 className="text-lg font-medium mb-1">Choose a prompt</h2>
                  <p className="text-sm text-gray-500 mb-5">Pick the one that speaks to you. There are no wrong choices.</p>
                  <div className="space-y-3">
                    {templates.map(t => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTemplate(t)}
                        className="card cursor-pointer hover:border-brand-200 hover:bg-brand-50/30 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="font-medium text-sm">{t.title}</span>
                              <span className={`badge text-xs ${GENRE_COLORS[t.genre] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{t.genre}</span>
                            </div>
                            <p className="text-sm text-gray-500 leading-relaxed">{t.prompt}</p>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : submitted ? (
                <div className="text-center py-8">
                  <CheckCircle size={40} className="mx-auto mb-3 text-green-500" />
                  <h3 className="font-medium text-lg mb-1">Sample submitted!</h3>
                  <p className="text-sm text-gray-500">An admin will review your story and approve your account. Click Finish to start exploring.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1"
                    >
                      <ChevronLeft size=  {14} /> Change prompt
                    </button>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-amber-900">{selectedTemplate.title}</span>
                      <span className={`badge text-xs ${GENRE_COLORS[selectedTemplate.genre] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{selectedTemplate.genre}</span>
                    </div>
                    <p className="text-sm text-amber-800 leading-relaxed">{selectedTemplate.prompt}</p>
                  </div>
                  <div className="field">
                    <label className="label">Your story</label>
                    <textarea
                      className="textarea"
                      rows={12}
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Start writing here… take your time, there's no rush."
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-400">{wordCount} words</span>
                      <span className="text-xs text-gray-400">500–1000 words recommended</span>
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                </>
              )}
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && (
            <div className="px-8 py-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-medium mb-3">You're all set</h2>
              <p className="text-gray-500 leading-relaxed mb-8 max-w-md mx-auto">
                {submitted
                  ? "Your sample story is in review. While you wait, browse the stories already on the platform — read a few chapters, get a feel for how it all works."
                  : profile.sample_done
                  ? "Your sample is approved. You can bid on open chapters, start your own story, or read what's already here."
                  : "Head to the Prompts page whenever you're ready to write your sample story and unlock bidding."
                }
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                <a href="/" className="btn btn-primary justify-center">
                  <BookOpen size={14} /> Browse stories
                </a>
                <a href="/bids" className="btn justify-center">
                  <Gavel size={14} /> See bids
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <button
            onClick={prev}
            disabled={stepIndex === 0}
            className="btn btn-sm disabled:opacity-30"
          >
            <ChevronLeft size={14} /> Back
          </button>

          <span className="text-xs text-gray-400">{stepIndex + 1} of {totalSteps}</span>

          {step === 'sample_write' && selectedTemplate && !submitted ? (
            <button
              onClick={submitSample}
              disabled={submitting || wordCount < 100}
              className="btn btn-primary btn-sm disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit sample'}
            </button>
          ) : step === 'done' ? (
            <button onClick={onComplete} className="btn btn-primary btn-sm">
              Finish <ChevronRight size={14} />
            </button>
          ) : step === 'sample_write' && !selectedTemplate ? (
            <span className="text-xs text-gray-400">Select a prompt to continue</span>
          ) : (
            <button onClick={next} className="btn btn-primary btn-sm">
              Next <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
