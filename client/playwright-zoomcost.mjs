// Aísla el coste del zoom en PC: ¿son las etiquetas o el re-raster del PNG?
//   A. zoom por debajo de 1.2 (sin etiquetas)
//   B. zoom por encima de 1.2 con etiquetas
//   C. zoom por encima de 1.2 con las etiquetas ocultas por CSS
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
const DIST = path.join(ROOT, 'dist')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  let file = path.join(DIST, url.pathname)
  try { if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html') } catch { file = path.join(DIST, 'index.html') }
  try { const b = await readFile(file); res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }); res.end(b) }
  catch { res.writeHead(404); res.end('no') }
})
await new Promise(r => server.listen(0, r))
const BASE = `http://localhost:${server.address().port}`

const FRAME_PROBE = () => {
  window.__frames = 0
  window.__long = 0
  window.__total = 0
  let last = performance.now()
  const tick = t => {
    const dt = t - last
    last = t
    window.__frames++
    window.__total += dt
    if (dt > 24) window.__long++
    window.__raf = requestAnimationFrame(tick)
  }
  window.__raf = requestAnimationFrame(tick)
}

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })

await page.goto(`${BASE}/mapa`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

const zoomPct = () => page.evaluate(() => {
  const el = [...document.querySelectorAll('span')].find(s => /^\d+%$/.test(s.textContent.trim()))
  return el ? parseInt(el.textContent, 10) : null
})
const labelCount = () => page.locator('.marker-label').count()

const setZoom = async (targetPct) => {
  for (let i = 0; i < 30; i++) {
    const z = await zoomPct()
    if (z === null) return
    if (Math.abs(z - targetPct) < 6) return
    const btn = z < targetPct ? '[aria-label="Acercar"]' : '[aria-label="Alejar"]'
    await page.click(btn)
    await page.waitForTimeout(70)
  }
}

const burst = async (steps) => {
  const box = await (await page.$('#map-image')).boundingBox()
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.evaluate(FRAME_PROBE)
  await page.waitForTimeout(200)
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, -120)
    await page.waitForTimeout(40)
  }
  const r = await page.evaluate(() => ({
    frames: window.__frames, long: window.__long, total: window.__total
  }))
  await page.evaluate(() => cancelAnimationFrame(window.__raf))
  const avg = r.frames ? r.total / r.frames : 0
  return { ...r, avg: avg.toFixed(1), fps: (1000 / avg).toFixed(0) }
}

const report = (name, r, extra = '') =>
  console.log(`  ${name.padEnd(42)} ${String(r.frames).padStart(3)} frames  ` +
    `${String(r.long).padStart(3)} largos  media ${r.avg}ms  ~${r.fps}fps  ${extra}`)

console.log('\nCoste del zoom en PC (1440x900, dpr 1)\n')

/* Lo que importa es el CRUCE del umbral de etiquetas: es cuando aparecen los
   DOM de las etiquetas y cuando el usuario nota el bajon. Por eso se mide
   empezando por debajo y cruzando, no con el zoom yaAGO arriba. */

// A. Cruzando 1.2 con etiquetas
await setZoom(95)
const labelsA = await labelCount()
const a = await burst(8)
report('A. cruzando 120% (con etiquetas)', a, `etiquetas=${labelsA}`)

// B. Cruzando 1.2 con las etiquetas ocultas desde el principio
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2200)
await page.addStyleTag({ content: '.marker-label { display: none !important; }' })
await setZoom(95)
const b = await burst(8)
report('B. cruzando 120% (etiquetas ocultas)', b)

// C. Cruzando 1.2 sin pixelated
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2200)
await page.addStyleTag({ content: '#map-image { image-rendering: auto !important; }' })
await setZoom(95)
const c = await burst(8)
report('C. cruzando 120%, sin pixelated', c)

// D. Cruzando 1.2 sin marcadores, solo el plano
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2200)
await page.addStyleTag({ content: '.marker-pin, .marker-label { display: none !important; }' })
await setZoom(95)
const d = await burst(8)
report('D. cruzando 120%, sin marcadores', d)

// E. Ya por encima del umbral, zoom continuo (referencia)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2200)
await setZoom(190)
const e = await burst(10)
report('E. ya > 120%, zoom continuo', e)

const pct = r => (100 * r.long / Math.max(1, r.frames)).toFixed(1)
console.log('\n--- conclusion ---')
console.log(`  etiquetas al cruzar:   ${pct(a)}% largos  vs  ${pct(b)}% sin ellas`)
console.log(`  pixelated al cruzar:   ${pct(a)}% largos  vs  ${pct(c)}% sin el`)
console.log(`  marcadores al cruzar:  ${pct(a)}% largos  vs  ${pct(d)}% sin marcadores`)
console.log(`  referencia > 120%:     ${pct(e)}% largos`)
console.log(`\n  medias: A=${a.avg} B=${b.avg} C=${c.avg} D=${d.avg} E=${e.avg} ms`)

await browser.close()
server.close()