// Recortes del plano a la escala del problema, con las variantes de CSS una a
// una, para comparar a ojo.
//
// Por que recortes y no un indice numerico: el PNG de origen ya tiene sus propios
// grises anti-aliasados en las lineas de 1 px, y eso se come casi todo el margen
// entre "nítido" y "borroso". Un recorte al lado de otro dice mas que un promedio.
//
// El recorte se ancla en MURO, buscando el punto mas denso en aristas del propio
// PNG de origen. Anclar en el marcador, que es el centro de una habitacion, cae
// en el interior vacio de la sala: blanco liso, cero lineas, nada que comparar.
//
//   node playwright-crops.mjs
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises'
import { inflateSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
const DIST = path.join(ROOT, 'dist')
const MAPS = path.join(ROOT, 'public', 'assets', 'maps')
const SHOTS = path.join(ROOT, '..', 'shots')
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

/* Decodificador de PNG minimo (8 bits, sin entrelazado, color 2 o 6). */
function decodePng(buf) {
  let p = 8, ihdr = null
  const idat = []
  while (p < buf.length) {
    const len = buf.readUInt32BE(p)
    const type = buf.toString('ascii', p + 4, p + 8)
    const data = buf.subarray(p + 8, p + 8 + len)
    if (type === 'IHDR') ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], color: data[9], interlace: data[12] }
    else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    p += 12 + len
  }
  const ch = ihdr.color === 6 ? 4 : ihdr.color === 2 ? 3 : null
  if (ihdr.depth !== 8 || ihdr.interlace !== 0 || !ch) throw new Error('PNG no soportado')
  const raw = inflateSync(Buffer.concat(idat))
  const { w, h } = ihdr
  const stride = w * ch
  const out = Buffer.alloc(h * stride)
  let rp = 0
  for (let y = 0; y < h; y++) {
    const f = raw[rp++]
    const line = raw.subarray(rp, rp + stride)
    rp += stride
    const cur = out.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0
      const b = prev ? prev[x] : 0
      const c = prev && x >= ch ? prev[x - ch] : 0
      let v = line[x]
      if (f === 1) v += a
      else if (f === 2) v += b
      else if (f === 3) v += (a + b) >> 1
      else if (f === 4) {
        const pp = a + b - c
        const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      cur[x] = v & 0xff
    }
  }
  return { w, h, ch, data: out }
}

/* Puntos del plano original donde hay mas linea, ordenados de mas a menos. */
function wallPoints(file) {
  const { w, h, ch, data } = decodePng(readFileSync(file))
  const CELL = 32
  const cols = Math.ceil(w / CELL)
  const density = new Float32Array(cols * Math.ceil(h / CELL))
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 1; x < w; x++) {
      const a = data[(row + x) * ch]
      const b = data[(row + x - 1) * ch]
      if (Math.abs(a - b) > 40) density[((y / CELL) | 0) * cols + ((x / CELL) | 0)]++
    }
  }
  return [...density.keys()]
    .sort((i, j) => density[j] - density[i])
    .slice(0, 400)
    .map(i => ({
      px: ((i % cols) * CELL + CELL / 2) / w,
      py: (((i / cols) | 0) * CELL + CELL / 2) / h,
      d: density[i]
    }))
}

import { readFileSync } from 'node:fs'

const CROP = { width: 400, height: 250 }
const walls = wallPoints(path.join(MAPS, 'mapa-sotano.png'))
console.log(`\n  puntos de muro candidatos: ${walls.length}, mas denso con ${walls[0].d} aristas\n`)

const browser = await chromium.launch({ channel: 'chrome', headless: false })
await mkdir(SHOTS, { recursive: true })

const CASES = [
  { name: '1-normal', css: null, dpr: 1 },
  { name: '2-sin-filtro', css: 'div:has(> #map-image) { filter: none !important; }', dpr: 1 },
  { name: '3-sin-pixelated', css: '#map-image { image-rendering: auto !important; }', dpr: 1 },
  { name: '4-sin-filtro-ni-pixelated', css: 'div:has(> #map-image) { filter: none !important; } #map-image { image-rendering: auto !important; }', dpr: 1 },
  { name: '5-sin-filtro-ni-sombra', css: 'div:has(> #map-image) { filter: none !important; box-shadow: none !important; }', dpr: 1 },
  { name: '6-normal-dpr2', css: null, dpr: 2 }
]

for (const c of CASES) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: c.dpr })
  const page = await context.newPage()
  await page.goto(`${BASE}/mapa`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

  const box = await (await page.$('#map-image')).boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)

  const scaleNow = () => page.evaluate(() => {
    const r = document.querySelector('#map-image').getBoundingClientRect()
    return r.width / 1376 * devicePixelRatio
  })

  let s = await scaleNow()
  for (let i = 0; i < 60 && Math.abs(s - 2.1) > 0.03; i++) {
    const step = Math.max(12, Math.min(220, Math.round(300 * (2.1 / s - 1))))
    await page.mouse.wheel(0, s < 2.1 ? -step : step)
    await page.waitForTimeout(90)
    s = await scaleNow()
  }
  if (c.css) await page.addStyleTag({ content: c.css })
  await page.waitForTimeout(400)

  /* El primer punto de muro que quepa entero en la ventana, ya con el zoom
     puesto. Todos los recortes salen del mismo sitio, asi que la comparacion
     entre variantes es de la misma linea de dibujo. */
  const rect = await page.evaluate(() => {
    const r = document.querySelector('#map-image').getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  const half = { w: CROP.width / 2, h: CROP.height / 2 }
  const pick = walls.find(w => {
    const x = rect.x + w.px * rect.w
    const y = rect.y + w.py * rect.h
    return x > half.w + 5 && x < 1600 - half.w - 5 && y > 100 + half.h && y < 900 - 80 - half.h
  })
  if (!pick) { console.log(`  ${c.name}: ningun punto de muro visible`); await context.close(); continue }

  const cx = rect.x + pick.px * rect.w
  const cy = rect.y + pick.py * rect.h
  const clip = {
    x: Math.round(cx - half.w),
    y: Math.round(cy - half.h),
    width: CROP.width,
    height: CROP.height
  }
  await writeFile(path.join(SHOTS, `crop-${c.name}.png`), await page.screenshot({ clip }))
  console.log(`  ${c.name.padEnd(28)} dpr ${c.dpr}  escala ${s.toFixed(2)}  aristas ${pick.d}`)
  await context.close()
}

await browser.close()
server.close()
console.log(`\n  en ${SHOTS}\\crop-*.png\n`)
