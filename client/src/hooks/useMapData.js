import { useState, useEffect, useCallback, useRef } from 'react'
import { crud } from '../services/crud.js'

const CACHE_KEY = 'geoubv_mapdata'

export function useMapData() {
  const [raw, setRaw] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      return cached ? JSON.parse(cached) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(!raw)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  const refreshMapData = useCallback(async (options = {}) => {
    const { silent = false } = options
    if (!silent) setLoading(true)
    try {
      const data = await crud.getMapData()
      if (!mountedRef.current) return
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
      setRaw(data)
      setError(null)
    } catch (_err) {
      if (!mountedRef.current) return
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        if (!silent) {
          setError('No se pudo actualizar. Usando datos en caché.')
        }
      } else {
        if (!silent) {
          setError('Error al cargar datos del mapa.')
        }
      }
    } finally {
      if (!silent && mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    if (!raw) {
      refreshMapData()
    } else {
      setLoading(false)
      refreshMapData({ silent: true })
    }
    return () => { mountedRef.current = false }
  }, [refreshMapData])

  const getPisoById = useCallback((id) => {
    return raw?.pisos?.find(p => p.id_piso === id) || null
  }, [raw?.pisos])

  const getHabitacionesByPiso = useCallback((pisoId) => {
    return raw?.habitaciones?.filter(h => h.id_piso_fk === pisoId) || []
  }, [raw?.habitaciones])

  const getCategoriaById = useCallback((id) => {
    return raw?.categorias?.find(c => c.id_categoria === id) || null
  }, [raw?.categorias])

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
    refreshMapData,
    getPisoById,
    getHabitacionesByPiso,
    getCategoriaById
  }
}
