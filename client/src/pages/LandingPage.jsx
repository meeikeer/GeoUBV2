import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginPanel from '../components/map/LoginPanel.jsx'
import AssetIcon from '../components/icons/AssetIcon.jsx'
import { login } from '../services/auth.js'

const DIRECTORY = [
  { icon: 'aula', label: 'Aulas' },
  { icon: 'laboratorio', label: 'Laboratorios' },
  { icon: 'biblioteca', label: 'Biblioteca' },
  { icon: 'coordinacion', label: 'Coordinación' },
  { icon: 'oficina', label: 'Oficinas' },
  { icon: 'cafeteria', label: 'Cafetería' },
  { icon: 'comedor', label: 'Comedor' },
  { icon: 'gym', label: 'Gimnasio' },
  { icon: 'salud', label: 'Salud' },
  { icon: 'banoMujeres', label: 'Baño mujeres' },
  { icon: 'banoHombres', label: 'Baño hombres' },
  { icon: 'escaleras', label: 'Escaleras' },
  { icon: 'entrada', label: 'Entradas' }
]

const CAPABILITIES = [
  {
    icon: 'search',
    title: 'Buscador con autosuggest',
    text: 'Escribe dos letras y el sistema propone aulas, baños y oficinas con su categoría y piso.'
  },
  {
    icon: 'route',
    title: 'Rutas entre pisos',
    text: 'A* sobre la grilla de caminabilidad calcula el camino más corto y encadena escaleras entre niveles.'
  },
  {
    icon: 'restart',
    title: 'Mapa sin conexión',
    text: 'El plano y los datos se cachean con la PWA: funciona en sótanos y zonas sin cobertura.'
  },
  {
    icon: 'list',
    title: 'Edición abierta',
    text: 'Con un token de GitHub el personal actualiza el directorio sin tocar código ni redesplegar.'
  }
]

function BrandMark({ size = 'md' }) {
  const box = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11'
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <div className={`chamfer chamfer-sm grid ${box} place-items-center bg-brand-400 text-ink-950`}>
      <AssetIcon name="pin" className={icon} />
    </div>
  )
}

