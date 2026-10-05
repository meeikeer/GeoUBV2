import SearchInput from './SearchInput.jsx'
import AssetIcon from '../icons/AssetIcon.jsx'

export default function RoutePanel({
  isOpen,
  onClose,
  onCalculate,
  searchLocations,
  onSelectOrigin,
  onSelectDest,
  originValue,
  destValue
}) {
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
        aria-label="Calcular ruta"
        className="panel-glass chamfer-top sm:chamfer relative w-full max-w-md shadow-2xl shadow-black/80 animate-sheet-up sm:animate-pop-in"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-3.5">
          <h2 className="flex items-center gap-2.5 font-display text-[15px] font-bold text-white">
            <span className="chamfer-sm grid h-8 w-8 place-items-center bg-signal-400/12 text-signal-400">
              <AssetIcon name="route" className="h-4 w-4" />
            </span>
            Calcular ruta
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

        <div className="space-y-4 px-5 py-5">
          <SearchInput
            label="Desde"
            placeholder="Punto de origen…"
            onSelect={onSelectOrigin}
            searchFn={searchLocations}
            defaultValue={originValue}
          />

          <div className="flex items-center gap-2" aria-hidden="true">
            <span className="h-px flex-1 bg-white/[0.07]" />
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            <span className="h-px flex-1 bg-white/[0.07]" />
            <span className="h-1.5 w-1.5 rounded-full bg-signal-400" />
          </div>

          <SearchInput
            label="Hasta"
            placeholder="Punto de destino…"
            onSelect={onSelectDest}
            searchFn={searchLocations}
            defaultValue={destValue}
          />

          <button onClick={onCalculate} className="btn btn-signal chamfer-sm w-full py-3.5 text-sm">
            <AssetIcon name="route" className="h-4 w-4" />
            Trazar camino
          </button>
        </div>
      </div>
    </div>
  )
}