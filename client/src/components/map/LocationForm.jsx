import { useState, useEffect, useCallback, useRef } from 'react'
import AssetIcon from '../icons/AssetIcon.jsx'
import Sheet from '../ui/Sheet.jsx'

export default function LocationForm({ isOpen, onClose, onSave, initialData, pisos, currentPiso, categorias }) {
  const [nombre, setNombre] = useState('')
  const [categoriaId, setCategoriaId] = useState(categorias?.[0]?.id_categoria || 1)
  const [pisoId, setPisoId] = useState(currentPiso?.id_piso || 1)
  const [esConexion, setEsConexion] = useState(false)
  const [nomConexion, setNomConexion] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!initialData?.id_habitacion

  /* Rellena el formulario solo cuando cambia el OBJETIVO (otra ubicación,
     otro pin, o cierre), no en cada re-render del padre.

     En creación MapPage construye initialData con un objeto nuevo en cada
     render, y un refresh de datos en segundo plano cambia la identidad de
     categorias: sin esta guarda, cualquier re-render mientras el admin escribe
     (p. ej. el aviso de pista a los 3 s) borraba lo tipeado y dejaba el botón
     de guardar deshabilitado. */
  const targetKey = initialData
    ? (initialData.id_habitacion ?? `nueva:${initialData.coord_x},${initialData.coord_y}`)
    : 'closed'
  const lastTargetRef = useRef(null)

  useEffect(() => {
    if (lastTargetRef.current === targetKey) return
    lastTargetRef.current = targetKey

    setError('')
    if (initialData) {
      setNombre(initialData.nom_codigo || '')
      setCategoriaId(initialData.id_categoria_fk || categorias?.[0]?.id_categoria || 1)
      setPisoId(initialData.id_piso_fk || currentPiso?.id_piso || 1)
      setEsConexion(!!initialData.es_conexion)
      setNomConexion(initialData.nom_conexion || '')
    } else {
      setNombre('')
      setCategoriaId(categorias?.[0]?.id_categoria || 1)
      setPisoId(currentPiso?.id_piso || 1)
      setEsConexion(false)
      setNomConexion('')
    }
  }, [targetKey, initialData, currentPiso?.id_piso, categorias])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!nombre.trim()) return
    setSaving(true)
    try {
      const body = {
        nom_codigo: nombre.trim(),
        id_categoria_fk: categoriaId,
        id_piso_fk: pisoId,
        coord_x: initialData?.coord_x ?? 0,
        coord_y: initialData?.coord_y ?? 0,
        es_conexion: esConexion,
        nom_conexion: esConexion ? nomConexion.trim() : null
      }
      if (isEditing) {
        body.id_habitacion = initialData.id_habitacion
      }
      await onSave(body, isEditing)
      onClose()
    } catch (err) {
      setError(err.message || 'No se pudo guardar la ubicación')
    } finally {
      setSaving(false)
    }
  }, [nombre, categoriaId, pisoId, esConexion, nomConexion, initialData, isEditing, onSave, onClose])

  return (
    <form onSubmit={handleSubmit} id="location-form">
      <Sheet
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? 'Editar ubicación' : 'Nueva ubicación'}
        labelledBy="location-form-title"
        icon={<AssetIcon name={isEditing ? 'edit' : 'pin'} className="h-4 w-4" />}
        footer={
          <div className="flex gap-2">
            <button
              type="submit"
              form="location-form"
              disabled={saving || !nombre.trim()}
              className="btn btn-primary chamfer-sm flex-1 py-3 text-sm"
            >
              {saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear ubicación'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline chamfer-sm px-5 py-3 text-sm"
            >
              Cancelar
            </button>
          </div>
        }
      >
        <div className="space-y-4 px-5 py-5">
          {!isEditing && initialData?.coord_x !== undefined && (
            <div className="chamfer-sm border border-brand-400/25 bg-brand-400/[0.07] px-3 py-2 font-mono text-[11px] text-brand-200">
              Coordenadas ({initialData.coord_x.toFixed(3)}, {initialData.coord_y.toFixed(3)})
            </div>
          )}

          <div>
            <label className="field-label" htmlFor="loc-nombre">
              Nombre
            </label>
            <input
              id="loc-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Aula 101"
              className="field chamfer-sm px-3 py-2.5 text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="field-label" htmlFor="loc-categoria">
              Categoría
            </label>
            <select
              id="loc-categoria"
              value={categoriaId}
              onChange={(e) => setCategoriaId(parseInt(e.target.value))}
              className="field chamfer-sm px-3 py-2.5 text-sm"
            >
              {(categorias || []).map((c) => (
                <option key={c.id_categoria} value={c.id_categoria}>
                  {c.nom_categoria}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="loc-piso">
              Piso
            </label>
            <select
              id="loc-piso"
              value={pisoId}
              onChange={(e) => setPisoId(parseInt(e.target.value))}
              className="field chamfer-sm px-3 py-2.5 text-sm"
            >
              {(pisos || []).map((p) => (
                <option key={p.id_piso} value={p.id_piso}>
                  {p.nom_piso}
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-3 border border-white/[0.07] bg-ink-900/50 px-3 py-2.5 transition-colors hover:border-white/[0.14]">
            <input
              type="checkbox"
              checked={esConexion}
              onChange={(e) => setEsConexion(e.target.checked)}
              className="h-4 w-4 shrink-0 accent-brand-500"
            />
            <span className="text-[13px] text-slate-300">Es punto de conexión (escalera)</span>
          </label>

          {esConexion && (
            <div>
              <label className="field-label" htmlFor="loc-conexion">
                Identificador de conexión
              </label>
              <input
                id="loc-conexion"
                type="text"
                value={nomConexion}
                onChange={(e) => setNomConexion(e.target.value)}
                placeholder="escalera_izquierda_piso_2"
                className="field chamfer-sm px-3 py-2.5 font-mono text-[13px]"
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                Debe terminar en el nombre normalizado del piso destino, por ejemplo
                <span className="font-mono text-slate-400"> _piso_2</span>, para que las rutas
                entre pisos emparejen la escalera correcta.
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="chamfer-sm border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-[12px] text-rose-200">
              {error}
            </p>
          )}
        </div>
      </Sheet>
    </form>
  )
}
