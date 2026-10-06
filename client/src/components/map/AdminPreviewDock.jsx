import { useState, useMemo } from 'react'
import Dock from '../ui/Dock.jsx'
import AssetIcon from '../icons/AssetIcon.jsx'
import { resolveIcon } from '../../lib/categorias.js'
import { assetUrl } from '../../lib/assets.js'
import {
  ENTITY_META,
  OP_META,
  opChipClass,
  displayName,
  diffRows,
  formatValue,
  countByOp,
  groupByFile
} from '../../lib/previewChange.js'

/* Dock de preview de sesión: el paso intermedio entre los formularios y los
   commits. Acumula TODOS los cambios etapados (adiciones, ediciones y
   eliminaciones, en cualquier planta) y los enseña en dos vistas conmutables —
   Mapa (qué va a pasar sobre el plano) y JSON (payloads con diff antes/después)
   — antes de que el admin pulse Publicar. No es modal: el plano sigue visible.

   Solo se escribe en GitHub al Publicar, agrupado 1 commit por fichero. */

const VIEWS = [
  { key: 'map', label: 'Mapa' },
  { key: 'json', label: 'JSON' }
]

function Field({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.05] py-2 last:border-0">
      <span className="flex-none text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500">
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-[13px] text-slate-200">{value}</span>
    </div>
  )
}

function MapHintBox({ children }) {
  return (
    <div className="chamfer-sm border border-brand-400/25 bg-brand-400/[0.07] px-3 py-2.5 text-[12px] leading-relaxed text-brand-100">
      {children}
    </div>
  )
}

/* Miniatura del PNG de un piso o del icono de una categoría: es la única
   preview "visual" que tienen entidades sin marcador propio. Se oculta si el
   archivo no existe (piso nuevo cuyo PNG aún no está en el bundle). */
function AssetThumb({ url, alt }) {
  const [broken, setBroken] = useState(false)
  if (!url || broken) return null
  return (
    <img
      src={assetUrl(url)}
      alt={alt}
      onError={() => setBroken(true)}
      className="chamfer-sm mt-3 max-h-40 w-full border border-white/10 object-contain bg-white/90"
    />
  )
}

function summaryRows(change, data) {
  const { entity, op, body, before, id } = change
  const rec = op === 'delete' ? before : { ...before, ...body }

  if (entity === 'habitacion') {
    const piso = data.pisos.find(p => p.id_piso === rec?.id_piso_fk)
    const cat = data.categorias.find(c => c.id_categoria === rec?.id_categoria_fk)
    return [
      { label: 'Nombre', value: rec?.nom_codigo || '—' },
      { label: 'Categoría', value: cat?.nom_categoria || '—' },
      { label: 'Piso', value: piso?.nom_piso || `Piso ${rec?.id_piso_fk}` },
      { label: 'Coordenadas', value: `${Number(rec?.coord_x ?? 0).toFixed(3)}, ${Number(rec?.coord_y ?? 0).toFixed(3)}` },
      ...(rec?.es_conexion ? [{ label: 'Conexión', value: rec.nom_conexion || 'sí' }] : [])
    ]
  }

  if (entity === 'piso') {
    const edificio = data.edificios.find(e => e.id_edificio === rec?.id_edificio_fk)
    return [
      { label: 'Nombre', value: rec?.nom_piso || '—' },
      { label: 'Número', value: `${rec?.num_piso ?? '—'} (${rec?.display || 'sin display'})` },
      { label: 'Edificio', value: edificio?.nom_edificio || `#${rec?.id_edificio_fk}` },
      { label: 'PNG', value: rec?.url_map || '—' }
    ]
  }

  if (entity === 'edificio') {
    const sede = data.sedes.find(s => s.id_sede === rec?.id_sede_fk)
    return [
      { label: 'Nombre', value: rec?.nom_edificio || '—' },
      { label: 'Sede', value: sede?.nom_sede || `#${rec?.id_sede_fk}` }
    ]
  }

  if (entity === 'categoria') {
    const usos = data.allLocations.filter(l => l.categoriaId === id).length
    return [
      { label: 'Nombre', value: rec?.nom_categoria || '—' },
      { label: 'Icono', value: rec?.url_icono || 'por defecto (Aula)' },
      { label: 'Marcadores', value: op === 'delete' ? `${usos} se verán afectados` : `${usos} con esta categoría` }
    ]
  }

  return []
}

