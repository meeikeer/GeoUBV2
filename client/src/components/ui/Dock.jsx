import { useEffect, useRef } from 'react'

/* Panel lateral no modal.

   A diferencia de Sheet no trae backdrop, focus trap ni bloqueo de scroll: su
   motivo de existir es enseñar el preview de un cambio mientras el plano sigue
   visible y interactuable debajo. Escape cierra y el foco entra al abrir, pero
   nada más se intercepta. */
export default function Dock({
  isOpen,
  onClose,
  title,
  description,
  icon,
  label,
  closeLabel = 'Cerrar',
  children,
  footer
}) {
  const panelRef = useRef(null)

  // Foco al abrir, una sola vez: si fuera una dependencia del listener, cada
  // render del padre (zoom, toasts…) robaría el foco al botón enfocado.
  useEffect(() => {
    if (!isOpen) return
    panelRef.current?.focus?.()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="region"
      aria-label={label || title}
      data-ui="true"
      className="panel-glass chamfer-top sm:chamfer-tl absolute inset-x-0 bottom-0 z-40 flex max-h-[58dvh] w-full flex-col border border-white/[0.08] shadow-2xl shadow-black/80 outline-none animate-sheet-up sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[420px] sm:animate-slide-in-right"
    >
      <header className="flex flex-none items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && (
            <span className="chamfer-sm grid h-8 w-8 flex-none place-items-center bg-brand-400/12 text-brand-400">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate font-display text-[15px] font-bold text-white">{title}</h2>
            {description && (
              <p className="mt-0.5 truncate text-[11px] text-slate-500">{description}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost chamfer-sm grid h-9 w-9 flex-none place-items-center"
          aria-label={closeLabel}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">{children}</div>

      {footer && (
        <footer className="flex-none border-t border-white/[0.07] px-4 py-3">{footer}</footer>
      )}
    </div>
  )
}
