import { useEngineStore } from '../../store/engineStore'

/** Short-lived status message (panic, automatic NaN recovery, audio errors). */
export function NoticeBar() {
  const notice = useEngineStore((s) => s.notice)
  const dismiss = useEngineStore((s) => s.dismissNotice)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-6" role="status" aria-live="polite">
      {notice && (
        <button
          type="button"
          onClick={dismiss}
          className={`pointer-events-auto border bg-panel px-5 py-3 text-label font-bold uppercase ${
            notice.kind === 'warn' ? 'border-warn text-warn glow-warn' : 'border-accent text-accent glow-accent'
          }`}
        >
          {notice.text}
        </button>
      )}
    </div>
  )
}
