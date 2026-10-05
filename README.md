# GeoUBV — Mapa Universitario Interactivo

Sistema de navegación digital para la Universidad Bolivariana de Venezuela (UBV). Permite a estudiantes, docentes y visitantes ubicar aulas, laboratorios, oficinas y servicios dentro del edificio principal, visualizar mapas por piso y calcular rutas entre ubicaciones. Funciona como PWA offline.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS v4, PWA |
| Backend | Node.js, Express |
| Base de datos | Archivos JSON (`server/geodata/*.json`) |
| Autenticación | JWT + bcryptjs |
| Pathfinding | A* sobre grilla generada desde PNG del mapa via Web Worker |

## Estructura del proyecto

```
GeoUBV/
├── client/                 # Frontend React + Vite
│   ├── public/
│   │   ├── assets/
│   │   │   ├── icons/          # SVGs de botones y categorías (22 archivos)
│   │   │   └── maps/           # PNG de pisos (sótano, piso1, piso2)
│   │   └── mapdata.json        # Árbol de datos generado por el backend
│   └── src/
│       ├── components/
│       │   ├── icons/          # Componentes SVG (ButtonIcons.jsx)
│       │   └── map/            # 13 componentes del mapa
│       ├── hooks/              # 4 hooks principales
│       ├── pages/              # LandingPage + MapPage
│       └── workers/            # Web Worker de escaneo de mapa
├── server/                 # Backend Express
│   ├── src/
│   │   ├── index.js        # API REST (toda la lógica de rutas)
│   │   ├── db.js           # JSON database helper
│   │   ├── auth.js         # JWT sign/verify + middlewares
│   │   ├── logger.js       # Auditoría de operaciones admin
│   │   └── mapdata.js      # Generador de mapdata.json
│   └── geodata/            # Datos persistentes (7 archivos JSON)
├── cambios.md              # Registro histórico de cambios
└── GeminiAgentRules.md     # Contexto para agentes de IA
```

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install --prefix client
npm install --prefix server
```

## Desarrollo

Inicia frontend y backend simultáneamente:

```bash
npm run dev
```

O por separado:

```bash
npm run dev:client   # http://localhost:5173
npm run dev:server   # http://localhost:3001
```

## Producción

```bash
npm run build:client
npm run start:server
```

El servidor sirve el build del frontend en `client/dist/`.

## Funcionalidades principales

- **Mapa interactivo**: zoom, arrastre, pellizco multi-touch
- **3 pisos**: Sótano, Piso 1, Piso 2 con planos reales
- **Búsqueda**: ubica rápidamente aulas, baños, oficinas, etc.
- **Rutas**: cálculo A* entre dos ubicaciones en el mismo piso o entre pisos
- **13 categorías**: Aula, Baño Mujeres/Hombres, Biblioteca, Cafetería, Comedor, Coordinación, Entrada, Escaleras, Gym, Laboratorio, Oficina, Salud
- **Modo administrador**: CRUD de ubicaciones sobre el mapa
- **PWA offline**: funciona sin conexión, instalable en el dispositivo
- **Marcadores responsive**: tamaño adaptativo con `clamp()` + `vw`
- **Labels solo al 120%+ de zoom**: nombres visibles solo al acercar lo suficiente
