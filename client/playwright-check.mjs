/* Verificacion con el Chrome ya instalado (channel: 'chrome'), sin descargar
   el Chromium de Playwright.

   Mide lo que no se puede comprobar leyendo codigo:
   - frames perdidos durante arrastre y zoom (el "se traba")
   - amplificacion real del PNG a zoom maximo
   - resolucion real del icono
   - la animacion retro sin coste de frames

   Levanta client/dist/ en un servidor local. Uso: node playwright-check.mjs
*/
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
const DIST = path.join(ROOT, 'dist')

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json'
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  let file = path.join(DIST, url.pathname)
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html')
  } catch {
    file = path.join(DIST, 'index.html')
  }
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404); res.end('no')
  }
})

await new Promise(r => server.listen(0, r))
const BASE = `http://localhost:${server.address().port}`

let fails = 0
const check = (name, cond, extra = '') => {
  if (cond) console.log(`  OK    ${name}${extra ? ' - ' + extra : ''}`)
  else { fails++; console.log(`  FALLA ${name}${extra ? ' - ' + extra : ''}`) }
}

const FRAME_PROBE = () => {
  window.__frames = 0
  window.__long = 0
  let last = performance.now()
  const tick = t => {
    const dt = t - last
    last = t
    window.__frames++
    if (dt > 32) window.__long++
    window.__raf = requestAnimationFrame(tick)
  }
  window.__raf = requestAnimationFrame(tick)
}

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const pct = f => (100 * f.long / Math.max(1, f.frames)).toFixed(1)

console.log('\n=== 1. Carga y datos ===\n')

