import { getFileContent, writeFile } from './github.js'
import { getToken } from './auth.js'

const GEODATA_PATH = 'geodata'

async function readCollection(name) {
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

    const allEdificios = []
    const allPisos = []
    const allHabitaciones = []

    for (const sede of data.sedes || []) {
      for (const ed of data.edificios?.filter(e => e.id_sede_fk === sede.id_sede) || []) {
        const edInfo = { ...ed, nom_sede: sede.nom_sede, id_sede: sede.id_sede }
        allEdificios.push(edInfo)
        for (const p of data.pisos?.filter(p => p.id_edificio_fk === ed.id_edificio) || []) {
          const pisoInfo = { ...p, nom_edificio: ed.nom_edificio }
          allPisos.push(pisoInfo)
          for (const h of data.habitaciones?.filter(h => h.id_piso_fk === p.id_piso) || []) {
            allHabitaciones.push({
              ...h,
              nom_piso: p.nom_piso,
              num_piso: p.num_piso,
              display: p.display,
              nom_edificio: ed.nom_edificio
            })
          }
        }
      }
    }

    const allLocations = allHabitaciones
      .filter(h => !h.es_conexion)
      .map(h => ({
        id: h.id_habitacion,
        name: h.nom_codigo,
        floor: h.nom_piso,
        pisoId: h.id_piso_fk,
        categoriaId: h.id_categoria_fk,
        coords: [h.coord_x, h.coord_y],
        display: h.display
      }))

    return {
      sedes: data.sedes || [],
      categorias: data.categorias || [],
      edificios: allEdificios,
      pisos: allPisos,
      habitaciones: allHabitaciones,
      allLocations
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
