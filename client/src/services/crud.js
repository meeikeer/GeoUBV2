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

export const crud = {
  readCollection,

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
