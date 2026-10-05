import Sheet from '../ui/Sheet.jsx'
import SearchInput from './SearchInput.jsx'
import AssetIcon from '../icons/AssetIcon.jsx'

/* Panel de cálculo de ruta. Sobre Sheet para tener Escape, focus trap y
   bloqueo de scroll. Origen precargado con la última ubicación usada, para no
   obligar a escribir los dos extremos. */
export default function RoutePanel({
  isOpen,
  onClose,
  onCalculate,
  onSwap,
  searchLocations,
  onSelectOrigin,
  onSelectDest,
  originValue,
  destValue,
  entrances
}) {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Calcular ruta"
      description="Elige desde dónde sales y adónde vas"
      labelledBy="route-panel-title"
      icon={<AssetIcon name="route" className="h-4 w-4" />}
      footer={
        <button
          type="button"
          onClick={onCalculate}
          className="btn btn-signal chamfer-sm w-full py-3 text-sm"
        >
          <AssetIcon name="route" className="h-4 w-4" />
          Trazar camino
        </button>
      }
    >
      <div className="space-y-4 px-5 py-5">
        <SearchInput
          id="route-origin"
          label="Desde"
          placeholder="Punto de origen…"
          onSelect={onSelectOrigin}
          searchFn={searchLocations}
          defaultValue={originValue}
        />

        <div className="flex items-center gap-2">
          {onSwap && (
            <button
              type="button"
              onClick={onSwap}
              className="btn btn-ghost chamfer-sm h-8 w-8 flex-none place-items-center text-slate-500 hover:text-white"
              aria-label="Intercambiar origen y destino"
              title="Intercambiar"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4v13M7 4 4 7M7 4l3 3M17 20V7M17 20l3-3M17 20l-3-3" />
              </svg>
            </button>
          )}

          <span className="h-px flex-1 bg-white/[0.07]" aria-hidden="true" />
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" aria-hidden="true" />
          <span className="h-px flex-1 bg-white/[0.07]" aria-hidden="true" />
          <span className="h-1.5 w-1.5 rounded-full bg-signal-400" aria-hidden="true" />
        </div>

        <SearchInput
          id="route-dest"
          label="Hasta"
          placeholder="Punto de destino…"
          onSelect={onSelectDest}
          searchFn={searchLocations}
          defaultValue={destValue}
        />

        {entrances?.length > 0 && (
          <div>
            <span className="field-label">Entradas del piso</span>
            <div className="flex flex-wrap gap-1.5">
              {entrances.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onSelectOrigin(e)}
                  className="chip chamfer-sm transition-colors duration-150 hover:border-brand-400/40 hover:text-brand-300"
                >
                  <AssetIcon name="entrada" className="h-3 w-3" />
                  {e.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}