import FloorControls from './FloorControls.jsx'
import AssetIcon from '../icons/AssetIcon.jsx'

/* Barra inferior en flujo (ya no fixed): antes tapaba ~90 px del plano y
   había que tapar el hueco con un degradado. El zoom vive en MapControls,
   único juego de controles. */
export default function BottomToolbar({
  currentPiso,
  canGoUp,
  canGoDown,
  goUp,
  goDown,
  sortedPisos,
  onSelectFloor,
  onRouteClick,
  onClearRoute,
  hasRoute
}) {
  return (
    <div className="safe-b z-40 flex-none border-t border-white/[0.06] bg-ink-950/88 px-3 pt-2.5 backdrop-blur-xl sm:px-4">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
        <FloorControls
          currentPiso={currentPiso}
          canGoUp={canGoUp}
          canGoDown={canGoDown}
          goUp={goUp}
          goDown={goDown}
          sortedPisos={sortedPisos}
          onSelectFloor={onSelectFloor}
        />

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onClearRoute}
            disabled={!hasRoute}
            className="btn btn-ghost chamfer-sm h-10 w-10 border border-white/10 text-slate-400 hover:border-rose-400/40 hover:text-rose-300 disabled:border-white/[0.04] disabled:text-slate-700 sm:w-auto sm:px-3"
            aria-label="Limpiar ruta"
            title="Limpiar ruta"
          >
            <AssetIcon name="trash" className="h-4 w-4" />
            <span className="hidden text-xs sm:inline">Limpiar</span>
          </button>

          <button
            type="button"
            onClick={onRouteClick}
            className="btn btn-signal chamfer-sm h-10 px-3 text-[13px] sm:px-4"
          >
            <AssetIcon name="route" className="h-4 w-4" />
            <span className="hidden sm:inline">Ruta</span>
            <span className="sr-only sm:hidden">Calcular ruta</span>
          </button>
        </div>
      </div>
    </div>
  )
}