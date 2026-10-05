import AssetIcon from '../icons/AssetIcon.jsx'

/* Planta esquemática del Piso 1 calcada sobre client/src/assets/Mapa-Piso1.png.
   El plano original es simétrico respecto de x = 720.5, así que el ala derecha
   y las torres son el mismo trazo espejado. Solo se dibuja el núcleo central. */

const HALL_TREADS = [124, 128, 132, 136, 140, 144, 148, 152, 156, 160, 164, 168, 172, 176]
const STAIR_TREADS = [190, 194, 198, 202, 206, 210, 214, 218, 222, 226, 230, 234, 238, 242, 246]

/* Muros portantes: bloques laterales, torres de escalera y jambas del acceso */
const WALLS = [
  'M565 187V352',
  'M565 187H630',
  'M630 187V259',
  'M565 284H630',
  'M630 269V313',
  'M630 323V352',
  'M876 187V352',
  'M876 187H811',
  'M811 187V259',
  'M876 284H811',
  'M811 269V313',
  'M811 323V352',
  'M651 118V329',
  'M660 118V199',
  'M684 118V199',
  'M790 118V329',
  'M781 118V199',
  'M757 118V199',
  'M651 354H660V393',
  'M651 354V393',
  'M781 354H790V393',
  'M781 354V393'
]

/* Bancos de ascensores: dos celdas anchas y tres shafts estrechas por lado */
const LIFTS = [
  'M659 175H696M696 175V199M696 199H659M659 199V175',
  'M684 175V199M688 175V199M692 175V199',
  'M745 175H782M782 175V199M782 199H745M745 199V175',
  'M749 175V199M753 175V199M757 175V199'
]

/* Escaleras: huellas de los tramos altos y de los bajos */
const STAIRS = [
  ...HALL_TREADS.map((y) => `M660 ${y}H684`),
  ...HALL_TREADS.map((y) => `M757 ${y}H781`),
  ...STAIR_TREADS.map((y) => `M631 ${y}H651`),
  ...STAIR_TREADS.map((y) => `M790 ${y}H810`),
  'M631 251H651',
  'M790 251H810'
]

/* Baños: cada aparato es una barra fina colgada del muro, y el muro del pasillo
   central se abre en cuatro vanos de puerta */
const RESTROOMS = [
  'M675 227V301',
  'M675 227H694V231H675',
  'M675 249H694V253H675',
  'M675 273H694V277H675',
  'M675 297H694V301H675',
  'M765 227V301',
  'M765 227H746V231H765',
  'M765 249H746V253H765',
  'M765 273H746V277H765',
  'M765 297H746V301H765',
  'M696 174V232M696 245V258M696 270V283M696 296V325',
  'M745 174V232M745 245V258M745 270V283M745 296V325'
]

/* Ala horizontal: doble línea del muro cortafuego y la alcoba lateral derecha */
const WING = ['M540 352H631M540 354H631', 'M809 352H940M809 354H940', 'M811 380H840M840 380V393']

/* Eje del corredor, en punteado tenue */
const CORRIDOR_AXIS = ['M545 380H649', 'M663 380H779']

/* Traza ortogonal de la ruta entre dos Salas, tal como la devuelve el worker */
const ROUTE = 'M597 310V318H641V341H797V318H843'

const MARKERS = [
  { id: 'aula', icon: 'aula', x: 597, y: 310, tone: 'text-brand-400' },
  { id: 'escaleras', icon: 'escaleras', x: 641, y: 219, tone: 'text-slate-300' },
  { id: 'biblioteca', icon: 'biblioteca', x: 843, y: 318, tone: 'text-signal-400' }
]

function Layer({ children, width, opacity, dash, cap = 'butt' }) {
  return (
    <path
      d={children.join(' ')}
      fill="none"
      stroke="#fff"
      strokeWidth={width}
      strokeOpacity={opacity}
      strokeLinecap={cap}
      strokeLinejoin="round"
      strokeDasharray={dash}
    />
  )
}

function Marker({ icon, x, y, tone }) {
  return (
    <foreignObject x={x - 13} y={y - 13} width="26" height="26" overflow="hidden">
      <div className={`marker-pin chamfer-sm grid h-[26px] w-[26px] rotate-45 place-items-center ${tone}`}>
        <AssetIcon name={icon} className="h-[13px] w-[13px] -rotate-45" />
      </div>
    </foreignObject>
  )
}

export default function MiniMap() {
  return (
    <div className="relative">
      <div className="chamfer chamfer-lg panel relative overflow-hidden">
        <div className="blueprint-grid absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="vignette absolute inset-0" aria-hidden="true" />

        {/* Planta del piso 1 */}
        <div className="relative aspect-[4/3] w-full sm:aspect-[16/11]">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="540 118 400 275"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <Layer width="2" opacity="0.17">
              {WALLS}
            </Layer>
            <Layer width="1.2" opacity="0.15">
              {LIFTS}
            </Layer>
            <Layer width="1" opacity="0.13">
              {STAIRS}
            </Layer>
            <Layer width="1.3" opacity="0.15">
              {RESTROOMS}
            </Layer>
            <Layer width="1.2" opacity="0.17">
              {WING}
            </Layer>
            <Layer width="1" opacity="0.09" dash="6 5">
              {CORRIDOR_AXIS}
            </Layer>

            {/* Trazo de ruta */}
            <g fill="none" stroke="#f59e0b" strokeLinecap="round" strokeLinejoin="round">
              <path d={ROUTE} strokeWidth="6" strokeOpacity="0.14" />
              <path d={ROUTE} strokeWidth="2" strokeOpacity="0.6" strokeDasharray="7 5" />
            </g>

            {MARKERS.map((m) => (
              <Marker key={m.id} {...m} />
            ))}
          </svg>

          {/* Chip de piso */}
          <div className="absolute right-3 top-3 chip chamfer chamfer-sm bg-ink-950/80">
            <span className="text-brand-400">Piso</span>
            <span className="font-mono text-slate-100">1</span>
          </div>

          {/* Chip de ruta activa */}
          <div className="absolute bottom-3 left-3 chamfer chamfer-sm border border-signal-400/30 bg-ink-950/85 px-3 py-1.5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-100">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-400" />
              A-204 → B-118
            </div>
            <div className="mt-0.5 pl-3.5 font-mono text-[10px] text-slate-500">1 min · 84 m</div>
          </div>
        </div>
      </div>
    </div>
  )
}