# GeoUBV

## Stack
- Frontend: React 19 + Vite 8 + Tailwind v4 + PWA. Sin backend Node; todo corre en navegador.
- Hosting: GitHub Pages (build estático `client/dist/`).
- Datos/auth: GitHub REST API (`api.github.com`) → JSON en `geodata/` del repo.
- Offline: Service Worker cachea `mapdata.json` + assets.
- Pathfinding: A* sobre grilla de caminabilidad generada desde PNG del mapa, en Web Worker.

## Estructura (`client/src/`)
- `services/`: `github.js` (fetch wrapper; constantes `REPO_OWNER`, `REPO_NAME`), `auth.js` (validación PAT, sesión), `crud.js` (CRUD sobre `geodata/*.json`)
- `hooks/`: `useMapData.js` (carga y cachea datos del mapa), `useFloorManager.js`, `useMapLoader.js`, `useRouteManager.js`
- `components/map/` (TopBar, BottomToolbar, etc.), `components/icons/` (SVG)
- `pages/`: `LandingPage.jsx`, `MapPage.jsx`
- `workers/mapScanner.worker.js`
- `App.jsx`, `App.css`, `main.jsx`, `index.css`

## Auth (PAT GitHub)
- Validación: `GET https://api.github.com/user` con token. Permiso PAT requerido: `repo`.
- Almacenamiento: `localStorage` key `geoubv_admin_token` → activa modo admin. Token inválido → error.

## CRUD GitHub Contents
- Lectura: `GET /repos/{owner}/{repo}/contents/geodata/{archivo}.json` → `{content: "<base64>", sha}` → `atob(content)` + `JSON.parse()`.
- Escritura: `PUT` misma ruta, body `{message, content: btoa(JSON.stringify(data, null, 2)), sha}`.
- `mapdata.json` se calcula en el frontend: fusión sedes → edificios → pisos → habitaciones.

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
`geodata/{sede,edificio,piso,habitacion,categoria}.json` en el repo GitHub.

## Convenciones
- Cambios pequeños y localizados; evitar refactors amplios.
- No hardcodear tokens ni secretos.
- No modificar `temp-repo/` salvo instrucción explícita.
- Comentarios en código solo si aportan contexto técnico complejo.
- Modular: cada módulo con una única responsabilidad.
- Git: commits atómicos con mensajes descriptivos.

## Rate limits
GitHub API: 5.000 req/h con token autenticado; el CRUD de pocas entidades es suficiente. Si hay rate limit: esperar 1 h o usar otro token.
