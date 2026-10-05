import { useCallback, useState } from 'react'
import SearchInput from './SearchInput.jsx'
import AssetIcon from '../icons/AssetIcon.jsx'

export default function TopBar({
  onBack,
  currentPiso,
  sedeName,
  searchLocations,
  onSearchResult,
  onRouteClick,
  originName,
  destName,
  routeActive
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

  const handleRouteClick = useCallback(() => {
    if (!query.trim()) {
      onRouteClick(null)
      return
    }
    const results = searchLocations ? searchLocations(query.trim()) : []
    const firstMatch = Array.isArray(results) && results.length > 0 ? results[0] : null
    onRouteClick(firstMatch)
  }, [query, onRouteClick, searchLocations])

  return (
    <header className="safe-t z-40 flex-shrink-0 border-b border-white/[0.06] bg-ink-950/85 backdrop-blur-xl">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
        <button
          onClick={onBack}
          className="btn btn-ghost chamfer-sm h-10 w-10 shrink-0 text-slate-400 hover:text-white"
          aria-label="Volver al inicio"
        >
          <AssetIcon name="back" className="h-[18px] w-[18px]" />
        </button>

        {currentPiso && (
          <nav className="hidden shrink-0 items-center gap-1.5 lg:flex" aria-label="Ubicación actual">
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

        {routeActive ? (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <button
              type="button"
              onClick={handleRouteClick}
              className="chamfer-sm field min-w-0 flex-1 truncate py-2.5 text-left text-[13px]"
            >
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" aria-hidden="true" />
                <span className="truncate">{originName || 'Origen'}</span>
              </span>
            </button>

            <AssetIcon name="route" className="h-3.5 w-3.5 shrink-0 text-slate-600" />

            <button
              type="button"
              onClick={handleRouteClick}
              className="chamfer-sm field min-w-0 flex-1 truncate py-2.5 text-left text-[13px]"
            >
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal-400" aria-hidden="true" />
                <span className="truncate">{destName || 'Destino'}</span>
              </span>
            </button>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <SearchInput
              placeholder="Buscar aula, baño, oficina…"
              onSelect={handleSearchSelect}
              searchFn={searchLocations}
              value={query}
              onChange={setQuery}
            />
          </div>
        )}

        <button
          onClick={handleRouteClick}
          className="btn btn-primary chamfer-sm h-10 shrink-0 px-3 text-[13px] sm:px-4"
          aria-label="Calcular ruta"
          title="Cómo llegar"
        >
          <AssetIcon name="route" className="h-4 w-4" />
          <span className="hidden sm:inline">Cómo llegar</span>
        </button>
      </div>
    </header>
  )
}