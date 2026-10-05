import { useRef, useEffect, useMemo, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMapData } from '../hooks/useMapData.js'
import { useFloorManager } from '../hooks/useFloorManager.js'
import { useMapLoader } from '../hooks/useMapLoader.js'
import { useRouteManager } from '../hooks/useRouteManager.js'
import { crud } from '../services/crud.js'
import { isAuthenticated, clearToken } from '../services/auth.js'
import TopBar from '../components/map/TopBar.jsx'
import BottomToolbar from '../components/map/BottomToolbar.jsx'
import RoutePanel from '../components/map/RoutePanel.jsx'
import AssetIcon from '../components/icons/AssetIcon.jsx'
import ZoomControls from '../components/map/ZoomControls.jsx'
import OnboardingOverlay from '../components/map/OnboardingOverlay.jsx'
import AdminToolbar from '../components/map/AdminToolbar.jsx'
import AdminPanel from '../components/map/AdminPanel.jsx'
import LocationForm from '../components/map/LocationForm.jsx'
import AdminOfflineOverlay from '../components/map/AdminOfflineOverlay.jsx'
import './MapPage.css'

const CATEGORY_ICONS_FALLBACK = {
  Aula: '/assets/icons/categ-classroom.svg',
  'Baño': '/assets/icons/categ-mans.svg',
  Coordinación: '/assets/icons/categ-coordination.svg',
  Escalera: '/assets/icons/categ-stairs.svg',
  Entrada: '/assets/icons/categ-entrance.svg',
  Servicio: '/assets/icons/categ-health.svg',
  PFG: '/assets/icons/categ-classroom.svg',
  Cafeteria: '/assets/icons/categ-coffeeshop.svg',
  Biblioteca: '/assets/icons/categ-library.svg',
  Comedor: '/assets/icons/categ-food.svg',
  Gym: '/assets/icons/categ-gym.svg',
  Laboratorio: '/assets/icons/categ-laboratory.svg',
  Oficina: '/assets/icons/categ-office.svg',
  Salud: '/assets/icons/categ-health.svg',
  'Baño Mujeres': '/assets/icons/categ-womans.svg',
  'Baño Hombres': '/assets/icons/categ-mans.svg'
}

const CATEGORY_ICON_NAMES = {
  1: 'aula',
  2: 'banoMujeres',
  3: 'banoHombres',
  4: 'biblioteca',
  5: 'cafeteria',
  6: 'comedor',
  7: 'coordinacion',
  8: 'entrada',
  9: 'escaleras',
  10: 'gym',
  11: 'laboratorio',
  12: 'oficina',
  13: 'salud'
}

