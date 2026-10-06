import AssetIcon from '../icons/AssetIcon.jsx'

/*Controles de administracion sobre el plano.
   Los botones se mantienen en la fila, pero el contenedor se baja para no
   chocar con el RouteBanner ni con la barra superior. */
export default function AdminToolbar({
  addingMode,
  onToggleAdd,
  onOpenList,
  hasDraft,
  previewOpen,
  onOpenPreview,
  onLogout
}) {
  const base = 'btn chamfer-sm h-9 px-2.5 text-[11px] font-semibold sm:px-3 sm:text-xs'

  return (
    <div className="panel-glass chamfer absolute left-3 top-3 z-20 flex items-center gap-1 p-1 shadow-xl shadow-black/50">
      <button
        type="button"
        onClick={onToggleAdd}
        className={`${base} ${
          addingMode ? 'bg-signal-400 text-ink-950' : 'btn-ghost text-slate-300 hover:text-white'
        }`}
        aria-label={addingMode ? 'Cancelar colocación' : 'Agregar ubicación'}
        aria-pressed={addingMode}
      >
        {addingMode ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <AssetIcon name="pin" className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">{addingMode ? 'Cancelar' : 'Agregar'}</span>
      </button>

      <button
        type="button"
        onClick={onOpenList}
        className={`${base} btn-ghost text-slate-300 hover:text-white`}
        aria-label="Gestionar ubicaciones"
      >
        <AssetIcon name="list" className="h-4 w-4" />
        <span className="hidden sm:inline">Lista</span>
      </button>

      {hasDraft && (
        <button
          type="button"
          onClick={onOpenPreview}
          className={`${base} ${
            previewOpen
              ? 'bg-brand-400/15 text-brand-300'
              : 'btn-ghost text-slate-300 hover:text-white'
          }`}
          aria-label="Ver el preview del cambio pendiente"
          aria-pressed={previewOpen}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="hidden sm:inline">Preview</span>
          {!previewOpen && (
            <span className="h-1.5 w-1.5 rounded-full bg-signal-400" aria-hidden="true" />
          )}
        </button>
      )}

      <span className="mx-0.5 h-5 w-px bg-white/10" aria-hidden="true" />

      <button
        type="button"
        onClick={onLogout}
        className={`${base} btn-danger`}
        aria-label="Cerrar sesión de administrador"
      >
        <AssetIcon name="logout" className="h-4 w-4" />
        <span className="hidden sm:inline">Salir</span>
      </button>
    </div>
  )
}