/* Resolución de rutas de assets bajo el base real del deploy.
   GitHub Pages puede servir el build en un subpath (ej. /GeoUBV_v2/), así que
   un '/assets/...' absoluto da 404. Todo se resuelve contra BASE_URL. */

const RAW_BASE = import.meta.env.BASE_URL || '/'

export const ASSET_BASE = new URL(RAW_BASE, document.baseURI).href.replace(
  /([^:])\/*$/,
  '$1/'
)

/** Convierte una ruta de asset (absoluta, relativa o URL externa) en una URL usable. */
export function assetUrl(path) {
  if (!path) return ''
  const value = String(path)
  if (/^(?:https?:)?\/\//i.test(value) || value.startsWith('data:')) return value
  return ASSET_BASE + value.replace(/^\.?\//, '')
}

/* Tamaño natural de los PNG de planta, medido sobre el archivo.
   Permite declarar width/height y aspect-ratio en el <img> para que el
   navegador reserve el espacio correcto y la página no salte al cargar. */
const MAP_SIZES = {
  'mapa-sotano.png': { w: 1376, h: 580 },
  'mapa-piso1.png': { w: 1454, h: 515 },
  'mapa-piso2.png': { w: 1927, h: 539 }
}

function mapFileName(url) {
  if (!url) return ''
  return String(url).split('/').pop().split('?')[0]
}

/** URL del PNG de planta de un piso. */
export function mapUrl(piso) {
  return assetUrl(piso?.url_map)
}

/** Tamaño natural del PNG ({w, h}) o null si no está en el manifiesto. */
export function mapIntrinsic(piso) {
  return MAP_SIZES[mapFileName(piso?.url_map)] || null
}

/** Proporción del PNG (width / height), o null si no se conoce. */
export function mapAspect(piso) {
  const size = mapIntrinsic(piso)
  return size ? size.w / size.h : null
}