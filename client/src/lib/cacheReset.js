/* Vaciado de caché a petición del usuario (botón "Recargar caché").

   Ctrl+F5 solo salta la caché HTTP: no toca las cachés del Service Worker
   (precache + runtime) ni el instantáneo de datos en localStorage, así que el
   SW sigue sirviendo el build anterior. Este módulo limpia las tres capas y
   fuerza la comprobación de un build nuevo, de modo que el reload posterior
   re-descarga todo desde red. Es la versión móvil (y más completa) del
   Ctrl+F5. */

// Instantáneo de datos del mapa (primera fuente de useMapData). El token de
// admin y el onboarding viven en claves distintas y NO se borran aquí.
export const MAPDATA_KEY = 'geoubv_mapdata_v2'

/** Vacía Cache Storage y el localStorage de datos, y pide actualización al SW. */
export async function resetAppCache() {
  // 1. Cache Storage del SW: precache de Workbox + todas las runtime
  //    (mapas, mapdata.json, geodata, API de GitHub).
  if (typeof caches !== 'undefined') {
    const keys = await caches.keys()
    await Promise.all(keys.map(key => caches.delete(key)))
  }

  // 2. Instantáneo de datos. Si storage no está disponible (modo privado)
  //    no hay nada que borrar, seguimos.
  try {
    localStorage.removeItem(MAPDATA_KEY)
  } catch {
    // cuota o storage bloqueado: el vaciado de cachés ya cubre la recarga
  }

  // 3. Comprobar si hay un build nuevo publicado. Con registerType autoUpdate
  //    el SW nuevo se instala y activa solo (skipWaiting) y el reload de
  //    después lo coge. En dev no hay SW o falla la petición: el vaciado de
  //    las cachés ya es suficiente, así que el error se ignora.
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(reg => reg.update().catch(() => {})))
    } catch {
      // entorno sin SW accesible: nada que actualizar
    }
  }
}
