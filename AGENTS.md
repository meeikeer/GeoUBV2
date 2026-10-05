# GeoUBV — Guía del Proyecto

## Stack
- **Frontend**: React 19 + Vite 8 + Tailwind CSS v4 + PWA
- **Backend**: GitHub Pages (hosting) + GitHub REST API (datos y auth)
- **Persistencia**: Archivos JSON en `geodata/` del repositorio GitHub
- **Autenticación**: Personal Access Token (PAT) de GitHub
- **Pathfinding**: A* sobre grilla de caminabilidad generada desde PNG del mapa en un Web Worker

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                  GitHub Pages                        │
│              (Frontend estático)                     │
├─────────────────────────────────────────────────────┤
│  React 19 + Vite 8 + Tailwind v4 + PWA              │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  auth/      │  │  api/        │  │  map/      │ │
│  │  (GitHub    │  │  (GitHub     │  │  (Lógica   │ │
│  │   Token)    │  │   Contents)  │  │   mapa)    │ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
              GitHub REST API
              (api.github.com)
```

- **Solo frontend**: No hay servidor Node.js. Todo el código corre en el navegador.
- **GitHub Pages**: Hosting del build estático (`client/dist/`).
- **GitHub API**: Lectura/escritura de archivos JSON en el repositorio.
- **PWA**: Service Worker cachea `mapdata.json` y assets para funcionamiento offline.

## Estructura de Módulos

```
client/src/
├── services/
│   ├── github.js      ← Cliente base de GitHub API (fetch wrapper)
│   ├── auth.js        ← Validación de PAT, gestión de sesión
│   └── crud.js        ← Operaciones CRUD sobre geodata/*.json
├── hooks/
│   ├── useMapData.js  ← Carga y cachea datos del mapa
│   ├── useFloorManager.js
│   ├── useMapLoader.js
│   └── useRouteManager.js
├── components/
│   ├── map/           ← Componentes del mapa (TopBar, BottomToolbar, etc.)
│   └── icons/         ← Iconos SVG
├── pages/
│   ├── LandingPage.jsx
│   └── MapPage.jsx
├── workers/
│   └── mapScanner.worker.js
├── App.jsx
├── App.css
├── main.jsx
└── index.css
```

## Autenticación

- **Método**: Personal Access Token (PAT) de GitHub
- **Validación**: `GET https://api.github.com/user` con el token
- **Almacenamiento**: `localStorage` bajo `geoubv_admin_token`
- **Permisos requeridos en el PAT**: `repo` (para leer/escribir archivos)
- **Flujo**:
  1. Usuario ingresa PAT en el panel de login
  2. Se valida contra `GET /user`
  3. Token válido → se guarda en localStorage → modo admin activado
  4. Token inválido → se muestra error

## CRUD de Datos

- **Lectura**: `GET /repos/{owner}/{repo}/contents/geodata/{archivo}.json`
  - Respuesta: `{ content: "<base64>", sha: "<sha>" }`
  - Decodificar: `atob(content)` → `JSON.parse()`
- **Escritura**: `PUT /repos/{owner}/{repo}/contents/geodata/{archivo}.json`
  - Body: `{ message: "<commit>", content: "<base64>", sha: "<sha>" }`
  - Codificar: `btoa(JSON.stringify(data, null, 2))`
- **mapdata.json**: Se calcula en el frontend (fusión de sedes → edificios → pisos → habitaciones)

## Modelo de Datos

- **sede**: `id_sede, nom_sede`
- **edificio**: `id_edificio, nom_edificio, id_sede_fk`
- **piso**: `id_piso, num_piso, display, nom_piso, url_map, id_edificio_fk`
- **habitacion**: `id_habitacion, nom_codigo, coord_x, coord_y (0-1 normalizados), id_piso_fk, id_categoria_fk, es_conexion, nom_conexion`
- **categoria**: `id_categoria, nom_categoria, url_icono`
- Coordenadas normalizadas 0-1 para ubicaciones en el mapa

## Categorías (13)
1. Aula, 2. Baño Mujeres, 3. Baño Hombres, 4. Biblioteca, 5. Cafeteria, 6. Comedor, 7. Coordinación, 8. Entrada, 9. Escaleras, 10. Gym, 11. Laboratorio, 12. Oficina, 13. Salud

## Mapas Disponibles
- 3 pisos: Sótano (`mapa-sotano.png`), Piso 1 (`mapa-piso1.png`), Piso 2 (`mapa-piso2.png`) en `client/public/assets/maps/`

## Configuración del Repositorio

- **Owner**: Se define en `src/services/github.js` (constant `REPO_OWNER`)
- **Repo**: Se define en `src/services/github.js` (constant `REPO_NAME`)
- **Archivos geodata**: `geodata/sede.json`, `geodata/edificio.json`, `geodata/piso.json`, `geodata/habitacion.json`, `geodata/categoria.json`

## Convenciones

- Preferir cambios pequeños y localizados sobre refactors amplios
- No hardcodear tokens ni secretos en el código
- Coordenadas normalizadas 0-1 para ubicaciones
- No modificar `temp-repo/` salvo instrucción explícita
- Evitar comentarios innecesarios en el código; solo cuando aporten contexto técnico complejo
- Programación modular: cada módulo tiene una única responsabilidad
- Uso de Git para control de versiones: commits atómicos con mensajes descriptivos

## Rate Limits

- GitHub API: 5,000 requests/hora con token autenticado
- CRUD de pocas entidades → suficiente para uso normal
- En caso de rate limit: esperar 1 hora o usar token diferente
