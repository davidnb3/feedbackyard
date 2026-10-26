import { THEMES, useThemeStore } from '../../store/themeStore'

/** Accent palette switch. Each swatch carries its own data-theme so it shows its own accent. */
export function ThemeSwitch() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <div role="radiogroup" aria-label="Accent palette" className="flex items-center gap-1">
      {THEMES.map((t) => {
        const selected = t.id === theme
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected}
            data-theme={t.id}
            onClick={() => setTheme(t.id)}
            title={`${t.label} palette`}
            className={`flex h-7 items-center gap-2 border px-2 text-label uppercase transition-colors ${
              selected ? 'border-accent text-accent' : 'border-line text-muted hover:text-ink'
            }`}
          >
            <span className="h-2.5 w-2.5 bg-accent" aria-hidden="true" />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
