import { forwardRef } from 'react'
import { mapUrl, mapIntrinsic } from '../../lib/assets.js'

/* El plano, su marco y el escenario que lo rodea.
   El PNG es blanco sobre un tema grafito: sin marco ni fondo se leia como una
   plancha suelta flotando en el vacio. Aqui se le da fondo de replano
   (blueprint-grid + vignette), borde, sombra y el tratamient justo para que no
   deslumbre, conservando el chaflan como identidad.

   El plano no lleva max-width: antes se capaba al ancho natural del PNG, que
   en pantallas grandes lo dejaba pequeno. El encuadre lo gobierna usePanZoom,
   que siempre escala desde el tamaño natural.

   Marcadores y overlay van como hermanos del marco (no dentro) porque el marco
   recorta con overflow-hidden y se los comeria. */
const MapStage = forwardRef(function MapStage(
  { piso, planeRef, imgRef, canvasRef, onImageLoad, addingMode, children },
  stageRef
) {
  const intrinsic = mapIntrinsic(piso)
  const url = mapUrl(piso)

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
        style={{ transformOrigin: 'center center' }}
      >
        <div
          className="chamfer relative bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/10"
          style={{ filter: 'brightness(0.96) contrast(1.04)', lineHeight: 0 }}
        >
          <img
            ref={imgRef}
            id="map-image"
            src={url || undefined}
            alt={piso ? `Planta de ${piso.nom_piso}` : 'Planta del edificio'}
            draggable={false}
            decoding="async"
            width={intrinsic?.w || undefined}
            height={intrinsic?.h || undefined}
            className="block h-auto w-full"
            style={{
              ...(intrinsic ? { aspectRatio: `${intrinsic.w} / ${intrinsic.h}` } : null),
              /* El PNG es un plano de líneas de 1 px y se muestra bastante por
                 encima de su tamaño natural. Reescalado se ve borroso; con
                 pixelated los bloques quedan nítidos y el plano se lee como un
                 zoom de CAD. */
              imageRendering: 'pixelated'
            }}
            onLoad={onImageLoad}
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