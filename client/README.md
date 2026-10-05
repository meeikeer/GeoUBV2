# GeoUBV — Frontend

Aplicación React 19 + Vite 8 + Tailwind CSS v4 con soporte PWA para el mapa interactivo universitario.

## Stack

- **React 19** con hooks funcionales
- **Vite 8** para build y desarrollo
- **Tailwind CSS v4** para estilos
- **React Router v7** para navegación cliente
- **PWA** via `vite-plugin-pwa` con Workbox (CacheFirst para mapas, NetworkFirst para API)
- **SSL** local via `@vitejs/plugin-basic-ssl`
- **Oxlint** para linting

## Estructura

```
client/src/
├── main.jsx                          # Entry point, BrowserRouter
├── App.jsx                           # Routes: / y /mapa
├── index.css                         # Tailwind imports
├── pages/
│   ├── LandingPage.jsx               # Página de aterrizaje + login admin
│   ├── MapPage.jsx                   # Página principal del mapa (590 líneas)
│   └── MapPage.css                   # Estilos específicos del mapa
├── components/
│   ├── icons/
│   │   └── ButtonIcons.jsx           # 9 componentes SVG: Back, Ubication, Delete, Restart, Signout, List, Edit, Calculate, Search
│   └── map/
│       ├── TopBar.jsx                # Barra superior: búsqueda + breadcrumb + botón ruta
│       ├── BottomToolbar.jsx         # Barra inferior fija: pisos + zoom (desktop) + acciones
│       ├── ZoomControls.jsx          # Sistema de zoom/arrastre/pellizco con inercia
│       ├── FloorControls.jsx         # Navegación entre pisos (anterior/siguiente)
│       ├── SearchInput.jsx           # Input de búsqueda con resultados y categorías
│       ├── RoutePanel.jsx            # Panel modal para seleccionar origen/destino
│       ├── StatusBar.jsx             # Barra de estado con mensajes contextuales
│       ├── AdminToolbar.jsx          # Toolbar admin: agregar/lista/salir
│       ├── LocationListPanel.jsx     # Panel lateral con lista de ubicaciones CRUD
│       ├── LocationForm.jsx          # Formulario para crear/editar ubicaciones
│       ├── LoginPanel.jsx            # Panel de login admin + hook useAdminAuth
│       ├── OnboardingOverlay.jsx     # Tutorial inicial de 3 pasos
│       └── AdminOfflineOverlay.jsx   # Overlay cuando admin está sin conexión
├── hooks/
│   ├── useMapData.js                 # Carga de datos con caché localStorage + fallback
│   ├── useFloorManager.js            # Estado de piso actual y navegación
│   ├── useMapLoader.js               # Carga de imagen, Web Worker, A*, canvas
│   └── useRouteManager.js            # Lógica de rutas simples y multi-piso
├── workers/
│   └── mapScanner.worker.js          # Web Worker: escanea PNG → grilla de caminabilidad
└── assets/                           # (no usado directamente)
```

