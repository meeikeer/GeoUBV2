/* Matemática de encuadre del plano, separada del hook para poder comprobarla
   sin montar React.

   El encuadre se modela con dos escalas en lugar de una:
   - contain: la planta completa se ve entera. Es el mínimo, para reubicarse.
   - cover:   la planta llena el escenario. Es la vista inicial.

   Sin esta distinción, contain en una pantalla estrecha daba una escala de
   ~0.22: por debajo del antiguo minZoom fijo de 0.5, y con limX = 0 el plano
   se veía diminuto y además no se podía arrastrar. */
export const FIT_PADDING = 0.92
export const MAX_ZOOM_FACTOR = 2.5
export const MIN_ABSOLUTE_MAX = 3

/**
 * Escalas del encuadre para una planta de w×h en un escenario de stageW×stageH.
 * Devuelve null si falta alguna medida.
 */
export function computeScales(stageW, stageH, planeW, planeH) {
  if (!stageW || !stageH || !planeW || !planeH) return null
  const contain = Math.min(stageW / planeW, stageH / planeH) * FIT_PADDING
  const cover = Math.max(stageW / planeW, stageH / planeH)
  return {
    contain,
    cover,
    max: Math.max(cover * MAX_ZOOM_FACTOR, MIN_ABSOLUTE_MAX)
  }
}

/**
 * Límites de desplazamiento en píxeles. Si la planta es más pequeña que el
 * escenario en un eje, el margen es 0 y ese eje queda centrado.
 */
export function panLimits(stageW, stageH, planeW, planeH, scale) {
  return {
    x: Math.max(0, (planeW * scale - stageW) / 2),
    y: Math.max(0, (planeH * scale - stageH) / 2)
  }
}

/** Acota un valor al intervalo. */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}