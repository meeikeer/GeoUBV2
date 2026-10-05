import { useRef, useState, useCallback, useEffect } from 'react'

// Hook principal del mapa: carga la imagen, escanea la grilla, ejecuta A* y dibuja
// El canvas se superpone al <img> con el mismo tamaño (width/height 100% del contenedor)
export function useMapLoader() {
  const imgRef = useRef(null)        // <img> del mapa
  const canvasRef = useRef(null)     // <canvas> overlay donde se dibuja la ruta
  const ctxRef = useRef(null)        // Contexto 2D del canvas (inicialización lazy)
  const gridRef = useRef({ data: null, cols: 0, rows: 0, key: null }) // Grilla de costos en plano 1D
  const currentMapKeyRef = useRef(null)
  const routeCacheRef = useRef(new Map()) // Cache local de rutas por piso/mapa
  const animRef = useRef(null)       // ID del requestAnimationFrame para la animación
  const [grid, setGrid] = useState({ data: null, cols: 0, rows: 0, key: null })    // Grilla para React (solo triggers)
  const [isScanning, setIsScanning] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const workerRef = useRef(null)     // Web Worker que escanea el PNG
  const lastRequestRef = useRef(null)

  // Inicializa el Web Worker una sola vez
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/mapScanner.worker.js', import.meta.url),
      { type: 'module' }
    )
    // Cuando el Worker termina de escanear, actualiza la grilla
    workerRef.current.onmessage = (e) => {
      const { grid: newGrid, cols, rows } = e.data
      const key = currentMapKeyRef.current || null
      const gridState = { data: newGrid, cols, rows, key }
      gridRef.current = gridState
      setGrid(gridState)
      if (key && !routeCacheRef.current.has(key)) {
        routeCacheRef.current.set(key, new Map())
      }
      setIsScanning(false)
    }
    return () => {
      if (workerRef.current) workerRef.current.terminate()
    }
  }, [])

  // Obtiene el contexto 2D del canvas (creación lazy, una sola vez)
  const getCtx = useCallback(() => {
    if (!ctxRef.current && canvasRef.current) {
      ctxRef.current = canvasRef.current.getContext('2d')
    }
    return ctxRef.current
  }, [])



  // Carga la imagen del piso, redimensiona el canvas y envía los píxeles al Worker
  // El canvas se dimensiona al tamaño natural del PNG para que la ruta use coords absolutas
  const loadMap = useCallback((url, mapKey) => {
    return new Promise((resolve) => {
      const img = imgRef.current
      if (!img || !url) { resolve(false); return }

      lastRequestRef.current = { url, mapKey }
      setMapLoaded(false)
      setLoadError(null)
      setIsScanning(true)

      const onLoad = () => {
        const canvas = canvasRef.current
        if (canvas) {
          canvas.width = img.naturalWidth || img.width || 800
          canvas.height = img.naturalHeight || img.height || 600
        }

        // Dibuja el PNG en un canvas temporal para extraer los píxeles
        const tempCanvas = document.createElement('canvas')
        const tempCtx = tempCanvas.getContext('2d')
        tempCanvas.width = canvas ? canvas.width : 800
        tempCanvas.height = canvas ? canvas.height : 600
        tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height)

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)

        if (workerRef.current) {
          currentMapKeyRef.current = mapKey || url
          const buffer = imageData.data.buffer
          workerRef.current.postMessage(
            {
              data: buffer,
              width: tempCanvas.width,
              height: tempCanvas.height,
              tileSize: 1    // TILE=1: cada tile = 1×1 píxel → mapeo pixel-perfect
            },
            [buffer]
          )
        } else {
          setIsScanning(false)
        }

        setMapLoaded(true)
        resolve(true)
      }

      const onError = () => {
        setIsScanning(false)
        setMapLoaded(false)
        setLoadError(url)
        resolve(false)
      }

      img.onload = onLoad
      img.onerror = onError
      img.src = url
    })
  }, [])

  // Reintenta la última carga fallida sin que el consumidor tenga que saber la URL.
  const retry = useCallback(() => {
    const last = lastRequestRef.current
    if (!last) return
    setAttempt(prev => prev + 1)
    return loadMap(last.url, last.mapKey)
  }, [loadMap])

  // A* pathfinding optimizado: usa una grilla 1D tipada y heap plano
  // Conectividad 8-direccional con costo diagonal 1.41 y bloqueo de esquinas
  const aStar = useCallback((start, end) => {
    const gridState = gridRef.current
    const gridData = gridState.data
    const cols = gridState.cols
    const rows = gridState.rows
    if (!gridData || cols <= 0 || rows <= 0) return null

    const startIndex = start.x + start.y * cols
    const endIndex = end.x + end.y * cols
    if (startIndex === endIndex) return [startIndex]

    const total = cols * rows
    const gScore = new Float32Array(total)
    const cameFrom = new Int32Array(total)
    const closed = new Uint8Array(total)
    gScore.fill(Infinity)
    cameFrom.fill(-1)

    const heuristic = (aIndex, bIndex) => {
      const ax = aIndex % cols
      const ay = (aIndex / cols) | 0
      const bx = bIndex % cols
      const by = (bIndex / cols) | 0
      return Math.hypot(ax - bx, ay - by)
    }

    const createHeap = (capacity) => {
      const nodes = []
      const priorities = []
      const positions = new Int32Array(capacity).fill(-1)

      const swap = (i, j) => {
        const ni = nodes[i]
        const nj = nodes[j]
        nodes[i] = nj
        nodes[j] = ni
        const pi = priorities[i]
        priorities[i] = priorities[j]
        priorities[j] = pi
        positions[ni] = j
        positions[nj] = i
      }

      const siftUp = (idx) => {
        while (idx > 0) {
          const parent = (idx - 1) >> 1
          if (priorities[idx] >= priorities[parent]) break
          swap(idx, parent)
          idx = parent
        }
      }

      const siftDown = (idx) => {
        const size = nodes.length
        while (true) {
          let smallest = idx
          const left = idx * 2 + 1
          const right = idx * 2 + 2
          if (left < size && priorities[left] < priorities[smallest]) smallest = left
          if (right < size && priorities[right] < priorities[smallest]) smallest = right
          if (smallest === idx) break
          swap(idx, smallest)
          idx = smallest
        }
      }

      return {
        push(node, priority) {
          const position = positions[node]
          if (position >= 0) {
            if (priority < priorities[position]) {
              priorities[position] = priority
              siftUp(position)
            }
            return
          }
          const index = nodes.length
          nodes.push(node)
          priorities.push(priority)
          positions[node] = index
          siftUp(index)
        },
        pop() {
          if (nodes.length === 0) return -1
          const top = nodes[0]
          const lastIndex = nodes.length - 1
          const lastNode = nodes[lastIndex]
          nodes[0] = lastNode
          priorities[0] = priorities[lastIndex]
          positions[lastNode] = 0
          nodes.pop()
          priorities.pop()
          positions[top] = -1
          if (nodes.length > 0) siftDown(0)
          return top
        },
        has(node) {
          return positions[node] >= 0
        },
        update(node, priority) {
          const position = positions[node]
          if (position < 0) return
          if (priority < priorities[position]) {
            priorities[position] = priority
            siftUp(position)
          }
        },
        get size() {
          return nodes.length
        }
      }
    }

    const heap = createHeap(total)
    const startPriority = heuristic(startIndex, endIndex)
    gScore[startIndex] = 0
    heap.push(startIndex, startPriority)

    const isWall = (idx) => gridData[idx] === 999

    const neighbors = [
      { dx: 1, dy: 0, cost: 1 },
      { dx: -1, dy: 0, cost: 1 },
      { dx: 0, dy: 1, cost: 1 },
      { dx: 0, dy: -1, cost: 1 },
      { dx: 1, dy: 1, cost: 1.41 },
      { dx: -1, dy: 1, cost: 1.41 },
      { dx: 1, dy: -1, cost: 1.41 },
      { dx: -1, dy: -1, cost: 1.41 }
    ]

    while (heap.size > 0) {
      const currentIndex = heap.pop()
      if (currentIndex === -1) break
      if (closed[currentIndex]) continue
      if (currentIndex === endIndex) {
        const path = []
        let idx = endIndex
        while (idx !== -1) {
          path.push(idx)
          if (idx === startIndex) break
          idx = cameFrom[idx]
        }
        return path
      }

      closed[currentIndex] = 1
      const cx = currentIndex % cols
      const cy = (currentIndex / cols) | 0
      const currentG = gScore[currentIndex]

      for (const { dx, dy, cost } of neighbors) {
        const nx = cx + dx
        const ny = cy + dy
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue

        const neighborIndex = currentIndex + dx + dy * cols
        if (closed[neighborIndex] || isWall(neighborIndex)) continue

        if (dx !== 0 && dy !== 0) {
          const side1 = currentIndex + dx
          const side2 = currentIndex + dy * cols
          if (isWall(side1) || isWall(side2)) continue
        }

        const tentativeG = currentG + cost + (gridData[neighborIndex] || 0)
        if (tentativeG < gScore[neighborIndex]) {
          gScore[neighborIndex] = tentativeG
          cameFrom[neighborIndex] = currentIndex
          const fScore = tentativeG + heuristic(neighborIndex, endIndex)
          if (heap.has(neighborIndex)) {
            heap.update(neighborIndex, fScore)
          } else {
            heap.push(neighborIndex, fScore)
          }
        }
      }
    }

    return null
  }, [])

  /* Escala del plano para convertir la polilínea a metros. Los PNG de planta
     están a ~0.05 m por píxel (un pasillo de ~10 px mide ~0.5 m), que es lo
     habitual en planos de obra. */
  const PX_TO_METERS = 0.05
  const WALK_METERS_PER_MIN = 75

  const measurePath = useCallback((path) => {
    let px = 0
    for (let i = 1; i < path.length; i++) {
      px += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y)
    }
    const meters = Math.round(px * PX_TO_METERS)
    return { meters, minutes: Math.max(1, Math.round(meters / WALK_METERS_PER_MIN)) }
  }, [])

  // Dibuja la ruta en el canvas: recibe coordenadas normalizadas (0-1) del piso
  // 1. Convierte coordenadas a tiles de grilla (TILE=1)
  // 2. Ejecuta A* en la grilla
  // 3. Dibuja la ruta como línea indigo + flecha al final + pulso animado en destino
  const drawRoute = useCallback((startCoords, endCoords) => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return false

    if (animRef.current) {
      cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!startCoords || !endCoords) return false

    const TILE = 1
    const gridState = gridRef.current
    const cols = gridState.cols
    const rows = gridState.rows
    if (!gridState.data || cols <= 0 || rows <= 0) return false

    const toGrid = (c) => {
      let x = Array.isArray(c) ? c[0] : c.x
      let y = Array.isArray(c) ? c[1] : c.y
      if (x <= 1 && y <= 1) {
        x = x * canvas.width
        y = y * canvas.height
      }
      return { x: Math.max(0, Math.min(cols - 1, Math.floor(x / TILE))), y: Math.max(0, Math.min(rows - 1, Math.floor(y / TILE))) }
    }

    const start = toGrid(startCoords)
    const end = toGrid(endCoords)
    const startIndex = start.x + start.y * cols
    const endIndex = end.x + end.y * cols
    const key = gridState.key || 'default'
    let mapCache = routeCacheRef.current.get(key)
    if (!mapCache) {
      mapCache = new Map()
      routeCacheRef.current.set(key, mapCache)
    }
    const cacheKey = `${startIndex}|${endIndex}`
    let pathIndices = mapCache.get(cacheKey)

    if (!pathIndices) {
      const computedPath = aStar(start, end)
      if (!computedPath) return false
      pathIndices = computedPath
      mapCache.set(cacheKey, pathIndices)
      mapCache.set(`${endIndex}|${startIndex}`, [...pathIndices].reverse())
    }

    const path = pathIndices.map((index) => ({ x: index % cols, y: (index / cols) | 0 }))
    if (path.length < 2) return false

    const pDest = path[0]
    const refIdx = Math.min(path.length - 1, 4)
    const pRef = path[refIdx]
    const xDest = pDest.x * TILE + TILE / 2
    const yDest = pDest.y * TILE + TILE / 2
    const xRef = pRef.x * TILE + TILE / 2
    const yRef = pRef.y * TILE + TILE / 2
    const angle = Math.atan2(yDest - yRef, xDest - xRef)
    let dashOffset = 0

    // Trazo en la paleta del proyecto: la ruta es teal (btn-signal), con un
    // halo oscuro debajo para que se lea tanto sobre el plano blanco como
    // sobre los rellenos oscuros de la planta.
    const ROUTE = '#2dd4bf'
    const HALO = 'rgba(8, 9, 13, 0.55)'
    const motionOff =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const trace = () => {
        ctx.beginPath()
        ctx.moveTo(path[path.length - 1].x * TILE + TILE / 2, path[path.length - 1].y * TILE + TILE / 2)
        for (let i = path.length - 2; i >= 0; i--) {
          ctx.lineTo(path[i].x * TILE + TILE / 2, path[i].y * TILE + TILE / 2)
        }
        ctx.stroke()
      }

      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.setLineDash([])

      // Halo: mismo trazo más ancho en oscuro, para separar del plano
      ctx.strokeStyle = HALO
      ctx.lineWidth = 11
      trace()

      ctx.strokeStyle = ROUTE
      ctx.lineWidth = 6
      if (!motionOff) {
        ctx.setLineDash([14, 10])
        ctx.lineDashOffset = -dashOffset
      }
      trace()
      ctx.setLineDash([])
      ctx.lineDashOffset = 0

      // Punta de flecha en el destino
      ctx.fillStyle = ROUTE
      ctx.save()
      ctx.translate(xDest, yDest)
      ctx.rotate(angle)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-18, -10)
      ctx.lineTo(-18, 10)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    if (motionOff) {
      draw()
      return { ok: true, ...measurePath(path) }
    }

    const animate = () => {
      draw()
      dashOffset += 0.8
      if (dashOffset > 24) dashOffset = 0
      animRef.current = requestAnimationFrame(animate)
    }
    animate()
    return { ok: true, ...measurePath(path) }
  }, [aStar, getCtx, measurePath])

  // Limpia el canvas (detiene animación y borra el dibujo de la ruta)
  const clearRoute = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [getCtx])

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  return {
    imgRef,
    canvasRef,
    grid,
    isScanning,
    mapLoaded,
    loadError,
    retry,
    attempt,
    loadMap,
    drawRoute,
    clearRoute
  }
}
