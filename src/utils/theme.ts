export type RGB = readonly [number, number, number]

export interface ThemeColors {
  bg: RGB
  panel: RGB
  line: RGB
  ink: RGB
  muted: RGB
  accent: RGB
  data: RGB
  warn: RGB
}

const NAMES = ['bg', 'panel', 'line', 'ink', 'muted', 'accent', 'data', 'warn'] as const

let cache: ThemeColors | null = null

/** Colors for canvas drawing, read from the CSS variables so canvases follow the active theme. */
export function getThemeColors(): ThemeColors {
  if (cache) return cache
  const style = getComputedStyle(document.documentElement)
  const read = (name: string): RGB => {
    const parts = style.getPropertyValue(`--${name}`).trim().split(/\s+/).map(Number)
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
  }
  cache = Object.fromEntries(NAMES.map((n) => [n, read(n)])) as unknown as ThemeColors
  return cache
}

export function invalidateThemeColors(): void {
  cache = null
}

export function rgba(c: RGB, alpha = 1): string {
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
}
