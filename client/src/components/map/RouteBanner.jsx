import AssetIcon from '../icons/AssetIcon.jsx'

/* Banner de ruta. Sustituye al toast: el estado de ruta lived en
   useRouteManager pero nunca se renderizaba, asi que toda la guia multi-piso
   ("dirijase a la escalera…") se perdia. Ahora es persistente mientras haya
   ruta, con origen, destino, paso, distancia y acciones. */
export default function RouteBanner({
  originName,
  destName,
  status,
  leg,
  step,
  missing,
  onClear,
  onFocusDest,
  currentFloorName,
  destFloorName
}) {
  const onDifferentFloor =
    step && step.total > 1 && currentFloorName && destFloorName &&
    currentFloorName !== destFloorName

  return (
    <div
      data-ui="true"
      role="status"
      aria-live="polite"
      className="panel-glass chamfer-sm pointer-events-auto absolute inset-x-3 top-3 z-30 mx-auto max-w-2xl px-3 py-2.5 shadow-2xl shadow-black/70 animate-fade-rise"
    >
      <div className="flex items-center gap-3">
        <span
          className={`chamfer-sm grid h-8 w-8 flex-none place-items-center ${
            missing ? 'bg-rose-400/12 text-rose-300' : 'bg-signal-400/12 text-signal-400'
          }`}
        >
          <AssetIcon name="route" className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold">
            <span className="h-1.5 w-1.5 flex-none rounded-full bg-brand-400" aria-hidden="true" />
            <span className="truncate text-slate-200">{originName || 'Origen'}</span>
            <AssetIcon name="route" className="h-3 w-3 flex-none text-slate-600" />
            <span className="h-1.5 w-1.5 flex-none rounded-full bg-signal-400" aria-hidden="true" />
            <span className="truncate text-slate-200">{destName || 'Destino'}</span>
          </div>

          <p
            className={`mt-0.5 truncate text-[11px] ${
              missing ? 'text-rose-300' : onDifferentFloor ? 'text-brand-300' : 'text-slate-400'
            }`}
          >
            {status}
            {leg && !onDifferentFloor && (
              <span className="font-mono text-slate-500"> · {leg.meters} m · {leg.minutes} min</span>
            )}
          </p>
        </div>

        {step && step.total > 1 && (
          <span
            className="chip chamfer-sm hidden flex-none font-mono text-[10px] text-slate-400 sm:inline-flex"
            aria-label={`Paso ${step.index} de ${step.total}`}
          >
            {step.index}/{step.total}
          </span>
        )}

        <div className="flex flex-none items-center gap-1">
          {onFocusDest && (
            /* Antes estaba oculto en movil con hidden sm:inline-flex, y en
               movil es justo donde hace falta: la ruta se traza fuera del
               encuadre y no habia forma de verla. */
            <button
              type="button"
              onClick={onFocusDest}
              className="btn btn-ghost chamfer-sm flex h-8 flex-none items-center gap-1 px-2.5 text-[11px] text-slate-400 hover:text-white"
              title="Centrar el destino en el plano"
            >
              <AssetIcon name="pin" className="h-3.5 w-3.5" />
              Ver
            </button>
          )}
          <button
            type="button"
            onClick={onClear}
            className="btn btn-ghost chamfer-sm grid h-8 w-8 place-items-center text-slate-400 hover:text-rose-300"
            aria-label="Limpiar ruta"
            title="Limpiar ruta"
          >
            <AssetIcon name="trash" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}