import { useCallback, useState } from 'react'
import SearchInput from './SearchInput.jsx'
import AssetIcon from '../icons/AssetIcon.jsx'
import CacheReloadButton from '../ui/CacheReloadButton.jsx'

/* La barra superior. La búsqueda se queda siempre visible: antes, al haber ruta
   activa, el input se sustituía por dos chips y el usuario perdía justo la
   función que necesita para cambiar de destino. El estado de ruta vive en el
   RouteBanner, sobre el plano. */
export default function TopBar({
  onBack,
  currentPiso,
  sedeName,
  searchLocations,
  onSearchResult,
  onRouteClick,
  onHelpClick
}) {
  const [query, setQuery] = useState('')

  const breadcrumb = currentPiso
    ? [sedeName || 'GeoUBV', currentPiso.nom_edificio, currentPiso.nom_piso].filter(Boolean)
    : ['GeoUBV']

  const handleSearchSelect = useCallback(
    (item) => {
      setQuery(item.name)
      onSearchResult?.(item)
    },
    [onSearchResult]
  )

  return (
    <header className="safe-t z-40 flex-none border-b border-white/[0.06] bg-ink-950/85 backdrop-blur-xl">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          className="btn btn-ghost chamfer-sm h-10 w-10 shrink-0 text-slate-400 hover:text-white"
          aria-label="Volver al inicio"
        >
          <AssetIcon name="back" className="h-[18px] w-[18px]" />
        </button>

        {currentPiso && (
          <nav
            className="hidden shrink-0 items-center gap-1.5 lg:flex"
            aria-label="Ubicación actual"
          >
            {breadcrumb.map((part, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-slate-700">/</span>}
                <span
                  className={`max-w-[10rem] truncate text-[11px] uppercase tracking-[0.1em] ${
                    i === breadcrumb.length - 1 ? 'text-brand-400' : 'text-slate-500'
                  }`}
                >
                  {part}
                </span>
              </span>
            ))}
          </nav>
        )}

        <div className="min-w-0 flex-1">
          <SearchInput
            id="topbar-search"
            placeholder="Buscar aula, baño, oficina…"
            onSelect={handleSearchSelect}
            searchFn={searchLocations}
            value={query}
            onChange={setQuery}
          />
        </div>

        {/* Visible también en móvil: el botón de ayuda no lo está, y la
            caché vieja es justo el problema del teléfono. */}
        <CacheReloadButton className="btn btn-ghost chamfer-sm grid h-10 w-10 shrink-0 place-items-center text-slate-400 hover:text-white" />

        <button
          type="button"
          onClick={onHelpClick}
          className="btn btn-ghost chamfer-sm hidden h-10 w-10 shrink-0 text-slate-400 hover:text-white sm:grid sm:place-items-center"
          aria-label="Ver la guía de uso"
          title="Guía de uso"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.1 9a3 3 0 1 1 4.2 2.7c-.8.4-1.3 1.1-1.3 2v.3M12 17.5h.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onRouteClick}
          className="btn btn-primary chamfer-sm h-10 shrink-0 px-3 text-[13px] sm:px-4"
          title="Cómo llegar"
        >
          <AssetIcon name="route" className="h-4 w-4" />
          <span className="hidden sm:inline">Cómo llegar</span>
          <span className="sr-only sm:hidden">Calcular ruta</span>
        </button>
      </div>
    </header>
  )
}