import { forwardRef, useState } from 'react'
import { mapUrl, mapIntrinsic } from '../../lib/assets.js'

/* El plano, su marco y el escenario que lo rodea.
   El PNG es blanco sobre un tema grafito: sin marco ni fondo se leia como una
   plancha suelta flotando en el vacio. Aqui se le da fondo de replano
   (blueprint-grid + vignette), borde, sombra y el tratamiento justo para que no
   deslumbre, conservando el chaflan como identidad.

   El plano tiene tamaño FIJO en pixeles, el natural del PNG, y de ahi lo escala
   usePanZoom. Esto no es estetico: el encuadre se calcula con
   offsetWidth/offsetHeight del plano, y si el plano se ajusta al contenido
   (shrink-to-fit) el <img> con width:100% se resuelve contra un padre de ancho
   automatico y colapsaba a 195x82 en vez de 1376x580. Con eso cover salia de
   8.6x y el plano se veíacropado y disparatado. Fijar el tamano hace que 1 px
   de CSS equivalga a 1 px de la imagen a escala 1, que es lo que hace
   Significant pixelated y que el teto de ampliacion signifique algo.

   Marcadores y overlay van como hermanos del marco (no dentro) porque el marco
   recorta con overflow-hidden y se los comeria. */
const MapStage = forwardRef(function MapStage(
  { piso, planeRef, imgRef, canvasRef, onImageLoad, addingMode, children },
  stageRef
) {
  const manifest = mapIntrinsic(piso)
  // Si el PNG no esta en el manifiesto, se usa lo que reporte el navegador.
  const [natural, setNatural] = useState(null)
  const size = manifest || natural
  const url = mapUrl(piso)

  const handleLoad = e => {
    const img = e.target
    if (!manifest && img.naturalWidth) {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    }
    onImageLoad?.(e)
  }

  return (
    <div
      ref={stageRef}
      className="relative min-h-0 flex-1 overflow-hidden outline-none"
      style={{ cursor: addingMode ? 'crosshair' : undefined }}
    >
      {/* Fondo del escenario: evita que las bandas vacias se lean como un fallo */}
      <div className="blueprint-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
      <div className="vignette pointer-events-none absolute inset-0" aria-hidden="true" />

      <div
        ref={planeRef}
        className="absolute left-1/2 top-1/2"
        style={{
          transformOrigin: 'center center',
          width: size ? `${size.w}px` : undefined,
          height: size ? `${size.h}px` : undefined
        }}
      >
        <div
          className="chamfer relative h-full w-full bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/10"
          style={{ filter: 'brightness(0.96) contrast(1.04)', lineHeight: 0 }}
        >
          <img
            ref={imgRef}
            id="map-image"
            src={url || undefined}
            alt={piso ? `Planta de ${piso.nom_piso}` : 'Planta del edificio'}
            draggable={false}
            decoding="async"
            width={size?.w || undefined}
            height={size?.h || undefined}
            className="block h-full w-full"
            style={{
              ...(size ? { aspectRatio: `${size.w} / ${size.h}` } : null),
              /* El PNG es un plano de líneas de 1 px y se muestra bastante por
                 encima de su tamaño natural. Reescalado se ve borroso; con
                 pixelated los bloques quedan nítidos y el plano se lee como un
                 zoom de CAD. */
              imageRendering: 'pixelated'
            }}
            onLoad={handleLoad}
          />

          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ lineHeight: 'normal' }}
          />
        </div>

        {children}
      </div>
    </div>
  )
})

export default MapStage