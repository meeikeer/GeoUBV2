import { useState, useEffect, useCallback } from 'react'
import Sheet from '../ui/Sheet.jsx'
import AssetIcon from '../icons/AssetIcon.jsx'

const STEPS = [
  {
    icon: 'restart',
    title: 'Mueve el plano',
    text: 'Arrastra con un dedo para desplazarte. Pellizca para acercar o alejar.'
  },
  {
    icon: 'search',
    title: 'Busca cualquier lugar',
    text: 'Escribe en la barra superior el nombre de un aula, baño u oficina.'
  },
  {
    icon: 'pin',
    title: 'Toca un lugar',
    text: 'Toca cualquier rombo del plano y verás su ficha con la opción de pedir la ruta hasta ahí.'
  },
  {
    icon: 'route',
    title: 'Traza una ruta',
    text: 'Toca "Cómo llegar", elige origen y destino, y el plano te muestra el camino paso a paso.'
  }
]

const STORAGE_KEY = 'geoubv_onboarding_done'

/* Guia de uso. Se abre sola la primera vez y se puede volver a abrir desde el
   botón "?" de la barra superior: antes de cerrarse para siempre no habia
   manera de recuperarla. */
export default function OnboardingOverlay({ isOpen, onClose }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (isOpen) setStep(0)
  }, [isOpen])

  const finish = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {}
    onClose?.()
  }, [onClose])

  const visible =
    isOpen ?? (typeof localStorage !== 'undefined' && !localStorage.getItem(STORAGE_KEY))

  if (!visible) return null

  const s = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <Sheet
      isOpen
      onClose={finish}
      title={s.title}
      labelledBy="onboarding-title"
      closeLabel="Cerrar la guía"
      icon={<AssetIcon name={s.icon} className="h-4 w-4" />}
      footer={
        <div className="space-y-3">
          <div className="flex gap-1.5" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 transition-colors duration-300 ${
                  i <= step ? 'bg-brand-400' : 'bg-white/10'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="btn btn-outline chamfer-sm px-5 py-3 text-[13px]"
              >
                Atrás
              </button>
            )}

            <button
              type="button"
              onClick={() => (isLast ? finish() : setStep(step + 1))}
              className="btn btn-primary chamfer-sm flex-1 py-3 text-[13px]"
            >
              {isLast ? 'Empezar a explorar' : 'Siguiente'}
            </button>
          </div>

          <button
            type="button"
            onClick={finish}
            className="w-full py-1 text-[11px] text-slate-500 transition-colors hover:text-slate-300"
          >
            Saltar guía
          </button>
        </div>
      }
    >
      <div className="px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <span className="chamfer grid h-14 w-14 flex-none place-items-center bg-brand-400/12 text-brand-400">
            <AssetIcon name={s.icon} className="h-6 w-6" />
          </span>
          <span className="chip chamfer-sm mt-1 font-mono text-slate-500">
            {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
          </span>
        </div>

        <p className="mt-5 text-[13px] leading-relaxed text-slate-400">{s.text}</p>
      </div>
    </Sheet>
  )
}