import { getFileContent, writeFile } from './github.js'
import { getToken } from './auth.js'
import { buildMapData } from '../lib/buildMapData.js'

const GEODATA_PATH = 'geodata'

export async function readCollection(name) {
  const token = getToken()
  try {
    const { content } = await getFileContent(`${GEODATA_PATH}/${name}.json`, token)
    return content
  } catch (err) {
    if (err.message.includes('no encontrado')) {
      return []
    }
    throw err
  }
}

async function writeCollection(name, data, message) {
  const token = getToken()
  let sha
  try {
    const existing = await getFileContent(`${GEODATA_PATH}/${name}.json`, token)
    sha = existing.sha
  } catch {
    sha = null
  }
  return writeFile(`${GEODATA_PATH}/${name}.json`, data, sha, message, token)
}

function nextId(collection, idField) {
  if (!collection || collection.length === 0) return 1
  const max = Math.max(...collection.map(item => item[idField] || 0))
  return max + 1
}

/* Aplica los cambios de UN fichero: 1 lectura → operaciones en orden de
   sesión → 1 escritura (1 commit). El fichero es atómico o se queda como
   estaba: si una operación falla, no se escribe nada de ese fichero. */
async function applyEntityChanges(entity, ops) {
  const idField = `id_${entity}`
  let collection = await readCollection(entity)
  let next = null

  for (const op of ops) {
    if (op.op === 'create') {
      if (next === null) next = nextId(collection, idField)
      collection = [...collection, { [idField]: next++, ...op.body }]
    } else if (op.op === 'update') {
      const idx = collection.findIndex(item => item[idField] == op.id)
      // El registro desapareció del repo después de etaparlo: sin esto el
      // cambio se aplicaría en silencio sobre nada, así que se señala.
      if (idx === -1) throw new Error(`el registro ${op.id} ya no existe en el repo`)
      const updated = [...collection]
      updated[idx] = { ...updated[idx], ...op.body, [idField]: updated[idx][idField] }
      collection = updated
    } else if (op.op === 'delete') {
      // Idempotente: si ya no está, el estado deseado se cumple.
      collection = collection.filter(item => item[idField] != op.id)
    }
  }

  const counts = { create: 0, update: 0, delete: 0 }
  for (const op of ops) counts[op.op] += 1
  const parts = []
  if (counts.create) parts.push(`${counts.create} create`)
  if (counts.update) parts.push(`${counts.update} update`)
  if (counts.delete) parts.push(`${counts.delete} delete`)
  await writeCollection(entity, collection, `Apply ${entity}: ${parts.join(', ')}`)
}

/* Publica una sesión completa agrupada por fichero: cada geodata/*.json
   tocado genera exactamente 1 commit (mínimo posible con la Contents API).
   No lanza ante fallos parciales: devuelve { published, errors } para que la
   UI saque de la cola lo publicado y conserve lo que falló. */
async function applyChanges(changes) {
  const byEntity = new Map()
  for (const change of changes) {
    if (!byEntity.has(change.entity)) byEntity.set(change.entity, [])
    byEntity.get(change.entity).push(change)
  }

  const published = []
  const errors = []
  for (const [entity, ops] of byEntity) {
    try {
      await applyEntityChanges(entity, ops)
      published.push(entity)
    } catch (err) {
      errors.push({ entity, message: err?.message || 'error desconocido' })
    }
  }
  return { published, errors }
}

export const crud = {
  readCollection,
  applyChanges,

  async getAll() {
    const [sedes, edificios, pisos, habitaciones, categorias] = await Promise.all([
      readCollection('sede'),
      readCollection('edificio'),
      readCollection('piso'),
      readCollection('habitacion'),
      readCollection('categoria')
    ])
    return { sedes, edificios, pisos, habitaciones, categorias }
  },

  async getMapData() {
    const data = await this.getAll()
    const m = buildMapData(data.sedes, data.edificios, data.pisos, data.habitaciones, data.categorias)
    return {
      sedes: m.sedes,
      categorias: m.categorias,
      edificios: m.edificios,
      pisos: m.pisos,
      habitaciones: m.habitaciones,
      allLocations: m.allLocations
    }
  },

  async insert(entity, doc) {
    const collection = await readCollection(entity)
    const idField = `id_${entity}`
    const newDoc = { [idField]: nextId(collection, idField), ...doc }
    collection.push(newDoc)
    await writeCollection(entity, collection, `Add ${entity}: ${newDoc[idField]}`)
    return newDoc
  },

  async update(entity, id, fields) {
    const collection = await readCollection(entity)
    const idField = `id_${entity}`
    const idx = collection.findIndex(item => item[idField] == id)
    if (idx === -1) return null
    collection[idx] = { ...collection[idx], ...fields, [idField]: collection[idx][idField] }
    await writeCollection(entity, collection, `Update ${entity}: ${id}`)
    return collection[idx]
  },

  async remove(entity, id) {
    const collection = await readCollection(entity)
    const idField = `id_${entity}`
    const filtered = collection.filter(item => item[idField] != id)
    if (filtered.length === collection.length) return false
    await writeCollection(entity, filtered, `Delete ${entity}: ${id}`)
    return true
  }
}
