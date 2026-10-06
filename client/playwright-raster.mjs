// Reparto real de tiempos del gesto de zoom, en navegador con ventana.
//
// Por qué existe: los bancos anteriores corrían en headless, que ya va por
// software y resultaba ser el caso "bueno" disfrazado. Ninguno de sus A/B
// discriminaba nada. Este banco se abre con ventana (GPU de verdad) y admite
// forzar el rasterizado por software, que es como se reproduce el bajón.
//
//   node playwright-raster.mjs gpu   -> con aceleración por hardware
//   node playwright-raster.mjs sw    -> forzando --disable-gpu-compositing
//   node playwright-raster.mjs all   -> los dos, en la misma ejecucion
//   node playwright-raster.mjs gpu --dump  -> guarda la traza cruda en shots/
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises'
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

/* Categorias de traza. -* apaga las implicitas y se reactivan solo las
  interesting: devtools.timeline da Layout/Paint/Layerize, y el sufijo
   disabled-by-default aporta RasterTask, DecodeImage y DrawFrame, que es
   justamente lo que no se ve en un perfil de CPU normal. */
const CATS = '-*,toplevel,devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,blink.user_timing'

/* Cuantas veces se mide cada variante. Una sola pasada dio "normal" a 32 fps en
   una ejecucion y a 58 en otra, y todas las variantes por debajo de normal, que
   es fisicamente imposible: el banco tiene tanto ruido que hay que repetir y
   quedarse con la mediana. */
const REPS = Number(process.env.REPS || 5)

/* Eventos de los que queremos el reparto. Los de primer nivel se atribuyen al
   hilo principal; los de raster, a los hilos de raster. */
const MAIN = ['RunTask', 'FunctionCall', 'EventDispatch', 'UpdateLayoutTree', 'Layout',
  'Layerize', 'Paint', 'PaintImage', 'CompositeLayers', 'UpdateLayerTree',
  'Commit', 'HitTest', 'TimerFire', 'RequestAnimationFrame', 'FireAnimationFrame']
const RASTER = ['RasterTask', 'Rasterize', 'DecodeImage', 'ImageDecodeTask',
  'DrawFrame', 'GpuRasterize', 'PaintOpBuffer']

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

const sum = (events, names) => {
  const out = {}
  for (const n of names) {
    const hits = events.filter(e => e.name === n && typeof e.dur === 'number')
    if (!hits.length) continue
    out[n] = { ms: hits.reduce((a, e) => a + e.dur, 0) / 1000, n: hits.length }
  }
  return out
}
const top = obj => Object.entries(obj).sort((a, b) => b[1].ms - a[1].ms)
const printBlock = (title, obj) => {
  const rows = top(obj)
  if (!rows.length) return console.log(`    ${title}: sin eventos`)
  for (const [name, v] of rows.slice(0, 6)) {
    console.log(`    ${title.padEnd(9)} ${name.padEnd(20)} ${v.ms.toFixed(1).padStart(7)} ms  x${String(v.n).padStart(4)}`)
  }
}

