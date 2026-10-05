import AssetIcon from '../icons/AssetIcon.jsx'

/* Un solo juego de controles, siempre en el mismo sitio y con el readout en
   todos los breakpoints. Antes coexistían dos: una columna móvil en MapPage
   (sin readout) y otra en la barra inferior (hidden en móvil). */
export default function MapControls({ zoom, onZoomIn, onZoomOut, onFit }) {
  return (
    <div
      data-ui="true"
      className="absolute bottom-4 right-3 z-30 flex flex-col gap-1.5"
      role="group"
      aria-label="Controles del plano"
    >
      <div className="panel-glass chamfer flex flex-col gap-1 p-1">
        <button
          type="button"
          onClick={onZoomIn}
          className="btn btn-ghost chamfer-sm grid h-11 w-11 place-items-center"
          aria-label="Acercar"
          title="Acercar"
        >
          <AssetIcon name="zoomin" className="h-[18px] w-[18px]" />
        </button>
        <span
          className="select-none border-y border-white/[0.07] py-1 text-center font-mono text-[10px] text-slate-500"
          aria-hidden="true"
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={onZoomOut}
          className="btn btn-ghost chamfer-sm grid h-11 w-11 place-items-center"
          aria-label="Alejar"
          title="Alejar"
        >
          <AssetIcon name="zoomout" className="h-[18px] w-[18px]" />
        </button>
      </div>
      <button
        type="button"
        onClick={onFit}
        className="btn btn-outline chamfer-sm grid h-11 w-11 place-items-center"
        aria-label="Ver la planta completa"
        title="Ver la planta completa"
      >
        <AssetIcon name="restart" className="h-[18px] w-[18px]" />
      </button>
    </div>
  )
}