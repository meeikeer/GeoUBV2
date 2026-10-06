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
import RoutePulse from '../components/map/RoutePulse.jsx'
import LocationCard from '../components/map/LocationCard.jsx'
import RouteBanner from '../components/map/RouteBanner.jsx'
import RoutePanel from '../components/map/RoutePanel.jsx'
import AdminToolbar from '../components/map/AdminToolbar.jsx'
import AdminPanel from '../components/map/AdminPanel.jsx'
import AdminPreviewDock from '../components/map/AdminPreviewDock.jsx'
import PreviewOverlay from '../components/map/PreviewOverlay.jsx'
import LocationForm from '../components/map/LocationForm.jsx'
import AdminOfflineOverlay from '../components/map/AdminOfflineOverlay.jsx'
import OnboardingOverlay from '../components/map/OnboardingOverlay.jsx'
import './MapPage.css'

const ORIGIN_MEMORY_KEY = 'geoubv_last_origin'

/* Zoom a partir del cual se muestran los nombres de todos los lugares. */
const LABEL_ZOOM = 1.2

/* Sobretamaño del marcador respecto a su tamaño nominal en pantalla.

   Antes valia 1.2 y lo compartia con LABEL_ZOOM, que hacia dos trabajos a la
   vez: decidir cuando aparecen las etiquetas y engordar el icono. Bajarlo para
   encoger el icono habia delayed las etiquetas, asi que ahora son separados.

   A 1 el icono mide en pantalla lo mismo que su tamaño nominal, que es lo que
   hace que quepa dentro de una habitacion pequena cuando el plano se aleja:
   las habitaciones si encogen con el zoom, los marcadores no. Con el 1.2 un
   icono de 28 px se veia de 34 y en un movil de 375 px eran 31 px, mas que
   algunas salas. */
