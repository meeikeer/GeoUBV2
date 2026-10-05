/* Normaliza los datos del mapa a la forma plana que consume el frontend.

   Hay dos formas posibles de entrada:
   - Aplanada (lo que produce services/crud.js y este generador): edificios,
     pisos, habitaciones y allLocations en arrays sueltos.
   - Anidada (mapdata.json en versiones previas): sedes -> edificios -> pisos
     -> habitaciones, sin allLocations.

   Ambas se reducen aquí al mismo shape, para que ninguna ruta dependa de cuál
   se leyó. La aplanada pasa tal cual; la anidada se aplana aquí. */

function buildAllLocations(habitaciones) {
  return habitaciones
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
}

export function normalizeMapData(input) {
  if (!input || typeof input !== 'object') return null

  const version = input.version ?? null
  const updatedAt = input.updatedAt ?? null
  const sedes = Array.isArray(input.sedes) ? input.sedes : []
  const categorias = Array.isArray(input.categorias) ? input.categorias : []

  // Forma anidada
  const isNested = sedes.some(s => Array.isArray(s.edificios) && s.edificios.length > 0)

  if (isNested) {
    const edificios = []
    const pisos = []
    const habitaciones = []

    for (const sede of sedes) {
      for (const ed of sede.edificios || []) {
        edificios.push({ ...ed, nom_sede: sede.nom_sede, id_sede: sede.id_sede })

        for (const piso of ed.pisos || []) {
          pisos.push({ ...piso, nom_edificio: ed.nom_edificio })

          for (const hab of piso.habitaciones || []) {
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

    return {
      version,
      updatedAt,
      sedes,
      categorias,
      edificios,
      pisos,
      habitaciones,
      allLocations: buildAllLocations(habitaciones)
    }
  }

  // Forma plana: se respeta tal cual,derivando allLocations si falta.
  const habitaciones = Array.isArray(input.habitaciones) ? input.habitaciones : []
  const allLocations = Array.isArray(input.allLocations) && input.allLocations.length > 0
    ? input.allLocations
    : buildAllLocations(habitaciones)

  return {
    version,
    updatedAt,
    sedes,
    categorias,
    edificios: Array.isArray(input.edificios) ? input.edificios : [],
    pisos: Array.isArray(input.pisos) ? input.pisos : [],
    habitaciones,
    allLocations
  }
}