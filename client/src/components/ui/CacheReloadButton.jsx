import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Sheet from './Sheet.jsx'
import AssetIcon from '../icons/AssetIcon.jsx'
import { resetAppCache } from '../../lib/cacheReset.js'

/* Botón "Recargar caché" con confirmación. Vacía Cache Storage, el
   instantáneo de datos en localStorage y fuerza la actualización del Service
   Worker antes de recargar: es el equivalente móvil del Ctrl+F5, más
   completo (Ctrl+F5 no toca ni las cachés del SW ni el localStorage).

   Sin conexión se deshabilita: vaciar y recargar dejaría el mapa sin datos
   hasta que vuelva la red. El token de admin y el onboarding no se borran. */
export default function CacheReloadButton({
  label,
  className = 'btn btn-ghost chamfer chamfer-sm h-10 px-3 text-[13px] sm:px-4'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleOpen = useCallback(() => {
    setError('')
    setIsOpen(true)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (busy || isOffline) return
    setBusy(true)
    setError('')
    try {
      await resetAppCache()
      // Con las cachés vacías, el reload obliga a re-descargar todo de red.
      window.location.reload()
    } catch (err) {
      setError(err?.message || 'No se pudo vaciar la caché.')
      setBusy(false)
    }
  }, [busy, isOffline])

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={className}
        aria-label="Recargar caché"
        title="Recargar caché"
      >
        <AssetIcon name="restart" className="h-4 w-4" />
        {label && <span className="hidden sm:inline">{label}</span>}
      </button>

      {/* Portal fuera del header: backdrop-blur-xl crea containing block para
          position:fixed y stacking context, así que el Sheet quedaría recortado
          dentro de la barra y por debajo de los z-50 del mapa (toasts). */}
      {createPortal(
        <Sheet
          isOpen={isOpen}
          onClose={busy ? undefined : () => setIsOpen(false)}
          title="Recargar caché"
          description="Si la página no se actualiza sola"
          labelledBy="cache-reload-title"
          closeLabel="Cerrar"
          icon={<AssetIcon name="restart" className="h-4 w-4" />}
          footer={
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy || isOffline}
              className="btn btn-primary chamfer-sm w-full py-3 text-sm"
            >
              <AssetIcon name="restart" className="h-4 w-4" />
              {busy ? 'Vaciando caché…' : 'Vaciar caché y recargar'}
            </button>
          }
        >
          <div className="space-y-3 px-5 py-5">
            <p className="text-[13px] leading-relaxed text-slate-400">
              Se borran los planos, los datos y el código de la página guardados
              en este dispositivo, y se vuelve a descargar todo desde cero. Úsalo
              cuando el mapa muestre información vieja o salga desactualizado.
            </p>

            {isOffline && (
              <div
                role="alert"
                className="chamfer-sm border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[12px] leading-relaxed text-amber-200"
              >
                Sin conexión: con la caché vacía el mapa no podría cargarse.
                Espera a tener señal y vuelve a intentarlo.
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="chamfer-sm border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-[12px] leading-relaxed text-rose-200"
              >
                {error}
              </div>
            )}

            <p className="text-[11px] leading-relaxed text-slate-500">
              No se borra tu sesión de administrador ni la guía de uso.
            </p>
          </div>
        </Sheet>,
        document.body
      )}
    </>
  )
}
