/* Estado vacío: no hay pisos publicados, o los datos no se pudieron leer.
   Antes esta situación devolvía una pantalla vacía sin explicación. */
export default function MapEmptyState({ message, onRetry }) {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center px-6">
      <div className="panel chamfer-sm max-w-xs px-6 py-5 text-center shadow-2xl shadow-black/70">
        <span className="chamfer-sm mx-auto grid h-11 w-11 place-items-center bg-brand-400/12 text-brand-400">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6" />
          </svg>
        </span>
        <h2 className="mt-3 font-display text-sm font-bold text-white">
          {message ? 'No se pudieron cargar los datos' : offline ? 'Sin conexión' : 'Sin plantas publicadas'}
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-slate-400">
          {/* El mensaje real va primero: si no, el texto genérico tapa el
              diagnóstico y no se sabe qué falló. */}
          {message ||
            (offline
              ? 'Conéctate a internet para descargar los datos del edificio.'
              : 'Todavía no hay pisos ni plantas cargados.')}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="btn btn-outline chamfer-sm mt-4 w-full py-2.5 text-[13px]"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  )
}