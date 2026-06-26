export type ThemeId = 'default' | 'midnight' | 'forest' | 'amber' | 'rose'

export interface Theme {
  id: ThemeId
  name: string
  description: string
  preview: string[]   // 3 swatch hex values for the picker
  vars: Record<string, string>
}

export const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Ink',
    description: 'Clean purple on white. The classic.',
    preview: ['#7F77DD', '#534AB7', '#EEEDFE'],
    vars: {
      '--brand-50':  '#EEEDFE',
      '--brand-100': '#CECBF6',
      '--brand-200': '#AFA9EC',
      '--brand-400': '#7F77DD',
      '--brand-600': '#534AB7',
      '--brand-800': '#3C3489',
      '--brand-900': '#26215C',
    }
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep navy. For the late-night writers.',
    preview: ['#3B82F6', '#1D4ED8', '#EFF6FF'],
    vars: {
      '--brand-50':  '#EFF6FF',
      '--brand-100': '#DBEAFE',
      '--brand-200': '#BFDBFE',
      '--brand-400': '#3B82F6',
      '--brand-600': '#1D4ED8',
      '--brand-800': '#1E3A8A',
      '--brand-900': '#1E3A8A',
    }
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Earthy green. Grounded and calm.',
    preview: ['#16A34A', '#15803D', '#F0FDF4'],
    vars: {
      '--brand-50':  '#F0FDF4',
      '--brand-100': '#DCFCE7',
      '--brand-200': '#BBF7D0',
      '--brand-400': '#16A34A',
      '--brand-600': '#15803D',
      '--brand-800': '#14532D',
      '--brand-900': '#052E16',
    }
  },
  {
    id: 'amber',
    name: 'Amber',
    description: 'Warm gold. Like writing by candlelight.',
    preview: ['#D97706', '#B45309', '#FFFBEB'],
    vars: {
      '--brand-50':  '#FFFBEB',
      '--brand-100': '#FEF3C7',
      '--brand-200': '#FDE68A',
      '--brand-400': '#D97706',
      '--brand-600': '#B45309',
      '--brand-800': '#78350F',
      '--brand-900': '#451A03',
    }
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Soft crimson. Bold and literary.',
    preview: ['#E11D48', '#BE123C', '#FFF1F2'],
    vars: {
      '--brand-50':  '#FFF1F2',
      '--brand-100': '#FFE4E6',
      '--brand-200': '#FECDD3',
      '--brand-400': '#E11D48',
      '--brand-600': '#BE123C',
      '--brand-800': '#881337',
      '--brand-900': '#4C0519',
    }
  },
]

export function applyTheme(id: ThemeId) {
  const theme = THEMES.find(t => t.id === id) ?? THEMES[0]
  const root = document.documentElement
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value)
  }
}
