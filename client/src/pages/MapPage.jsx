import { useRef, useEffect, useMemo, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMapData } from '../hooks/useMapData.js'
import { useFloorManager } from '../hooks/useFloorManager.js'
import { useMapLoader } from '../hooks/useMapLoader.js'
import { useRouteManager } from '../hooks/useRouteManager.js'
import { usePanZoom } from '../hooks/usePanZoom.js'
import { useToast } from '../hooks/useToast.js'
import { crud } from '../services/crud.js'
import { isAuthenticated, clearToken, getToken } from '../services/auth.js'
import { validateToken } from '../services/github.js'
import TopBar from '../components/map/TopBar.jsx'
import BottomToolbar from '../components/map/BottomToolbar.jsx'
import MapStage from '../components/map/MapStage.jsx'
import MapSkeleton from '../components/map/MapSkeleton.jsx'
import MapErrorState from '../components/map/MapErrorState.jsx'
import MapEmptyState from '../components/map/MapEmptyState.jsx'
import MapControls from '../components/map/MapControls.jsx'
import MarkerLayer from '../components/map/MarkerLayer.jsx'
import LocationCard from '../components/map/LocationCard.jsx'
import RouteBanner from '../components/map/RouteBanner.jsx'
import RoutePanel from '../components/map/RoutePanel.jsx'
import AdminToolbar from '../components/map/AdminToolbar.jsx'
import AdminPanel from '../components/map/AdminPanel.jsx'
import LocationForm from '../components/map/LocationForm.jsx'
import AdminOfflineOverlay from '../components/map/AdminOfflineOverlay.jsx'
import OnboardingOverlay from '../components/map/OnboardingOverlay.jsx'
import './MapPage.css'

const ORIGIN_MEMORY_KEY = 'geoubv_last_origin'
const LABEL_ZOOM = 1.2

