import AssetIcon from '../icons/AssetIcon.jsx'
import { resolveIcon } from '../../lib/categorias.js'

/* Marcadores del preview de sesión.

   Pinta TODOS los cambios etapados que afectan a la planta actual, no solo el
   seleccionado: el seleccionado sale con etiqueta y opacidad completa y el
   resto solo con su marcador, para que el admin vea la sesión entera sin
   saturar el plano.

   Va como hijo del plano (hermano de MarkerLayer) para compartir su sistema de
   coordenadas 0-1, y con pointer-events-none para no tapar el plano: el dock de
   preview no es modal y el admin sigue pudiendo panear y hacer zoom mientras
   decide si publica. Solo se pinta en la vista Mapa del preview. */

function GhostPin({ icon, color, bg, kind }) {
  return (
    <span className="relative grid place-items-center">
      {/* Halo respirando detrás del rombo: da la sensación de "todavía no está
          publicado" y distingue el fantasma de un marcador real. */}
      <span
        className="animate-breathe absolute h-11 w-11 rounded-full border-2"
        style={{ borderColor: color }}
        aria-hidden="true"
      />
      <span
        className="marker-pin chamfer-sm grid h-[clamp(22px,2.4vw,28px)] w-[clamp(22px,2.4vw,28px)] rotate-45 place-items-center"
        style={{ borderStyle: 'dashed', borderColor: color, backgroundColor: bg, color }}
      >
        {kind === 'delete' ? (
          <svg viewBox="0 0 24 24" className="h-[62%] w-[62%] -rotate-45" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <AssetIcon name={icon.name} src={icon.src} className="h-[62%] w-[62%] -rotate-45" />
        )}
      </span>
    </span>
  )
}

function Ring({ color }) {
  return (
    <span className="relative grid place-items-center">
      <span
        className="animate-breathe absolute h-10 w-10 rounded-full border-2 border-dashed"
        style={{ borderColor: color }}
        aria-hidden="true"
      />
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
    </span>
  )
}

/* Marcadores que corresponde pintar para UN cambio en la planta `currentPisoId`.
   Devuelve [] si el cambio no toca esta planta. */
function changeItems(change, { currentPisoId, locations, categorias }) {
  const { entity, op, body, before, id } = change
  const items = []
  const categoriaOf = (catId) => (categorias || []).find(c => c.id_categoria === catId) || null

  if (entity === 'habitacion') {
    const live = (locations || []).find(l => l.id === (id || before?.id_habitacion))

    if (op === 'create' && body?.id_piso_fk === currentPisoId) {
      const cat = categoriaOf(body.id_categoria_fk)
      items.push({
        kind: 'create',
        coords: [body.coord_x, body.coord_y],
        label: `Nuevo: ${body.nom_codigo}`,
        color: '#2dd4bf',
        bg: '#14302c',
        icon: resolveIcon(body.id_categoria_fk, cat?.nom_categoria, cat?.url_icono)
      })
    } else if (op === 'delete' && before?.id_piso_fk === currentPisoId && (live || before)) {
      items.push({
        kind: 'delete',
        coords: live ? live.coords : [before.coord_x, before.coord_y],
        label: `Se eliminará: ${before.nom_codigo}`,
        color: '#f87171',
        bg: '#2a1414'
      })
    } else if (op === 'update') {
      const moved = body?.id_piso_fk !== before?.id_piso_fk
      if (moved && body?.id_piso_fk === currentPisoId) {
        // Cambió de piso: en la planta destino aún no hay marcador.
        const cat = categoriaOf(body.id_categoria_fk)
        items.push({
          kind: 'create',
          coords: [body.coord_x, body.coord_y],
          label: `Se moverá aquí: ${body.nom_codigo}`,
          color: '#fbbf24',
          bg: '#2a2418',
          icon: resolveIcon(body.id_categoria_fk, cat?.nom_categoria, cat?.url_icono)
        })
      } else if (moved && before?.id_piso_fk === currentPisoId) {
        // Cambió de piso: en la planta origen el marcador actual desaparecerá.
        items.push({
          kind: 'delete',
          coords: live ? live.coords : [before.coord_x, before.coord_y],
          label: `Se irá de aquí: ${before.nom_codigo}`,
          color: '#f87171',
          bg: '#2a1414'
        })
      } else if (!moved && before?.id_piso_fk === currentPisoId) {
        items.push({
          kind: 'edit',
          coords: live ? live.coords : [before.coord_x, before.coord_y],
          label: body?.nom_codigo !== before?.nom_codigo
            ? `Se renombrará: ${body.nom_codigo}`
            : `Se actualizará: ${before.nom_codigo}`,
          color: '#fbbf24',
          bg: '#2a2418'
        })
      }
    }
  } else if (entity === 'categoria' && (op === 'update' || op === 'delete')) {
    // Los marcadores no cambian de sitio: lo que cambia es su aspecto (nombre
    // e icono) o su existencia, así que se resalta el conjunto afectado.
    const affected = (locations || []).filter(l => l.categoriaId === id)
    affected.forEach((l) => {
      items.push({
        kind: op === 'delete' ? 'delete' : 'edit',
        coords: l.coords,
        color: op === 'delete' ? '#f87171' : '#fbbf24'
      })
    })
  }

  return items
}

export default function PreviewOverlay({
  isOpen,
  view,
  changes,
  selectedKey,
  currentPisoId,
  locations,
  categorias,
  scale = 1
}) {
  if (!isOpen || !changes || changes.length === 0 || view !== 'map') return null

  const items = []
  for (const change of changes) {
    const selected = change.key === selectedKey
    const built = changeItems(change, { currentPisoId, locations, categorias })
    built.forEach((item, i) => items.push({ ...item, key: `${change.key}-${i}`, selected }))
  }

  if (items.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {items.map(item => (
        <div
          key={item.key}
          className="absolute z-20"
          style={{
            left: `${item.coords[0] * 100}%`,
            top: `${item.coords[1] * 100}%`,
            transform: 'translate(-50%, -50%)',
            opacity: item.selected ? 1 : 0.7
          }}
        >
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
            {item.kind === 'edit' && !item.icon ? (
              <Ring color={item.color} />
            ) : (
              <GhostPin icon={item.icon || { name: 'pin' }} color={item.color} bg={item.bg || '#171b25'} kind={item.kind} />
            )}
            {item.selected && item.label && (
              <span className="marker-label" style={{ color: item.color }}>
                {item.label}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
