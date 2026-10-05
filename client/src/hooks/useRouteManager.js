import { useState, useCallback, useMemo } from 'react'

// Hook que orquesta el cálculo de rutas: soporta rutas en un mismo piso
// y rutas multi-piso conectadas por escaleras (nom_conexion)
export function useRouteManager(allLocations, habitaciones, sortedPisos) {
  const [currentRoute, setCurrentRoute] = useState(null)   // Ruta activa (simple o multifloor)
  const [routeStatus, setRouteStatus] = useState('')       // Mensaje de estado visible al usuario
  const [routeLeg, setRouteLeg] = useState(null)          // { meters, minutes } del tramo actual
  const [routeStep, setRouteStep] = useState(null)        // { index, total } para el banner
  const [routeMissing, setRouteMissing] = useState(false) // No se halló camino

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

  // Dibuja un tramo y registra distancia/tiempo. drawRoute devuelve
  // { ok, meters, minutes } o false si no halló camino.
  const drawLeg = useCallback((mapLoader, from, to) => {
    const result = mapLoader.drawRoute(from, to)
    if (!result || result.ok === false) {
      setRouteLeg(null)
      setRouteMissing(true)
      return false
    }
    setRouteMissing(false)
    setRouteLeg({ meters: result.meters, minutes: result.minutes })
    return true
  }, [])

  // Calcula la ruta entre dos ubicaciones (origen y destino)
  // Mismo piso → ruta directa con A*
  // Distinto piso → ruta multi-piso: origen → escalera más cercana (en este piso),
  //   luego el usuario cambia de piso y continueRoute completa: escalera destino → destino
  const calculateRoute = useCallback((orig, dst, floorManager, mapLoader) => {
    if (!orig || !dst || !floorManager || !mapLoader) return

    const coordA = getCoords(orig)
    const coordB = getCoords(dst)

    if (!coordA || !coordB) {
      setRouteStatus('Coordenadas no disponibles para esas ubicaciones')
      setRouteLeg(null)
      return
    }

    const floorA = orig.pisoId
    const floorB = dst.pisoId
    const sameFloor = floorA === floorB
    const currentPisoId = floorManager?.currentPiso?.id_piso

    if (sameFloor) {
      setCurrentRoute({
        type: 'simple',
        origin: orig,
        dest: dst,
        pisoId: floorA
      })
      setRouteStep({ index: 1, total: 1 })

      if (currentPisoId === floorA) {
        if (drawLeg(mapLoader, coordA, coordB)) {
          setRouteStatus(`Destino en este piso: ${dst.name}`)
        } else {
          setRouteStatus(`No hay camino pasa por ${dst.name} en este piso`)
        }
      } else {
        mapLoader.clearRoute()
        setRouteLeg(null)
        setRouteStatus(`Ruta guardada. Cambia a ${getPisoNameById(floorA)} para ver el camino.`)
      }
      return
    }

    // Ruta multi-piso: busca escaleras de conexión
    const stairA = findStairClosestTo(floorA, floorB, coordA)  // Escalera más cercana al origen
    const stairB = findStairClosestTo(floorB, floorA, null)    // Escalera en el piso destino

    if (!stairA || !stairB) {
      setRouteStatus('No hay escaleras registradas que conecten estos pisos')
      setRouteLeg(null)
      return
    }

    const destFloorName = getPisoNameById(floorB)

    setCurrentRoute({
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
    })

    if (currentPisoId === floorA) {
      setRouteStep({ index: 1, total: 2 })
      if (drawLeg(mapLoader, coordA, stairA)) {
        setRouteStatus(`Diríjase a la escalera para subir a ${destFloorName}`)
      } else {
        setRouteStatus(`No hay camino hasta la escalera de ${getPisoNameById(floorA)}`)
      }
    } else if (currentPisoId === floorB) {
      setRouteStep({ index: 2, total: 2 })
      setCurrentRoute(prev => ({ ...prev, step: 'stairs_to_dest' }))
      if (drawLeg(mapLoader, stairB, coordB)) {
        setRouteStatus(`Comienza en la escalera hasta ${dst.name}`)
      } else {
        setRouteStatus(`No hay camino hasta ${dst.name}`)
      }
    } else {
      mapLoader.clearRoute()
      setRouteLeg(null)
      setRouteStep({ index: 1, total: 2 })
      setRouteStatus(`Ruta guardada. Cambia a ${getPisoNameById(floorA)} o ${destFloorName} para verla.`)
    }
  }, [getCoords, getPisoNameById, findStairClosestTo, drawLeg])

  // Continúa una ruta multi-piso cuando el usuario cambia de piso
  // Se llama desde MapPage.jsx cada vez que cambia fm.currentFloorIndex
  // - Si estábamos en "origin_to_stairs" y el usuario subió al piso destino:
  //   dibuja el tramo escalera → destino final
  // - Si estábamos en "done" y el usuario volvió al piso origen: redibuja el tramo inicial
  const continueRoute = useCallback((floorManager, mapLoader) => {
    if (!currentRoute || currentRoute.type !== 'multifloor') return false

    const currentPisoId = floorManager?.currentPiso?.id_piso

    if (currentPisoId === currentRoute.fromPisoId) {
      setCurrentRoute(prev => ({ ...prev, step: 'origin_to_stairs' }))
      setRouteStep({ index: 1, total: 2 })
      drawLeg(mapLoader, currentRoute.coordA, currentRoute.stairA)
      setRouteStatus(`Diríjase a la escalera para subir a ${getPisoNameById(currentRoute.toPisoId)}`)
      return true
    }

    if (currentPisoId === currentRoute.toPisoId) {
      setCurrentRoute(prev => ({ ...prev, step: 'done' }))
      setRouteStep({ index: 2, total: 2 })
      drawLeg(mapLoader, currentRoute.stairB, currentRoute.coordB)
      setRouteStatus(`Llegada: ${currentRoute.dest.name}`)
      return true
    }

    mapLoader.clearRoute()
    setRouteLeg(null)
    return false
  }, [currentRoute, getPisoNameById, drawLeg])

  // Limpia el estado de la ruta y borra el dibujo del canvas
  const clearRoute = useCallback((mapLoader) => {
    setCurrentRoute(null)
    setRouteStatus('')
    setRouteLeg(null)
    setRouteStep(null)
    setRouteMissing(false)
    if (mapLoader) mapLoader.clearRoute()
  }, [])

  return {
    routeStatus,
    routeLeg,
    routeStep,
    routeMissing,
    currentRoute,
    searchLocations,
    calculateRoute,
    continueRoute,
    clearRoute,
    searchableLocations
  }
}
