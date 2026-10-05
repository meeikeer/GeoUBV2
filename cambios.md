# Registro de Cambios y Plan de Implementación

Este documento contiene el plan de implementación de las tareas abordadas durante esta sesión, el detalle de los cambios efectuados (modificaciones, adiciones y eliminaciones) y los puntos críticos a tener en cuenta para el mantenimiento futuro.

---

## 1. Plan de Implementación de la Sesión

### Diagnóstico Inicial
1. **Redundancia en Módulos de Rutas**: La aplicación contaba con archivos heredados (`routeModal.js` y `routeSearch.js`) que fueron reemplazados por un módulo unificado (`routeManager.js`). Sin embargo, seguían siendo importados en el punto de entrada principal (`app.js`) y cacheables en el Service Worker.
2. **Latencia Crítica en A***: La implementación de búsqueda de caminos en `MapLoader.aStar` presentaba problemas de rendimiento graves debidos a:
   - Complejidad $O(N)$ en la búsqueda del nodo de menor costo del conjunto abierto.
   - Complejidad $O(N)$ para verificar la existencia de vecinos usando `openSet.some()`.
   - Alta presión sobre el Garbage Collector por el formateo constante de Strings para claves de diccionarios (`Map`) y asignación dinámica de objetos de coordenadas.

### Estrategia de Solución
- **Fase de Limpieza**: Desvincular y eliminar físicamente los archivos sin uso para reducir el peso de descarga de la PWA.
- **Fase de Optimización de A***:
  - Cambiar el sistema de coordenadas a un array plano unidimensional de tamaño `cols * rows` indexado por `index = x + y * cols`.
  - Reemplazar los objetos `Map` de JS por arreglos tipados (`Float32Array`, `Int32Array`, `Uint8Array`) para obtener accesos y búsquedas instantáneas en $O(1)$.
  - Implementar un **Binary Min-Heap** plano para que la cola de prioridad reduzca la complejidad de inserción y extracción a $O(\log N)$.
  - Medir y registrar el tiempo de cálculo de A* en consola para asegurar una latencia menor a 1ms.

---

## 2. Cambios, Borrados y Adiciones Realizados

### Archivos Eliminados (Borrados)
- `[DELETE]` [routeModal.js](file:///c:/Users/USER/Desktop/Danielfhgd.github.io-main/scripts/modules/routeModal.js): Código redundante de control de modal.
- `[DELETE]` [routeSearch.js](file:///c:/Users/USER/Desktop/Danielfhgd.github.io-main/scripts/modules/routeSearch.js): Código redundante de autocompletado y validación de inputs.
- `[DELETE]` [config.js](file:///c:/Users/USER/Desktop/Danielfhgd.github.io-main/scripts/config.js): Archivo de configuración obsoleto no importado.

### Archivos Modificados
1. **[app.js](file:///c:/Users/USER/Desktop/Danielfhgd.github.io-main/scripts/app.js)**:
   - Se removieron los imports sin uso de `RouteModal` y `RouteSearch`.
2. **[service-worker.js](file:///c:/Users/USER/Desktop/Danielfhgd.github.io-main/service-worker.js)**:
   - Se actualizaron las referencias de caché eliminando los módulos borrados de `urlsToCache`.
   - Se incrementó la constante de versión de la aplicación a `APP_VERSION = '1.0.15'` para invalidar el almacenamiento del caché viejo en los navegadores cliente y forzar su actualización automática.
3. **[mapLoader.js](file:///c:/Users/USER/Desktop/Danielfhgd.github.io-main/scripts/modules/mapLoader.js)**:
   - Se reescribió por completo la función `aStar` usando la optimización de Min-Heap e indexación 1D con Typed Arrays.
   - Se agregaron temporizadores de consola (`console.time('A* Pathfinding')`) en `drawRouteFromCoords` para facilitar el análisis del rendimiento del algoritmo.

---

## 3. Cosas Importantes a Tener en Cuenta

### Cache y Service Worker
> [!IMPORTANT]
> El Service Worker de esta PWA está configurado con una estrategia de **Cache First** para scripts y estilos. Cualquier modificación futura que realices en el código requiere que incrementes la versión `APP_VERSION` en la cabecera de `service-worker.js` (línea 5). Si no lo haces, los navegadores de los usuarios seguirán cargando la versión guardada previamente en su almacenamiento local.

### Geometría y Bloqueo de Esquinas
El algoritmo optimizado conserva de forma estricta las siguientes reglas de negocio del mapa original:
- **Costo de Paredes**: Las paredes tienen un valor de coste fijo de `999`. Cualquier nodo que registre este coste es ignorado.
- **Bloqueo Diagonal de Esquinas**: Para impedir que la ruta "atraviese" esquinas de paredes en diagonal, se valida que si un vecino es diagonal, los dos lados ortogonales adyacentes no sean paredes (`999`).
- **Formato del Camino**: El camino de salida se entrega como un arreglo de objetos `{ x, y }` ordenados desde el destino hasta el origen, lo que garantiza la compatibilidad total con el renderizador animado de la ruta en pantalla.
