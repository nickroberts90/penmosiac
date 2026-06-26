'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Chapter, Story, Profile } from '@/types'
import { TIER_BID_CAP } from '@/types'
import { X } from 'lucide-react'

export default function BidModal({
  chapter, story, profile, onClose, onBid
}: { chapter: Chapter; story: Story; profile: Profile; onClose: () => void; onBid: () => void }) {
  const supabase = createClient()
  const cap = TIER_BID_CAP[story.tier]
  const maxBid = Math.min(Math.floor(profile.points), cap)
  const [amount, setAmount] = useState(Math.min(20, maxBid))
  const [pitch, setPitch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (amount < 1 || amount > maxBid) { setError(`Bid must be between 1 and ${maxBid} pts`); return }

    setLoading(true)
    // Deduct points
    const { error: ptErr } = await supabase
      .from('profiles')
      .update({ points: profile.points - amount })
      .eq('id', profile.id)
    if (ptErr) { setError(ptErr.message); setLoading(false); return }

    // Place bid
    const { error: bidErr } = await supabase.from('bids').insert({
      chapter_id: chapter.id,
      bidder_id: profile.id,
      amount,
      pitch: pitch || null,
      status: 'active',
    })
    if (bidErr) {
      // Refund points on failure
      await supabase.from('profiles').update({ points: profile.points }).eq('id', profile.id)
      setError(bidErr.message); setLoading(false); return
    }

    onBid()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl border border-gray-100 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-medium">Bid for Chapter {chapter.chapter_num}</h2>
          <button onClick={onClose} className="btn btn-sm border-transparent text-gray-400"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-5">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800 mb-4">
            Your balance: <strong>{profile.points % 1 === 0 ? profile.points : profile.points.toFixed(1)} pts</strong>
            <span className="mx-2">·</span>
            Tier cap: <strong>{cap} pts</strong>
            <span className="mx-2">·</span>
            Losers get their stake back in full.
          </div>
          <div className="field">
            <label className="label">Points to stake</label>
            <input
              type="number" className="input" min={1} max={maxBid}
              value={amount} onChange={e => setAmount(Number(e.target.value))}
            />
            <p className="text-xs text-gray-400 mt-1">Max: {maxBid} pts</p>
          </div>
          <div className="field">
            <label className="label">Your pitch — what direction will you take this chapter?</label>
            <textarea
              className="textarea" rows={3} value={pitch}
              onChange={e => setPitch(e.target.value)}
              placeholder="Briefly describe your vision…"
            />
          </div>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || maxBid < 1}>
              {loading ? 'Placing bid…' : `Stake ${amount} pts & bid`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
