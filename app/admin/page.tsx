'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile, SampleSubmission } from '@/types'
import { getRank } from '@/types'
import { RANK_COLORS, formatPoints } from '@/lib/utils'
import { CheckCircle, XCircle, Trash2, Plus, RefreshCw } from 'lucide-react'
import Navbar from '@/components/Navbar'

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [samples, setSamples] = useState<(SampleSubmission & { user: Profile })[]>([])
  const [tab, setTab] = useState<'users' | 'samples' | 'stories'>('users')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [tab])

  async function loadData() {
    setLoading(true)

    // Auth + admin check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!me?.is_admin) { router.push('/'); return }

    if (tab === 'users') {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      setProfiles(data || [])
    }
    if (tab === 'samples') {
      const { data } = await supabase
        .from('sample_submissions')
        .select('*, user:profiles!user_id(*)')
        .order('submitted_at', { ascending: false })
      setSamples(data as unknown as (SampleSubmission & { user: Profile })[] || [])
    }
    setLoading(false)
  }

  async function clearStrikes(id: string) {
    await supabase.from('profiles').update({ strikes: 0, suspended_until: null }).eq('id', id)
    loadData()
  }
  async function addPoints(id: string) {
    const p = profiles.find(x => x.id === id)
    if (!p) return
    await supabase.from('profiles').update({ points: p.points + 50 }).eq('id', id)
    loadData()
  }
  async function approveSample(sub: SampleSubmission & { user: Profile }) {
    await supabase.from('sample_submissions').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', sub.id)
    await supabase.from('profiles').update({ sample_done: true }).eq('id', sub.user_id)

    // Get user email
    const { data: authUser } = await supabase.auth.admin?.getUserById?.(sub.user_id) ?? {}
    const email = (authUser as any)?.user?.email
    if (email) {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sample_approved',
          to_email: email,
          to_name: sub.user.display_name,
          data: { points: String(sub.user.points) },
        }),
      })
    }
    loadData()
  }

  async function rejectSample(sub: SampleSubmission & { user: Profile }) {
    const note = prompt('Rejection reason (optional):')
    await supabase.from('sample_submissions').update({ status: 'rejected', admin_note: note, reviewed_at: new Date().toISOString() }).eq('id', sub.id)

    const { data: authUser } = await supabase.auth.admin?.getUserById?.(sub.user_id) ?? {}
    const email = (authUser as any)?.user?.email
    if (email) {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sample_rejected',
          to_email: email,
          to_name: sub.user.display_name,
          data: { admin_note: note ?? '' },
        }),
      })
    }
    loadData()
  }

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-xl font-medium mb-5">Admin panel</h1>

        <div className="flex gap-0 border-b border-gray-100 mb-5">
          {(['users', 'samples', 'stories'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm capitalize border-b-2 transition-colors ${
                tab === t ? 'border-brand-400 text-brand-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >{t === 'samples' ? 'Sample reviews' : t}</button>
          ))}
        </div>

        {loading && <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>}

        {!loading && tab === 'users' && (
          <div className="space-y-2">
            {profiles.map(p => {
              const rank = getRank(p.lifetime_likes)
              return (
                <div key={p.id} className="card flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-800 flex items-center justify-center font-medium flex-shrink-0">
                    {p.display_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                      {p.display_name}
                      <span className={`badge ${RANK_COLORS[rank]}`}>{rank}</span>
                      {p.strikes >= 3 && <span className="badge bg-red-50 text-red-700 border-red-200">Suspended</span>}
                      {!p.sample_done && <span className="badge bg-amber-50 text-amber-700 border-amber-200">No sample</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {p.lifetime_likes} likes · {formatPoints(p.points)} pts · {p.strikes}/3 strikes
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => addPoints(p.id)} className="btn btn-sm" title="Add 50 pts">
                      <Plus size={13} /> 50pts
                    </button>
                    {p.strikes > 0 && (
                      <button onClick={() => clearStrikes(p.id)} className="btn btn-sm" title="Clear strikes">
                        <RefreshCw size={13} /> Strikes
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && tab === 'samples' && (
          <div className="space-y-3">
            {samples.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No sample submissions yet.</div>}
            {samples.map(sub => (
              <div key={sub.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium text-sm">{sub.user.display_name}</div>
                    <div className="text-xs text-gray-400">Template: {sub.template_id} · {new Date(sub.submitted_at).toLocaleDateString()}</div>
                  </div>
                  <span className={`badge ${sub.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : sub.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {sub.status}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed mb-3 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {sub.content}
                </div>
                {sub.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => approveSample(sub)} className="btn btn-sm" style={{ color: '#166534', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                      <CheckCircle size={13} /> Approve
                    </button>
                    <button onClick={() => rejectSample(sub)} className="btn btn-danger btn-sm">
                      <XCircle size={13} /> Reject
                    </button>
                  </div>
                )}
                {sub.admin_note && <p className="text-xs text-gray-400 mt-2">Note: {sub.admin_note}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
