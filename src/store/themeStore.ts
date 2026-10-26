import { create } from 'zustand'
import { invalidateThemeColors } from '../utils/theme'

export type ThemeId = 'green' | 'cyan' | 'amber'

export const THEMES: readonly { id: ThemeId; label: string }[] = [
  { id: 'green', label: 'GRN' },
  { id: 'cyan', label: 'CYN' },
  { id: 'amber', label: 'AMB' },
]

const KEY = 'feedbackyard.theme.v1'

function load(): ThemeId {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'green' || v === 'cyan' || v === 'amber') return v
  } catch {
    /* storage unavailable */
  }
  return 'green'
}

function apply(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme
  invalidateThemeColors()
}

interface ThemeStore {
  theme: ThemeId
  setTheme(theme: ThemeId): void
}

const initial = load()
apply(initial)

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: initial,
  setTheme: (theme) => {
    apply(theme)
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* storage unavailable */
    }
    set({ theme })
  },
}))
