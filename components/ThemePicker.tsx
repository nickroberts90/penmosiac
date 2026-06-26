'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { THEMES, applyTheme, type ThemeId } from '@/lib/themes'
import { Palette, Check } from 'lucide-react'

export default function ThemePicker() {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<ThemeId>('default')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: p } = await supabase.from('profiles').select('theme').eq('id', data.user.id).single()
      if (p?.theme) setCurrent(p.theme as ThemeId)
    })
  }, [])

  async function selectTheme(id: ThemeId) {
    setCurrent(id)
    applyTheme(id)
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ theme: id }).eq('id', user.id)
    setSaving(false)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-sm border-transparent text-gray-400 hover:text-brand-500"
        title="Change theme"
      >
        <Palette size={16} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 bg-white rounded-xl border border-gray-100 shadow-xl p-3 w-64">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3 px-1">Color theme</p>
            <div className="space-y-1">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => selectTheme(theme.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    current === theme.id ? 'bg-gray-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Color swatches */}
                  <div className="flex gap-1 flex-shrink-0">
                    {theme.preview.map((hex, i) => (
                      <div key={i} className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ background: hex }} />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{theme.name}</div>
                    <div className="text-xs text-gray-400 truncate">{theme.description}</div>
                  </div>
                  {current === theme.id && <Check size={14} className="text-brand-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
