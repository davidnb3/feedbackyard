import { useEffect, useRef } from 'react'
import { HudButton } from '../ui/HudButton'
import { ReticleIcon } from '../ui/Deco'

interface WarningModalProps {
  onConfirm(): void
  onCancel(): void
}

/** Shown once, before the first START: feedback can be loud. */
export function WarningModal({ onConfirm, onCancel }: WarningModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/85 p-6" role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="warn-title"
        aria-describedby="warn-body"
        className="relative w-full max-w-[520px]"
        style={{ ['--c' as string]: '22px' }}
      >
        <div className="chamfer pointer-events-none absolute inset-0 bg-warn" aria-hidden="true" />
        <div className="chamfer-in pointer-events-none absolute inset-[1px] bg-panel" aria-hidden="true" />
        <div className="relative p-8">
          <div className="flex items-center gap-4 text-warn">
            <ReticleIcon size={36} />
            <h2 id="warn-title" className="font-display text-[15px] font-bold uppercase tracking-wide2">
              Feedback can be loud
            </h2>
          </div>
          <p id="warn-body" className="mt-5 text-[14px] leading-relaxed text-ink">
            A feedback loop can build up very quickly and get far louder than you expect, with harsh or sudden peaks.
            Turn your system volume down before you start. The master level starts low and a limiter guards the output,
            but it will still be loud on a loud system.
          </p>
          <ul className="mt-4 space-y-1 text-label uppercase text-muted">
            <li>PANIC (or Esc) cuts the feedback, fades out and clears the loop at any time.</li>
            <li>The loop is internal: nothing is picked up from a microphone.</li>
          </ul>
          <div className="mt-7 flex justify-end gap-3">
            <HudButton variant="ghost" size="md" onClick={onCancel}>
              Cancel
            </HudButton>
            <HudButton ref={confirmRef} variant="warn" size="md" onClick={onConfirm}>
              I understand, start
            </HudButton>
          </div>
        </div>
      </div>
    </div>
  )
}
