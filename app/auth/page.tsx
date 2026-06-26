'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, display_name: displayName } },
      })
      if (error) { setError(error.message); setLoading(false); return }
      setDone(true)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card max-w-sm w-full text-center">
        <div className="text-2xl mb-2">✉️</div>
        <h2 className="text-lg font-medium mb-1">Check your email</h2>
        <p className="text-sm text-gray-500">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-sm w-full">
        <h1 className="text-xl font-medium mb-1">
          Penmosaic
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {mode === 'login' ? 'Sign in to your account' : 'Create your author account'}
        </p>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <>
              <div className="field">
                <label className="label">Username</label>
                <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="your_handle" required />
              </div>
              <div className="field">
                <label className="label">Display name</label>
                <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your Name" required />
              </div>
            </>
          )}
          <div className="field">
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn btn-primary w-full justify-center" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500 mt-4">
          {mode === 'login' ? "Don't have an account? " : 'Already have one? '}
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-brand-600 hover:underline">
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
