import AssetIcon from '../icons/AssetIcon.jsx'
import { categoriaNombre, resolveIcon } from '../../lib/categorias.js'

/* Tarjeta del lugar tocado. Antes el único gesto posible era ver el nombre:
   en una app de orientacion falta lo esencial, que es pedir la ruta a ese
   lugar sin escribir su nombre a mano. */
export default function LocationCard({ location, categoria, onRouteHere, onClose }) {
  const icon = resolveIcon(location.categoriaId, categoria?.nom_categoria, categoria?.url_icono)
  const categoryName = categoriaNombre(location.categoriaId, categoria?.nom_categoria)

  return (
    <div
      className="panel chamfer-sm w-56 overflow-hidden shadow-2xl shadow-black/80 animate-pop-in"
      role="dialog"
      aria-label={`${location.name}, ${categoryName}`}
      data-ui="true"
    >
      <div className="flex items-start gap-2.5 px-3 pt-3">
        <span className="chamfer-sm grid h-8 w-8 flex-none place-items-center border border-white/10 bg-ink-800 text-brand-400">
          <AssetIcon name={icon.name} src={icon.src} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">{location.name}</p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">
            {categoryName}
            {location.floor ? ` · ${location.floor}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost chamfer-sm -mr-1 -mt-1 flex-none p-1.5 text-slate-500 hover:text-slate-200"
          aria-label="Cerrar tarjeta"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-3 pb-3 pt-2.5">
        <button
          type="button"
          onClick={onRouteHere}
          className="btn btn-signal chamfer-sm w-full py-2 text-[12px]"
        >
          <AssetIcon name="route" className="h-3.5 w-3.5" />
          Cómo llegar aquí
        </button>
      </div>
    </div>
  )
}