import AssetIcon from '../icons/AssetIcon.jsx'

/* Estado de carga del plano. Se muestra centrado en el escenario, no en la
   barra inferior: el aviso de "Escaneando" quedaba fuera del campo de visión
   del usuario mientras mira el mapa. */
export default function MapSkeleton({ isScanning }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center" aria-hidden="true">
      <div className="flex flex-col items-center gap-3">
        <div
          className="chamfer-sm relative h-16 w-24 overflow-hidden border border-white/10 bg-ink-900/80"
        >
          <div className="blueprint-grid absolute inset-0 opacity-60" />
          <div
            className="absolute inset-y-0 w-1/3"
            style={{
              backgroundImage:
                'linear-gradient(90deg, transparent, rgba(245,158,11,0.22), transparent)',
              animation: 'scan-sweep 1.4s linear infinite'
            }}
          />
        </div>
        <span className="chip chamfer-sm gap-2 border-brand-400/25 text-brand-300">
          {isScanning ? (
            <>
              <span className="scan-dot h-1.5 w-1.5 rounded-full bg-brand-400" />
              Escaneando plano
            </>
          ) : (
            <>
              <AssetIcon name="restart" className="h-3 w-3" />
              Cargando planta
            </>
          )}
        </span>
      </div>
    </div>
  )
}