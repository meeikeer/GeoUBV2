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

/* rmSync recursivo en vez de un rmDir a mano: la version anterior recorria el
   arbol y hacia rmdirSync de cada subcarpeta, y en Windows fallaba con ENOENT
   al llegar a docs/assets/icons, dejando docs/ a medias. rmSync es atomico y
   tolera el orden de borrado. */
/* CNAME vive en docs/ pero no en client/dist/: si se borra con el resto, cada
   deploy deja al sitio sin dominio personalizado. Se lee antes de limpiar y se
   vuelve a escribir despues. */
const cnamePath = path.join(DOCS, 'CNAME')
const cname = fs.existsSync(cnamePath) ? fs.readFileSync(cnamePath, 'utf8') : null

fs.rmSync(DOCS, { recursive: true, force: true })
copyDir(DIST, DOCS)

if (cname !== null) {
  fs.writeFileSync(cnamePath, cname)
}
fs.writeFileSync(path.join(DOCS, '.nojekyll'), '')
console.log('publish-docs: docs/ actualizado desde client/dist/')