function mapNarrative(change, data) {
  const { entity, op, body, before } = change
  const name = displayName(change)

  if (entity === 'habitacion') {
    if (op === 'create') return `Aparecerá un marcador fantasma en ${name} con la categoría elegida hasta que publiques.`
    if (op === 'delete') return `El marcador de ${name} se marcará en rojo y desaparecerá del plano al publicar.`
    const moved = body?.id_piso_fk !== before?.id_piso_fk
    return moved
      ? `${name} se marcará en la planta destino y, en la actual, con "Se irá de aquí".`
      : `El marcador de ${name} se resalta con el aspecto nuevo (nombre y categoría).`
  }

  if (entity === 'categoria') {
    const usos = data.allLocations.filter(l => l.categoriaId === change.id).length
    if (op === 'delete') return `Los ${usos} marcadores de esta categoría quedarán marcados para su eliminación lógica (los registros siguen existiendo hasta publicar).`
    return `Los ${usos} marcadores de esta categoría se resaltan en el plano con el nuevo nombre e icono.`
  }

  if (entity === 'piso') return 'Los pisos no tienen marcador propio: su efecto visible es el PNG de la planta, que se muestra debajo.'

  return 'Los edificios no están dibujados en el plano: revisa la vista JSON para verificar el cambio.'
}

function jsonLineClass(mark) {
  if (mark === '+') return 'text-emerald-300'
  if (mark === '~') return 'text-brand-300'
  if (mark === '-') return 'text-rose-300'
  return 'text-slate-300'
}

/* Bloque de diff de UN cambio: cabecera seleccionable + payload en mono. */
function DiffBlock({ change, selected, onSelect }) {
  const rows = diffRows(change)
  const opMeta = OP_META[change.op]

  return (
    <div className={`chamfer-sm border ${selected ? 'border-brand-400/45' : 'border-white/[0.08]'}`}>
      <button
        type="button"
        onClick={() => onSelect(change.key)}
        aria-pressed={selected}
        className="flex w-full items-center gap-2 border-b border-white/[0.06] bg-white/[0.03] px-3 py-2 text-left"
      >
        <span className={`chamfer-sm flex-none border px-1.5 py-0.5 text-[10px] font-semibold ${opChipClass(change.op)}`}>
          {opMeta.label}
        </span>
        <span className="truncate text-[12px] text-slate-200">{displayName(change)}</span>
      </button>

      <div className="p-3 font-mono text-[11.5px] leading-relaxed">
        <div className="text-slate-500">{'{'}</div>
        {rows.map((row, i) => (
          <div key={`${row.key}-${i}`} className="flex gap-2 pl-2">
            <span className={`w-3 flex-none select-none font-bold ${jsonLineClass(row.mark)}`}>
              {row.mark === ' ' ? '' : row.mark}
            </span>
            <span className={jsonLineClass(row.mark)}>
              "{row.key}":{' '}
              <span className="text-slate-100">{formatValue(row.value)}</span>
              {row.prev !== undefined && (
                <span className="text-slate-500"> /* antes: {formatValue(row.prev)} */</span>
              )}
              {i < rows.length - 1 ? ',' : ''}
            </span>
          </div>
        ))}
        {change.op === 'create' && ENTITY_META[change.entity].idField && (
          <div className="flex gap-2 pl-2">
            <span className="w-3 flex-none select-none font-bold text-emerald-300">+</span>
            <span className="text-slate-500 italic">
              "{ENTITY_META[change.entity].idField}": asignado al publicar
            </span>
          </div>
        )}
        <div className="text-slate-500">{'}'}</div>
      </div>
    </div>
  )
}

