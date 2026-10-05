// Web Worker: escanea el PNG del mapa y genera una grilla de navegación
// Recibe el buffer de píxeles desde el hilo principal (useMapLoader)
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
        grid[idx] = 999
      } else if (density >= 0.5) {
        grid[idx] = 300
      } else if (density >= 0.25) {
        grid[idx] = 50
      } else {
        grid[idx] = 0
      }
    }
  }

  self.postMessage({ grid, cols, rows }, [grid.buffer])
}
