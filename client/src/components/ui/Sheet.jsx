import { useEffect, useRef, useCallback } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/* Base de modal y panel lateral: focus trap, Escape, bloqueo de scroll y
   retorno del foco al elemento que lo abrió. Los cinco overlays del mapa
   (ruta, admin, form, offline, onboarding) repetían la misma envoltura sin
   ninguna de estas garantías. */
export default function Sheet({
  isOpen,
  onClose,
  title,
  description,
  icon,
  closeLabel = 'Cerrar',
  children,
  footer,
  variant = 'modal',
  labelledBy
}) {
  const panelRef = useRef(null)
  const restoreRef = useRef(null)

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose?.()
      return
    }
    if (e.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return
    const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
      el => el.offsetParent !== null || el === document.activeElement
    )
    if (items.length === 0) {
      e.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    restoreRef.current = document.activeElement

    const panel = panelRef.current
    const target = panel?.querySelector('[data-autofocus]') ||
      panel?.querySelector(FOCUSABLE) ||
      panel
    target?.focus?.()

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = overflow
      const restore = restoreRef.current
      if (restore && typeof restore.focus === 'function' && restore.isConnected) {
        restore.focus()
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const isPanel = variant === 'panel'

  return (
    <div
      className={
        isPanel
          ? 'fixed inset-0 z-50'
          : 'fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6'
      }
      onKeyDown={handleKeyDown}
    >
      <div
        className={`absolute inset-0 ${isPanel ? 'bg-ink-950/75 backdrop-blur-[2px]' : 'bg-ink-950/80 backdrop-blur-[2px]'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : title}
        tabIndex={-1}
        className={
          isPanel
            ? 'panel-glass chamfer-tl absolute inset-y-0 right-0 flex w-full flex-col border-l border-white/[0.08] shadow-2xl shadow-black/80 animate-slide-in-right'
            : 'panel-glass chamfer-top sm:chamfer relative flex max-h-[92vh] w-full max-w-md flex-col shadow-2xl shadow-black/80 animate-sheet-up sm:animate-pop-in'
        }
      >
        <header className="flex flex-none items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && (
              <span className="chamfer-sm grid h-8 w-8 flex-none place-items-center bg-brand-400/12 text-brand-400">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <h2
                id={labelledBy}
                className="truncate font-display text-[15px] font-bold text-white"
              >
                {title}
              </h2>
              {description && (
                <p className="mt-0.5 truncate text-[11px] text-slate-500">{description}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost chamfer-sm flex-none grid h-9 w-9 place-items-center"
            aria-label={closeLabel}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <footer className="flex-none border-t border-white/[0.07] px-5 py-3.5">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}