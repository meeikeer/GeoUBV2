import { useState, useMemo, useCallback } from 'react'

export function useFloorManager(pisos) {
  const sortedPisos = useMemo(() => {
    if (!pisos || pisos.length === 0) return []
    return [...pisos].sort((a, b) => a.num_piso - b.num_piso)
  }, [pisos])

  const [currentFloorIndex, setCurrentFloorIndex] = useState(0)

  const currentPiso = sortedPisos[currentFloorIndex] || null

  const goUp = useCallback(() => {
    setCurrentFloorIndex(prev => Math.min(prev + 1, sortedPisos.length - 1))
  }, [sortedPisos.length])

  const goDown = useCallback(() => {
    setCurrentFloorIndex(prev => Math.max(prev - 1, 0))
  }, [])

  const setFloor = useCallback((pisoId) => {
    const idx = sortedPisos.findIndex(p => p.id_piso === pisoId)
    if (idx !== -1) setCurrentFloorIndex(idx)
  }, [sortedPisos])

  return {
    currentPiso,
    sortedPisos,
    currentFloorIndex,
    canGoUp: currentFloorIndex < sortedPisos.length - 1,
    canGoDown: currentFloorIndex > 0,
    goUp,
    goDown,
    setFloor
  }
}