async function run(mode) {
  const sw = mode === 'sw'
  const args = sw ? ['--disable-gpu-compositing', '--enable-unsafe-swiftshader'] : []

  console.log(`\n=== modo ${mode} ===${sw ? '  (rasterizado por software, como sin aceleracion)' : '  (con GPU)'}`)
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await context.newPage()

  await page.goto(`${BASE}/mapa`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl')
    if (!gl) return { webgl: false, renderer: 'sin webgl' }
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    return { webgl: true, renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) }
  })
  console.log(`  GPU: ${renderer.renderer}`)

  /* CONTROL: ritmo de fotogramas con la pagina vacia. Antes de seguir con
     variantes hace falta esto. Si una pagina en blanco tambien va a ~32fps,
     ningun A/B sobre el mapa puede mover el numero, porque el compositor por
     software no llega a la frecuencia de refresco y todas las filas anteriores
     estaban midiendo el techo, no nuestro codigo. */
  const frameRate = async ms => {
    await page.evaluate(FRAME_PROBE)
    await page.waitForTimeout(ms)
    const r = await page.evaluate(() => {
      cancelAnimationFrame(window.__raf)
      return { frames: window.__frames, total: window.__total }
    })
    return r.frames ? (1000 / (r.total / r.frames)).toFixed(0) : '0'
  }

  await page.goto('about:blank')
  const blank = await frameRate(1500)
  await page.goto(`${BASE}/mapa`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const idle = await frameRate(1500)
  console.log(`  control: pagina en blanco ${blank} fps | mapa sin tocar ${idle} fps`)

  const zoomPct = () => page.evaluate(() => {
    const el = [...document.querySelectorAll('span')].find(s => /^\d+%$/.test(s.textContent.trim()))
    return el ? parseInt(el.textContent, 10) : null
  })
  const setZoom = async targetPct => {
    for (let i = 0; i < 30; i++) {
      const z = await zoomPct()
      if (z === null || Math.abs(z - targetPct) < 6) return
      await page.click(z < targetPct ? '[aria-label="Acercar"]' : '[aria-label="Alejar"]')
      await page.waitForTimeout(70)
    }
  }

  /* La variante es lo que se enciende o apaga antes de la ráfaga. Se hace por
     CSS inyectado y no tocando el codigo, para que el A/B sea limpio. */
  const CASES = [
    { name: 'normal', css: null },
    /* Promover el plano a capa propia. Es la unica palanca que queda y es de
       otra naturaleza que las anteriores: no quita contenido, cambia como se
       reparte el repintado. Si el plano no es su propia capa, cada frame
       invalida la zona danada y hay que recomponerla entera. */
    { name: 'plano en capa propia', css: 'div:has(> #map-image) { will-change: transform; }' },
    { name: 'plano en capa, sin filtro', css: 'div:has(> #map-image) { will-change: transform; filter: none !important; }' },
    { name: 'plano en capa, sin pixelated', css: 'div:has(> #map-image) { will-change: transform; } #map-image { image-rendering: auto !important; }' },
    { name: 'sin filtro del marco', css: 'div:has(> #map-image) { filter: none !important; }' },
    { name: 'sin el plano', css: '#map-image { visibility: hidden !important; }' },
    { name: 'sin marcadores', css: '.marker-pin, .marker-label { display: none !important; }' }
  ]

  const results = []
  const reps = []
  for (let rep = 0; rep < REPS; rep++) {
    /* Se recorre en orden alterno: si la maquina se calienta o se va calmando a
       lo largo de la pasada, el efecto no cae siempre sobre la misma variante. */
    const order = rep % 2 ? [...CASES].reverse() : CASES
    for (const c of order) {
      await page.goto(`${BASE}/mapa`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(2200)
      /* El zoom se fija ANTES de inyectar el CSS: si la variante oculta los
         botones de zoom, setZoom se quedaria esperando un boton invisible. */
      await setZoom(95)
      if (c.css) await page.addStyleTag({ content: c.css })
      await page.waitForTimeout(150)

      const box = await (await page.$('#map-image')).boundingBox()
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)

      /* La traza solo en la primera pasada: con la traza puesta el propio
         rastreo mete overhead, y aqui lo que interesa es el numero. */
      let cdp = null
      if (rep === 0) {
        cdp = await context.newCDPSession(page)
        const events = []
        cdp.on('Tracing.dataCollected', e => events.push(...e.value))
        await cdp.send('Tracing.start', { categories: CATS, transferMode: 'ReportEvents' })
        cdp.__events = events
      }

      await page.evaluate(FRAME_PROBE)
      for (let i = 0; i < 8; i++) {
        await page.mouse.wheel(0, -120)
        await page.waitForTimeout(40)
      }
      const r = await page.evaluate(() => {
        cancelAnimationFrame(window.__raf)
        return { frames: window.__frames, long: window.__long, total: window.__total }
      })

      if (cdp) {
        const done = new Promise(res => cdp.once('Tracing.tracingComplete', res))
        await cdp.send('Tracing.end')
        await done
        const events = cdp.__events
        const main = sum(events, MAIN)
        const raster = sum(events, RASTER)
        console.log(`\n  ${c.name}   [reparto, 1a pasada]`)
        console.log(`    fps ~${(1000 / (r.total / r.frames)).toFixed(0)}  largos ${(100 * r.long / Math.max(1, r.frames)).toFixed(1)}%`)
        printBlock('hilo ppal', main)
        printBlock('raster', raster)
        if (process.argv.includes('--dump')) {
          await mkdir(path.join(ROOT, '..', 'shots'), { recursive: true })
          await writeFile(path.join(ROOT, '..', 'shots', `traza-${mode}-${c.name.replace(/[^a-z0-9]+/gi, '-')}.json`), JSON.stringify(events))
        }
        await cdp.detach()
      }

      const avg = r.frames ? r.total / r.frames : 0
      reps.push({ c, avg, pctLong: 100 * r.long / Math.max(1, r.frames) })
    }
  }

  const median = a => {
    const s = [...a].sort((x, y) => x - y)
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
  }
  for (const c of CASES) {
    const fpsAll = reps.filter(x => x.c.name === c.name).map(x => 1000 / x.avg)
    const longAll = reps.filter(x => x.c.name === c.name).map(x => x.pctLong)
    results.push({ c, fps: median(fpsAll), long: median(longAll), raw: fpsAll })
  }

  const base = results[0]
  console.log(`\n  --- atribucion en modo ${mode} (mediana de ${REPS}) ---`)
  console.log(`    ${'variante'.padEnd(36)}${'fps'.padStart(5)}${'largos'.padStart(9)}   delta`)
  for (const x of results) {
    const d = (x.fps - base.fps).toFixed(1)
    console.log(`    ${x.c.name.padEnd(36)}${x.fps.toFixed(0).padStart(5)}${(x.long.toFixed(1) + '%').padStart(9)}   ${d > 0 ? '+' : ''}${d} fps   [${x.raw.map(v => v.toFixed(0)).join(' ')}]`)
  }

  await browser.close()
  return results
}

const which = process.argv[2] || 'all'
try {
  if (which === 'all') { await run('gpu'); await run('sw') }
  else await run(which)
} finally {
  server.close()
}
