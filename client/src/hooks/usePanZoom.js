import { useRef, useState, useCallback, useEffect } from 'react'
import { computeScales, panLimits, clamp } from '../lib/framing.js'

/* Motor de pan/zoom del plano. La matemática del encuadre vive en
   lib/framing.js para poder comprobarla aislada. */

const ZOOM_STEP = 0.4
const FRICTION = 0.94
const RESIZE_DEBOUNCE = 120

function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function usePanZoom({ containerRef, planeRef, reducedMotion }) {
  const transformRef = useRef({ x: 0, y: 0, scale: 1 })
  const targetRef = useRef({ x: 0, y: 0, scale: 1 })
  const velocityRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef(null)
  const limitsRef = useRef({ min: 0.1, max: 8, fit: 1, cover: 1 })

  const [zoom, setZoom] = useState(1)
  const [ready, setReady] = useState(false)

  const getStageRect = useCallback(() => {
    return containerRef?.current?.getBoundingClientRect() || null
  }, [containerRef])

  const getPlaneSize = useCallback(() => {
    const el = planeRef?.current
    if (!el) return { w: 0, h: 0 }
    return { w: el.offsetWidth || 0, h: el.offsetHeight || 0 }
  }, [planeRef])

  const readScales = useCallback(() => {
    const rect = getStageRect()
    const { w, h } = getPlaneSize()
    if (!rect) return null
    return computeScales(rect.width, rect.height, w, h)
  }, [getStageRect, getPlaneSize])

  const applyTransform = useCallback(() => {
    const el = planeRef?.current
    if (!el) return
    const { x, y, scale } = transformRef.current
    el.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0) scale(${scale})`
  }, [planeRef])

  // Limita el desplazamiento a lo que sobresale del escenario. Cuando la planta
  // es mas pequena que el escenario, se recentra.
  const constrain = useCallback(() => {
    const rect = getStageRect()
    if (!rect) return
    const { w, h } = getPlaneSize()
    const scale = targetRef.current.scale
    const limits = panLimits(rect.width, rect.height, w, h, scale)
    targetRef.current.x = clamp(targetRef.current.x, -limits.x, limits.x)
    targetRef.current.y = clamp(targetRef.current.y, -limits.y, limits.y)
  }, [getStageRect, getPlaneSize])

  const setFraming = useCallback((scale) => {
    targetRef.current = { x: 0, y: 0, scale }
    velocityRef.current = { x: 0, y: 0 }
    transformRef.current = { ...targetRef.current }
    applyTransform()
    setZoom(scale)
    setReady(true)
  }, [applyTransform])

  // Planta completa a la vista.
  const fitToScreen = useCallback(() => {
    const scales = readScales()
    if (!scales) return
    limitsRef.current = { min: scales.contain, max: scales.max, fit: scales.contain, cover: scales.cover }
    setFraming(scales.contain)
  }, [readScales, setFraming])

  // Vista inicial: la planta llena el escenario y el usuario desplaza.
  const resetToCover = useCallback(() => {
    const scales = readScales()
    if (!scales) return
    limitsRef.current = { min: scales.contain, max: scales.max, fit: scales.contain, cover: scales.cover }
    setFraming(scales.cover)
  }, [readScales, setFraming])

  const zoomToPoint = useCallback((factor, centerX, centerY) => {
    const { min, max } = limitsRef.current
    const oldScale = targetRef.current.scale
    const newScale = clamp(oldScale * factor, min, max)
    const ratio = newScale / oldScale
    targetRef.current.scale = newScale
    targetRef.current.x = centerX - (centerX - targetRef.current.x) * ratio
    targetRef.current.y = centerY - (centerY - targetRef.current.y) * ratio
    constrain()
    setZoom(newScale)
  }, [constrain])

  const zoomIn = useCallback(() => zoomToPoint(1 + ZOOM_STEP, 0, 0), [zoomToPoint])
  const zoomOut = useCallback(() => zoomToPoint(1 / (1 + ZOOM_STEP), 0, 0), [zoomToPoint])

  // Centra el escenario en unas coordenadas normalizadas del plano (0-1).
  const centerOn = useCallback((nx, ny) => {
    const { w, h } = getPlaneSize()
    if (!w || !h) return
    const scale = targetRef.current.scale
    const rect = getStageRect()
    const centerX = rect ? rect.width / 2 : 0
    const centerY = rect ? rect.height / 2 : 0
    targetRef.current.x = centerX - (nx * w) * scale
    targetRef.current.y = centerY - (ny * h) * scale
    velocityRef.current = { x: 0, y: 0 }
    constrain()
    setZoom(scale)
  }, [getPlaneSize, getStageRect, constrain])

  const nudge = useCallback((dx, dy) => {
    targetRef.current.x += dx
    targetRef.current.y += dy
    velocityRef.current = { x: 0, y: 0 }
    constrain()
  }, [constrain])

  useEffect(() => {
    const stage = containerRef?.current
    const plane = planeRef?.current
    if (!stage || !plane) return

    const motionOff = reducedMotion ?? prefersReducedMotion()
    const friction = motionOff ? 0 : FRICTION

    stage.style.overflow = 'hidden'
    stage.style.position = 'relative'
    stage.style.touchAction = 'none'
    stage.style.cursor = 'grab'

    plane.style.position = 'absolute'
    plane.style.left = '50%'
    plane.style.top = '50%'
    plane.style.transformOrigin = 'center center'
    plane.style.willChange = 'transform'

    const pointerFromCenter = (clientX, clientY) => {
      const rect = stage.getBoundingClientRect()
      return { x: clientX - (rect.left + rect.width / 2), y: clientY - (rect.top + rect.height / 2) }
    }

    const loop = () => {
      if (!isDraggingRef.current && !motionOff) {
        targetRef.current.x += velocityRef.current.x
        targetRef.current.y += velocityRef.current.y
        velocityRef.current.x *= friction
        velocityRef.current.y *= friction
        if (Math.abs(velocityRef.current.x) < 0.05) velocityRef.current.x = 0
        if (Math.abs(velocityRef.current.y) < 0.05) velocityRef.current.y = 0
        if (velocityRef.current.x !== 0 || velocityRef.current.y !== 0) constrain()
      }

      const dx = targetRef.current.x - transformRef.current.x
      const dy = targetRef.current.y - transformRef.current.y
      const ds = targetRef.current.scale - transformRef.current.scale
      const settled =
        Math.abs(dx) < 0.3 &&
        Math.abs(dy) < 0.3 &&
        Math.abs(ds) < 0.0005 &&
        velocityRef.current.x === 0 &&
        velocityRef.current.y === 0

      transformRef.current.x += dx * 0.2
      transformRef.current.y += dy * 0.2
      transformRef.current.scale += ds * 0.18
      applyTransform()

      rafRef.current = settled ? null : requestAnimationFrame(loop)
    }

    const startLoop = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(loop)
    }

    const onWheel = (e) => {
      e.preventDefault()
      const m = pointerFromCenter(e.clientX, e.clientY)
      const factor = -Math.sign(e.deltaY) > 0 ? 1 + ZOOM_STEP : 1 / (1 + ZOOM_STEP)
      zoomToPoint(factor, m.x, m.y)
      startLoop()
    }

    const onMouseDown = (e) => {
      if (e.button !== 0) return
      isDraggingRef.current = true
      velocityRef.current = { x: 0, y: 0 }
      lastPointerRef.current = pointerFromCenter(e.clientX, e.clientY)
      stage.style.cursor = 'grabbing'
      targetRef.current = { ...transformRef.current }
      startLoop()
    }

    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return
      const m = pointerFromCenter(e.clientX, e.clientY)
      const dx = m.x - lastPointerRef.current.x
      const dy = m.y - lastPointerRef.current.y
      targetRef.current.x += dx
      targetRef.current.y += dy
      velocityRef.current = { x: dx, y: dy }
      lastPointerRef.current = m
      constrain()
      transformRef.current.x = targetRef.current.x
      transformRef.current.y = targetRef.current.y
    }

    const onMouseUp = () => {
      isDraggingRef.current = false
      stage.style.cursor = 'grab'
    }

    let touches = []
    let lastTouchDist = 0
    let lastTouchCenter = { x: 0, y: 0 }

    const getDist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)

    const onTouchStart = (e) => {
      if (e.target.closest?.('[data-ui], button, a, input, select, textarea')) return
      isDraggingRef.current = true
      velocityRef.current = { x: 0, y: 0 }
      touches = Array.from(e.touches)
      if (touches.length > 0) {
        lastTouchCenter = pointerFromCenter(touches[0].clientX, touches[0].clientY)
        if (touches.length === 2) lastTouchDist = getDist(touches)
      }
      targetRef.current = { ...transformRef.current }
      startLoop()
    }

    const onTouchMove = (e) => {
      if (!isDraggingRef.current) return
      e.preventDefault()
      const t = Array.from(e.touches)
      const center = touches.length > 0
        ? pointerFromCenter(touches[0].clientX, touches[0].clientY)
        : { x: 0, y: 0 }
      const dx = center.x - lastTouchCenter.x
      const dy = center.y - lastTouchCenter.y
      targetRef.current.x += dx
      targetRef.current.y += dy
      velocityRef.current = { x: dx, y: dy }
      if (t.length === 2 && touches.length === 2) {
        const dist = getDist(t)
        zoomToPoint(dist / (lastTouchDist || 1), center.x, center.y)
        lastTouchDist = dist
      }
      lastTouchCenter = center
      touches = t
      constrain()
      transformRef.current.x = targetRef.current.x
      transformRef.current.y = targetRef.current.y
      transformRef.current.scale = targetRef.current.scale
    }

    const onTouchEnd = (e) => {
      touches = Array.from(e.touches)
      if (touches.length === 0) isDraggingRef.current = false
      else lastTouchCenter = pointerFromCenter(touches[0].clientX, touches[0].clientY)
    }

    const onKeyDown = (e) => {
      const step = e.shiftKey ? 120 : 40
      const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '=', '-', '0', 'Escape']
      if (!keys.includes(e.key)) return
      if (e.key === 'ArrowUp') nudge(0, step)
      else if (e.key === 'ArrowDown') nudge(0, -step)
      else if (e.key === 'ArrowLeft') nudge(step, 0)
      else if (e.key === 'ArrowRight') nudge(-step, 0)
      else if (e.key === '+' || e.key === '=') zoomIn()
      else if (e.key === '-') zoomOut()
      else if (e.key === '0') fitToScreen()
      else return
      e.preventDefault()
      startLoop()
    }

    stage.addEventListener('wheel', onWheel, { passive: false })
    stage.addEventListener('mousedown', onMouseDown)
    stage.addEventListener('keydown', onKeyDown)
    stage.addEventListener('touchstart', onTouchStart, { passive: false })
    stage.addEventListener('touchmove', onTouchMove, { passive: false })
    stage.addEventListener('touchend', onTouchEnd)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    // El encuadre depende del tamaño del escenario, que cambia con la barra
    // del navegador en movil. Se reajusta con debounce y solo se preserva el
    // zoom del usuario cuando cabe en los nuevos limites.
    let resizeTimer = null
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        const scales = readScales()
        if (!scales) return
        const prev = limitsRef.current
        const keepUserZoom = ready && targetRef.current.scale > prev.min + 0.001
        const scale = keepUserZoom
          ? clamp(targetRef.current.scale, scales.contain, scales.max)
          : scales.cover
        limitsRef.current = { min: scales.contain, max: scales.max, fit: scales.contain, cover: scales.cover }
        targetRef.current.scale = scale
        if (!keepUserZoom) {
          targetRef.current.x = 0
          targetRef.current.y = 0
        } else {
          constrain()
        }
        velocityRef.current = { x: 0, y: 0 }
        transformRef.current = { ...targetRef.current }
        applyTransform()
        setZoom(scale)
      }, RESIZE_DEBOUNCE)
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      clearTimeout(resizeTimer)
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('mousedown', onMouseDown)
      stage.removeEventListener('keydown', onKeyDown)
      stage.removeEventListener('touchstart', onTouchStart)
      stage.removeEventListener('touchmove', onTouchMove)
      stage.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [
    containerRef, planeRef, zoomToPoint, zoomIn, zoomOut, fitToScreen,
    nudge, constrain, applyTransform, readScales, ready, reducedMotion
  ])

  return { zoom, ready, zoomIn, zoomOut, fitToScreen, resetToCover, centerOn, limits: limitsRef }
}