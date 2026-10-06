/* Matemática de encuadre del plano, separada del hook para poder comprobarla
   sin montar React.

   El encuadre se modela con dos escalas en lugar de una:
   - contain: la planta completa se ve entera. Es el mínimo, para reubicarse.
   - cover:   la planta llena el escenario. Es la vista inicial.

   Sin esta distinción, contain en una pantalla estrecha daba una escala de
   ~0.22: por debajo del antiguo minZoom fijo de 0.5, y con limX = 0 el plano
   se veía diminuto y además no se podía arrastrar. */
export const FIT_PADDING = 0.92

/* Tope de ampliación del PNG. Los PNG de planta son de 1376-1927 px de ancho y
   cover ya los amplía (1.15-2.29× según escenario), así que un factor relativo
   alto los empujaba a 4-5.7×: cada píxel del original se convertía en un bloque
   de 4×4 o más. Con image-rendering: pixelated eso se lee limpio, pero el
   reescalado sigue costando gigapíxeles al compositor.

   Por eso hay dos topes: uno relativo al escenario y otro absoluto. El relativo
   solo no basta, porque en tablet vertical cover ya es 2.29 y multiplicando
   llegaba igual a 4.1. */
export const MAX_ZOOM_FACTOR = 1.8
export const MAX_UPSCALE = 3

/**
 * Escalas del encuadre para una planta de w×h en un escenario de stageW×stageH.
 * Devuelve null si falta alguna medida.
 */
export function computeScales(stageW, stageH, planeW, planeH) {
  if (!stageW || !stageH || !planeW || !planeH) return null
  const contain = Math.min(stageW / planeW, stageH / planeH) * FIT_PADDING
  const cover = Math.max(stageW / planeW, stageH / planeH)
  const max = Math.min(cover * MAX_ZOOM_FACTOR, MAX_UPSCALE)
  return { contain, cover, max: Math.max(max, contain * 1.5) }
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