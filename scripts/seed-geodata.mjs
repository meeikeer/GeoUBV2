/* Siembra geodata/*.json a partir del bundle mapdata.json (anidado).
   Los JSON del repo están vacíos y el bundle es la única copia de los datos,
   así que este script es la fuente de la siembra. Es de una sola vez.

   Uso: node scripts/seed-geodata.mjs [--force]
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const GEODATA = path.join(ROOT, 'geodata')
const BUNDLE = path.join(ROOT, 'client', 'public', 'mapdata.json')

const bundle = JSON.parse(fs.readFileSync(BUNDLE, 'utf8'))

const hasNested = Array.isArray(bundle.sedes) && bundle.sedes.some(s => s.edificios?.length)

if (!hasNested) {
  console.log('El bundle ya esta aplanado, no hay nada que sembrar.')
  process.exit(0)
}

const force = process.argv.includes('--force')

// No pisar datos existentes sin permiso: los JSON del repo son la fuente de
// verdad y pueden contener cambios del admin que el bundle no tiene.
const targets = ['sede', 'edificio', 'piso', 'habitacion', 'categoria']
const existing = targets.filter(name => {
  const file = path.join(GEODATA, `${name}.json`)
  if (!fs.existsSync(file)) return false
  const raw = fs.readFileSync(file, 'utf8').trim()
  return raw && raw !== '[]'
})

if (existing.length > 0 && !force) {
  console.error(
    `Se aborta: ${existing.join(', ')}.json ya tienen datos y el bundle podria estar mas obsoleto.\n` +
    'Revisa si el bundle es la fuente correcta. Si es asi, corre con --force.'
  )
  process.exit(1)
}

const out = {
  sede: [],
  edificio: [],
  piso: [],
  habitacion: [],
  categoria: bundle.categorias || []
}

for (const sede of bundle.sedes) {
  out.sede.push({
    id_sede: sede.id_sede,
    nom_sede: sede.nom_sede
  })

  for (const ed of sede.edificios || []) {
    out.edificio.push({
      id_edificio: ed.id_edificio,
      nom_edificio: ed.nom_edificio,
      id_sede_fk: sede.id_sede
    })

    for (const piso of ed.pisos || []) {
      out.piso.push({
        id_piso: piso.id_piso,
        num_piso: piso.num_piso,
        display: piso.display,
        nom_piso: piso.nom_piso,
        url_map: piso.url_map,
        id_edificio_fk: ed.id_edificio
      })

      for (const hab of piso.habitaciones || []) {
        out.habitacion.push({
          id_habitacion: hab.id_habitacion,
          nom_codigo: hab.nom_codigo,
          coord_x: hab.coord_x,
          coord_y: hab.coord_y,
          id_piso_fk: piso.id_piso,
          id_categoria_fk: hab.id_categoria_fk,
          es_conexion: hab.es_conexion,
          nom_conexion: hab.nom_conexion
        })
      }
    }
  }
}

fs.mkdirSync(GEODATA, { recursive: true })
for (const [name, rows] of Object.entries(out)) {
  fs.writeFileSync(path.join(GEODATA, `${name}.json`), JSON.stringify(rows, null, 2) + '\n')
}

console.log(
  `geodata/ sembrado: ${out.sede.length} sedes, ${out.edificio.length} edificios, ` +
  `${out.piso.length} pisos, ${out.habitacion.length} habitaciones, ${out.categoria.length} categorias`
)