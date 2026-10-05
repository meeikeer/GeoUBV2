import { useId, useState } from 'react'

const PROBLEMS = [
  {
    id: 'desorientacion',
    title: 'No se sabe dónde está cada aula',
    text: 'Cada carrera ocupa distintas aulas y los horarios cambian cada cuatrimestre. El nombre del salón no dice en qué piso queda ni por dónde se entra, así que llegar a tiempo depende de que alguien te acompañe o te guíe por teléfono.'
  },
  {
    id: 'desactualizacion',
    title: 'La información de los espacios se queda vieja',
    text: 'Un laboratorio cierra por mantenimiento, un salón cambia de actividad y otro se reserva para otra carrera. Lo que se averiguó el mes pasado ya no es cierto, y los avisos de las puertas no siempre se actualizan.'
  },
  {
    id: 'busquedas',
    title: 'Se pierde tiempo preguntando',
    text: 'Preguntar «¿dónde queda el salón X?» le hace perder tiempo a quien pregunta y a quien responde. Como los turnos entre clases son cortos, cada búsqueda mal orientada se come el descanso o hace llegar tarde a la actividad siguiente.'
  },
  {
    id: 'intermediarios',
    title: 'La ubicación depende de personas, no de un lugar público',
    text: 'El salón de siempre está en la memoria del personal de vigilancia o en el historial de un grupo de mensajes. Si no se conoce a esa persona, no hay forma de averiguar: la información no está publicada en un lugar al que cualquiera pueda acudir.'
  },
  {
    id: 'conexion',
    title: 'Sin internet, las soluciones digitales dejan de servir',
    text: 'Un mapa que solo funciona en línea se apaga cuando hay poca señal, y en la institución hay sótanos, garajes y pasillos donde la señal se pierde. Justo en esos lugares es cuando más hace falta saber a dónde ir.'
  }
]

function Chevron({ className = '' }) {
  return (
    <svg
      className={`h-4 w-4 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export default function ProblemSection() {
  const [openId, setOpenId] = useState(PROBLEMS[0].id)
  const baseId = useId()

  const toggle = (id) => setOpenId((current) => (current === id ? null : id))

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 sm:py-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="chip chamfer chamfer-sm border-signal-400/25 text-signal-300">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-400 animate-breathe" />
            El problema
          </div>
          <h2 className="mt-5 font-display text-2xl font-bold text-white sm:text-3xl">
            ¿Qué problema resuelve GeoUBV?
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
            Cinco problemas concretos de la vida diaria en la institución, con lo que cuesta cada
            uno. Desplegá cada punto para ver el detalle.
          </p>
        </div>
        <span className="chip chamfer chamfer-sm self-start font-mono text-slate-400">
          5 problemas
        </span>
      </div>

      <ul className="stagger mt-9 space-y-3">
        {PROBLEMS.map((problem, i) => {
          const isOpen = openId === problem.id
          const buttonId = `${baseId}-btn-${problem.id}`
          const panelId = `${baseId}-panel-${problem.id}`

          return (
            <li
              key={problem.id}
              className={`panel chamfer transition-colors duration-200 ${
                isOpen ? 'bg-ink-850' : 'hover:bg-ink-850'
              }`}
            >
              <h3>
                <button
                  id={buttonId}
                  type="button"
                  onClick={() => toggle(problem.id)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="flex w-full items-start gap-4 px-4 py-4 text-left sm:gap-6 sm:px-6 sm:py-5"
                >
                  <span
                    className={`mt-0.5 font-mono text-xs transition-colors duration-200 ${
                      isOpen ? 'text-brand-400' : 'text-slate-600'
                    }`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`min-w-0 flex-1 font-display text-[15px] font-semibold transition-colors duration-200 sm:text-lg ${
                      isOpen ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    {problem.title}
                  </span>
                  <span
                    className={`mt-0.5 shrink-0 transition-all duration-300 ${
                      isOpen ? 'rotate-180 text-brand-400' : 'text-slate-600'
                    }`}
                  >
                    <Chevron />
                  </span>
                </button>
              </h3>

              {isOpen && (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="animate-fade-in border-t border-white/[0.06] px-4 pb-5 pt-4 sm:px-6 sm:pb-6"
                >
                  <p className="pl-8 text-[13px] leading-relaxed text-slate-400 sm:pl-10 sm:text-sm">
                    {problem.text}
                  </p>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {/* ── Para qué ─────────────────────────────────────── */}
      <div className="panel-glass chamfer mt-4 flex flex-col gap-4 p-6 sm:p-8">
        <div className="border-l-2 border-brand-500 pl-4 sm:pl-5">
          <h3 className="font-display text-base font-semibold text-white sm:text-lg">
            Para qué existe este mapa
          </h3>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-400 sm:text-sm">
            Reúne en un solo lugar la información que hoy está repartida entre planos, avisos y
            personas: dónde está cada espacio, en qué piso se encuentra y qué camino se sigue para
            llegar. Quien abre el mapa —con o sin internet— obtiene la ubicación y la ruta en el
            momento, sin depender de que otra persona lo acompañe o le responda un mensaje. De la
            orientación que se transmite de boca en boca a una orientación que cualquiera puede
            verificar por sí mismo.
          </p>
        </div>
      </div>
    </section>
  )
}