const MARKER_OVERSHOOT = 1

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

  /* Preview de cambios: el cambio se etapa aquí y NO se escribe hasta que el
     admin pulsa Publicar en el dock. Un solo borrador activo (el último gana). */
  const [stagedChange, setStagedChange] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewView, setPreviewView] = useState('map')
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState('')
  const pendingFrameRef = useRef(null)

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
  // tamaño medible. Si hay un preview etapado en otra planta, su encuadre va
  // justo después: cover del onLoad lo pisaría si se pidiera antes.
  const handleImageLoad = useCallback(() => {
    panZoom.resetToCover()
    const pending = pendingFrameRef.current
    if (pending) {
      pendingFrameRef.current = null
      panZoom.framePoints([pending])
    }
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

  /* Los marcadores se compensan del zoom para mantener tamaño constante en
     pantalla: scale = MARKER_OVERSHOOT / zoom.

     Antes llevaba Math.min(1, ...) y a partir de 1.2 de zoom dejaba de
     compensar, así que al alejar el marcador se encogía con la vista y a zoom
     0.26 quedaba en 7 px, ilegible. Sin ese tope el tamaño en pantalla es
     siempre el mismo, tanto acercarse como alejar.

     El resultado se cuantiza en pasos: un valor continuo cambiaría en cada
     evento de rueda y re-renderizaría la capa de marcadores entera. React solo
     reacciona al cruzar de escalón.

     El tope de 6 es seguridad: a un zoom muy pequeño 1/0.01 daría 100×. */
const MARKER_SCALE_CAP = 6
const MARKER_SCALE_STEPS = 24

/* Cuantiza dentro del rango real [0, CAP]. Limitar a [0, 1] reintroducia
     justo el bug que se queria quitar: por debajo de 1.2 de zoom el valor
     correcto es mayor que 1 (a 0.26 sale 4.6), y ahi es justo cuando el
     marcador se encoge hasta ser ilegible. */
function quantizeScale(value, steps, max) {
  const clamped = Math.max(0, Math.min(max, value))
  return Math.round(clamped * steps) / steps
}

const markerScale = quantizeScale(
    MARKER_OVERSHOOT / Math.max(zoom, 0.01),
    MARKER_SCALE_STEPS,
    MARKER_SCALE_CAP
  )
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

    /* El encuadre por defecto es cover, que en un plano apaisado dentro de una
       pantalla vertical deja fuera buena parte del edificio: la ruta se trazaba
       fuera de la vista y parecia que no habia pasado nada. framePoints baja la
       escala lo justo para que los dos extremos quepan. */
    const from = selectedOrigin.coords
    const to = selectedDest.coords
    if (from && to) {
      panZoom.framePoints([from, to])
    }
  }, [selectedOrigin, selectedDest, rm, fm, ml, toast, panZoom])

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
        setStagedChange(null)
        setPreviewOpen(false)
      }
    })
    return () => { cancelled = true }
  }, [isAdmin])

  const handleLogout = useCallback(() => {
    clearToken()
    setIsAdmin(false)
    setAddingMode(false)
    setPinCoords(null)
    setStagedChange(null)
    setPreviewOpen(false)
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

  /* Etapa un cambio en vez de escribirlo: el dock de preview enseña qué va a
     pasar (mapa o JSON) y la escritura real ocurre en handlePublish, con los
     mismos crud.* de siempre. */
  const handleStageChange = useCallback((change) => {
    setFormOpen(false)
    setEditTarget(null)
    setFormCoords(null)
    setListOpen(false)
    setAddingMode(false)
    setPinCoords(null)
    setPublishError('')
    setPreviewView('map')
    setPreviewOpen(true)
    if (stagedChange) toast.info('Se reemplazó el borrador anterior')
    setStagedChange(change)

    // La preview visual solo tiene sentido viendo la planta donde ocurrirá.
    if (change.entity === 'habitacion') {
      const rec = change.op === 'delete' ? change.before : change.body
      const targetPisoId = rec?.id_piso_fk
      const coords = [rec?.coord_x, rec?.coord_y]
      if (targetPisoId && targetPisoId !== currentPisoId) {
        pendingFrameRef.current = coords
        fm.setFloor(targetPisoId)
      } else if (Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
        panZoom.framePoints([coords])
      }
    }
  }, [stagedChange, toast, currentPisoId, fm, panZoom])

  const handleDelete = useCallback((item) => {
    handleStageChange({
      entity: 'habitacion',
      op: 'delete',
      id: item.id_habitacion,
      body: null,
      before: item
    })
  }, [handleStageChange])

  const handleSaveLocation = useCallback((body, isEditing) => {
    handleStageChange({
      entity: 'habitacion',
      op: isEditing ? 'update' : 'create',
      id: isEditing ? body.id_habitacion : null,
      body,
      before: isEditing ? editTarget : null
    })
  }, [editTarget, handleStageChange])

  /* Publica el borrador: única vía de escritura del flujo de preview. Mismos
     crud.* que antes, mismas lecturas posteriores. */
  const handlePublish = useCallback(async () => {
    const change = stagedChange
    if (!change || publishing) return
    setPublishing(true)
    setPublishError('')
    try {
      const { entity, op, id, body } = change
      if (op === 'create') await crud.insert(entity, body)
      else if (op === 'update') await crud.update(entity, id, body)
      else await crud.remove(entity, id)

      if (entity === 'habitacion') await loadLocations()
      await data.refreshMapData({ silent: true })
      setStagedChange(null)
      setPreviewOpen(false)
      toast.success('Cambio publicado')
    } catch (err) {
      // El borrador se conserva: el admin puede reintentar o descartar.
      setPublishError(err?.message || 'No se pudo publicar el cambio')
      toast.warning('No se pudo publicar el cambio')
    } finally {
      setPublishing(false)
    }
  }, [stagedChange, publishing, loadLocations, data, toast])

  const handleDiscard = useCallback(() => {
    setStagedChange(null)
    setPreviewOpen(false)
    setPublishError('')
    toast.info('Cambio descartado')
  }, [toast])

  const handleGoToFloor = useCallback((pisoId, coords) => {
    if (pisoId !== currentPisoId) {
      pendingFrameRef.current = coords
      fm.setFloor(pisoId)
    } else if (coords && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
      panZoom.framePoints([coords])
    }
  }, [currentPisoId, fm, panZoom])

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

      {/* relative es imprescindible: MapControls, RouteBanner y los estados son
          absolute y se posicionan contra este contenedor. Sin esto se
          posicionan contra el viewport, el banner queda detras de la TopBar
          (z-40 > z-30) y los controles invaden la barra inferior. */}
      <main
        className="relative flex min-h-0 flex-1 flex-col"
        onClick={handleStageClick}
      >
        <MapStage
          ref={stageRef}
          piso={fm.currentPiso}
          planeRef={planeRef}
          imgRef={ml.imgRef}
          canvasRef={ml.canvasRef}
          onImageLoad={handleImageLoad}
          addingMode={addingMode}
        >
          <RoutePulse ends={ml.routeEnds} />

          <MarkerLayer
            locations={mapLocations}
            getCategoria={data.getCategoriaById}
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

          {isAdmin && (
            <PreviewOverlay
              isOpen={previewOpen && Boolean(stagedChange)}
              view={previewView}
              change={stagedChange}
              currentPisoId={currentPisoId}
              locations={mapLocations}
              categorias={data.categorias}
              scale={markerScale}
            />
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
          className={previewOpen && stagedChange ? 'max-sm:hidden sm:right-[432px]' : ''}
        />

        {isAdmin && (
          <AdminToolbar
            data-ui="true"
            addingMode={addingMode}
            onToggleAdd={handleToggleAdd}
            onOpenList={handleOpenList}
            hasDraft={Boolean(stagedChange)}
            previewOpen={previewOpen}
            onOpenPreview={() => setPreviewOpen(o => !o)}
            onLogout={handleLogout}
          />
        )}

        {isAdmin && (
          <AdminPreviewDock
            isOpen={previewOpen && Boolean(stagedChange)}
            onClose={() => setPreviewOpen(false)}
            change={stagedChange}
            view={previewView}
            onViewChange={setPreviewView}
            onPublish={handlePublish}
            onDiscard={handleDiscard}
            publishing={publishing}
            publishError={publishError}
            data={data}
            currentPiso={fm.currentPiso}
            onGoToFloor={handleGoToFloor}
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
        onStageChange={handleStageChange}
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