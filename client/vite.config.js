import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  // GitHub Pages puede servir el build en un subpath (ej. /GeoUBV_v2/).
  // Con base relativa, src/lib/assets.js resuelve los '/assets/...' contra el
  // base real del deploy en lugar de dar 404.
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      // Los PNG van en precache: son inmutables dentro del build y asi estan
      // disponibles en la primera visita, sin depender de la red.
      // mapdata.json NO va aqui a proposito: en precache el service worker lo
      // serviria siempre desde la copia congelada del build y jamas podria
      // traer los cambios que el admin publique en el repo. Se cachea en
      // runtime (StaleWhileRevalidate) para que sirva de inmediato y se
      // actualice en segundo plano cuando haya red.
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'masked-icon.svg',
        'assets/maps/*.png'
      ],
      manifest: {
        id: '/',
        name: 'GeoUBV - Mapa Universitario Interactivo',
        short_name: 'GeoUBV',
        description: 'Mapa interactivo digital del edificio de la universidad, funcionando offline.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.github\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'geoubv-github-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /^\/assets\/maps\/.*\.(png|jpg|jpeg|webp|svg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'geoubv-maps-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },
          {
            // Datos del mapa: sirve la copia guardada al instante y pide una
            // version nueva en segundo plano. Es lo que permite que el
            // visitante se actualice sin token y sin redesplegar.
            urlPattern: /mapdata\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'geoubv-mapdata-cache',
              expiration: {
                maxEntries: 2,
                maxAgeSeconds: 60 * 60 * 24 * 7
              }
            }
          }
        ]
      }
    })
  ],
})
