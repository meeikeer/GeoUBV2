import FloorControls from './FloorControls.jsx'
import AssetIcon from '../icons/AssetIcon.jsx'

export default function BottomToolbar({
  currentPiso,
  canGoUp,
  canGoDown,
  goUp,
  goDown,
  sortedPisos,
  onSelectFloor,
  currentZoom,
  onZoomIn,
  onZoomOut,
  onFit,
  onRouteClick,
  onClearRoute,
  isScanning,
  isLoading
}) {
  const zoomBtn =
    'btn btn-ghost chamfer-sm h-10 w-10 border border-white/10 text-slate-300 hover:border-brand-400/40 hover:text-brand-300'

  return (
    <div className="safe-b fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-ink-950/88 px-3 pt-2.5 backdrop-blur-xl sm:px-4">
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
          {isScanning && (
            <span className="chip chamfer-sm scan-line hidden border-brand-400/25 text-brand-300 md:inline-flex">
              <span className="scan-dot h-1.5 w-1.5 rounded-full bg-brand-400" />
              Escaneando
            </span>
          )}
          {isLoading && (
            <span className="hidden font-mono text-[10px] text-slate-500 lg:inline">Cargando…</span>
          )}

          <button
            onClick={onClearRoute}
            className="btn btn-ghost chamfer-sm h-10 w-10 border border-white/10 text-slate-400 hover:border-rose-400/40 hover:text-rose-300 sm:w-auto sm:px-3"
            aria-label="Limpiar ruta"
            title="Limpiar ruta"
          >
            <AssetIcon name="trash" className="h-4 w-4" />
            <span className="hidden text-xs sm:inline">Limpiar</span>
          </button>

          <button
            onClick={onRouteClick}
            className="btn btn-signal chamfer-sm h-10 px-3 text-[13px] sm:px-4"
            aria-label="Calcular ruta"
          >
            <AssetIcon name="route" className="h-4 w-4" />
            <span className="hidden sm:inline">Ruta</span>
          </button>

          <div className="ml-1 hidden items-center gap-1 border-l border-white/[0.07] pl-2 sm:flex">
            <button onClick={onZoomOut} className={zoomBtn} aria-label="Alejar" title="Alejar">
              <AssetIcon name="zoomout" className="h-4 w-4" />
            </button>
            <span className="w-11 text-center font-mono text-[10px] text-slate-500">
              {Math.round(currentZoom * 100)}%
            </span>
            <button onClick={onZoomIn} className={zoomBtn} aria-label="Acercar" title="Acercar">
              <AssetIcon name="zoomin" className="h-4 w-4" />
            </button>
            <button onClick={onFit} className={zoomBtn} aria-label="Ajustar vista" title="Ajustar vista">
              <AssetIcon name="restart" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}