# GeoUBV

Mapa digital interactivo de la Universidad Bolivariana de Venezuela. Permite a estudiantes, docentes y visitantes ubicar aulas, laboratorios, oficinas y servicios dentro del edificio, recorrer cada piso y calcular rutas entre ubicaciones. Funciona como PWA, sin conexión y sin backend propio.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS v4, React Router 7 |
| PWA | `vite-plugin-pwa` (precache de mapas, runtime cache de datos) |
| Datos | Archivos JSON versionados en el repo (`geodata/*.json`) |
| Escritura | GitHub Contents API, solo para el admin autenticado |
| Pathfinding | A* sobre grilla de caminabilidad en Web Worker |
| Hosting | GitHub Pages, build estático desde `client/dist/` |

No hay servidor: todo corre en el navegador. El visitante lee del bundle; el admin escribe contra el repo con su token.

## Estructura

```
GeoUBV2/
├── client/                         # Frontend React + Vite
│   ├── public/
│   │   ├── assets/icons/           # SVGs de botones y categorías
│   │   ├── assets/maps/            # PNG de los pisos (sótano, 1, 2)
│   │   ├── mapdata.json            # Datos aplanados, incluidos en el bundle
│   │   └── pwa-*.png               # Iconos de la PWA
│   └── src/
│       ├── components/landing/     # Hero, sección de problemas, minimapa
│       ├── components/map/         # Mapa, marcadores, toolbar, panel admin
│       ├── components/ui/          # Sheet reutilizable
│       ├── components/icons/       # Componentes SVG
│       ├── hooks/                  # Datos, pisos, carga, rutas, pan/zoom, toasts
│       ├── lib/                    # Assets, categorías, encuadre, shape de datos
│       ├── pages/                  # LandingPage, MapPage
│       ├── services/               # github.js, auth.js, crud.js
│       └── workers/                # Escaneo del mapa + A*
├── geodata/                        # Fuente de verdad (5 JSON)
├── scripts/
│   ├── generate-mapdata.mjs        # geodata/ -> client/public/mapdata.json
│   └── seed-geodata.mjs            # Siembra geodata/ desde un bundle anidado
├── AGENTS.md                       # Contexto técnico del proyecto
└── package.json                    # Scripts que delegan en client/
```

## Puesta en marcha

```bash
npm install          # instala las dependencias del cliente
npm run dev          # servidor de desarrollo con HTTPS local
npm run build        # genera client/dist/
npm run preview      # sirve el build para probarlo
npm run lint         # oxlint
```

## Datos: fuente de verdad y lectura

`geodata/*.json` es la fuente de verdad. `client/public/mapdata.json` es su foto aplanada para el arranque offline, no una fuente independiente: se regenera antes de cada deploy.

```bash
node scripts/generate-mapdata.mjs
```

La cascada de carga del frontend (`client/src/hooks/useMapData.js`) es:

1. `localStorage` (`geoubv_mapdata`) → instantáneo, sin parpadeo.
2. `mapdata.json` del bundle → red; da el offline de primera visita y refresca.
3. API de GitHub → solo si hay token de admin. Último recurso.

El token decide si se puede *actualizar*, nunca si se puede *mostrar*.

### Modelo de datos

| Colección | Campos |
|-----------|--------|
| `sede` | `id_sede`, `nom_sede` |
| `edificio` | `id_edificio`, `nom_edificio`, `id_sede_fk` |
| `piso` | `id_piso`, `num_piso`, `display`, `nom_piso`, `url_map`, `id_edificio_fk` |
| `habitacion` | `id_habitacion`, `nom_codigo`, `coord_x`, `coord_y`, `id_piso_fk`, `id_categoria_fk`, `es_conexion`, `nom_conexion` |
| `categoria` | `id_categoria`, `nom_categoria`, `url_icono` |

Las coordenadas van normalizadas de 0 a 1. El catálogo tiene 13 categorías: Aula, Baño Mujeres, Baño Hombres, Biblioteca, Cafetería, Comedor, Coordinación, Entrada, Escaleras, Gym, Laboratorio, Oficina y Salud.

## Modo administrador

El admin edita por interfaz, nunca el JSON a mano: cada cambio genera un commit en `geodata/*.json` a través de la Contents API.

- Autenticación: `GET https://api.github.com/user` con un Personal Access Token de alcance `repo`.
- Sesión: `localStorage`, clave `geoubv_admin_token`.
- Escritura: `PUT /repos/meeikeer/GeoUBV2/contents/geodata/{archivo}.json`, leyendo el `sha` justo antes de escribir. Si el archivo cambió, GitHub rechaza el `PUT`.

El PAT nunca se escribe en el código: lo introduce el admin en el panel de login.

## Mapas y pathfinding

Los PNG de `client/public/assets/maps/` son la fuente visual. `client/src/workers/mapScanner.worker.js` los escanea en el navegador para construir la grilla de caminabilidad, aísla el exterior del edificio y ejecuta A* sobre ella, con priority queue para evitar el costo cuadrático de una búsqueda lineal.

## Despliegue en GitHub Pages

1. `node scripts/generate-mapdata.mjs` para actualizar el bundle de datos.
2. `npm run build`.
3. Publicar `client/dist/`.

El build usa `base: './'` en `client/vite.config.js`, así que las rutas de assets resuelven contra el subpath real del deploy sin dar 404. El Service Worker precachea los PNG de los pisos y cachea `mapdata.json` con estrategia StaleWhileRevalidate: sirve la copia guardada al instante y trae la versión nueva en segundo plano cuando hay red.
