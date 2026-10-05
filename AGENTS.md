# GeoUBV

## Stack
- Frontend: React 19 + Vite 8 + Tailwind v4 + PWA. Sin backend Node; todo corre en navegador.
- Hosting: GitHub Pages (build estático `client/dist/`).
- Serverless: sin backend propio. El frontend lee los datos del bundle y solo
  escribe en GitHub cuando hay un admin autenticado.
- Offline: Service Worker cachea los PNG (precache) y `mapdata.json`
  (StaleWhileRevalidate). El mapa se usa sin conexión desde la primera visita.
- Pathfinding: A* sobre grilla de caminabilidad generada desde PNG del mapa, en Web Worker.

## Modelo de datos (fuente de verdad y origen de cada lectura)
- **Lectura del visitante:** nunca usa la API. Sale de `client/public/mapdata.json`,
  que viaja en el bundle y se regenera con `node scripts/generate-mapdata.mjs`.
- **Escritura:** solo el admin, vía GitHub API, que commitea `geodata/*.json`.
- `geodata/*.json` es la fuente de verdad. `mapdata.json` es su foto aplanada
  para el arranque offline, no una fuente independiente.

### Cascada de carga (`hooks/useMapData.js`)
1. `localStorage` (`geoubv_mapdata`) → instantáneo, sin parpadeo.
2. `mapdata.json` del bundle → red; da el offline de primera visita y refresca.
3. API de GitHub → **solo si hay token**. Último recurso, no fuente normal.

El token decide si se puede *actualizar*, nunca si se puede *mostrar*.
`lib/mapDataShape.js` normaliza las dos formas del bundle (anidada y plana) al
mismo shape, para que ninguna ruta dependa de cuál se leyó.

## Estructura (`client/src/`)
- `services/`: `github.js` (fetch wrapper; constantes `REPO_OWNER`, `REPO_NAME`), `auth.js` (validación PAT, sesión), `crud.js` (CRUD sobre `geodata/*.json`)
- `hooks/`: `useMapData.js` (cascada de carga), `useFloorManager.js`, `useMapLoader.js`, `useRouteManager.js`, `usePanZoom.js`, `useToast.js`
- `lib/`: `assets.js` (rutas de assets y tamaños de PNG), `categorias.js` (catálogo de las 13), `framing.js` (matemática de encuadre), `mapDataShape.js` (normalización del bundle)
- `components/map/` (TopBar, BottomToolbar, MapStage, etc.), `components/ui/` (Sheet), `components/icons/` (SVG)
- `pages/`: `LandingPage.jsx`, `MapPage.jsx`
- `workers/mapScanner.worker.js`
- `App.jsx`, `App.css`, `main.jsx`, `index.css`

## Scripts (raíz del repo)
- `node scripts/generate-mapdata.mjs` → regenera `client/public/mapdata.json` desde `geodata/`. Ejecutar antes de cada build/deploy.
- `node scripts/seed-geodata.mjs` → siembra `geodata/` desde un bundle anidado. De una sola vez; aborta si ya hay datos salvo `--force`.

## Auth (PAT GitHub)
- Validación: `GET https://api.github.com/user` con token. Permiso PAT requerido: `repo`.
- Almacenamiento: `localStorage` key `geoubv_admin_token` → activa modo admin. Token inválido → error.
- `MapPage` revalida el token al montar: si caducó, limpia la sesión y oculta la UI admin.

## CRUD GitHub Contents
- Lectura: `GET /repos/{owner}/{repo}/contents/geodata/{archivo}.json` → `{content: "<base64>", sha}` → `atob(content)` + `JSON.parse()`.
- Escritura: `PUT` misma ruta, body `{message, content: btoa(JSON.stringify(data, null, 2)), sha}`.
- El `sha` obliga a leer justo antes de escribir: si el archivo cambió, GitHub rechaza el `PUT`.
- Cada `PUT` genera un commit. El admin edita por interfaz, nunca el JSON a mano.
- `mapdata.json` se genera **antes del deploy**, no en runtime.

## Escritura y refresco
- `crud.readCollection` es API pública: la usan `AdminPanel` (pestañas pisos,
  edificios, categorías) y `MapPage` (listado de ubicaciones).
- Para el admin, `useMapData` lee **primero la API de GitHub** y usa
  `mapdata.json` como red de seguridad. Motivo: `mapdata.json` es estático y no
  refleja el `PUT` recién hecho, así que refrescar solo desde el bundle
  revertiría en pantalla lo recién escrito.
- El visitante no cambia: nunca toca la API.

## Despliegue
- **Deploy from a branch**: rama `main`, carpeta **`/docs`**.
- `npm run build` genera `client/dist/` y copia a `docs/` con `.nojekyll`
  (scripts/publish-docs.mjs).
- Los datos (`geodata/*.json`) se publican directamente desde `raw.githubusercontent.com`,
  así que un cambio hecho por el admin (commit vía Contents API) queda visible
  al instante, sin rebuild ni redespliegue.
- El código solo necesita redespliegue cuando cambia `.jsx`, `.css`, `.html`, etc.
- `npm run lint` vive en la raíz y delega en `client/`.

## Config
- `client/src/services/github.js` apunta a `meeikeer/GeoUBV2`. Si el repo se
  clona o se renombra, hay que actualizar `REPO_OWNER` y `REPO_NAME`.

## Modelo de datos
- `sede`: id_sede, nom_sede
- `edificio`: id_edificio, nom_edificio, id_sede_fk
- `piso`: id_piso, num_piso, display, nom_piso, url_map, id_edificio_fk
- `habitacion`: id_habitacion, nom_codigo, coord_x, coord_y (0-1 norm.), id_piso_fk, id_categoria_fk, es_conexion, nom_conexion
- `categoria`: id_categoria, nom_categoria, url_icono
- Coordenadas siempre normalizadas 0-1.

## Categorías (13)
1 Aula, 2 Baño Mujeres, 3 Baño Hombres, 4 Biblioteca, 5 Cafeteria, 6 Comedor, 7 Coordinación, 8 Entrada, 9 Escaleras, 10 Gym, 11 Laboratorio, 12 Oficina, 13 Salud

## Mapas
`client/public/assets/maps/`: `mapa-sotano.png` (Sótano), `mapa-piso1.png`, `mapa-piso2.png`

## Geodata
`geodata/{sede,edificio,piso,habitacion,categoria}.json` en la raíz del repo.
Fuente de verdad. El admin los escribe vía API; `scripts/generate-mapdata.mjs`
los aplana a `client/public/mapdata.json` para el bundle.

## Convenciones
- Cambios pequeños y localizados; evitar refactors amplios.
- No hardcodear tokens ni secretos.
- No modificar `temp-repo/` salvo instrucción explícita.
- Comentarios en código solo si aportan contexto técnico complejo.
- Modular: cada módulo con una única responsabilidad.
- Git: commits atómicos con mensajes descriptivos.

## Rate limits
- Con token: 5.000 req/h. El CRUD de pocas entidades es suficiente.
- Sin token (lectura de repo público): 60 req/h por IP. El visitante no llega a
  consumirlos, porque no usa la API para leer.

## Fuera de alcance
- Seguridad del token (decisión pendiente del usuario).
- Cambios en GitHub, despliegue o repositorio.
- PNG subibles por el admin sin redespliegue: hoy van embebidos en el bundle.
  Para eso habría que sacarlos de `client/public/assets/maps/` a una ruta
  servida por red.
