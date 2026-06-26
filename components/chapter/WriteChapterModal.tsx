'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Chapter, Story } from '@/types'
import { timeUntil } from '@/lib/utils'
import { X, Save, Send, Clock, CheckCircle } from 'lucide-react'

export default function WriteChapterModal({
  chapter, story, onClose, onSubmit
}: { chapter: Chapter; story: Story; onClose: () => void; onSubmit: () => void }) {
  const supabase = createClient()
  const [title, setTitle] = useState(chapter.draft_title || chapter.title || '')
  const [content, setContent] = useState(chapter.draft_content || chapter.content || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(
    chapter.draft_saved_at ? new Date(chapter.draft_saved_at) : null
  )
  const [wordCount, setWordCount] = useState(0)
  const [confirmSubmit, setConfirmSubmit] = useState(false)

  useEffect(() => {
    setWordCount(content.trim().split(/\s+/).filter(Boolean).length)
  }, [content])

  // Autosave draft every 30 seconds if content has changed
  const saveDraft = useCallback(async (t: string, c: string) => {
    if (!t.trim() && !c.trim()) return
    setSaveState('saving')
    await supabase.from('chapters').update({
      draft_title: t,
      draft_content: c,
      draft_saved_at: new Date().toISOString(),
    }).eq('id', chapter.id)
    setSaveState('saved')
    setLastSaved(new Date())
    setTimeout(() => setSaveState('idle'), 3000)
  }, [chapter.id])

  useEffect(() => {
    const t = setTimeout(() => saveDraft(title, content), 30000)
    return () => clearTimeout(t)
  }, [title, content, saveDraft])

  const handleManualSave = async () => {
    await saveDraft(title, content)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) { setError('Add a title and content'); return }
    if (!confirmSubmit) { setConfirmSubmit(true); return }

    setLoading(true)
    const { error: err } = await supabase
      .from('chapters')
      .update({
        title: title.trim(),
        content: content.trim(),
        status: 'done',
        draft_title: null,
        draft_content: null,
        draft_saved_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chapter.id)

    if (err) { setError(err.message); setLoading(false); return }

    // Open next chapter for bidding
    const { data: nextCh } = await supabase
      .from('chapters')
      .select('*')
      .eq('story_id', story.id)
      .eq('chapter_num', chapter.chapter_num + 1)
      .single()

    if (nextCh && nextCh.status === 'locked' && nextCh.author_id === null) {
      await supabase.from('chapters').update({
        status: 'bidding',
        bid_deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      }).eq('id', nextCh.id)
    }

    // Notify story followers (fire and forget)
    fetch('/api/notify-followers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        story_id: story.id,
        story_title: story.title,
        chapter_num: chapter.chapter_num,
        chapter_title: title.trim(),
      }),
    }).catch(() => {})

    onSubmit()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl border border-gray-100 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-medium">Chapter {chapter.chapter_num} — {story.title}</h2>
            <div className="flex items-center gap-3 mt-0.5">
              {chapter.write_deadline && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={11} /> Due in {timeUntil(chapter.write_deadline)}
                </p>
              )}
              <p className="text-xs text-gray-400">{wordCount} words</p>
              {saveState === 'saving' && <p className="text-xs text-gray-400">Saving…</p>}
              {saveState === 'saved' && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <CheckCircle size={11} /> Draft saved
                </p>
              )}
              {saveState === 'idle' && lastSaved && (
                <p className="text-xs text-gray-300">
                  Last saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-sm border-transparent text-gray-400"><X size={16} /></button>
        </div>

        {/* Guideline */}
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex-shrink-0">
          <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-1">Story guideline</p>
          <p className="text-xs text-blue-800 leading-relaxed">{story.guideline}</p>
        </div>

        {/* Editor */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 pt-4 flex-shrink-0">
            <input
              className="input text-base font-medium mb-3"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Chapter title…"
            />
          </div>
          <div className="px-5 flex-1 overflow-hidden">
            <textarea
              className="textarea w-full h-full resize-none text-[15px] leading-relaxed"
              style={{ minHeight: '260px' }}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your chapter here… It autosaves every 30 seconds."
            />
          </div>

          {error && <p className="text-sm text-red-600 px-5 mt-2">{error}</p>}

          {/* Confirm submit notice */}
          {confirmSubmit && (
            <div className="mx-5 mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-800">
              <strong>Ready to submit?</strong> Once submitted, you can't edit your chapter. Click "Submit chapter" again to confirm.
            </div>
          )}

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-between flex-shrink-0">
            <button type="button" onClick={handleManualSave} className="btn btn-sm gap-1.5 text-gray-500">
              <Save size={13} /> Save draft
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn btn-sm">Close</button>
              <button
                type="submit"
                className={`btn btn-sm gap-1.5 ${confirmSubmit ? 'btn-primary' : 'btn'}`}
                disabled={loading}
              >
                <Send size={13} />
                {loading ? 'Submitting…' : confirmSubmit ? 'Confirm & submit' : 'Submit chapter'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
