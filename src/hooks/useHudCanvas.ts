import { useCallback, useEffect, useRef } from 'react'
import { engine, type Frame } from '../audio/AudioEngine'
import { useThemeStore } from '../store/themeStore'
import { getThemeColors, type ThemeColors } from '../utils/theme'

export interface DrawArgs {
  g: CanvasRenderingContext2D
  /** CSS pixels */
  w: number
  h: number
  frame: Frame
  now: number
  colors: ThemeColors
}

/** Return true to ask for another frame even while the engine is idle (for example a decaying meter). */
export type DrawFn = (args: DrawArgs) => boolean | void

/**
 * Canvas that draws from `requestAnimationFrame` through refs, never React state.
 * - `animated`: draws every frame while the engine is active (and while `draw` keeps returning
 *   true after it goes idle), then rests. Redraws on resize, theme change and `invalidate()`.
 * - not animated: draws only on mount, resize, theme change and `invalidate()`.
 * Returns the canvas ref and an `invalidate` function (for example when a param changed).
 */
export function useHudCanvas(draw: DrawFn, animated = true) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  const dirtyRef = useRef(true)
  const paintRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    drawRef.current = draw
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const g = canvas?.getContext('2d')
    if (!canvas || !g) return

    let w = 0
    let h = 0
    let keep = false
    let raf = 0

    const paint = (now: number) => {
      const frame = engine.readFrame(now)
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.clearRect(0, 0, canvas.width, canvas.height)
      const dpr = canvas.width / Math.max(1, w)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      keep = drawRef.current({ g, w, h, frame, now, colors: getThemeColors() }) === true
      dirtyRef.current = false
    }
    paintRef.current = () => paint(performance.now())

    const markDirty = () => {
      dirtyRef.current = true
      if (!animated) paint(performance.now())
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = Math.max(1, Math.round(rect.width))
      h = Math.max(1, Math.round(rect.height))
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      markDirty()
    }

    const loop = (now: number) => {
      const active = engine.readFrame(now).active
      if (active || dirtyRef.current || keep) paint(now)
      raf = requestAnimationFrame(loop)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    const unsubTheme = useThemeStore.subscribe(markDirty)
    void document.fonts?.ready.then(markDirty)
    if (animated) raf = requestAnimationFrame(loop)

    return () => {
      paintRef.current = null
      cancelAnimationFrame(raf)
      ro.disconnect()
      unsubTheme()
    }
  }, [animated])

  const invalidate = useCallback(() => {
    dirtyRef.current = true
    if (!animated) paintRef.current?.()
  }, [animated])

  return [canvasRef, invalidate] as const
}
