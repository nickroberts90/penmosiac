'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile, Message } from '@/types'
import { timeAgo } from '@/lib/utils'
import { Send, MessageSquare } from 'lucide-react'
import Navbar from '@/components/Navbar'

export default function MessagesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [me, setMe] = useState<Profile | null>(null)
  const [conversations, setConversations] = useState<Profile[]>([])
  const [activeUser, setActiveUser] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [allAuthors, setAllAuthors] = useState<Profile[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    // Handle ?with=username from author profile message button
    const params = new URLSearchParams(window.location.search)
    const withUsername = params.get('with')
    if (withUsername && allAuthors.length > 0) {
      const target = allAuthors.find(u => u.username === withUsername)
      if (target) selectUser(target)
    }
  }, [allAuthors])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setMe(p)

    // Get all authors I've messaged with
    const { data: sent } = await supabase.from('messages').select('recipient_id').eq('sender_id', user.id)
    const { data: recv } = await supabase.from('messages').select('sender_id').eq('recipient_id', user.id)
    const ids = [...new Set([
      ...(sent || []).map(m => m.recipient_id),
      ...(recv || []).map(m => m.sender_id),
    ])]

    if (ids.length > 0) {
      const { data: convProfiles } = await supabase.from('profiles').select('*').in('id', ids)
      setConversations(convProfiles || [])
      if (convProfiles && convProfiles.length > 0) {
        setActiveUser(convProfiles[0])
        loadMessages(user.id, convProfiles[0].id)
      }
    }

    // All authors for new conversation
    const { data: authors } = await supabase.from('profiles').select('*').neq('id', user.id).limit(20)
    setAllAuthors(authors || [])
    setLoading(false)
  }

  async function loadMessages(myId: string, theirId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*, sender_profile:profiles!sender_id(*)')
      .or(`and(sender_id.eq.${myId},recipient_id.eq.${theirId}),and(sender_id.eq.${theirId},recipient_id.eq.${myId})`)
      .order('created_at')
    setMessages(data || [])
  }

  async function sendMessage() {
    if (!draft.trim() || !me || !activeUser) return
    await supabase.from('messages').insert({
      sender_id: me.id,
      recipient_id: activeUser.id,
      content: draft.trim(),
    })

    // Notify recipient (fire and forget)
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'message_received',
        to_email: activeUser.id, // resolved server-side via auth.admin
        to_name: activeUser.display_name,
        data: {
          sender_name: me.display_name,
          message_preview: draft.trim().slice(0, 200),
          recipient_id: activeUser.id,
        },
      }),
    }).catch(() => {})

    setDraft('')
    loadMessages(me.id, activeUser.id)
    if (!conversations.find(c => c.id === activeUser.id)) {
      setConversations(prev => [...prev, activeUser])
    }
  }

  const selectUser = (u: Profile) => {
    setActiveUser(u)
    if (me) loadMessages(me.id, u.id)
  }

  if (loading) return <><Navbar /><div className="text-center py-16 text-gray-400 text-sm">Loading…</div></>

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-xl font-medium mb-5">Messages</h1>
        <div className="card p-0 flex overflow-hidden" style={{ height: '520px' }}>
          {/* Sidebar */}
          <div className="w-52 border-r border-gray-100 flex flex-col flex-shrink-0">
            <div className="p-3 border-b border-gray-50">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Authors</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {allAuthors.map(u => (
                <div
                  key={u.id}
                  onClick={() => selectUser(u)}
                  className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                    activeUser?.id === u.id ? 'bg-brand-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-brand-50 text-brand-800 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {u.display_name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{u.display_name}</div>
                    <div className="text-xs text-gray-400 truncate">@{u.username}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {activeUser ? (
              <>
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-50 text-brand-800 flex items-center justify-center text-sm font-medium">
                    {activeUser.display_name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{activeUser.display_name}</div>
                    <div className="text-xs text-gray-400">@{activeUser.username}</div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-8">No messages yet. Say hello!</div>
                  )}
                  {messages.map(m => (
                    <div key={m.id} className={`flex ${m.sender_id === me?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs rounded-xl px-3 py-2 text-sm leading-relaxed ${
                        m.sender_id === me?.id
                          ? 'bg-brand-400 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      }`}>
                        {m.content}
                        <div className={`text-xs mt-1 ${m.sender_id === me?.id ? 'text-brand-100' : 'text-gray-400'}`}>
                          {timeAgo(m.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div className="p-3 border-t border-gray-100 flex gap-2">
                  <input
                    className="input text-sm"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder={`Message ${activeUser.display_name}…`}
                  />
                  <button onClick={sendMessage} className="btn btn-primary px-3"><Send size={14} /></button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Select an author to message</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
