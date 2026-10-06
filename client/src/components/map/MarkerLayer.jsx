import AssetIcon from '../icons/AssetIcon.jsx'
import { resolveIcon } from '../../lib/categorias.js'

/* Categorías que sobreviven al zoom-away. Con dozens de lugares en el plano,
   al alejar todos compiten por el mismo pixel y el usuario no distingue nada.
   Estas son las que sostienen la orientacion; el resto entra al ampliar. */
const PRIORITY = new Set([8, 9, 2, 3]) // Entrada, Escaleras, Baños

export default function MarkerLayer({
  locations,
  getCategoria,
  zoom,
  activeId,
  selectedId,
  scale,
  showAllLabels,
  onSelect
}) {
  const declutter = zoom < 0.75
  const visible = declutter ? locations.filter(l => PRIORITY.has(l.categoriaId)) : locations
  const hiddenCount = locations.length - visible.length

  return (
    <>
      {hiddenCount > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center">
          <span className="chip chamfer-sm border-white/10 bg-ink-950/85 text-slate-400 backdrop-blur-sm">
            {hiddenCount} {hiddenCount === 1 ? 'lugar más' : 'lugares más'} al acercar
          </span>
        </div>
      )}

      {visible.map((item) => {
        const [normX, normY] = item.coords
        const categoria = getCategoria(item.categoriaId)
        const icon = resolveIcon(item.categoriaId, categoria?.nom_categoria, categoria?.url_icono)
        const isActive = activeId === item.id
        const isSelected = selectedId === item.id

        return (
          <div
            key={item.id}
            className="absolute z-20"
            style={{
              left: `${normX * 100}%`,
              top: `${normY * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {/* La escala va en un envoltorio: el button lleva rotate-45 de
                Tailwind y un transform inline lo pisaria. */}
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
              <button
                type="button"
                aria-label={`${item.name}${item.floor ? `, ${item.floor}` : ''}${categoria?.nom_categoria ? `, ${categoria.nom_categoria}` : ''}`}
                aria-pressed={isActive}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(isActive ? null : item)
                }}
                className={`marker-pin chamfer-sm grid h-[clamp(26px,3.4vw,40px)] w-[clamp(26px,3.4vw,40px)] rotate-45 place-items-center text-brand-300 no-tap-highlight ${
                  isActive ? 'marker-active' : ''
                } ${isSelected ? 'marker-selected' : ''}`}
              >
                <AssetIcon name={icon.name} src={icon.src} className="h-[62%] w-[62%] -rotate-45" />
              </button>

              {(showAllLabels || isActive) && <span className="marker-label">{item.name}</span>}
            </div>
          </div>
        )
      })}
    </>
  )
}