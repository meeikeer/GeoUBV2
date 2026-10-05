import AssetIcon from '../icons/AssetIcon.jsx'

/* Estado de error de carga. Antes un PNG que fallaba resolvía en falso y
   dejaba la pantalla en negro sin ninguna explicación. */
export default function MapErrorState({ onRetry, isRetrying }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center px-6">
      <div className="panel chamfer-sm max-w-xs px-6 py-5 text-center shadow-2xl shadow-black/70">
        <span className="mx-auto chamfer-sm grid h-11 w-11 place-items-center bg-rose-400/12 text-rose-300">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 9v4M12 17h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
        </span>
        <h2 className="mt-3 font-display text-sm font-bold text-white">No se pudo cargar la planta</h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-slate-400">
          Revisa tu conexión y vuelve a intentarlo. Si sigues sin ver el plano, el archivo puede no
          estar disponible.
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="btn btn-outline chamfer-sm mt-4 w-full py-2.5 text-[13px]"
        >
          <AssetIcon name="restart" className="h-3.5 w-3.5" />
          {isRetrying ? 'Reintentando…' : 'Reintentar'}
        </button>
      </div>
    </div>
  )
}