## Rutas del Frontend

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/` | `LandingPage` | Landing page con información del proyecto y login admin |
| `/mapa` | `MapPage` | Mapa interactivo principal |

## Hooks Principales

### useMapData
- Carga datos del mapa desde `/api/mapdata`, con fallback a `/mapdata.json`
- Cachea en `localStorage` bajo clave `geoubv_mapdata`
- Retorna datos aplanados: sedes, edificios, pisos, habitaciones, categorías, y `allLocations` (ubicaciones no conexión con coords normalizadas)
- Métodos: `getPisoById`, `getHabitacionesByPiso`, `getCategoriaById`, `refreshMapData`

### useFloorManager
- Ordena pisos por `num_piso`
- Estado: `currentPiso`, `currentFloorIndex`, `canGoUp`, `canGoDown`
- Acciones: `goUp`, `goDown`, `setFloor`

### useMapLoader
- Carga la imagen del piso en un `<img>` y redimensiona un `<canvas>` overlay al tamaño natural del PNG
- Envía los píxeles al Web Worker que genera la grilla de caminabilidad
- Algoritmo A* optimizado: heap binario con typed arrays (Float32Array, Int32Array, Uint8Array), conectividad 8-direccional con bloqueo de esquinas
- Dibuja la ruta animada en el canvas (línea discontinua roja + flecha final)
- Cachea rutas calculadas por piso en `routeCacheRef`

### useRouteManager
- Búsqueda textual de ubicaciones por nombre o piso
- `calculateRoute`: calcula ruta entre dos ubicaciones (mismo piso → directa, distinto piso → multi-piso con escaleras)
- `continueRoute`: redibuja el tramo correspondiente al cambiar de piso en rutas multi-piso
- Búsqueda de escaleras: por `nom_conexion` específico (ej: `escalera_piso_2`), genérico, o la más cercana

## ZoomControls (sistema de navegación del mapa)

- Transformación CSS: `translate(-50%, -50%) translate3d(x, y, 0) scale(zoom)` sobre `[data-map-element="true"]`
- Zoom mínimo: 0.5 (50%), máximo: 8
- Paso de zoom: 0.4
- Inercia con fricción (0.94) para arrastre suave
- Soporte: rueda del ratón, arrastre con mouse, pellizco multi-touch
- `fitToScreen`: ajusta zoom para que el mapa completo quepa en el contenedor (factor 0.85)
- Animación vía `requestAnimationFrame` con interpolación (lerp) suave

## Marcadores en el Mapa

- Posicionados como `absolute` con coordenadas porcentuales dentro del contenedor del mapa
- Tamaño base responsive: `clamp(14px, 2.5vw, 34px)` para iconos SVG de categoría
- Labels visibles solo cuando `currentZoom > 1.2` (120%+)
- `markerScale = Math.min(1, 1.2 / currentZoom)`:
  - Por debajo de 120%: escala = 1, el marcador crece/encoge con el mapa
  - Desde 120% en adelante: escala inversa al zoom, el marcador mantiene tamaño constante en pantalla
- Iconos: `<img>` con rutas SVG desde `CATEGORY_ICONS` (13 categorías mapeadas a `categ-*.svg`)
- Labels: `text-[clamp(9px,0.8vw,12px)]` con fondo semitransparente y borde
- Zoom flotante en mobile: botones +/−/reset en esquina superior izquierda

## Iconos

### Botones del sistema (componentes React)
`ButtonIcons.jsx` exporta 9 componentes: `BackIcon`, `UbicationIcon`, `DeleteIcon`, `RestartIcon`, `SignoutIcon`, `ListIcon`, `EditIcon`, `CalculateIcon`, `SearchIcon`. Usan SVGs inline desde `client/public/assets/icons/button-*.svg`.

### Categorías del mapa (SVGs inline)
Las 13 categorías se renderizan como `<img>` con URL a `client/public/assets/icons/categ-*.svg`. Mapeo en `MapPage.jsx` (`CATEGORY_ICONS`) y `SearchInput.jsx` (`CATEGORY_ICONS` por ID numérico).

## Categorías (13)

| ID | Nombre | Archivo SVG |
|----|--------|-------------|
| 1 | Aula | `categ-classroom.svg` |
| 2 | Baño Mujeres | `categ-womans.svg` |
| 3 | Baño Hombres | `categ-mans.svg` |
| 4 | Biblioteca | `categ-library.svg` |
| 5 | Cafeteria | `categ-coffeeshop.svg` |
| 6 | Comedor | `categ-food.svg` |
| 7 | Coordinación | `categ-coordination.svg` |
| 8 | Entrada | `categ-entrance.svg` |
| 9 | Escaleras | `categ-stairs.svg` |
| 10 | Gym | `categ-gym.svg` |
| 11 | Laboratorio | `categ-laboratory.svg` |
| 12 | Oficina | `categ-office.svg` |
| 13 | Salud | `categ-health.svg` |

## Administración

- Token JWT guardado en `localStorage` como `geoubv_admin_token`
- Login desde `LandingPage` vía `LoginPanel`
- Toolbar admin (esquina superior derecha del mapa): agregar ubicación, lista CRUD, cerrar sesión
- Formulario para crear/editar ubicaciones con campos: nombre, categoría, piso, coordenadas, es conexión
- Panel lateral de lista con agrupación por piso, edición y eliminación

## PWA

- Registro automático con `vite-plugin-pwa`
- Estrategia de caché: NetworkFirst para `/api/mapdata`, CacheFirst para assets de mapas
- Precarga de: favicon, mapdata.json, PNG de mapas
- Service Worker generado automáticamente por Workbox
- Instalable como standalone en dispositivos móviles

## Scripts

```bash
npm run dev      # Servidor de desarrollo Vite
npm run build    # Build producción
npm run lint     # Oxlint
npm run preview  # Preview del build
```

## Categorías del servidor (geodata)

El archivo `server/geodata/categoria.json` contiene las categorías de la base de datos persistente. NOTA: actualmente contiene las 7 categorías originales (Aula, Baño, Coordinación, Escalera, Entrada, Servicio, PFG). Los mapeos del frontend usan 13 categorías definitivas por ID numérico. Si se sincroniza, el servidor debe actualizar `categoria.json` para reflejar las 13 categorías.
