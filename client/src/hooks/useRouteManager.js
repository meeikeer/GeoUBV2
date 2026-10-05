import { useState, useCallback, useMemo } from 'react'

// Hook que orquesta el cálculo de rutas: soporta rutas en un mismo piso
// y rutas multi-piso conectadas por escaleras (nom_conexion)
export function useRouteManager(allLocations, habitaciones, sortedPisos) {
  const [origin, setOrigin] = useState(null)
  const [dest, setDest] = useState(null)
  const [currentRoute, setCurrentRoute] = useState(null)   // Ruta activa (simple o multifloor)
  const [routeStatus, setRouteStatus] = useState('')       // Mensaje de estado visible al usuario

  // Mapa: id_piso → nom_piso normalizado (ej: "Piso 2" → "piso_2")
  // Se usa para emparejar escaleras por nom_conexion
  const floorKeyMap = useMemo(() => {
    const map = {}
    for (const p of (sortedPisos || [])) {
      let key = p.nom_piso.toLowerCase().replace(/ó/g, 'o').replace(/\s+/g, '_')
      map[p.id_piso] = key
    }
    return map
  }, [sortedPisos])

  // Filtra ubicaciones que no sean escaleras (no se muestran como destino seleccionable)
  const searchableLocations = useMemo(() => {
    return allLocations.filter(loc => {
      const lower = loc.name.toLowerCase()
      return !lower.startsWith('escalera')
    })
  }, [allLocations])

  // Búsqueda textual de ubicaciones por nombre o piso
  const searchLocations = useCallback((query) => {
    if (!query || !query.trim()) return searchableLocations.slice(0, 30)
    const q = query.toLowerCase().trim()
    return searchableLocations.filter(loc =>
      loc.name.toLowerCase().includes(q) ||
      (loc.floor && loc.floor.toLowerCase().includes(q))
    ).slice(0, 20)
  }, [searchableLocations])

  const getCoords = useCallback((location) => {
    return location?.coords || null
  }, [])

  const getPisoNameById = useCallback((pisoId) => {
    const p = (sortedPisos || []).find(p => p.id_piso === pisoId)
    return p ? p.nom_piso : ''
  }, [sortedPisos])

  // Encuentra una escalera de conexión en un piso dado
  // Busca primero por nom_conexion específico (ej: "escalera_piso_2"),
  // luego por conexión genérica, y finalmente la primera disponible
  const findStairOnFloor = useCallback((pisoId, targetPisoId) => {
    const conexiones = habitaciones.filter(h =>
      h.id_piso_fk === pisoId &&
      h.es_conexion &&
      h.nom_conexion
    )
    if (conexiones.length === 0) return null

    const targetKey = floorKeyMap[targetPisoId]

    // Busca conexión con nom_conexion que termine en "_piso_2" (específica)
    const specific = conexiones.find(c =>
      targetKey && c.nom_conexion.endsWith(`_${targetKey}`)
    )
    if (specific) return [specific.coord_x, specific.coord_y]

    // Si no hay específica, busca una conexión genérica (sin sufijo de piso)
    const generic = conexiones.find(c => {
      const parts = c.nom_conexion.split('_')
      const suffix = parts[parts.length - 1]
      return suffix !== 'sotano' && !suffix.startsWith('piso')
    })
    if (generic) return [generic.coord_x, generic.coord_y]

    // Último recurso: primera escalera disponible
    return [conexiones[0].coord_x, conexiones[0].coord_y]
  }, [habitaciones, floorKeyMap])

  // Encuentra la escalera de conexión MÁS CERCANA a fromCoords
  // Se usa para rutas multi-piso: ir desde el origen hasta la escalera más cercana
  const findStairClosestTo = useCallback((pisoId, targetPisoId, fromCoords) => {
    const conexiones = habitaciones.filter(h =>
      h.id_piso_fk === pisoId &&
      h.es_conexion &&
      h.nom_conexion
    )
    if (conexiones.length === 0) return null

    const targetKey = floorKeyMap[targetPisoId]

    // Filtra candidatos por nom_conexion (específica o genérica)
    const candidates = []
    for (const c of conexiones) {
      const match = targetKey && c.nom_conexion.endsWith(`_${targetKey}`)
      const parts = c.nom_conexion.split('_')
      const suffix = parts[parts.length - 1]
      const isGeneric = suffix !== 'sotano' && !suffix.startsWith('piso')
      if (match || isGeneric) {
        candidates.push(c)
      }
    }

    if (candidates.length === 0) {
      return [conexiones[0].coord_x, conexiones[0].coord_y]
    }

    if (!fromCoords) {
      return [candidates[0].coord_x, candidates[0].coord_y]
    }

    // Ordena por distancia euclídea a fromCoords y devuelve la más cercana
    const dist = (a, b) => {
      const ax = Array.isArray(a) ? a[0] : a.x
      const ay = Array.isArray(a) ? a[1] : a.y
      const bx = Array.isArray(b) ? b[0] : b.x
      const by = Array.isArray(b) ? b[1] : b.y
      return Math.sqrt(Math.pow(ax - bx, 2) + Math.pow(ay - by, 2))
    }

    candidates.sort((a, b) => {
      const da = dist(fromCoords, [a.coord_x, a.coord_y])
      const db = dist(fromCoords, [b.coord_x, b.coord_y])
      return da - db
    })

    return [candidates[0].coord_x, candidates[0].coord_y]
  }, [habitaciones, floorKeyMap])

  // Calcula la ruta entre dos ubicaciones (origen y destino)
  // Mismo piso → ruta directa con A*
  // Distinto piso → ruta multi-piso: origen → escalera más cercana (en este piso),
  //   luego el usuario cambia de piso y continueRoute completa: escalera destino → destino
  const calculateRoute = useCallback((orig, dst, floorManager, mapLoader) => {
    if (!orig || !dst || !floorManager || !mapLoader) return

    const coordA = getCoords(orig)
    const coordB = getCoords(dst)

    if (!coordA || !coordB) {
      setRouteStatus('Error: coordenadas no disponibles')
      return
    }

    const floorA = orig.pisoId
    const floorB = dst.pisoId
    const sameFloor = floorA === floorB

    if (sameFloor) {
      const simpleRoute = {
        type: 'simple',
        origin: orig,
        dest: dst,
        pisoId: floorA
      }
      setCurrentRoute(simpleRoute)

      const currentPisoId = floorManager?.currentPiso?.id_piso
      if (currentPisoId === floorA) {
        mapLoader.drawRoute(coordA, coordB)
        setRouteStatus(`📍 Destino en este piso: ${dst.name}`)
      } else {
        if (mapLoader) mapLoader.clearRoute()
        setRouteStatus(`Ruta guardada para ${getPisoNameById(floorA)}. Cambia a ese piso para ver el camino.`)
      }
      return
    }

    // Ruta multi-piso: busca escaleras de conexión
    const stairA = findStairClosestTo(floorA, floorB, coordA)  // Escalera más cercana al origen
    const stairB = findStairClosestTo(floorB, floorA, null)    // Escalera en el piso destino

    if (!stairA || !stairB) {
      setRouteStatus('No hay escaleras disponibles entre estos pisos')
      return
    }

    const destFloorName = getPisoNameById(floorB)
    const currentPisoId = floorManager?.currentPiso?.id_piso

    const routeState = {
      type: 'multifloor',
      origin: orig,
      dest: dst,
      fromPisoId: floorA,
      toPisoId: floorB,
      stairA,
      stairB,
      coordA,
      coordB,
      step: 'origin_to_stairs'
    }

    setCurrentRoute(routeState)

    if (currentPisoId === floorA) {
      mapLoader.drawRoute(coordA, stairA)
      setRouteStatus(`⬆️ Diríjase a la escalera para subir a ${destFloorName}`)
    } else if (currentPisoId === floorB) {
      mapLoader.drawRoute(stairB, coordB)
      setCurrentRoute(prev => ({ ...prev, step: 'stairs_to_dest' }))
      setRouteStatus(`🏁 Comienza desde la escalera hasta ${dst.name}`)
    } else {
      if (mapLoader) mapLoader.clearRoute()
      setRouteStatus(`Ruta guardada. Cambia a ${getPisoNameById(floorA)} o ${destFloorName} para verla.`)
    }
  }, [getCoords, getPisoNameById, findStairClosestTo])

  // Continúa una ruta multi-piso cuando el usuario cambia de piso
  // Se llama desde MapPage.jsx cada vez que cambia fm.currentFloorIndex
  // - Si estábamos en "origin_to_stairs" y el usuario subió al piso destino:
  //   dibuja el tramo escalera → destino final
  // - Si estábamos en "done" y el usuario volvió al piso origen: redibuja el tramo inicial
  const continueRoute = useCallback((floorManager, mapLoader) => {
    if (!currentRoute || currentRoute.type !== 'multifloor') return false

    const currentPisoId = floorManager?.currentPiso?.id_piso

    if (currentPisoId === currentRoute.fromPisoId) {
      mapLoader.drawRoute(currentRoute.coordA, currentRoute.stairA)
      setCurrentRoute(prev => ({ ...prev, step: 'origin_to_stairs' }))
      setRouteStatus(`⬆️ Diríjase a la escalera para subir a ${getPisoNameById(currentRoute.toPisoId)}`)
      return true
    }

    if (currentPisoId === currentRoute.toPisoId) {
      mapLoader.drawRoute(currentRoute.stairB, currentRoute.coordB)
      setCurrentRoute(prev => ({ ...prev, step: 'done' }))
      setRouteStatus(`🏁 Llegada: ${currentRoute.dest.name}`)
      return true
    }

    if (mapLoader) {
      mapLoader.clearRoute()
    }
    return false
  }, [currentRoute, getPisoNameById])

  // Limpia el estado de la ruta y borra el dibujo del canvas
  const clearRoute = useCallback((mapLoader) => {
    setCurrentRoute(null)
    setRouteStatus('')
    if (mapLoader) mapLoader.clearRoute()
  }, [])

  return {
    origin,
    setOrigin,
    dest,
    setDest,
    routeStatus,
    setRouteStatus,
    currentRoute,
    searchLocations,
    calculateRoute,
    continueRoute,
    clearRoute,
    searchableLocations,
    floorKeyMap
  }
}