function MiniMap() {
  return (
    <div className="relative">
      <div className="chamfer chamfer-lg panel relative overflow-hidden">
        <div className="blueprint-grid absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="vignette absolute inset-0" aria-hidden="true" />

        {/* Planta esquemática */}
        <div className="relative aspect-[4/3] w-full sm:aspect-[16/11]">
          <div className="absolute inset-[8%] border border-white/10" aria-hidden="true">
            <div className="absolute left-0 top-0 h-[38%] w-[46%] border-b border-r border-white/10" />
            <div className="absolute right-0 top-0 h-[38%] w-[38%] border-b border-l border-white/10" />
            <div className="absolute bottom-0 left-0 h-[34%] w-[62%] border-r border-t border-white/10" />
            <div className="absolute bottom-0 right-0 h-[34%] w-[30%] border-l border-t border-white/10" />
            <div className="absolute left-[46%] top-0 h-[38%] w-[16%] border-x border-white/10" />
            <div className="absolute left-0 top-[38%] h-[28%] w-full border-y border-dashed border-white/[0.07]" />
          </div>

          {/* Marcadores */}
          {[
            { l: '26%', t: '32%', icon: 'aula', tone: 'text-brand-400' },
            { l: '68%', t: '26%', icon: 'biblioteca', tone: 'text-signal-400' },
            { l: '46%', t: '72%', icon: 'escaleras', tone: 'text-slate-300' }
          ].map((m, i) => (
            <div
              key={i}
              className="absolute"
              style={{ left: m.l, top: m.t, transform: 'translate(-50%, -50%)' }}
            >
              <div className={`marker-pin chamfer-sm h-7 w-7 rotate-45 ${m.tone}`}>
                <AssetIcon name={m.icon} className="h-3.5 w-3.5 -rotate-45" />
              </div>
            </div>
          ))}

          {/* Trazo de ruta */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M26 32 L46 40 L46 62 L68 26"
              fill="none"
              stroke="rgba(245,158,11,0.5)"
              strokeWidth="0.7"
              strokeDasharray="2.5 2"
              vectorEffect="non-scaling-stroke"
            />
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

function LandingPage() {
  const navigate = useNavigate()
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [enteringSystem, setEnteringSystem] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleEnterSystem = useCallback(() => {
    if (enteringSystem) return
    setEnteringSystem(true)
    setTimeout(() => {
      setEnteringSystem(false)
      navigate('/mapa')
    }, 420)
  }, [enteringSystem, navigate])

  const handleLogin = useCallback(
    async (token) => {
      setLoginError('')
      try {
        await login(token)
        setLoginOpen(false)
        setEnteringSystem(true)
        setTimeout(() => {
          setEnteringSystem(false)
          navigate('/mapa')
        }, 320)
      } catch (err) {
        setLoginError(err.message || 'Token inválido')
        throw new Error(err.message)
      }
    },
    [navigate]
  )

  const handleOpenLogin = useCallback(() => {
    setLoginError('')
    setLoginOpen(true)
  }, [])

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-ink-950 text-slate-200">
      <div className="blueprint-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="vignette pointer-events-none absolute inset-0" aria-hidden="true" />

      <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-6">
          <a href="/" className="flex items-center gap-3 no-tap-highlight">
            <BrandMark />
            <div className="leading-none">
              <div className="font-display text-[17px] font-bold tracking-tight text-white">GeoUBV</div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.24em] text-slate-500">
                Mapa del campus
              </div>
            </div>
          </a>

          <div className="flex items-center gap-2">
            {isOffline && (
              <span className="chip chamfer chamfer-sm hidden border-amber-500/30 bg-amber-500/10 text-amber-300 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-breathe" />
                Sin conexión
              </span>
            )}
            <button
              onClick={handleOpenLogin}
              className="btn btn-ghost chamfer chamfer-sm h-10 px-3 text-[13px] sm:px-4"
            >
              <AssetIcon name="logout" className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </button>
            <button
              onClick={handleEnterSystem}
              disabled={enteringSystem}
              className="btn btn-primary chamfer chamfer-sm h-10 px-4 text-[13px] sm:px-5"
            >
              {enteringSystem ? 'Abriendo…' : 'Abrir mapa'}
            </button>
          </div>
        </div>
      </header>

      <main className="relative flex-grow">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div className="animate-fade-rise">
              <div className="chip chamfer chamfer-sm border-brand-400/25 text-brand-300">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-breathe" />
                Cartografía del campus
              </div>

              <h1 className="mt-6 font-display text-[2.1rem] font-extrabold leading-[1.08] text-white sm:text-5xl lg:text-[3.4rem]">
                Deja de preguntar
                <br />
                <span className="relative inline-block text-brand-400">
                  dónde queda eso
                  <span className="absolute -bottom-1 left-0 h-[3px] w-full bg-brand-500/40" aria-hidden="true" />
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-slate-400 sm:text-base">
                GeoUBV dibuja cada piso del edificio y calcula el camino más corto entre
                aula, laboratorio o biblioteca. Funciona también sin internet.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={handleEnterSystem}
                  disabled={enteringSystem}
                  className="btn btn-primary chamfer h-12 px-7 text-sm"
                >
                  <AssetIcon name="pin" className="h-4 w-4" />
                  {enteringSystem ? 'Abriendo…' : 'Entrar al mapa'}
                </button>
                <button
                  onClick={handleOpenLogin}
                  className="btn btn-outline chamfer h-12 px-7 text-sm"
                >
                  <AssetIcon name="list" className="h-4 w-4" />
                  Gestión de ubicaciones
                </button>
              </div>

              <dl className="mt-10 flex items-stretch gap-6 border-t border-white/[0.06] pt-6 sm:gap-10">
                {[
                  ['3', 'pisos mapeados'],
                  ['13', 'categorías'],
                  ['0', 'registros']
                ].map(([n, l]) => (
                  <div key={l}>
                    <dt className="font-display text-2xl font-bold text-white">{n}</dt>
                    <dd className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate-500">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="animate-fade-rise lg:pl-4" style={{ animationDelay: '0.12s' }}>
              <MiniMap />
            </div>
          </div>
        </section>

        {/* ── Directorio ───────────────────────────────────── */}
        <section className="border-y border-white/[0.06] bg-ink-900/40">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 sm:py-20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
                  Directorio de espacios
                </h2>
                <p className="mt-2 max-w-md text-sm text-slate-400">
                  Trece categorías indexadas en el mapa. Cada una con su icono y su color de
                  señalización.
                </p>
              </div>
              <span className="chip chamfer chamfer-sm self-start font-mono text-slate-400">
                13 / 13 activas
              </span>
            </div>

            <ul className="stagger mt-9 grid grid-cols-2 gap-px overflow-hidden border border-white/[0.06] bg-white/[0.05] sm:grid-cols-3 lg:grid-cols-5">
              {DIRECTORY.map((item) => (
                <li
                  key={item.label}
                  className="group flex items-center gap-3 bg-ink-900 px-3.5 py-4 transition-colors duration-200 hover:bg-ink-850 sm:px-4"
                >
                  <span className="text-slate-500 transition-colors duration-200 group-hover:text-brand-400">
                    <AssetIcon name={item.icon} className="h-5 w-5" />
                  </span>
                  <span className="text-[13px] font-medium text-slate-300 transition-colors duration-200 group-hover:text-white">
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Capacidades ──────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
                Capacidades
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
                Todo lo que hace GeoUBV, sin vueltas. De la búsqueda al cálculo de ruta, en el
                navegador.
              </p>
              <div className="mt-6 hidden h-px w-24 bg-gradient-to-r from-brand-500/60 to-transparent lg:block" />
            </div>

            <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
              {CAPABILITIES.map((c, i) => (
                <li key={c.title} className="group relative">
                  <div className="flex items-start gap-4 py-5 sm:gap-6 sm:py-6">
                    <span className="mt-0.5 font-mono text-xs text-slate-600 transition-colors duration-200 group-hover:text-brand-500">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-base font-semibold text-slate-100 transition-colors duration-200 group-hover:text-white sm:text-lg">
                        {c.title}
                      </h3>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500 sm:text-sm">
                        {c.text}
                      </p>
                    </div>
                    <span className="mt-0.5 hidden text-slate-600 transition-all duration-300 group-hover:text-brand-400 sm:block">
                      <AssetIcon name={c.icon} className="h-5 w-5" />
                    </span>
                  </div>
                  <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-brand-500/50 transition-transform duration-400 group-hover:scale-x-100" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-white/[0.06] bg-ink-950">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-5 px-5 py-9 sm:flex-row sm:px-6">
          <div className="flex items-center gap-3">
            <BrandMark size="sm" />
            <span className="font-display text-sm font-bold text-slate-300">GeoUBV</span>
          </div>
          <p className="text-center text-xs text-slate-600 sm:text-right">
            Proyecto académico · Datos abiertos en GitHub
          </p>
        </div>
      </footer>

      <LoginPanel
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={handleLogin}
        error={loginError}
        isOffline={isOffline}
      />
    </div>
  )
}

export default LandingPage