/* Aplana los datos de geodata para obtener el shape que consume el frontend.
   Única fuente de verdad para el aplanado: tanto crud.getMapData como
   repo.readGeodata deben dar exactamente el mismo resultado. */

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

export function buildMapData(sedes = [], edificios = [], pisos = [], habitaciones = [], categorias = []) {
  const allEdificios = []
  const allPisos = []
  const allHabitaciones = []

  for (const sede of sedes || []) {
    for (const ed of edificios?.filter(e => e.id_sede_fk === sede.id_sede) || []) {
      const edInfo = { ...ed, nom_sede: sede.nom_sede, id_sede: sede.id_sede }
      allEdificios.push(edInfo)
      for (const p of pisos?.filter(p => p.id_edificio_fk === ed.id_edificio) || []) {
        const pisoInfo = { ...p, nom_edificio: ed.nom_edificio }
        allPisos.push(pisoInfo)
        for (const h of habitaciones?.filter(h => h.id_piso_fk === p.id_piso) || []) {
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

  return {
    sedes: sedes || [],
    categorias: categorias || [],
    edificios: allEdificios,
    pisos: allPisos,
    habitaciones: allHabitaciones,
    allLocations: buildAllLocations(allHabitaciones)
  }
}
