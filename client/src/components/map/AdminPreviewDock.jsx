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
  targetFile,
  diffRows,
  formatValue
} from '../../lib/previewChange.js'

/* Dock de preview: el paso intermedio entre el formulario y el commit.

   Muestra el cambio etapado en dos vistas conmutables — Mapa (qué va a pasar
   sobre el plano) y JSON (payload exacto con diff antes/después) — y solo
   escribe en GitHub cuando el admin pulsa Publicar. */

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
      ? `${name} se marcará en la planta destino; en la actual dejará de existir al publicar.`
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

export default function AdminPreviewDock({
  isOpen,
  onClose,
  change,
  view,
  onViewChange,
  onPublish,
  onDiscard,
  publishing,
  publishError,
  data,
  currentPiso,
  onGoToFloor
}) {
  const rows = useMemo(() => (change ? diffRows(change) : []), [change])
  const summary = useMemo(
    () => (change ? summaryRows(change, data) : []),
    [change, data]
  )

  if (!change) return null

  const meta = ENTITY_META[change.entity]
  const opMeta = OP_META[change.op]
  const name = displayName(change)
  const file = targetFile(change.entity)

  const targetPisoId =
    change.entity === 'habitacion'
      ? (change.op === 'delete' ? change.before?.id_piso_fk : change.body?.id_piso_fk)
      : null
  const targetPiso = data.pisos.find(p => p.id_piso === targetPisoId)
  const needsFloorJump = Boolean(targetPiso && currentPiso?.id_piso !== targetPisoId)

  const thumb =
    change.entity === 'piso'
      ? (change.body || change.before)?.url_map
      : null
  const categoriaIcon =
    change.entity === 'categoria'
      ? resolveIcon(
          change.id,
          (change.body || change.before)?.nom_categoria,
          (change.body || change.before)?.url_icono
        )
      : null

  return (
    <Dock
      isOpen={isOpen}
      onClose={onClose}
      title="Preview del cambio"
      description={`${opMeta.label} ${meta.noun} · pendiente de publicar`}
      label="Preview del cambio pendiente"
      icon={<AssetIcon name={change.entity === 'habitacion' ? 'pin' : 'list'} className="h-4 w-4" />}
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
              {publishing ? 'Publicando…' : 'Publicar cambio'}
            </button>
            <button
              type="button"
              onClick={onDiscard}
              disabled={publishing}
              className="btn btn-outline chamfer-sm px-4 py-2.5 text-xs"
            >
              Descartar
            </button>
          </div>
        </div>
      }
    >
      <div className="px-4 pt-3">
        <div className="flex items-center gap-2">
          <span className={`chamfer-sm border px-2 py-1 text-[11px] font-semibold ${opChipClass(change.op)}`}>
            {opMeta.label}
          </span>
          <span className="truncate text-[13px] font-medium text-slate-200">{name}</span>
        </div>
      </div>

      <div role="tablist" aria-label="Vista del preview" className="mt-3 flex gap-1 border-b border-white/[0.07] px-4">
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
            <MapHintBox>{mapNarrative(change, data)}</MapHintBox>

            {needsFloorJump && (
              <button
                type="button"
                onClick={() =>
                  onGoToFloor(
                    targetPisoId,
                    change.op === 'delete'
                      ? [change.before.coord_x, change.before.coord_y]
                      : [change.body.coord_x, change.body.coord_y]
                  )
                }
                className="btn btn-outline chamfer-sm w-full py-2 text-xs"
              >
                Ver en {targetPiso?.nom_piso || `piso ${targetPisoId}`}
              </button>
            )}

            <div>
              {summary.map(row => (
                <Field key={row.label} label={row.label} value={row.value} />
              ))}
            </div>

            {categoriaIcon && change.op !== 'delete' && (
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
            <div className="flex flex-wrap items-center gap-2">
              <code className="chamfer-sm border border-white/[0.08] bg-ink-950/70 px-2 py-1 text-[11px] text-signal-300">
                {file}
              </code>
              <span className="chip chamfer-sm">PUT</span>
              <span className={`chamfer-sm border px-2 py-0.5 text-[11px] font-semibold ${opChipClass(change.op)}`}>
                {opMeta.label}
              </span>
            </div>

            <div className="chamfer-sm border border-white/[0.08] bg-ink-950/70 p-3 font-mono text-[11.5px] leading-relaxed">
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

            <div className="space-y-1 text-[11px] text-slate-500">
              <p>
                <span className="font-bold text-emerald-300">+</span> añadido ·{' '}
                <span className="font-bold text-brand-300">~</span> modificado ·{' '}
                <span className="font-bold text-rose-300">-</span> eliminado · sin marca: sin cambios
              </p>
              <p>
                Al publicar se reescribe <span className="font-mono text-slate-400">{file}</span> completo en
                un único commit de la rama main.
              </p>
            </div>
          </>
        )}
      </div>
    </Dock>
  )
}
