import { useState, useEffect, useCallback } from 'react'
import AssetIcon from '../icons/AssetIcon.jsx'

const STEPS = [
  {
    icon: 'restart',
    title: 'Mueve el mapa',
    text: 'Arrastra con un dedo para desplazarte. Pellizca para acercar o alejar.'
  },
  {
    icon: 'search',
    title: 'Busca cualquier lugar',
    text: 'Escribe en la barra superior el nombre de un aula, baño u oficina.'
  },
  {
    icon: 'route',
    title: 'Traza una ruta',
    text: 'Toca "Cómo llegar", elige origen y destino, y el mapa te muestra el camino.'
  },
  {
    icon: 'pin',
    title: 'Toca los marcadores',
    text: 'Toca cualquier rombo del plano para ver el nombre del espacio al instante.'
  }
]

const STORAGE_KEY = 'geoubv_onboarding_done'

export default function OnboardingOverlay({ onDone }) {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
  }, [])

  const handleDone = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
    onDone?.()
  }, [onDone])

  if (!visible) return null

  const s = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink-950/85 backdrop-blur-sm" aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Guía de uso"
        className="panel-glass chamfer-top sm:chamfer relative w-full max-w-sm shadow-2xl shadow-black/80 animate-sheet-up sm:animate-pop-in"
      >
        <div className="px-6 pb-6 pt-7">
          <div className="flex items-start justify-between gap-4">
            <span className="chamfer grid h-14 w-14 shrink-0 place-items-center bg-brand-400/12 text-brand-400">
              <AssetIcon name={s.icon} className="h-6 w-6" />
            </span>
            <span className="chip chamfer-sm mt-1 font-mono text-slate-500">
              {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
            </span>
          </div>

          <h2 className="mt-5 font-display text-xl font-bold text-white">{s.title}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{s.text}</p>

          {/* Progreso segmentado */}
          <div className="mt-6 flex gap-1.5" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 transition-colors duration-300 ${
                  i <= step ? 'bg-brand-400' : 'bg-white/10'
                }`}
              />
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="btn btn-outline chamfer-sm px-5 py-3 text-[13px]"
              >
                Atrás
              </button>
            )}

            {isLast ? (
              <button onClick={handleDone} className="btn btn-primary chamfer-sm flex-1 py-3 text-[13px]">
                Empezar a explorar
              </button>
            ) : (
              <button
                onClick={() => setStep(step + 1)}
                className="btn btn-primary chamfer-sm flex-1 py-3 text-[13px]"
              >
                Siguiente
              </button>
            )}
          </div>

          <button
            onClick={handleDone}
            className="mt-3 w-full py-2 text-[11px] text-slate-600 transition-colors hover:text-slate-400"
          >
            Omitir guía
          </button>
        </div>
      </div>
    </div>
  )
}