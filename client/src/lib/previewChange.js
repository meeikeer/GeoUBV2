/* Utilidades puras del preview de cambios del modo admin.

   Un "cambio" es la unidad que se etapa antes de publicar:
   { entity, op: 'create' | 'update' | 'delete', id, body, before }
   - body:  registro a escribir (null en delete)
   - before: registro actual tal y como se leyó (null en create) */

export const ENTITY_META = {
  sede: { label: 'Sede', noun: 'sede', nameField: 'nom_sede', idField: 'id_sede' },
  edificio: { label: 'Edificio', noun: 'edificio', nameField: 'nom_edificio', idField: 'id_edificio' },
  piso: { label: 'Piso', noun: 'piso', nameField: 'nom_piso', idField: 'id_piso' },
  categoria: { label: 'Categoría', noun: 'categoría', nameField: 'nom_categoria', idField: 'id_categoria' },
  habitacion: { label: 'Ubicación', noun: 'ubicación', nameField: 'nom_codigo', idField: 'id_habitacion' }
}

export const OP_META = {
  create: { label: 'Crear', tone: 'emerald' },
  update: { label: 'Editar', tone: 'brand' },
  delete: { label: 'Eliminar', tone: 'rose' }
}

const TONES = {
  emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  brand: 'border-brand-400/30 bg-brand-400/10 text-brand-200',
  rose: 'border-rose-400/30 bg-rose-400/10 text-rose-200'
}

export function opChipClass(op) {
  return TONES[OP_META[op]?.tone] || TONES.brand
}

/** Nombre legible del registro que toca el cambio (el pendiente, si lo hay). */
export function displayName(change) {
  if (!change) return ''
  const meta = ENTITY_META[change.entity]
  const rec = change.body || change.before
  return (rec && rec[meta.nameField]) || '(sin nombre)'
}

/** Ruta del fichero geodata que se reescribe al publicar. */
export function targetFile(entity) {
  return `geodata/${entity}.json`
}

function fmt(value) {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  return String(value)
}

/**
 * Filas del diff registro a registro.

 * Marcas: '+' añadido, '~' modificado, '-' eliminado, ' ' sin cambios.
 * En un update las claves que no viajan en body no se marcan como eliminadas:
 * crud.update hace merge, así que se conservan tal y como estaban.
 */
export function diffRows(change) {
  if (!change) return []
  const { op, before, body } = change

  if (op === 'create') {
    return Object.keys(body || {}).map(k => ({ key: k, value: body[k], mark: '+' }))
  }

  if (op === 'delete') {
    return Object.keys(before || {}).map(k => ({ key: k, value: before[k], mark: '-' }))
  }

  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(body || {})])]
  return keys.map(k => {
    const inBefore = before && k in before
    const inBody = body && k in body
    if (!inBefore) return { key: k, value: body[k], mark: '+' }
    if (!inBody) return { key: k, value: before[k], mark: ' ' }
    const changed = JSON.stringify(before[k]) !== JSON.stringify(body[k])
    return changed
      ? { key: k, value: body[k], prev: before[k], mark: '~' }
      : { key: k, value: body[k], mark: ' ' }
  })
}

export function formatValue(value) {
  return fmt(value)
}