export default function MapPage() {
  const navigate = useNavigate()
  const mapContainerRef = useRef(null)
  const mapInnerRef = useRef(null)
  const zoomRef = useRef(null)
  const [routePanelOpen, setRoutePanelOpen] = useState(false)
  const [selectedOrigin, setSelectedOrigin] = useState(null)
  const [selectedDest, setSelectedDest] = useState(null)
  const [currentZoom, setCurrentZoom] = useState(1)
  const [statusMsg, setStatusMsg] = useState('')
  const [statusType, setStatusType] = useState('info')
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })

  const [isAdmin, setIsAdmin] = useState(() => isAuthenticated())
  const [addingMode, setAddingMode] = useState(false)
  const [pinCoords, setPinCoords] = useState(null)
  const [hintVisible, setHintVisible] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [locationData, setLocationData] = useState([])
  const [activeMarkerId, setActiveMarkerId] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [formCoords, setFormCoords] = useState(null)

  const data = useMapData()
  const fm = useFloorManager(data.pisos)
  const ml = useMapLoader()
  const rm = useRouteManager(data.allLocations, data.habitaciones, fm.sortedPisos)

  const sedeName = data.sedes?.[0]?.nom_sede || 'GeoUBV'

  const loadLocations = useCallback(async () => {
    setLocationLoading(true)
    try {
      const habitaciones = await crud.readCollection('habitacion')
      setLocationData(habitaciones)
    } catch {} finally {
      setLocationLoading(false)
    }
  }, [])

  useEffect(() => {
    if (fm.currentPiso && fm.currentPiso.url_map) {
      ml.loadMap(fm.currentPiso.url_map, fm.currentPiso.id_piso)
    }
  }, [fm.currentPiso?.id_piso])

  useEffect(() => {
    if (!ml.mapLoaded) return
    if (rm.currentRoute?.type === 'multifloor') {
      const handled = rm.continueRoute(fm, ml)
      if (!handled) {
        ml.clearRoute()
      }
    }
  }, [fm.currentFloorIndex, ml.mapLoaded, rm.currentRoute, fm.currentPiso?.id_piso])

  useEffect(() => {
    const handlePageHide = () => {
      clearToken()
      setIsAdmin(false)
    }

    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('beforeunload', handlePageHide)

    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('beforeunload', handlePageHide)
    }
  }, [])

  useEffect(() => {
    if (!ml.mapLoaded || !ml.grid?.data || ml.grid.data.length === 0) return
    if (!rm.currentRoute) return

    if (rm.currentRoute.type === 'multifloor') {
      rm.continueRoute(fm, ml)
      return
    }

    if (rm.currentRoute.type === 'simple') {
      const currentPisoId = fm.currentPiso?.id_piso
      if (currentPisoId === rm.currentRoute.pisoId) {
        ml.drawRoute(rm.currentRoute.origin.coords, rm.currentRoute.dest.coords)
      } else {
        ml.clearRoute()
      }
    }
  }, [ml.mapLoaded, ml.grid, rm.currentRoute, fm.currentPiso?.id_piso])

  const handleOpenRoutePanel = useCallback((destination = null) => {
    if (destination) {
      setSelectedDest(destination)
    }
    setRoutePanelOpen(true)
  }, [])

  const handleCloseRoutePanel = useCallback(() => {
    setRoutePanelOpen(false)
  }, [])

  const handleSelectOrigin = useCallback((item) => {
    setSelectedOrigin(item)
  }, [])

  const handleSelectDest = useCallback((item) => {
    setSelectedDest(item)
  }, [])

  const handleCalculateRoute = useCallback(() => {
    if (!selectedOrigin || !selectedDest) {
      setStatusMsg('Selecciona origen y destino válidos')
      setStatusType('warning')
      return
    }
    if (selectedOrigin.id === selectedDest.id) {
      setStatusMsg('El origen y destino no pueden ser el mismo')
      setStatusType('warning')
      return
    }
    rm.calculateRoute(selectedOrigin, selectedDest, fm, ml)
    setRoutePanelOpen(false)
  }, [selectedOrigin, selectedDest, rm, fm, ml])

  const handleSearchResult = useCallback((item) => {
    if (!item) return
    if (item.pisoId && fm.setFloor) {
      fm.setFloor(item.pisoId)
    }
    setSelectedDest(item)
    setStatusMsg(`${item.name} — ${item.floor || ''}`)
    setStatusType('info')
  }, [fm])

  const routeActive = Boolean(rm.currentRoute && selectedOrigin && selectedDest)

  const [isOffline, setIsOffline] = useState(() => !navigator.onLine)

  const currentPisoId = fm.currentPiso?.id_piso
  const mapLocations = useMemo(() => {
    if (!data.allLocations || !currentPisoId) return []
    return data.allLocations.filter((item) => item.pisoId === currentPisoId)
  }, [data.allLocations, currentPisoId])

  /* Nombre de icono local por id de categoría; url_icono del admin
     tiene prioridad si existe. El nombre evita depender del dato. */
  const getLocationIcon = useCallback((categoriaId) => {
    const byId = CATEGORY_ICON_NAMES[categoriaId]
    if (byId) return { name: byId, src: undefined }
    const categoria = data.getCategoriaById(categoriaId)
    if (categoria?.url_icono) return { name: 'aula', src: categoria.url_icono }
    const fallback = categoria?.nom_categoria ? CATEGORY_ICONS_FALLBACK[categoria.nom_categoria] : null
    return { name: 'aula', src: fallback }
  }, [data])

  const showLocationLabels = currentZoom > 1.2
  const markerScale = Math.min(1, 1.2 / currentZoom)

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

  useEffect(() => {
    if (!hintVisible) return
    const t = setTimeout(() => setHintVisible(false), 3000)
    return () => clearTimeout(t)
  }, [hintVisible])

  useEffect(() => {
    if (!statusMsg) return
    const t = setTimeout(() => setStatusMsg(''), 3200)
    return () => clearTimeout(t)
  }, [statusMsg])

  const showAdminOffline = isAdmin && isOffline

  const isScanning = ml.isScanning
  const isLoading = data.loading

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

  const handleMapClick = useCallback((e) => {
    if (!addingMode || !isAdmin) return
    const img = ml.imgRef.current
    if (!img) return

    // Use the image bounding rect for robust click-to-image mapping
    const rect = img.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const renderedW = rect.width
    const renderedH = rect.height

    const normX = clickX / renderedW
    const normY = clickY / renderedH

    if (normX < 0 || normX > 1 || normY < 0 || normY > 1) return

    setPinCoords({ x: normX, y: normY })
  }, [addingMode, isAdmin, ml.imgRef])

  const handleConfirmAdd = useCallback(() => {
    if (!pinCoords) return
    setFormCoords(pinCoords)
    setEditTarget(null)
    setFormOpen(true)
  }, [pinCoords])

  const handleCancelPin = useCallback(() => {
    setPinCoords(null)
  }, [])

  const handleOpenList = useCallback(() => {
    loadLocations()
    setListOpen(true)
    setAddingMode(false)
    setPinCoords(null)
  }, [loadLocations])

  const handleEdit = useCallback((item) => {
    setEditTarget({
      id_habitacion: item.id_habitacion,
      nom_codigo: item.nom_codigo,
      id_categoria_fk: item.id_categoria_fk,
      id_piso_fk: item.id_piso_fk,
      coord_x: item.coord_x,
      coord_y: item.coord_y,
      es_conexion: item.es_conexion,
      nom_conexion: item.nom_conexion
    })
    setFormCoords(null)
    setFormOpen(true)
  }, [])

  const handleDelete = useCallback(async (item) => {
    if (!window.confirm(`¿Eliminar "${item.nom_codigo}"?`)) return
    try {
      await crud.remove('habitacion', item.id_habitacion)
      loadLocations()
      data.refreshMapData({ silent: true })
    } catch {}
  }, [loadLocations, data])

  const handleSaveLocation = useCallback(async (body, isEditing) => {
    try {
      if (isEditing) {
        await crud.update('habitacion', body.id_habitacion, body)
      } else {
        await crud.insert('habitacion', body)
      }
      setStatusMsg(isEditing ? 'Ubicación actualizada' : 'Ubicación creada')
      setStatusType('success')
      setPinCoords(null)
      setAddingMode(false)
      if (listOpen) loadLocations()
      data.refreshMapData({ silent: true })
    } catch (err) {
      throw new Error(err.message || 'Error al guardar')
    }
  }, [listOpen, loadLocations, data])

  const pinPercent = useCallback((normX, normY) => {
    const img = ml.imgRef.current
    if (!img) return { x: 50, y: 50 }
    const rect = img.getBoundingClientRect()
    const pxX = normX * rect.width
    const pxY = normY * rect.height
    return { x: (pxX / rect.width) * 100, y: (pxY / rect.height) * 100 }
  }, [ml.imgRef])

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-ink-950 text-slate-200">
      <TopBar
        onBack={() => navigate('/')}
        currentPiso={fm.currentPiso}
        sedeName={sedeName}
        searchLocations={rm.searchLocations}
        onSearchResult={handleSearchResult}
        onRouteClick={handleOpenRoutePanel}
        originName={selectedOrigin?.name}
        destName={selectedDest?.name}
        routeActive={routeActive}
      />

      <main
        className="flex-1 relative overflow-hidden"
        ref={mapContainerRef}
        onClick={handleMapClick}
        style={addingMode ? { cursor: 'crosshair' } : {}}
      >
        <div
          ref={mapInnerRef}
          data-map-element="true"
          className="relative"
          style={imgSize.w && imgSize.h ? {
            width: '100%',
            maxWidth: imgSize.w + 'px',
            lineHeight: 0
          } : {}}
        >
          <img
            ref={ml.imgRef}
            id="map-image"
            className="w-full h-auto block"
            src=""
            alt="Mapa del edificio"
            draggable={false}
            onLoad={(e) => {
              const img = e.target
              if (img.naturalWidth && img.naturalHeight) {
                setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
              }
            }}
          />
          <canvas
            ref={ml.canvasRef}
            style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          />

          {mapLocations.map((item) => {
            const [normX, normY] = item.coords
            const x = `${normX * 100}%`
            const y = `${normY * 100}%`
            const icon = getLocationIcon(item.categoriaId)
            const isActive = activeMarkerId === item.id
            const showLabel = showLocationLabels || isActive

            return (
              <div
                key={item.id}
                className="absolute z-20"
                style={{ left: x, top: y, transform: 'translate(-50%, -50%)', willChange: 'transform' }}
              >
                <div
                  className="relative flex flex-col items-center"
                  style={{
                    transform: `scale(${markerScale})`,
                    transformOrigin: 'center center',
                    willChange: 'transform'
                  }}
                >
                  <button
                    type="button"
                    aria-label={item.name}
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveMarkerId((prev) => (prev === item.id ? null : item.id))
                    }}
                    className={`marker-pin chamfer-sm h-[clamp(20px,3vw,38px)] w-[clamp(20px,3vw,38px)] rotate-45 text-brand-400 no-tap-highlight ${
                      isActive ? 'marker-active' : ''
                    }`}
                  >
                    <AssetIcon src={icon.src} name={icon.name} className="h-[58%] w-[58%] -rotate-45" />
                  </button>

                  {showLabel && <span className="marker-label">{item.name}</span>}
                </div>
              </div>
            )
          })}
          {pinCoords && (() => {
            const pos = pinPercent(pinCoords.x, pinCoords.y)
            return (
              <div
                className="absolute z-30"
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <div className="panel chamfer-sm flex items-center gap-1 p-1 shadow-2xl shadow-black/70 animate-pop-in">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleConfirmAdd()
                    }}
                    className="btn btn-success chamfer-sm h-9 px-3 text-[11px] whitespace-nowrap"
                  >
                    Agregar aquí
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCancelPin()
                    }}
                    className="btn btn-ghost chamfer-sm h-9 w-9 text-slate-400"
                    aria-label="Cancelar"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })()}
        </div>

        {addingMode && !pinCoords && hintVisible && (
          <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center px-4">
            <div className="map-hint chip chamfer border-brand-400/30 bg-ink-950/90 px-3.5 py-2 text-[13px] text-brand-200 backdrop-blur-sm">
              Toca el mapa para colocar una ubicación
            </div>
          </div>
        )}

        <ZoomControls ref={zoomRef} mapContainerRef={mapContainerRef} onZoomChange={setCurrentZoom} />

        {/* Zoom táctil: columna flotante al borde inferior derecho */}
        <div className="absolute bottom-[4.75rem] right-3 z-30 flex flex-col gap-1.5 sm:hidden">
          <div className="panel-glass chamfer flex flex-col gap-1 p-1">
            <button
              onClick={() => zoomRef.current?.zoomIn()}
              className="btn btn-ghost chamfer-sm grid h-11 w-11 place-items-center"
              aria-label="Acercar"
            >
              <AssetIcon name="zoomin" className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={() => zoomRef.current?.zoomOut()}
              className="btn btn-ghost chamfer-sm grid h-11 w-11 place-items-center"
              aria-label="Alejar"
            >
              <AssetIcon name="zoomout" className="h-[18px] w-[18px]" />
            </button>
          </div>
          <button
            onClick={() => zoomRef.current?.fitToScreen()}
            className="btn btn-outline chamfer-sm grid h-11 w-11 place-items-center"
            aria-label="Ajustar vista"
          >
            <AssetIcon name="restart" className="h-[18px] w-[18px]" />
          </button>
        </div>

        {isAdmin && (
          <AdminToolbar
            addingMode={addingMode}
            onToggleAdd={handleToggleAdd}
            onOpenList={handleOpenList}
            onLogout={handleLogout}
          />
        )}

        {/* Velo para que la barra inferior se lea sobre el plano */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent"
          aria-hidden="true"
        />
      </main>

      <BottomToolbar
        currentPiso={fm.currentPiso}
        canGoUp={fm.canGoUp}
        canGoDown={fm.canGoDown}
        goUp={fm.goUp}
        goDown={fm.goDown}
        sortedPisos={fm.sortedPisos}
        onSelectFloor={fm.setFloor}
        currentZoom={currentZoom}
        onZoomIn={() => zoomRef.current?.zoomIn()}
        onZoomOut={() => zoomRef.current?.zoomOut()}
        onFit={() => zoomRef.current?.fitToScreen()}
        onRouteClick={handleOpenRoutePanel}
        onClearRoute={() => {
          rm.clearRoute(ml)
          setStatusMsg('Ruta limpiada')
          setStatusType('info')
          setSelectedOrigin(null)
          setSelectedDest(null)
        }}
        isScanning={isScanning}
        isLoading={isLoading}
      />

      {statusMsg && (
        <div
          role="status"
          className={`panel chamfer-sm pointer-events-none fixed left-1/2 top-[4.5rem] z-50 -translate-x-1/2 px-4 py-2.5 text-[13px] font-medium shadow-2xl shadow-black/60 animate-fade-rise ${
            statusType === 'success'
              ? 'border-emerald-400/30 text-emerald-200'
              : statusType === 'warning'
                ? 'border-amber-400/30 text-amber-200'
                : 'text-slate-200'
          }`}
        >
          {statusMsg}
        </div>
      )}

      <RoutePanel
        isOpen={routePanelOpen}
        onClose={handleCloseRoutePanel}
        onCalculate={handleCalculateRoute}
        searchLocations={rm.searchLocations}
        onSelectOrigin={handleSelectOrigin}
        onSelectDest={handleSelectDest}
        searchableLocations={rm.searchableLocations}
        originValue={selectedOrigin?.name}
        destValue={selectedDest?.name}
      />

      <AdminPanel
        isOpen={listOpen}
        onClose={() => setListOpen(false)}
        habitaciones={locationData}
        pisos={data.pisos}
        categorias={data.categorias}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={locationLoading}
      />

      <LocationForm
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); setFormCoords(null) }}
        onSave={handleSaveLocation}
        initialData={editTarget ? editTarget : (formCoords ? { coord_x: formCoords.x, coord_y: formCoords.y } : null)}
        pisos={data.pisos}
        currentPiso={fm.currentPiso}
        categorias={data.categorias}
      />

      <OnboardingOverlay />

      {showAdminOffline && (
        <AdminOfflineOverlay
          onReconnect={() => setIsOffline(false)}
          onLogout={handleLogout}
        />
      )}
    </div>
  )
}
