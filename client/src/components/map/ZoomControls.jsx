import { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react'

const ZoomControls = forwardRef(function ZoomControls({ mapContainerRef, onZoomChange }, ref) {
  const transformRef = useRef({ x: 0, y: 0, scale: 1 })
  const targetRef = useRef({ x: 0, y: 0, scale: 1 })
  const velocityRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const lastMouseRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef(null)
  const [currentZoom, setCurrentZoom] = useState(1)

  const minZoom = 0.5
  const maxZoom = 8
  const zoomStep = 0.4
  const friction = 0.94

  const getMouseFromCenter = useCallback((clientX, clientY) => {
    const rect = mapContainerRef?.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: clientX - (rect.left + rect.width / 2),
      y: clientY - (rect.top + rect.height / 2)
    }
  }, [mapContainerRef])

  const getMapElement = useCallback(() => {
    const container = mapContainerRef?.current
    if (!container) return null
    return container.querySelector('[data-map-element="true"]')
  }, [mapContainerRef])

  const updateTransform = useCallback(() => {
    const el = getMapElement()
    if (!el) return
    const { x, y, scale } = transformRef.current
    el.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0) scale(${scale})`
  }, [getMapElement])

  const constrain = useCallback(() => {
    const rect = mapContainerRef?.current?.getBoundingClientRect()
    const el = getMapElement()
    if (!rect || !el) return

    const w = el.offsetWidth || 1000
    const h = el.offsetHeight || 1000
    const visualW = w * targetRef.current.scale
    const visualH = h * targetRef.current.scale
    const limX = Math.max(0, (visualW - rect.width) / 2)
    const limY = Math.max(0, (visualH - rect.height) / 2)
    targetRef.current.x = Math.max(-limX, Math.min(limX, targetRef.current.x))
    targetRef.current.y = Math.max(-limY, Math.min(limY, targetRef.current.y))
  }, [mapContainerRef, getMapElement])

  const fitToScreen = useCallback(() => {
    const rect = mapContainerRef?.current?.getBoundingClientRect()
    const el = getMapElement()
    if (!rect || !el) return

    const w = el.offsetWidth || 1000
    const h = el.offsetHeight || 1000
    const fitScale = Math.min(rect.width / w, rect.height / h) * 0.85

    targetRef.current.x = 0
    targetRef.current.y = 0
    targetRef.current.scale = fitScale
    velocityRef.current = { x: 0, y: 0 }
    transformRef.current = { ...targetRef.current }
    updateTransform()
    setCurrentZoom(fitScale)
  }, [mapContainerRef, getMapElement, updateTransform])

  const zoomToPoint = useCallback((factor, centerX, centerY) => {
    const oldScale = targetRef.current.scale
    const newScale = Math.min(Math.max(oldScale * factor, minZoom), maxZoom)
    const sRatio = newScale / oldScale
    targetRef.current.scale = newScale
    targetRef.current.x = centerX - (centerX - targetRef.current.x) * sRatio
    targetRef.current.y = centerY - (centerY - targetRef.current.y) * sRatio
    constrain()
    setCurrentZoom(newScale)
  }, [constrain])

  const zoomIn = useCallback(() => {
    zoomToPoint(1 + zoomStep, 0, 0)
  }, [zoomToPoint])

  const zoomOut = useCallback(() => {
    zoomToPoint(1 / (1 + zoomStep), 0, 0)
  }, [zoomToPoint])

  useImperativeHandle(ref, () => ({
    zoomIn,
    zoomOut,
    fitToScreen
  }), [zoomIn, zoomOut, fitToScreen])

  useEffect(() => {
    if (onZoomChange) onZoomChange(currentZoom)
  }, [currentZoom, onZoomChange])

  useEffect(() => {
    const c = mapContainerRef?.current
    if (!c) return

    const el = getMapElement()
    if (el) {
      el.style.position = 'absolute'
      el.style.left = '50%'
      el.style.top = '50%'
      el.style.right = 'auto'
      el.style.bottom = 'auto'
      el.style.transformOrigin = 'center center'
    }
    c.style.overflow = 'hidden'
    c.style.position = 'relative'
    c.style.touchAction = 'none'
    c.style.cursor = 'grab'

    const onWheel = (e) => {
      e.preventDefault()
      const m = getMouseFromCenter(e.clientX, e.clientY)
      const direction = -Math.sign(e.deltaY)
      const factor = direction > 0 ? (1 + zoomStep) : (1 / (1 + zoomStep))
      zoomToPoint(factor, m.x, m.y)
      startLoop()
    }

    const onMouseDown = (e) => {
      if (e.button !== 0) return
      isDraggingRef.current = true
      velocityRef.current = { x: 0, y: 0 }
      lastMouseRef.current = getMouseFromCenter(e.clientX, e.clientY)
      c.style.cursor = 'grabbing'
      targetRef.current = { ...transformRef.current }
      startLoop()
    }

    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return
      const m = getMouseFromCenter(e.clientX, e.clientY)
      const dx = m.x - lastMouseRef.current.x
      const dy = m.y - lastMouseRef.current.y
      targetRef.current.x += dx
      targetRef.current.y += dy
      velocityRef.current = { x: dx, y: dy }
      lastMouseRef.current = m
      constrain()
      transformRef.current.x = targetRef.current.x
      transformRef.current.y = targetRef.current.y
    }

    const onMouseUp = () => {
      isDraggingRef.current = false
      c.style.cursor = 'grab'
    }

    let touches = []
    let lastTouchDist = 0
    let lastTouchCenter = { x: 0, y: 0 }

    const getDist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)

    const onTouchStart = (e) => {
      if (e.target.closest('button')) return
      isDraggingRef.current = true
      velocityRef.current = { x: 0, y: 0 }
      touches = Array.from(e.touches)
      if (touches.length > 0) {
        const m = getMouseFromCenter(touches[0].clientX, touches[0].clientY)
        lastTouchCenter = m
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
        ? getMouseFromCenter(t[0].clientX, t[0].clientY)
        : { x: 0, y: 0 }
      const dx = center.x - lastTouchCenter.x
      const dy = center.y - lastTouchCenter.y
      targetRef.current.x += dx
      targetRef.current.y += dy
      velocityRef.current = { x: dx, y: dy }
      if (t.length === 2 && touches.length === 2) {
        const dist = getDist(t)
        const sf = dist / (lastTouchDist || 1)
        zoomToPoint(sf, center.x, center.y)
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
      else lastTouchCenter = getMouseFromCenter(touches[0].clientX, touches[0].clientY)
    }

    c.addEventListener('wheel', onWheel, { passive: false })
    c.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    c.addEventListener('touchstart', onTouchStart, { passive: false })
    c.addEventListener('touchmove', onTouchMove, { passive: false })
    c.addEventListener('touchend', onTouchEnd)

    const loop = () => {
      if (!isDraggingRef.current) {
        targetRef.current.x += velocityRef.current.x
        targetRef.current.y += velocityRef.current.y
        velocityRef.current.x *= friction
        velocityRef.current.y *= friction
        if (Math.abs(velocityRef.current.x) < 0.05) velocityRef.current.x = 0
        if (Math.abs(velocityRef.current.y) < 0.05) velocityRef.current.y = 0
        constrain()
      }

      const dx = targetRef.current.x - transformRef.current.x
      const dy = targetRef.current.y - transformRef.current.y
      const ds = targetRef.current.scale - transformRef.current.scale
      const settled = Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3 && Math.abs(ds) < 0.0005 && velocityRef.current.x === 0 && velocityRef.current.y === 0

      transformRef.current.x += dx * 0.2
      transformRef.current.y += dy * 0.2
      transformRef.current.scale += ds * 0.18

      updateTransform()

      if (!settled) {
        rafRef.current = requestAnimationFrame(loop)
      } else {
        rafRef.current = null
      }
    }

    const startLoop = () => {
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(loop)
      }
    }

    rafRef.current = requestAnimationFrame(loop)

    const resizeTimer = setTimeout(fitToScreen, 100)
    window.addEventListener('resize', fitToScreen)

    return () => {
      c.removeEventListener('wheel', onWheel)
      c.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      c.removeEventListener('touchstart', onTouchStart)
      c.removeEventListener('touchmove', onTouchMove)
      c.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('resize', fitToScreen)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      clearTimeout(resizeTimer)
    }
  }, [mapContainerRef, getMapElement, getMouseFromCenter, zoomToPoint, constrain, updateTransform, fitToScreen, friction])

  return null
})

export default ZoomControls
