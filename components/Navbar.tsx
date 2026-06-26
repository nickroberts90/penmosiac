'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/types'
import { getRank } from '@/types'
import { RANK_COLORS } from '@/lib/utils'
import {
  BookOpen, PenSquare, Gavel, MessageSquare, Settings,
  Coins, LogOut, Lightbulb, Beaker, Menu, X, Search, Trophy, Users
} from 'lucide-react'
import ThemePicker from '@/components/ThemePicker'

const NAV = [
  { href: '/',             label: 'Discover',     icon: BookOpen },
  { href: '/search',       label: 'Search',       icon: Search },
  { href: '/leaderboard',  label: 'Leaderboard',  icon: Trophy },
  { href: '/prompts',      label: 'Prompts',      icon: Lightbulb },
  { href: '/mystories',    label: 'My Stories',   icon: PenSquare },
  { href: '/bids',         label: 'Bids',         icon: Gavel },
  { href: '/friends',      label: 'Friends',      icon: Users },
  { href: '/messages',     label: 'Messages',     icon: MessageSquare },
]
const ADMIN_NAV = { href: '/test', label: 'Test', icon: Beaker }

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [unread, setUnread] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMenuOpen(false) }, [pathname])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      setProfile(p)
      setIsAdmin(p?.is_admin ?? false)
      const { count } = await supabase
        .from('messages').select('id', { count: 'exact', head: true })
        .eq('recipient_id', data.user.id).eq('read', false)
      setUnread(count ?? 0)
    })
  }, [pathname])

  const navItems = isAdmin ? [...NAV, ADMIN_NAV] : NAV

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => {
    const isMessages = href === '/messages'
    const active = pathname === href
    return (
      <Link
        href={href}
        className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          active ? 'bg-brand-50 text-brand-800 font-medium' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        <Icon size={15} />
        {label}
        {isMessages && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="text-lg font-medium tracking-tight flex-shrink-0">
            Penmosaic
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5 flex-1">
            {navItems.map(item => <NavLink key={item.href} {...item} />)}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            {profile ? (
              <>
                <span className="hidden sm:flex items-center gap-1 text-sm text-brand-600 font-medium">
                  <Coins size={14} />
                  {profile.points % 1 === 0 ? profile.points : profile.points.toFixed(1)}
                </span>
                <span className={`hidden sm:inline-flex badge ${RANK_COLORS[getRank(profile.lifetime_likes)]}`}>
                  {getRank(profile.lifetime_likes)}
                </span>
                <Link href="/profile" className="w-8 h-8 rounded-full bg-brand-50 text-brand-800 flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {profile.display_name[0]}
                </Link>
                <div className="hidden sm:flex items-center gap-1">
                  <ThemePicker />
                  <button onClick={signOut} className="btn btn-sm text-gray-400 hover:text-gray-700 border-transparent">
                    <LogOut size={14} />
                  </button>
                  {isAdmin && (
                    <Link href="/admin" className="btn btn-sm" title="Admin panel">
                      <Settings size={13} />
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <Link href="/auth" className="btn btn-primary btn-sm">Sign in</Link>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden btn btn-sm border-transparent text-gray-500"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-40 bg-white border-t border-gray-100 overflow-y-auto">
          <div className="px-4 py-4 space-y-1">
            {navItems.map(item => <NavLink key={item.href} {...item} />)}
          </div>

          {profile && (
            <div className="px-4 py-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-800 flex items-center justify-center font-medium">
                  {profile.display_name[0]}
                </div>
                <div>
                  <div className="font-medium text-sm">{profile.display_name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`badge text-xs ${RANK_COLORS[getRank(profile.lifetime_likes)]}`}>
                      {getRank(profile.lifetime_likes)}
                    </span>
                    <span className="text-xs text-brand-600 flex items-center gap-1">
                      <Coins size={11} /> {profile.points % 1 === 0 ? profile.points : profile.points.toFixed(1)} pts
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <ThemePicker />
                {isAdmin && (
                  <Link href="/admin" className="btn btn-sm"><Settings size={13} /> Admin</Link>
                )}
                <button onClick={signOut} className="btn btn-sm text-gray-400">
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
