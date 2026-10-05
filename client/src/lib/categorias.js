import { assetUrl } from './assets.js'

/* Catálogo único de categorías. Fuente de verdad para marcadores, buscador,
   panel admin y calculation de ruta: evita tres copias del mismo mapa. */

const CATEGORIAS = [
  { id: 1, nombre: 'Aula', iconName: 'aula' },
  { id: 2, nombre: 'Baño Mujeres', iconName: 'banoMujeres' },
  { id: 3, nombre: 'Baño Hombres', iconName: 'banoHombres' },
  { id: 4, nombre: 'Biblioteca', iconName: 'biblioteca' },
  { id: 5, nombre: 'Cafetería', iconName: 'cafeteria' },
  { id: 6, nombre: 'Comedor', iconName: 'comedor' },
  { id: 7, nombre: 'Coordinación', iconName: 'coordinacion' },
  { id: 8, nombre: 'Entrada', iconName: 'entrada' },
  { id: 9, nombre: 'Escaleras', iconName: 'escaleras' },
  { id: 10, nombre: 'Gym', iconName: 'gym' },
  { id: 11, nombre: 'Laboratorio', iconName: 'laboratorio' },
  { id: 12, nombre: 'Oficina', iconName: 'oficina' },
  { id: 13, nombre: 'Salud', iconName: 'salud' }
]

const DEFAULT_CATEGORIA = CATEGORIAS[0]

/* Nombres que aparecen en geodata pero no son los del catálogo.
   Se resuelven al id equivalente para no perder el icono. */
const ALIASES = {
  bano: 2,
  escalera: 9,
  pfg: 1,
  servicio: 13
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

const BY_ID = new Map(CATEGORIAS.map(c => [c.id, c]))
const BY_NAME = new Map(CATEGORIAS.map(c => [normalize(c.nombre), c]))

/** Entrada del catálogo por id (o null si el id no existe). */
export function getCategoria(categoriaId) {
  return BY_ID.get(Number(categoriaId)) || null
}

/** Resuelve un id o un nombre de categoría (incluidos alias) a la entrada del catálogo. */
export function resolveCategoria(categoriaId, nombre) {
  const byId = getCategoria(categoriaId)
  if (byId) return byId
  const key = normalize(nombre)
  return BY_NAME.get(key) || BY_ID.get(ALIASES[key]) || null
}

/** Nombre legible; prefiere el catálogo (acentuado) y cae al dato si no existe. */
export function categoriaNombre(categoriaId, nombre) {
  const entry = resolveCategoria(categoriaId, nombre)
  return entry ? entry.nombre : nombre || ''
}

/** Nombre del icono local para una categoría. */
export function categoriaIconName(categoriaId, nombre) {
  const entry = resolveCategoria(categoriaId, nombre)
  return entry ? entry.iconName : DEFAULT_CATEGORIA.iconName
}

/**
 * Icono a pintar: si el admin define un url_icono propio se respeta (resuelto
 * contra el base del deploy); si no, se usa el nombre del catálogo local.
 */
export function resolveIcon(categoriaId, nombre, urlIcono) {
  if (urlIcono) return { name: 'aula', src: assetUrl(urlIcono) }
  return { name: categoriaIconName(categoriaId, nombre), src: undefined }
}

export { CATEGORIAS }