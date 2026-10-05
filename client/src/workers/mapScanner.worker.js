// Web Worker: escanea el PNG del mapa y genera una grilla de navegación
// Recibe el buffer de píxeles desde el hilo principal (useMapLoader)

const WALL = 999
const EXPENSIVE = 300
const SLOW = 50
const INF = 1 << 29

/* Distancia chebyshev a muro, por chamfer de dos pasadas.
   Se usa para dilatar los muros y tapar los vanos de puerta antes de
   rellenar el exterior. */
function wallDistance(grid, cols, rows) {
  const dist = new Int32Array(cols * rows)
  for (let i = 0; i < grid.length; i++) dist[i] = grid[i] === WALL ? 0 : INF

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = x + y * cols
      let d = dist[i]
      if (y > 0) d = Math.min(d, dist[i - cols] + 1)
      if (x > 0) d = Math.min(d, dist[i - 1] + 1)
      if (y > 0 && x > 0) d = Math.min(d, dist[i - cols - 1] + 1)
      if (y > 0 && x < cols - 1) d = Math.min(d, dist[i - cols + 1] + 1)
      dist[i] = d
    }
  }

  for (let y = rows - 1; y >= 0; y--) {
    for (let x = cols - 1; x >= 0; x--) {
      const i = x + y * cols
      let d = dist[i]
      if (y < rows - 1) d = Math.min(d, dist[i + cols] + 1)
      if (x < cols - 1) d = Math.min(d, dist[i + 1] + 1)
      if (y < rows - 1 && x < cols - 1) d = Math.min(d, dist[i + cols + 1] + 1)
      if (y < rows - 1 && x > 0) d = Math.min(d, dist[i + cols - 1] + 1)
      dist[i] = d
    }
  }

  return dist
}

/* Los PNG son plantas con fondo blanco: sin este paso todo el blanco exterior
   al edificio queda como suelo caminable y A* corta por el vacío en vez de por
   los pasillos.

   Los muros exteriores tienen vanos de puerta, así que un relleno desde el
   borde sin más arrastraría el interior entero. Por eso el relleno solo
   atraviesa celdas a más de CLOSE_RADIUS del muro más cercano: los vanos
   quedan cerrados y el exterior sí se aísla.

   CLOSE_RADIUS = 12 se ajustó midiendo contra los tres PNG: con 10 o más los
   seis pares de ubicaciones reales del geodata conservan camino, y por debajo
   de 10 el relleno invade los pasillos. */
const CLOSE_RADIUS = 12

function sealExterior(grid, cols, rows) {
  const dist = wallDistance(grid, cols, rows)
  const seen = new Uint8Array(cols * rows)
  const stack = []

  const push = (x, y) => {
    const idx = x + y * cols
    if (seen[idx] || dist[idx] <= CLOSE_RADIUS) return
    seen[idx] = 1
    stack.push(idx)
  }

  for (let x = 0; x < cols; x++) {
    push(x, 0)
    push(x, rows - 1)
  }
  for (let y = 0; y < rows; y++) {
    push(0, y)
    push(cols - 1, y)
  }

  while (stack.length > 0) {
    const idx = stack.pop()
    const x = idx % cols
    const y = (idx / cols) | 0
    if (x > 0) push(x - 1, y)
    if (x < cols - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < rows - 1) push(x, y + 1)
  }

  let sealed = 0
  for (let i = 0; i < grid.length; i++) {
    if (seen[i]) {
      grid[i] = WALL
      sealed++
    }
  }
  return sealed
}

self.onmessage = (e) => {
  const { data, width, height, tileSize } = e.data
  const TILE = tileSize || 1          // Cada tile agrupa TILE×TILE píxeles del PNG (usar 1 para pixel-perfect)
  const pixels = new Uint8ClampedArray(data)
  const cols = Math.floor(width / TILE)   // Cantidad de columnas de la grilla
  const rows = Math.floor(height / TILE)  // Cantidad de filas de la grilla

  const grid = new Int16Array(cols * rows)

  for (let ty = 0; ty < rows; ty++) {
    const baseY = ty * TILE
    for (let tx = 0; tx < cols; tx++) {
      let darkCount = 0
      const baseX = tx * TILE

      for (let dy = 0; dy < TILE; dy++) {
        for (let dx = 0; dx < TILE; dx++) {
          const px = baseX + dx
          const py = baseY + dy
          if (px >= width || py >= height) continue
          const i = (py * width + px) * 4
          const r = pixels[i]
          const g = pixels[i + 1]
          const b = pixels[i + 2]
          const a = pixels[i + 3]
          if (a > 0 && (r + g + b) / 3 < 180) {
            darkCount++
          }
        }
      }

      const density = darkCount / (TILE * TILE)
      const idx = tx + ty * cols
      if (density >= 0.75) {
        grid[idx] = WALL
      } else if (density >= 0.5) {
        grid[idx] = EXPENSIVE
      } else if (density >= 0.25) {
        grid[idx] = SLOW
      } else {
        grid[idx] = 0
      }
    }
  }

  const sealed = sealExterior(grid, cols, rows)

  self.postMessage({ grid, cols, rows, sealed }, [grid.buffer])
}