export default function AdminPreviewDock({
  isOpen,
  onClose,
  changes,
  change,
  onSelect,
  view,
  onViewChange,
  onPublish,
  onDiscard,
  onDiscardAll,
  publishing,
  publishError,
  data,
  currentPiso,
  onGoToFloor
}) {
  const counts = useMemo(() => countByOp(changes || []), [changes])
  const groups = useMemo(() => groupByFile(changes || []), [changes])

  if (!changes || changes.length === 0) return null
  const selected = change || changes[0]
  const n = changes.length

  const opMeta = OP_META[selected.op]

  const targetPisoId =
    selected.entity === 'habitacion'
      ? (selected.op === 'delete' ? selected.before?.id_piso_fk : selected.body?.id_piso_fk)
      : null
  const targetPiso = data.pisos.find(p => p.id_piso === targetPisoId)
  const needsFloorJump = Boolean(targetPiso && currentPiso?.id_piso !== targetPisoId)

  const thumb =
    selected.entity === 'piso'
      ? (selected.body || selected.before)?.url_map
      : null
  const categoriaIcon =
    selected.entity === 'categoria'
      ? resolveIcon(
          selected.id,
          (selected.body || selected.before)?.nom_categoria,
          (selected.body || selected.before)?.url_icono
        )
      : null

  /** Etiqueta corta de la derecha en la lista: piso destino o tipo de entidad. */
  const listTag = (c) => {
    if (c.entity === 'habitacion') {
      const pisoId = c.op === 'delete' ? c.before?.id_piso_fk : c.body?.id_piso_fk
      const piso = data.pisos.find(p => p.id_piso === pisoId)
      return piso?.nom_piso || `Piso ${pisoId}`
    }
    return ENTITY_META[c.entity].label
  }

  return (
    <Dock
      isOpen={isOpen}
      onClose={onClose}
      title="Preview de la sesión"
      description={`${n} ${n === 1 ? 'cambio pendiente' : 'cambios pendientes'} de publicar`}
      label="Preview de la sesión"
      icon={<AssetIcon name={selected.entity === 'habitacion' ? 'pin' : 'list'} className="h-4 w-4" />}
      footer={
        <div className="space-y-2.5">
          {publishError && (
            <p role="alert" className="chamfer-sm border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-[12px] text-rose-200">
              {publishError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onPublish}
              disabled={publishing}
              className="btn btn-primary chamfer-sm flex-1 py-2.5 text-xs"
            >
              {publishing ? 'Publicando…' : n === 1 ? 'Publicar cambio' : `Publicar ${n} cambios`}
            </button>
            <button
              type="button"
              onClick={onDiscardAll}
              disabled={publishing}
              className="btn btn-outline chamfer-sm px-4 py-2.5 text-xs"
            >
              {n === 1 ? 'Descartar' : 'Descartar todo'}
            </button>
          </div>
        </div>
      }
    >
      {/* Resumen y lista de la sesión: cada fila selecciona su cambio (y salta
          a su planta); la X descarta solo esa entrada. */}
      <div className="space-y-2.5 border-b border-white/[0.07] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-slate-200">
            {n} {n === 1 ? 'cambio pendiente' : 'cambios pendientes'}
          </p>
          <div className="flex flex-none gap-1.5">
            {counts.create > 0 && (
              <span className="chamfer-sm border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-200">
                {counts.create} crear
              </span>
            )}
            {counts.update > 0 && (
              <span className="chamfer-sm border border-brand-400/30 bg-brand-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-200">
                {counts.update} editar
              </span>
            )}
            {counts.delete > 0 && (
              <span className="chamfer-sm border border-rose-400/30 bg-rose-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-200">
                {counts.delete} eliminar
              </span>
            )}
          </div>
        </div>

        <ul className="scroll-slim max-h-36 space-y-1 overflow-y-auto pr-0.5">
          {changes.map(c => {
            const active = c.key === selected.key
            return (
              <li
                key={c.key}
                className={`flex items-center gap-1 border ${active ? 'border-brand-400/45 bg-brand-400/10' : 'border-white/[0.06] bg-ink-900/50'}`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(c.key)}
                  aria-pressed={active}
                  className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
                >
                  <span className={`chamfer-sm flex-none border px-1.5 py-0.5 text-[10px] font-semibold ${opChipClass(c.op)}`}>
                    {OP_META[c.op].label}
                  </span>
                  <span className="truncate text-[12px] text-slate-200">{displayName(c)}</span>
                  <span className="ml-auto flex-none pl-1 text-[10px] text-slate-500">{listTag(c)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDiscard(c.key)}
                  aria-label={`Descartar: ${displayName(c)}`}
                  title="Descartar este cambio"
                  disabled={publishing}
                  className="mr-1 grid h-7 w-7 flex-none place-items-center text-slate-500 transition-colors hover:text-rose-300"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div role="tablist" aria-label="Vista del preview" className="flex gap-1 border-b border-white/[0.07] px-4">
        {VIEWS.map(v => {
          const active = view === v.key
          return (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onViewChange(v.key)}
              className={`relative flex-1 py-2.5 text-center text-xs font-semibold transition-colors duration-200 ${
                active ? 'text-brand-300' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {v.label}
              <span
                className={`absolute inset-x-3 bottom-0 h-[2px] origin-center bg-brand-400 transition-transform duration-300 ${
                  active ? 'scale-x-100' : 'scale-x-0'
                }`}
                aria-hidden="true"
              />
            </button>
          )
        })}
      </div>

      <div role="tabpanel" aria-label={view === 'map' ? 'Vista en el mapa' : 'Vista JSON'} className="space-y-4 p-4">
        {view === 'map' ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`chamfer-sm border px-2 py-1 text-[11px] font-semibold ${opChipClass(selected.op)}`}>
                  {opMeta.label}
                </span>
                <span className="truncate text-[13px] font-medium text-slate-200">{displayName(selected)}</span>
              </div>
              <MapHintBox>
                <p>{mapNarrative(selected, data)}</p>
                {n > 1 && (
                  <p className="mt-1.5 text-brand-100/70">
                    El plano resalta los {n} cambios de la sesión en esta planta; solo el seleccionado lleva etiqueta.
                  </p>
                )}
              </MapHintBox>
            </div>

            {needsFloorJump && (
              <button
                type="button"
                onClick={() =>
                  onGoToFloor(
                    targetPisoId,
                    selected.op === 'delete'
                      ? [selected.before.coord_x, selected.before.coord_y]
                      : [selected.body.coord_x, selected.body.coord_y]
                  )
                }
                className="btn btn-outline chamfer-sm w-full py-2 text-xs"
              >
                Ver en {targetPiso?.nom_piso || `piso ${targetPisoId}`}
              </button>
            )}

            <div>
              {summaryRows(selected, data).map(row => (
                <Field key={row.label} label={row.label} value={row.value} />
              ))}
            </div>

            {categoriaIcon && selected.op !== 'delete' && (
              <div className="flex items-center gap-3 border border-white/[0.06] bg-ink-900/60 px-3 py-2.5">
                <span className="marker-pin chamfer-sm grid h-9 w-9 rotate-45 place-items-center text-brand-300">
                  <AssetIcon name={categoriaIcon.name} src={categoriaIcon.src} className="h-[62%] w-[62%] -rotate-45" />
                </span>
                <span className="text-[12px] text-slate-400">Icono que verán los marcadores</span>
              </div>
            )}

            <AssetThumb url={thumb} alt="Planta del piso" />
          </>
        ) : (
          <>
            <div className="space-y-3">
              {groups.map(g => (
                <div key={g.file} className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="chamfer-sm border border-white/[0.08] bg-ink-950/70 px-2 py-1 text-[11px] text-signal-300">
                      {g.file}
                    </code>
                    <span className="chip chamfer-sm">PUT</span>
                    <span className="text-[11px] text-slate-500">
                      {g.changes.length === 1 ? '1 cambio' : `${g.changes.length} cambios`}
                    </span>
                  </div>
                  {g.changes.map(c => (
                    <DiffBlock key={c.key} change={c} selected={c.key === selected.key} onSelect={onSelect} />
                  ))}
                </div>
              ))}
            </div>

            <div className="space-y-1 text-[11px] text-slate-500">
              <p>
                <span className="font-bold text-emerald-300">+</span> añadido ·{' '}
                <span className="font-bold text-brand-300">~</span> modificado ·{' '}
                <span className="font-bold text-rose-300">-</span> eliminado · sin marca: sin cambios
              </p>
              <p>
                Al publicar se reescriben {groups.length === 1 ? 'el fichero' : `los ${groups.length} ficheros`} en{' '}
                {groups.length === 1
                  ? 'un único commit de la rama main'
                  : `${groups.length} commits de la rama main`}
                .
              </p>
            </div>
          </>
        )}
      </div>
    </Dock>
  )
}