await page.goto(`${BASE}/mapa`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

const state = await page.evaluate(() => {
  const img = document.querySelector('#map-image')
  return {
    complete: img?.complete || false,
    natural: img ? `${img.naturalWidth}x${img.naturalHeight}` : null,
    rendered: img ? Math.round(img.getBoundingClientRect().width) : null,
    imageRendering: img ? getComputedStyle(img).imageRendering : null,
    markers: document.querySelectorAll('.marker-pin').length,
    empty: document.body.innerText.includes('Sin plantas publicadas')
  }
})

check('el plano carga', state.complete && /^\d+x\d+$/.test(state.natural || ''), state.natural)
check('no sale el estado vacio', !state.empty)
check('los marcadores se pintan', state.markers > 0, `${state.markers} marcadores`)
check('el PNG usa image-rendering: pixelated', state.imageRendering === 'pixelated', state.imageRendering)

console.log('\n=== 2. Amplificacion real a zoom maximo ===\n')

const zoom = await page.evaluate(async () => {
  const img = document.querySelector('#map-image')
  const plane = img.closest('div[style*="translate"]')
  const scale = () => new DOMMatrixReadOnly(getComputedStyle(plane).transform).a
  const steps = []
  for (let i = 0; i < 16; i++) {
    const btn = document.querySelector('[aria-label="Acercar"]')
    if (!btn || btn.disabled) break
    btn.click()
    await new Promise(r => setTimeout(r, 110))
    steps.push(scale())
  }
  return { max: Math.max(...steps), steps: steps.length, natural: img.naturalWidth }
})

console.log(`        ${zoom.steps} pasos de zoom, escala maxima ${zoom.max.toFixed(2)}x`)
check('la ampliacion maxima no pasa de 3x', zoom.max <= 3.05,
  `${zoom.max.toFixed(2)}x (antes llegaba a 5.73x)`)

console.log('\n=== 3. Iconos a distintos zooms ===\n')

const iconAt = () => page.evaluate(() => {
  const btn = document.querySelector('.marker-pin')
  const span = btn?.querySelector('span.mask-icon')
  if (!span) return null
  const r = span.getBoundingClientRect()
  const readout = [...document.querySelectorAll('span')].find(s => /^\d+%$/.test(s.textContent.trim()))
  return {
    px: Math.round(r.width * window.devicePixelRatio),
    filter: getComputedStyle(btn).filter,
    zoom: readout ? parseInt(readout.textContent, 10) : null
  }
})

const atCover = await iconAt()

// Alejar al maximo: los marcadores deben mantener su tamano en pantalla
for (let i = 0; i < 20; i++) {
  await page.click('[aria-label="Alejar"]')
  await page.waitForTimeout(90)
}
await page.waitForTimeout(700)
const far = await iconAt()

// Acercar al maximo
for (let i = 0; i < 20; i++) {
  await page.click('[aria-label="Acercar"]')
  await page.waitForTimeout(90)
}
await page.waitForTimeout(700)
const near = await iconAt()

console.log(`        cover=${atCover.zoom}% icono=${atCover.px}px | ` +
  `lejos=${far.zoom}% icono=${far.px}px | cerca=${near.zoom}% icono=${near.px}px`)

check('el icono no tiene filter (causa del pixelado)', atCover.filter === 'none', atCover.filter)
check('el icono se lee alejado', far.px >= 30, `${far.px}px reales a ${far.zoom}%`)
check('el icono se lee cerca', near.px >= 30, `${near.px}px reales a ${near.zoom}%`)
check('el tamaño se mantiene estable al zoom',
  Math.max(atCover.px, far.px, near.px) / Math.min(atCover.px, far.px, near.px) < 1.6,
  `rango ${Math.min(atCover.px, far.px, near.px)}-${Math.max(atCover.px, far.px, near.px)}px`)
check('no hay aviso de lugares ocultos',
  !(await page.locator('text=lugares más al acercar').count()), 'decluttering eliminado')

console.log('\n=== 3b. Arrastre con raton ===\n')

const before = await page.evaluate(() => {
  const img = document.querySelector('#map-image')
  const plane = img.closest('div[style*="translate"]')
  const m = new DOMMatrixReadOnly(getComputedStyle(plane).transform)
  return { x: Math.round(m.e), y: Math.round(m.f) }
})

const box = await (await page.$('#map-image')).boundingBox()
const cx = box.x + box.width / 2
const cy = box.y + box.height / 2

await page.mouse.move(cx - 140, cy)
await page.mouse.down()
for (let i = 0; i < 20; i++) {
  await page.mouse.move(cx - 140 + i * 12, cy + i * 4)
  await page.waitForTimeout(16)
}
const during = await page.evaluate(() => {
  const img = document.querySelector('#map-image')
  const plane = img.closest('div[style*="translate"]')
  const m = new DOMMatrixReadOnly(getComputedStyle(plane).transform)
  return { x: Math.round(m.e), y: Math.round(m.f) }
})
await page.mouse.up()

const moved = Math.hypot(during.x - before.x, during.y - before.y)
check('el plano se mueve mientras se arrastra sin soltar', moved > 30,
  `desplazamiento ${Math.round(moved)}px`)

console.log('\n=== 4. Rendimiento ===\n')

const stage = await page.$('#map-image')
const sbox = await stage.boundingBox()
const sx = sbox.x + sbox.width / 2
const sy = sbox.y + sbox.height / 2

await page.evaluate(FRAME_PROBE)
await page.mouse.move(sx - 130, sy)
await page.mouse.down()
for (let i = 0; i < 26; i++) {
  await page.mouse.move(sx - 130 + i * 11, sy + Math.sin(i / 3) * 34)
  await page.waitForTimeout(12)
}
const dragMoving = await page.evaluate(() => {
  const img = document.querySelector('#map-image')
  const plane = img.closest('div[style*="translate"]')
  const m = new DOMMatrixReadOnly(getComputedStyle(plane).transform)
  return { frames: window.__frames, long: window.__long, x: Math.round(m.e), y: Math.round(m.f) }
})
await page.mouse.up()
console.log(`        arrastre: ${dragMoving.frames} frames, ${dragMoving.long} largos (${pct(dragMoving)}%)`)
check('el arrastre mueve el plano de verdad', Math.abs(dragMoving.x) > 30 || Math.abs(dragMoving.y) > 30,
  `termino en ${dragMoving.x},${dragMoving.y}`)

await page.evaluate(FRAME_PROBE)
for (let i = 0; i < 12; i++) {
  await page.mouse.move(sx, sy)
  await page.mouse.wheel(0, -120)
  await page.waitForTimeout(30)
}
const wheel = await page.evaluate(() => ({ frames: window.__frames, long: window.__long }))
console.log(`        zoom rueda: ${wheel.frames} frames, ${wheel.long} largos (${pct(wheel)}%)`)

check('el arrastre no acumula frames largos', dragMoving.long / Math.max(1, dragMoving.frames) < 0.25, pct(dragMoving) + '%')
check('el zoom no acumula frames largos', wheel.long / Math.max(1, wheel.frames) < 0.25, pct(wheel) + '%')

console.log('\n=== 5. Ruta y extremos retro ===\n')

await page.goto(`${BASE}/mapa`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2200)

await page.click('button[title="Cómo llegar"]')
await page.waitForTimeout(700)

// El dialog se identifica por aria-labelledby (Sheet), no por aria-label
const dialog = page.locator('[role="dialog"][aria-labelledby="route-panel-title"]')
const panelOpen = await dialog.count()
check('el panel de ruta abre', panelOpen > 0)

if (panelOpen > 0) {
  // Cada input elige una opcion distinta: si coinciden, la app lo rechaza
  // ("el origen y el destino no pueden ser el mismo lugar"), que es correcto
  // pero no ejercita el trazado.
  const pick = async (inputIndex, optionIndex) => {
    const inputs = dialog.locator('input[role="combobox"]')
    await inputs.nth(inputIndex).fill('a')
    await page.waitForTimeout(650)
    const opts = page.locator('[role="option"]')
    const n = await opts.count()
    if (n === 0) return false
    await opts.nth(Math.min(optionIndex, n - 1)).click()
    await page.waitForTimeout(400)
    return true
  }

  await pick(0, 0)
  await pick(1, 1)

  await dialog.locator('button', { hasText: 'Trazar camino' }).click()
  await page.waitForTimeout(3000)
}

const route = await page.evaluate(() => {
  const canvas = document.querySelector('canvas')
  let painted = false
  if (canvas && canvas.width > 0) {
    const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
    for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 10) { painted = true; break }
  }
  return {
    painted,
    ping: document.querySelectorAll('.route-ping').length,
    blink: document.querySelectorAll('.route-blink').length,
    banner: document.querySelector('[aria-label="Ruta"],[role="status"]')?.innerText || ''
  }
})

check('la ruta se dibuja en el canvas', route.painted)
check('el ping del origen esta', route.ping > 0, `${route.ping}`)
check('el galope de la flecha esta', route.blink > 0, `${route.blink}`)
if (route.banner) console.log(`        banner: ${route.banner.replace(/\s+/g, ' ').trim().slice(0, 80)}`)

if (route.ping > 0) {
  await page.evaluate(FRAME_PROBE)
  await page.waitForTimeout(2200)
  const pulse = await page.evaluate(() => ({ frames: window.__frames, long: window.__long }))
  console.log(`        pulso: ${pulse.frames} frames, ${pulse.long} largos (${pct(pulse)}%)`)
  check('la animacion retro no cuesta frames', pulse.long / Math.max(1, pulse.frames) < 0.35, pct(pulse) + '%')
}

await browser.close()
server.close()

console.log('')
console.log(fails === 0 ? 'RESULTADO: todo correcto' : `RESULTADO: ${fails} fallo(s)`)
process.exit(fails === 0 ? 0 : 1)