'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile, Friendship } from '@/types'
import { getRank } from '@/types'
import { RANK_COLORS } from '@/lib/utils'
import { UserPlus, Check, X, Users, Search, MessageSquare, Clock } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default function FriendsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [me, setMe] = useState<Profile | null>(null)
  const [friends, setFriends] = useState<Profile[]>([])
  const [incoming, setIncoming] = useState<(Friendship & { requester_profile: Profile })[]>([])
  const [outgoing, setOutgoing] = useState<(Friendship & { recipient_profile: Profile })[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'friends' | 'requests' | 'find'>('friends')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setMe(p)

    // Accepted friendships, either direction
    const { data: accepted } = await supabase
      .from('friendships')
      .select('*, requester_profile:profiles!requester_id(*), recipient_profile:profiles!recipient_id(*)')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)

    const friendProfiles = (accepted || []).map((f: any) =>
      f.requester_id === user.id ? f.recipient_profile : f.requester_profile
    )
    setFriends(friendProfiles)

    // Incoming pending requests (someone sent to me)
    const { data: inc } = await supabase
      .from('friendships')
      .select('*, requester_profile:profiles!requester_id(*)')
      .eq('status', 'pending')
      .eq('recipient_id', user.id)
    setIncoming(inc as any || [])

    // Outgoing pending requests (I sent to someone)
    const { data: out } = await supabase
      .from('friendships')
      .select('*, recipient_profile:profiles!recipient_id(*)')
      .eq('status', 'pending')
      .eq('requester_id', user.id)
    setOutgoing(out as any || [])

    setLoading(false)
  }

  async function searchUsers() {
    if (!query.trim() || !me) { setResults([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
      .neq('id', me.id)
      .limit(15)
    setResults(data || [])
  }

  useEffect(() => {
    const t = setTimeout(searchUsers, 300)
    return () => clearTimeout(t)
  }, [query])

  async function sendRequest(recipientId: string) {
    if (!me) return
    await supabase.from('friendships').insert({ requester_id: me.id, recipient_id: recipientId, status: 'pending' })
    loadData()
  }

  async function acceptRequest(friendshipId: string) {
    await supabase.from('friendships').update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', friendshipId)
    loadData()
  }

  async function declineRequest(friendshipId: string) {
    await supabase.from('friendships').update({ status: 'declined', responded_at: new Date().toISOString() }).eq('id', friendshipId)
    loadData()
  }

  async function removeFriend(friendId: string) {
    if (!me) return
    if (!confirm('Remove this friend? You\'ll need to send a new request to reconnect.')) return
    await supabase.from('friendships').delete()
      .or(`and(requester_id.eq.${me.id},recipient_id.eq.${friendId}),and(requester_id.eq.${friendId},recipient_id.eq.${me.id})`)
    loadData()
  }

  function friendshipStatusWith(userId: string): 'none' | 'friends' | 'incoming' | 'outgoing' {
    if (friends.some(f => f.id === userId)) return 'friends'
    if (incoming.some(r => r.requester_id === userId)) return 'incoming'
    if (outgoing.some(r => r.recipient_id === userId)) return 'outgoing'
    return 'none'
  }

  if (loading) return <><Navbar /><div className="text-center py-16 text-gray-400 text-sm">Loading…</div></>
  if (!me) return null

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Users size={20} className="text-brand-400" />
          <h1 className="text-xl font-medium">Friends</h1>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800">
          You can message friends anytime. You can also message co-authors on any story you're both currently writing — that access ends once the story is marked complete, unless you're friends.
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-100 mb-6">
          {[
            { id: 'friends' as const,  label: 'Friends',  count: friends.length },
            { id: 'requests' as const, label: 'Requests', count: incoming.length },
            { id: 'find' as const,     label: 'Find people', count: null },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${tab === t.id ? 'border-brand-400 text-brand-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t.label}
              {t.count !== null && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Friends list */}
        {tab === 'friends' && (
          friends.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users size={28} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-3">No friends yet.</p>
              <button onClick={() => setTab('find')} className="btn btn-primary btn-sm">Find people</button>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map(f => {
                const rank = getRank(f.lifetime_likes)
                return (
                  <div key={f.id} className="card flex items-center gap-3">
                    <Link href={`/authors/${f.username}`} className="w-10 h-10 rounded-full bg-brand-50 text-brand-800 flex items-center justify-center font-medium flex-shrink-0">
                      {f.display_name[0]}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/authors/${f.username}`} className="font-medium text-sm hover:text-brand-600 hover:underline">{f.display_name}</Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">@{f.username}</span>
                        <span className={`badge text-xs ${RANK_COLORS[rank]}`}>{rank}</span>
                      </div>
                    </div>
                    <Link href={`/messages?with=${f.username}`} className="btn btn-sm gap-1.5">
                      <MessageSquare size={13} /> Message
                    </Link>
                    <button onClick={() => removeFriend(f.id)} className="btn btn-sm text-gray-400 hover:text-red-500">
                      <X size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* Requests */}
        {tab === 'requests' && (
          <div className="space-y-5">
            {incoming.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Incoming requests</h3>
                <div className="space-y-2">
                  {incoming.map(r => (
                    <div key={r.id} className="card flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-800 flex items-center justify-center font-medium flex-shrink-0">
                        {r.requester_profile.display_name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{r.requester_profile.display_name}</div>
                        <div className="text-xs text-gray-400">@{r.requester_profile.username}</div>
                      </div>
                      <button onClick={() => acceptRequest(r.id)} className="btn btn-primary btn-sm"><Check size={13} /> Accept</button>
                      <button onClick={() => declineRequest(r.id)} className="btn btn-sm text-gray-400"><X size={13} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {outgoing.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Sent requests</h3>
                <div className="space-y-2">
                  {outgoing.map(r => (
                    <div key={r.id} className="card flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center font-medium flex-shrink-0">
                        {r.recipient_profile.display_name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{r.recipient_profile.display_name}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10} /> Pending</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {incoming.length === 0 && outgoing.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">No pending requests.</div>
            )}
          </div>
        )}

        {/* Find people */}
        {tab === 'find' && (
          <div>
            <div className="relative mb-5">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Search by name or username…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              {results.map(r => {
                const status = friendshipStatusWith(r.id)
                return (
                  <div key={r.id} className="card flex items-center gap-3">
                    <Link href={`/authors/${r.username}`} className="w-10 h-10 rounded-full bg-brand-50 text-brand-800 flex items-center justify-center font-medium flex-shrink-0">
                      {r.display_name[0]}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/authors/${r.username}`} className="font-medium text-sm hover:text-brand-600 hover:underline">{r.display_name}</Link>
                      <div className="text-xs text-gray-400">@{r.username}</div>
                    </div>
                    {status === 'none' && (
                      <button onClick={() => sendRequest(r.id)} className="btn btn-primary btn-sm"><UserPlus size={13} /> Add friend</button>
                    )}
                    {status === 'friends' && <span className="text-xs text-green-600 flex items-center gap-1"><Check size={12} /> Friends</span>}
                    {status === 'incoming' && <span className="text-xs text-amber-600">Wants to be friends</span>}
                    {status === 'outgoing' && <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11} /> Request sent</span>}
                  </div>
                )
              })}
              {query && results.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">No one found matching "{query}"</div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  )
}
