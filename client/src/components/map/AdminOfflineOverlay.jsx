import { useState, useCallback } from 'react'

export default function AdminOfflineOverlay({ onLogout }) {
  const [checking, setChecking] = useState(false)

  // Comueba GitHub sin esperar al evento 'online': al reconectar el router
  // puede tardar, y el overlay se queda puesto aunque ya haya red.
  const handleReconnect = useCallback(async () => {
    setChecking(true)
    try {
      const res = await fetch('https://api.github.com', { signal: AbortSignal.timeout(5000) })
      if (res.ok) window.location.reload()
    } catch {
      // sigue sin conexión: el listener 'online' de MapPage lo resolverá
    } finally {
      setChecking(false)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink-950/88 backdrop-blur-sm" aria-hidden="true" />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-offline-title"
        aria-describedby="admin-offline-desc"
        className="panel-glass chamfer-top sm:chamfer relative w-full max-w-sm px-6 pb-7 pt-8 text-center shadow-2xl shadow-black/80 animate-sheet-up sm:animate-pop-in"
      >
        <span className="animate-breathe mx-auto grid h-14 w-14 place-items-center">
          <span className="absolute h-14 w-14 rounded-full border border-amber-400/30" aria-hidden="true" />
          <span className="chamfer grid h-12 w-12 place-items-center bg-amber-400/12 text-amber-400">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M2 8.5a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0" />
              <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
              <path d="M3 3l18 18" />
            </svg>
          </span>
        </span>

        <h2 id="admin-offline-title" className="mt-5 font-display text-xl font-bold text-white">
          Sin conexión
        </h2>
        <p id="admin-offline-desc" className="mx-auto mt-2 max-w-[19rem] text-[13px] leading-relaxed text-slate-400">
          El modo administrador necesita internet para leer y escribir en GitHub. Reconecta o
          cierra la sesión para seguir como visitante.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleReconnect}
            disabled={checking}
            className="btn btn-primary chamfer-sm w-full py-3 text-[13px]"
          >
            {checking ? 'Comprobando…' : 'Reintentar conexión'}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="btn btn-outline chamfer-sm w-full py-3 text-[13px]"
          >
            Salir del modo admin
          </button>
        </div>
      </div>
    </div>
  )
}