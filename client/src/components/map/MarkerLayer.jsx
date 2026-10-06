import AssetIcon from '../icons/AssetIcon.jsx'
import { resolveIcon } from '../../lib/categorias.js'

/* Capa de marcadores.

   Sin decluttering: antes se ocultaban las categorías no prioritarias por
   debajo de 0.75 de zoom y salía un aviso de "N lugares más al acercar". Con el
   tamaño de marcador ya compensado (1.2 / zoom, ver MapPage) todos los lugares
   se leen a cualquier nivel, asi que esconderlos solo quitaba informacion.

   El escalado llega cuantizado desde MapPage, no continuo: asi la capa no se
   re-renderiza en cada evento de rueda. */
export default function MarkerLayer({
  locations,
  getCategoria,
  activeId,
  selectedId,
  scale,
  showAllLabels,
  onSelect
}) {
  return (
    <>
      {locations.map(item => {
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
                onClick={e => {
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