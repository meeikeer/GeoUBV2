// Nitidez del icono del marcador a lo largo del zoom.
//
// El marcador se dibuja a zoom * markerScale, y markerScale va cuantizado en
// pasos. El error de esa cuantizacion es relativo: medio_paso / markerScale, y
// markerScale es pequeno cuanto mas cerca se esta. A 210% sale 0.4762 real
// contra 0.4583 cuantizado, o sea que el icono se pinta al 96% de su tamano
// nominal y ese 4% cae sobre un pixel de dispositivo.
//
// Aqui se mide el porcentaje de pixeles grises del recorte del icono y su
// etiqueta. Un SVG de bordes duros, a escala fraccionaria, reparte el borde en
// grises; a escala entera lo deja en negro limpio. Por eso el dato discrimina.
//
// Este si funciona donde el del plano fallaba: las lineas del PNG son de 1 px
// anti-aliasadas y su propio gris se come el margen, pero un icono no.
//
//   node playwright-marker.mjs [etiqueta]
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { inflateSync } from 'node:zlib'
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

function decodePng(buf) {
  let p = 8, ihdr = null
  const idat = []
  while (p < buf.length) {
    const len = buf.readUInt32BE(p)
    const t = buf.toString('ascii', p + 4, p + 8)
    const d = buf.subarray(p + 8, p + 8 + len)
    if (t === 'IHDR') ihdr = { w: d.readUInt32BE(0), h: d.readUInt32BE(4), color: d[9] }
    else if (t === 'IDAT') idat.push(d)
    else if (t === 'IEND') break
    p += 12 + len
  }
  const ch = ihdr.color === 6 ? 4 : 3
  const W = ihdr.w, H = ihdr.h, stride = W * ch
  const out = Buffer.alloc(H * stride)
  const raw = inflateSync(Buffer.concat(idat))
  let rp = 0
  for (let y = 0; y < H; y++) {
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
  return { w: W, h: H, ch, data: out }
}

/* grises = pixeles en la banda intermedia. Bordes limpios -> pocos. */
function stats(buf) {
  const img = decodePng(buf)
  let mid = 0, dark = 0, n = 0, sum = 0
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const j = (y * img.w + x) * img.ch
      const v = img.data[j]
      sum += v; n++
      if (v > 30 && v < 225) mid++
      if (v < 30) dark++
    }
  }
  return { mid: 100 * mid / n, dark: 100 * dark / n, mean: sum / n }
}

const LABEL = process.argv[2] || 'build'
const VARIANTS = [
  { name: 'normal', css: null },
  { name: 'sin filtro del marco', css: 'div:has(> #map-image) { filter: none !important; }' },
  { name: 'sin clip-path', css: '.marker-pin { clip-path: none !important; }' },
  { name: 'sin rotate del icono', css: '.marker-pin .mask-icon { transform: none !important; }' }
]

const browser = await chromium.launch({ channel: 'chrome' })
console.log(`\n=== ${LABEL} ===`)
console.log('  grises = % de pixeles en la banda intermedia del recorte del marcador')

const results = {}
for (const dpr of [1, 2]) {
  for (const v of VARIANTS) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: dpr })
    const page = await context.newPage()
    await page.goto(`${BASE}/mapa`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2200)
    if (v.css) await page.addStyleTag({ content: v.css })

    const box = await (await page.$('#map-image')).boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)

    const readout = () => page.evaluate(() => {
      const e = [...document.querySelectorAll('span')].find(s => /^\d+%$/.test(s.textContent.trim()))
      return e ? parseInt(e.textContent, 10) : null
    })

    for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(20) }
    await page.waitForTimeout(500)

    const rows = []
    let prev = 0
    for (let i = 0; i < 40; i++) {
      const z = await readout()
      if (z === null) break
      if (i > 0 && z <= prev) break
      prev = z
      /* El recorte es el contenedor del marcador: encompasses el rombo y la
         etiqueta, que es lo que se ve borroso. */
      const holder = page.locator('.marker-pin').first().locator('xpath=../..')
      let s
      try { s = stats(await holder.screenshot()) } catch { break }
      rows.push({ z, ...s })
      await page.mouse.wheel(0, -22)
      await page.waitForTimeout(90)
    }
    results[`${dpr}|${v.name}`] = rows
    await context.close()
  }
}

const brief = (name, rows) => {
  if (!rows.length) return `${name}: sin muestras`
  const worst = rows.reduce((a, b) => (b.mid > a.mid ? b : a))
  const best = rows.reduce((a, b) => (b.mid < a.mid ? b : a))
  return `${name}: max ${worst.mid.toFixed(1)}% a ${worst.z}% | min ${best.mid.toFixed(1)}% a ${best.z}% | n=${rows.length}`
}

for (const dpr of [1, 2]) {
  console.log(`\n  dpr ${dpr}`)
  for (const v of VARIANTS) {
    console.log(`    ${v.name.padEnd(24)} ${brief(v.name, results[`${dpr}|${v.name}`])}`)
  }
}

console.log(`\n  detalle dpr 1, normal (zoom -> grises):`)
for (const r of results['1|normal']) {
  console.log(`    ${String(r.z).padStart(4)}%  ${r.mid.toFixed(1).padStart(5)}%   oscuros ${r.dark.toFixed(1)}%`)
}

await browser.close()
server.close()
