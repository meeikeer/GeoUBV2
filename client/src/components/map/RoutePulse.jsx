/* Extremos de la ruta, en estilo retro.

   El trazo se dibuja una sola vez en el canvas. Aquí solo viven los dos
   elementos que se mueven: un ping en el origen y un galope en la punta del
   destino. Son elementos DOM pequeños y animan con steps() en el compositor.

   Antes el trazo entero se redibujaba en un bucle de requestAnimationFrame
   infinito, dos pasadas de polilínea por frame sobre un canvas que el compositor
   reescala a miles de píxeles: eso invalidaba el plano en cada frame y el
   arrastre se trababa. */
export default function RoutePulse({ ends }) {
  if (!ends?.from || !ends?.to) return null

  const [fx, fy] = ends.from
  const [tx, ty] = ends.to

  // Redondear: 0.58 * 100 da 57.99999999999999, y eso en el DOM produce
  // posicionamiento subpíxel y jitter en el pulso.
  const pct = v => `${Math.round(v * 10000) / 100}%`
  const angleDeg = Math.round(((ends.angle * 180) / Math.PI) * 10) / 10

  return (
    <div aria-hidden="true">
      {/* Origen: ping que se expande */}
      <div
        className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
        style={{ left: pct(fx), top: pct(fy) }}
      >
        <span className="route-ping block h-4 w-4 rounded-full border-2 border-signal-400" />
      </div>

      {/* Destino: galope de la punta de flecha */}
      <div
        className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
        style={{ left: pct(tx), top: pct(ty), rotate: `${angleDeg}deg` }}
      >
        <span className="route-blink block border-y-[6px] border-l-[10px] border-y-transparent border-l-signal-300" />
      </div>
    </div>
  )
}