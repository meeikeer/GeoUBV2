import { useState } from 'react'
import AssetIcon from '../icons/AssetIcon.jsx'

/* Modal de acceso del admin. El estado de la sesión vive en MapPage (que ya
   lo tenía) y el token en services/auth.js, así que aquí solo se pide y se
   entrega al padre. */
export default function LoginPanel({ isOpen, onClose, onLogin, error, isOffline }) {
  const [tokenInput, setTokenInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!tokenInput.trim()) return
    setLoading(true)
    try {
      await onLogin(tokenInput.trim())
      setTokenInput('')
    } catch {
      // el error se muestra vía prop `error`
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Acceso de administrador"
        className="panel-glass chamfer-top sm:chamfer relative w-full max-w-sm shadow-2xl shadow-black/80 animate-sheet-up sm:animate-pop-in"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-3.5">
          <h2 className="flex items-center gap-2.5 font-display text-[15px] font-bold text-white">
            <span className="chamfer-sm grid h-8 w-8 place-items-center bg-brand-400/12 text-brand-400">
              <AssetIcon name="logout" className="h-4 w-4" />
            </span>
            Acceso administrador
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost chamfer-sm grid h-9 w-9 place-items-center"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isOffline ? (
          <div className="space-y-3 px-5 py-7 text-center">
            <span className="chip chamfer-sm mx-auto border-amber-400/30 bg-amber-400/10 text-amber-300">
              Sin conexión
            </span>
            <p className="text-[13px] leading-relaxed text-slate-400">
              Necesitas conexión a internet para validar el token de GitHub.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
            {error && (
              <div
                role="alert"
                className="chamfer-sm border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-[12px] text-rose-200"
              >
                {error}
              </div>
            )}

            <div>
              <label className="field-label" htmlFor="pat-input">
                GitHub Personal Access Token
              </label>
              <input
                id="pat-input"
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_••••••••••••••••"
                className="field chamfer-sm px-3 py-2.5 font-mono text-[13px]"
                autoComplete="off"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Se usa para leer y escribir archivos del repositorio. Requiere el permiso{' '}
                <code className="text-slate-400">repo</code>.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !tokenInput.trim()}
              className="btn btn-primary chamfer-sm w-full py-3 text-sm"
            >
              {loading ? 'Validando…' : 'Conectar con GitHub'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}