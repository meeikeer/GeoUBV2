/* Genera client/public/mapdata.json a partir de los 5 JSON de geodata/.
   Los JSON del repo son la fuente de verdad (los escribe el admin por la API);
   este script aplana el árbol a la forma que consume el frontend y deja el
   bundle listo para el arranque offline.

   El aplanado es idéntico al de services/crud.js getMapData(), para que ambos
   caminos produzcan exactamente lo mismo.

   Uso: node scripts/generate-mapdata.mjs
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const GEODATA = path.join(ROOT, 'geodata')
const OUT = path.join(ROOT, 'client', 'public', 'mapdata.json')

const COLLECTIONS = ['sede', 'edificio', 'piso', 'habitacion', 'categoria']

function readCollection(name) {
  const file = path.join(GEODATA, `${name}.json`)
  if (!fs.existsSync(file)) {
    console.warn(`  aviso: no existe ${name}.json, se usa []`)
    return []
  }
  // Decodificación estricta: si el JSON no es UTF-8 válido (p. ej. una ñ
  // escrita como el byte Latin-1 0xF1 por btoa), el script aborta aquí en vez
  // de colar caracteres U+FFFD al bundle.
  const bytes = fs.readFileSync(file)
  let raw
  try {
    raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes).trim()
  } catch {
    throw new Error(
      `${name}.json no es UTF-8 válido: contiene bytes sueltos de acentos o Ñ. ` +
      'Hay que reparar el fichero en geodata/ antes de generar el bundle.'
    )
  }
  if (!raw || raw === '[]') return []
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error(`${name}.json debe ser un array`)
  }
  return parsed
}

const data = Object.fromEntries(COLLECTIONS.map(name => [name, readCollection(name)]))

const sedes = data.sede
const edificios = []
const pisos = []
const habitaciones = []

for (const sede of sedes) {
  for (const ed of data.edificio.filter(e => e.id_sede_fk === sede.id_sede)) {
    edificios.push({ ...ed, nom_sede: sede.nom_sede, id_sede: sede.id_sede })

    for (const piso of data.piso.filter(p => p.id_edificio_fk === ed.id_edificio)) {
      pisos.push({ ...piso, nom_edificio: ed.nom_edificio })

      for (const hab of data.habitacion.filter(h => h.id_piso_fk === piso.id_piso)) {
        habitaciones.push({
          ...hab,
          nom_piso: piso.nom_piso,
          num_piso: piso.num_piso,
          display: piso.display,
          nom_edificio: ed.nom_edificio
        })
      }
    }
  }
}

const allLocations = habitaciones
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

const payload = {
  version: Date.now(),
  updatedAt: new Date().toISOString(),
  sedes,
  categorias: data.categoria,
  edificios,
  pisos,
  habitaciones,
  allLocations
}

fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n')

const kb = (fs.statSync(OUT).size / 1024).toFixed(1)
console.log(
  `mapdata.json: ${sedes.length} sedes, ${edificios.length} edificios, ${pisos.length} pisos, ` +
  `${habitaciones.length} habitaciones, ${allLocations.length} ubicaciones (${kb} KB)`
)

if (pisos.length === 0) {
  console.warn('  aviso: no hay pisos. El visitante vera el estado vacio.')
}