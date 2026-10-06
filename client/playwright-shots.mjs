// Capturas del mapa para revision visual: movil y desktop, vista inicial y
// con zoom. Uso: node playwright-shots.mjs
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, stat, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
const DIST = path.join(ROOT, 'dist')
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

await mkdir(SHOTS, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })

for (const vp of [
  { name: 'movil', width: 390, height: 844, dsf: 2 },
  { name: 'desktop', width: 1440, height: 900, dsf: 1 }
]) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dsf
  })

  await page.goto(`${BASE}/mapa`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2600)
  await page.screenshot({ path: path.join(SHOTS, `${vp.name}-inicial.png`) })

  // Con la ruta trazada, para ver el trazo y los extremos retro
  await page.click('button[title="Cómo llegar"]')
  await page.waitForTimeout(700)
  const dialog = page.locator('[role="dialog"][aria-labelledby="route-panel-title"]')
  if (await dialog.count()) {
    const inputs = dialog.locator('input[role="combobox"]')
    for (const [i, o] of [[0, 0], [1, 1]]) {
      await inputs.nth(i).fill('a')
      await page.waitForTimeout(650)
      const opts = page.locator('[role="option"]')
      const n = await opts.count()
      if (n) { await opts.nth(Math.min(o, n - 1)).click(); await page.waitForTimeout(400) }
    }
    await dialog.locator('button', { hasText: 'Trazar camino' }).click()
    await page.waitForTimeout(2600)
  }
  await page.screenshot({ path: path.join(SHOTS, `${vp.name}-ruta.png`) })

  // Zoom maximo, para juzgar la nitidez del plano y de los iconos
  for (let i = 0; i < 16; i++) {
    await page.click('[aria-label="Acercar"]')
    await page.waitForTimeout(110)
  }
  await page.waitForTimeout(900)
  await page.screenshot({ path: path.join(SHOTS, `${vp.name}-zoom.png`) })

  await page.close()
  console.log(`${vp.name}: capturas listas`)
}

await browser.close()
server.close()
console.log(`\nEn: ${SHOTS}`)