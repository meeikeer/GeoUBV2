/* Copia client/dist/ a docs/ para publicación con "Deploy from a branch".
   Crea .nojekyll para evitar que GitHub Pages ejecute Jekyll. */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'client', 'dist')
const DOCS = path.join(ROOT, 'docs')

function copyDir(src, dest) {
  if (!fs.existsSync(src)) throw new Error(`No existe ${src}`)
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(s, d)
    else fs.copyFileSync(s, d)
  }
}

function rmDir(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      rmDir(p)
      fs.rmdirSync(p)
    } else {
      fs.unlinkSync(p)
    }
  }
  fs.rmdirSync(dir)
}

rmDir(DOCS)
copyDir(DIST, DOCS)
fs.writeFileSync(path.join(DOCS, '.nojekyll'), '')
console.log('publish-docs: docs/ actualizado desde client/dist/')