export default function MapPage() {
  const navigate = useNavigate()
  const stageRef = useRef(null)
  const planeRef = useRef(null)

  const [routePanelOpen, setRoutePanelOpen] = useState(false)
  const [selectedOrigin, setSelectedOrigin] = useState(null)
  const [selectedDest, setSelectedDest] = useState(null)
  const [activeMarker, setActiveMarker] = useState(null)
  const [locationData, setLocationData] = useState([])
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine)

  const [isAdmin, setIsAdmin] = useState(() => isAuthenticated())
  const [addingMode, setAddingMode] = useState(false)
  const [pinCoords, setPinCoords] = useState(null)
  const [hintVisible, setHintVisible] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [formCoords, setFormCoords] = useState(null)
  const [onboardingOpen, setOnboardingOpen] = useState(false)

  const data = useMapData()
  const fm = useFloorManager(data.pisos)
  const ml = useMapLoader()
  const rm = useRouteManager(data.allLocations, data.habitaciones, fm.sortedPisos)
  const toast = useToast()

  const panZoom = usePanZoom({ containerRef: stageRef, planeRef })
  const { zoom } = panZoom

  const sedeName = data.sedes?.[0]?.nom_sede || 'GeoUBV'
  const currentPisoId = fm.currentPiso?.id_piso

  /* ---------------- datos ---------------- */

  const loadLocations = useCallback(async () => {
    setLocationLoading(true)
    try {
      setLocationData(await crud.readCollection('habitacion'))
    } catch {
      toast.warning('No se pudo leer la lista de ubicaciones')
    } finally {
      setLocationLoading(false)
    }
  }, [toast])

  const currentMapUrl = fm.currentPiso?.url_map

  useEffect(() => {
    if (!currentMapUrl) return
    ml.loadMap(currentMapUrl, fm.currentPiso.id_piso)
    // Cambiar de piso reencuadra: la planta nueva es otra imagen
    setActiveMarker(null)
    setPinCoords(null)
    // ml es un objeto estable created por el hook; se re-ejecuta solo con el piso
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMapUrl, fm.currentPiso?.id_piso])

  // Encuadre inicial: la planta llena el escenario una vez que la imagen tiene
  // tamaño medible.
  const handleImageLoad = useCallback(() => {
    panZoom.resetToCover()
  }, [panZoom])

  /* ---------------- rutas ---------------- */

  const { mapLoaded, grid } = ml
  const { currentRoute } = rm
  const currentFloorId = fm.currentPiso?.id_piso

  /* Un solo efecto redibuja la ruta cuando cambia el piso, la grilla o la ruta.
     Antes había dos efectos que llamaban a continueRoute, con lo que el estado
     de la ruta se pisaba a sí mismo. */
  useEffect(() => {
    if (!mapLoaded || !grid?.data?.length || !currentRoute) return

    if (currentRoute.type === 'multifloor') {
      rm.continueRoute(fm, ml)
      return
    }

    if (currentFloorId === currentRoute.pisoId) {
      ml.drawRoute(currentRoute.origin.coords, currentRoute.dest.coords)
    } else {
      ml.clearRoute()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, grid, currentRoute, currentFloorId])

  useEffect(() => {
    window.addEventListener('online', () => setIsOffline(false))
    window.addEventListener('offline', () => setIsOffline(true))
    return () => {
      window.removeEventListener('online', () => setIsOffline(false))
      window.removeEventListener('offline', () => setIsOffline(true))
    }
  }, [])

  useEffect(() => {
    if (!hintVisible) return
    const t = setTimeout(() => setHintVisible(false), 3000)
    return () => clearTimeout(t)
  }, [hintVisible])

  /* ---------------- marcadores ---------------- */

  const mapLocations = useMemo(() => {
    if (!data.allLocations || !currentPisoId) return []
    return data.allLocations.filter(item => item.pisoId === currentPisoId)
  }, [data.allLocations, currentPisoId])

  const entrances = useMemo(() => {
    if (!currentPisoId) return []
    return data.allLocations.filter(
      item => item.pisoId === currentPisoId && item.categoriaId === 8
    )
  }, [data.allLocations, currentPisoId])

  // Los marcadores se compensan del zoom para mantener tamaño constante en
  // pantalla. El mínimo evita que se vuelvan diminutos al alejar.
  const markerScale = Math.min(1, LABEL_ZOOM / Math.max(zoom, 0.01))
  const showAllLabels = zoom >= LABEL_ZOOM

  const activeCategoria = activeMarker ? data.getCategoriaById(activeMarker.categoriaId) : null

  /* ---------------- handlers ---------------- */

  const handleSelectOrigin = useCallback((item) => {
    setSelectedOrigin(item)
    try {
      localStorage.setItem(ORIGIN_MEMORY_KEY, item.id)
    } catch {}
  }, [])

  const handleSwapEnds = useCallback(() => {
    setSelectedOrigin((prev) => {
      setSelectedDest(prev)
      return prev
    })
  }, [])

  const handleCalculateRoute = useCallback(() => {
    if (!selectedOrigin || !selectedDest) {
      toast.warning('Selecciona origen y destino')
      return
    }
    if (selectedOrigin.id === selectedDest.id) {
      toast.warning('El origen y el destino no pueden ser el mismo lugar')
      return
    }
    const calculated = rm.calculateRoute(selectedOrigin, selectedDest, fm, ml)
    if (calculated !== false) setRoutePanelOpen(false)
  }, [selectedOrigin, selectedDest, rm, fm, ml, toast])

  const handleClearRoute = useCallback(() => {
    if (!rm.currentRoute) return
    rm.clearRoute(ml)
    setSelectedOrigin(null)
    setSelectedDest(null)
    setActiveMarker(null)
    toast.info('Ruta limpiada')
  }, [rm, ml, toast])

  const handleSearchResult = useCallback((item) => {
    if (!item) return
    if (item.pisoId) fm.setFloor(item.pisoId)
    setSelectedDest(item)
    toast.info(`${item.name} · ${item.floor || ''}`)
  }, [fm, toast])

  // "Cómo llegar aquí": la acción que faltaba al tocar un marcador.
  // Si no hay origen elegido, se propone el último usado o la entrada del piso,
  // para que al panel solo le falte confirmar el destino.
  const handleRouteToActive = useCallback(() => {
    const target = activeMarker || selectedDest
    if (!target) return
    setSelectedDest(target)
    if (!selectedOrigin) {
      const lastId = Number(localStorage.getItem(ORIGIN_MEMORY_KEY))
      const last = data.allLocations.find(l => l.id === lastId) || entrances[0] || null
      if (last) setSelectedOrigin(last)
    }
    setRoutePanelOpen(true)
  }, [activeMarker, selectedDest, selectedOrigin, data.allLocations, entrances])

  const handleFocusDest = useCallback(() => {
    const target = rm.currentRoute?.dest
    if (target?.coords) panZoom.centerOn(target.coords[0], target.coords[1])
  }, [rm.currentRoute, panZoom])

  /* ---------------- modo admin ---------------- */

  /* El token puede haber caducado desde que se guardó: isAuthenticated() solo
     mira que exista la clave. Sin esto se enseñaría la UI de admin y toda
     escritura fallaría después con un 401. */
  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    validateToken(getToken()).then(user => {
      if (cancelled) return
      if (!user) {
        clearToken()
        setIsAdmin(false)
        setAddingMode(false)
        setListOpen(false)
      }
    })
    return () => { cancelled = true }
  }, [isAdmin])

  const handleLogout = useCallback(() => {
    clearToken()
    setIsAdmin(false)
    setAddingMode(false)
    setPinCoords(null)
    window.location.reload()
  }, [])

  const handleToggleAdd = useCallback(() => {
    setAddingMode(prev => !prev)
    setPinCoords(null)
    setHintVisible(true)
  }, [])

  const handleStageClick = useCallback((e) => {
    if (!addingMode || !isAdmin) return
    // Los controles superpuestos no deben colocar marcadores
    if (e.target.closest('[data-ui], button')) return

    const img = ml.imgRef.current
    if (!img) return

    const rect = img.getBoundingClientRect()
    const normX = (e.clientX - rect.left) / rect.width
    const normY = (e.clientY - rect.top) / rect.height
    if (normX < 0 || normX > 1 || normY < 0 || normY > 1) return

    setPinCoords({ x: normX, y: normY })
  }, [addingMode, isAdmin, ml.imgRef])

  const handleConfirmAdd = useCallback(() => {
    if (!pinCoords) return
    setFormCoords(pinCoords)
    setEditTarget(null)
    setFormOpen(true)
  }, [pinCoords])

  const handleOpenList = useCallback(() => {
    loadLocations()
    setListOpen(true)
    setAddingMode(false)
    setPinCoords(null)
  }, [loadLocations])

  const handleEdit = useCallback((item) => {
    setEditTarget({ ...item })
    setFormCoords(null)
    setFormOpen(true)
  }, [])

  const handleDelete = useCallback(async (item) => {
    if (!window.confirm(`¿Eliminar "${item.nom_codigo}"?`)) return
    try {
      await crud.remove('habitacion', item.id_habitacion)
      loadLocations()
      await data.refreshMapData({ silent: true })
      toast.success('Ubicación eliminada')
    } catch {
      toast.warning('No se pudo eliminar la ubicación')
    }
  }, [loadLocations, data, toast])

  const handleSaveLocation = useCallback(async (body, isEditing) => {
    if (isEditing) await crud.update('habitacion', body.id_habitacion, body)
    else await crud.insert('habitacion', body)

    setPinCoords(null)
    setAddingMode(false)
    if (listOpen) loadLocations()
    await data.refreshMapData({ silent: true })
    toast.success(isEditing ? 'Ubicación actualizada' : 'Ubicación creada')
  }, [listOpen, loadLocations, data, toast])

  /* ---------------- estados de pantalla ---------------- */

  const hasFloors = fm.sortedPisos.length > 0
  const showError = Boolean(ml.loadError)
  const showSkeleton = hasFloors && !ml.mapLoaded && !showError
  const showEmpty = !hasFloors && !data.loading

  return (
    <div className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-ink-950 text-slate-200">
      <TopBar
        onBack={() => navigate('/')}
        currentPiso={fm.currentPiso}
        sedeName={sedeName}
        searchLocations={rm.searchLocations}
        onSearchResult={handleSearchResult}
        onRouteClick={() => setRoutePanelOpen(true)}
        onHelpClick={() => setOnboardingOpen(true)}
      />

      <main className="flex min-h-0 flex-1 flex-col" onClick={handleStageClick}>
        <MapStage
          ref={stageRef}
          piso={fm.currentPiso}
          planeRef={planeRef}
          imgRef={ml.imgRef}
          canvasRef={ml.canvasRef}
          onImageLoad={handleImageLoad}
          addingMode={addingMode}
        >
          <MarkerLayer
            locations={mapLocations}
            getCategoria={data.getCategoriaById}
            zoom={zoom}
            activeId={activeMarker?.id}
            selectedId={selectedDest?.id}
            scale={markerScale}
            showAllLabels={showAllLabels}
            onSelect={(item) => {
              setActiveMarker(item)
              setSelectedDest((prev) => (prev?.id === item?.id ? prev : item || null))
            }}
          />

          {activeMarker && !addingMode && (
            <div
              className="absolute z-30 -translate-x-1/2 -translate-y-[calc(100%+16px)]"
              style={{
                left: `${activeMarker.coords[0] * 100}%`,
                top: `${activeMarker.coords[1] * 100}%`
              }}
            >
              <LocationCard
                location={activeMarker}
                categoria={activeCategoria}
                onRouteHere={handleRouteToActive}
                onClose={() => setActiveMarker(null)}
              />
            </div>
          )}

          {pinCoords && (
            <div
              className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pinCoords.x * 100}%`, top: `${pinCoords.y * 100}%` }}
            >
              <div className="panel chamfer-sm flex items-center gap-1 p-1 shadow-2xl shadow-black/70 animate-pop-in">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleConfirmAdd() }}
                  className="btn btn-success chamfer-sm h-9 whitespace-nowrap px-3 text-[11px]"
                >
                  Agregar aquí
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPinCoords(null) }}
                  className="btn btn-ghost chamfer-sm h-9 w-9 text-slate-400"
                  aria-label="Cancelar"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {addingMode && !pinCoords && hintVisible && (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-center px-4">
              <div className="map-hint chip chamfer border-brand-400/30 bg-ink-950/90 px-3.5 py-2 text-[13px] text-brand-200 backdrop-blur-sm">
                Toca el plano para colocar una ubicación
              </div>
            </div>
          )}
        </MapStage>

        {showEmpty && (
          <MapEmptyState
            message={data.error || undefined}
            onRetry={() => data.refreshMapData()}
          />
        )}

        {showError && <MapErrorState onRetry={ml.retry} isRetrying={ml.isScanning} />}

        {showSkeleton && <MapSkeleton isScanning={ml.isScanning} />}

        {rm.currentRoute && (
          <RouteBanner
            originName={rm.currentRoute.origin?.name}
            destName={rm.currentRoute.dest?.name}
            status={rm.routeStatus}
            leg={rm.routeLeg}
            step={rm.routeStep}
            missing={rm.routeMissing}
            onClear={handleClearRoute}
            onFocusDest={handleFocusDest}
            currentFloorName={fm.currentPiso?.nom_piso}
            destFloorName={
              fm.sortedPisos.find(p => p.id_piso === rm.currentRoute.dest?.pisoId)?.nom_piso
            }
          />
        )}

        <MapControls
          zoom={zoom}
          onZoomIn={panZoom.zoomIn}
          onZoomOut={panZoom.zoomOut}
          onFit={panZoom.fitToScreen}
        />

        {isAdmin && (
          <AdminToolbar
            data-ui="true"
            addingMode={addingMode}
            onToggleAdd={handleToggleAdd}
            onOpenList={handleOpenList}
            onLogout={handleLogout}
          />
        )}
      </main>

      <BottomToolbar
        currentPiso={fm.currentPiso}
        canGoUp={fm.canGoUp}
        canGoDown={fm.canGoDown}
        goUp={fm.goUp}
        goDown={fm.goDown}
        sortedPisos={fm.sortedPisos}
        onSelectFloor={fm.setFloor}
        onRouteClick={() => setRoutePanelOpen(true)}
        onClearRoute={handleClearRoute}
        hasRoute={Boolean(rm.currentRoute)}
      />

      <ToastStack toasts={toast.toasts} onDismiss={toast.dismiss} liveMessage={toast.liveMessage} />

      <RoutePanel
        isOpen={routePanelOpen}
        onClose={() => setRoutePanelOpen(false)}
        onCalculate={handleCalculateRoute}
        onSwap={selectedOrigin && selectedDest ? handleSwapEnds : undefined}
        searchLocations={rm.searchLocations}
        onSelectOrigin={handleSelectOrigin}
        onSelectDest={setSelectedDest}
        originValue={selectedOrigin?.name}
        destValue={selectedDest?.name}
        entrances={entrances}
      />

      <AdminPanel
        isOpen={listOpen}
        onClose={() => setListOpen(false)}
        habitaciones={locationData}
        pisos={data.pisos}
        categorias={data.categorias}
        sedes={data.sedes}
        edificios={data.edificios}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={locationLoading}
      />

      <LocationForm
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); setFormCoords(null) }}
        onSave={handleSaveLocation}
        initialData={
          editTarget || (formCoords ? { coord_x: formCoords.x, coord_y: formCoords.y } : null)
        }
        pisos={data.pisos}
        currentPiso={fm.currentPiso}
        categorias={data.categorias}
      />

      <OnboardingOverlay isOpen={onboardingOpen} onClose={() => setOnboardingOpen(false)} />

      {isAdmin && isOffline && (
        <AdminOfflineOverlay onLogout={handleLogout} />
      )}
    </div>
  )
}

function ToastStack({ toasts, onDismiss, liveMessage }) {
  return (
    <>
      <div aria-live="polite" role="status" className="sr-only">{liveMessage}</div>

      {toasts.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4">
          {toasts.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => onDismiss(t.id)}
              className={`panel chamfer-sm pointer-events-auto px-4 py-2.5 text-[13px] font-medium shadow-2xl shadow-black/60 animate-fade-rise ${
                t.type === 'success'
                  ? 'border-emerald-400/30 text-emerald-200'
                  : t.type === 'warning'
                    ? 'border-amber-400/30 text-amber-200'
                    : 'text-slate-200'
              }`}
            >
              {t.message}
            </button>
          ))}
        </div>
      )}
    </>
  )
}