'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { applyTheme, type ThemeId } from '@/lib/themes'
import { Coins, Flame } from 'lucide-react'

interface LoginReward {
  points_earned: number
  streak: number
  bonus: boolean
  message: string
  already_claimed: boolean
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [reward, setReward] = useState<LoginReward | null>(null)
  const claimed = useRef(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load and apply saved theme
      const { data: profile } = await supabase
        .from('profiles')
        .select('theme')
        .eq('id', user.id)
        .single()

      if (profile?.theme) applyTheme(profile.theme as ThemeId)

      // Claim daily login points (once per session)
      if (claimed.current) return
      claimed.current = true
      const { data } = await supabase.rpc('handle_daily_login', { p_user_id: user.id })
      if (data && !data.already_claimed && data.points_earned > 0) {
        setReward(data)
        setTimeout(() => setReward(null), 5000)
      }
    }
    init()
  }, [])

  return (
    <>
      {children}
      {reward && (
        <div className="fixed bottom-5 right-5 z-[200] animate-in slide-in-from-bottom-4 duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
            reward.bonus
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-white border-gray-200 text-gray-800'
          }`}>
            {reward.bonus
              ? <Flame size={18} className="text-amber-500 flex-shrink-0" />
              : <Coins size={18} className="text-brand-400 flex-shrink-0" />
            }
            <div>
              <div>{reward.message}</div>
              <div className="text-xs opacity-60 mt-0.5">
                {reward.streak} day streak
                {reward.streak > 1 && ` · keep it going!`}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
