import { useState, useEffect, useCallback, useRef } from 'react'
import { crud } from '../services/crud.js'
import { readGeodata } from '../services/repo.js'
import { isAuthenticated } from '../services/auth.js'
import { normalizeMapData } from '../lib/mapDataShape.js'
import { assetUrl } from '../lib/assets.js'
import { buildMapData } from '../lib/buildMapData.js'

const CACHE_KEY = 'geoubv_mapdata'
const BUNDLE_URL = assetUrl('mapdata.json')

/* Carga de datos del mapa, en cascada y tolerante a fallos.

   Para el visitante, el orden es fijo:

   1. localStorage    -> instantáneo, sin parpadeo. Puede estar desfasado.
   2. raw.githubusercontent.com (geodata/*.json) -> en vivo, sin API.
   3. mapdata.json    -> bundle del build, red de seguridad.
   4. API de GitHub   -> solo para el admin (si hay token).

   Con token, tras leer raw, la API puede releerse. En ambos casos la
   prioridad es que el mapa siempre se vea. El token decide si se puede
   *actualizar*, nunca si se puede *mostrar*. */
export function useMapData() {
  const [raw, setRaw] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      return cached ? normalizeMapData(JSON.parse(cached)) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(!raw)
  const [error, setError] = useState(null)
  const [source, setSource] = useState(null)
  const mountedRef = useRef(true)

  const save = useCallback((data, origin) => {
    if (!mountedRef.current) return
    setRaw(data)
    setSource(origin)
    setError(null)
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    } catch {
      // cuota llena o modo privado: el bundle ya cubre la carga
    }
  }, [])

  /* El admin necesita ver sus escrituras al instante, y mapdata.json es un
     fichero estático del bundle: no refleja un PUT recién hecho. Para el admin
     la fuente de verdad es el repo, así que se lee de la API primero y el
     bundle queda como red de seguridad (token caducado, sin conexión, o justo
     después de crear un piso que el bundle aún no tiene). El visitante no
     cambia: nunca toca la API. */
  const refresh = useCallback(async () => {
    const readBundle = async () => {
      const res = await fetch(BUNDLE_URL, { cache: 'no-cache' })
      if (!res.ok) throw new Error(`mapdata.json: HTTP ${res.status}`)
      const data = normalizeMapData(await res.json())
      if (!data?.pisos?.length) throw new Error('el bundle no trae pisos')
      return data
    }

    const readRaw = async () => {
      const g = await readGeodata()
      const m = buildMapData(g.sede, g.edificio, g.piso, g.habitacion, g.categoria)
      const data = normalizeMapData({
        version: null,
        updatedAt: null,
        sedes: m.sedes,
        categorias: m.categorias,
        edificios: m.edificios,
        pisos: m.pisos,
        habitaciones: m.habitaciones,
        allLocations: m.allLocations
      })
      if (!data?.pisos?.length) throw new Error('el raw no trae pisos')
      return data
    }

    // 1. raw.githubusercontent (en vivo)
    try {
      save(await readRaw(), 'raw')
      setLoading(false)
      return
    } catch (rawErr) {
      // pasa a siguiente
    }

    if (isAuthenticated()) {
      try {
        const data = normalizeMapData(await crud.getMapData())
        if (data?.pisos?.length) {
          save(data, 'api')
          setLoading(false)
          return
        }
      } catch {
        // token caducado o API caída
      }
    }

    try {
      save(await readBundle(), 'bundle')
      setLoading(false)
    } catch (bundleErr) {
      if (raw) {
        if (!mountedRef.current) return
        setSource('cache')
        setError('No se pudo actualizar. Usando datos en caché.')
        setLoading(false)
        return
      }
      if (!mountedRef.current) return
      setError(bundleErr.message || 'No se pudieron cargar los datos del mapa.')
      setLoading(false)
    }
  }, [raw, save])

  const refreshMapData = useCallback(async (options = {}) => {
    const { silent = false } = options
    if (!silent && mountedRef.current) setLoading(true)
    await refresh()
  }, [refresh])

  useEffect(() => {
    mountedRef.current = true
    if (!raw) setLoading(true)
    refresh()
    return () => {
      mountedRef.current = false
    }
    // Solo al montar: refresh cambia con cada `raw`, y no queremos reintentos
    // encadenados mientras llegan datos nuevos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getPisoById = useCallback(
    id => raw?.pisos?.find(p => p.id_piso === id) || null,
    [raw?.pisos]
  )

  const getCategoriaById = useCallback(
    id => raw?.categorias?.find(c => c.id_categoria === id) || null,
    [raw?.categorias]
  )

  return {
    sedes: raw?.sedes || [],
    categorias: raw?.categorias || [],
    edificios: raw?.edificios || [],
    pisos: raw?.pisos || [],
    habitaciones: raw?.habitaciones || [],
    allLocations: raw?.allLocations || [],
    raw,
    loading,
    error,
    source,
    refreshMapData,
    getPisoById,
    getCategoriaById
  }
}