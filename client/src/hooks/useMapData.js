import { useState, useEffect, useCallback, useRef } from 'react'
import { crud } from '../services/crud.js'
import { isAuthenticated } from '../services/auth.js'
import { normalizeMapData } from '../lib/mapDataShape.js'
import { assetUrl } from '../lib/assets.js'

const CACHE_KEY = 'geoubv_mapdata'
const BUNDLE_URL = assetUrl('mapdata.json')

/* Carga de datos del mapa, en cascada y tolerante a fallos:

   1. localStorage    -> instantáneo, sin parpadeo. Puede estar desfasado.
   2. mapdata.json    -> el bundle que viaja con la app. Da el offline de la
                         primera visita y refresca cuando hay red.
   3. API de GitHub   -> solo si hay token de admin. Nunca es la fuente de
                         lectura del visitante.

   La prioridad es que el visitante vea el mapa: una fuente que falla se
   salta y se pasa a la siguiente. El token decide si se puede *actualizar*,
   nunca si se puede *mostrar*. */
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

  /* Refresco silencioso: nunca enseña un spinner sobre datos que ya están. */
  const refresh = useCallback(async () => {
    // 1. Bundle local: la fuente principal del visitante
    try {
      const res = await fetch(BUNDLE_URL, { cache: 'no-cache' })
      if (!res.ok) throw new Error(`mapdata.json: HTTP ${res.status}`)
      const data = normalizeMapData(await res.json())
      if (data?.pisos?.length) {
        save(data, 'bundle')
        setLoading(false)
        return
      }
      throw new Error('el bundle no trae pisos')
    } catch (bundleErr) {
      // 2. Sin bundle: si hay algo en caché se conserva y se avisa
      if (raw) {
        if (!mountedRef.current) return
        setSource('cache')
        setError('No se pudo actualizar. Usando datos en caché.')
        setLoading(false)
        return
      }
      if (!mountedRef.current) return
      setError(bundleErr.message || 'No se pudieron cargar los datos del mapa.')

      // 3. Último recurso: API de GitHub, que requiere token
      if (isAuthenticated()) {
        try {
          const data = normalizeMapData(await crud.getMapData())
          if (data?.pisos?.length) {
            save(data, 'api')
            setLoading(false)
            return
          }
        } catch {
          // se mantiene el error del bundle
        }
      }
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