import { useState, useEffect, useCallback } from 'react'
import AssetIcon from '../icons/AssetIcon.jsx'

export default function LocationForm({ isOpen, onClose, onSave, initialData, pisos, currentPiso, categorias }) {
  const [nombre, setNombre] = useState('')
  const [categoriaId, setCategoriaId] = useState(categorias?.[0]?.id_categoria || 1)
  const [pisoId, setPisoId] = useState(currentPiso?.id_piso || 1)
  const [esConexion, setEsConexion] = useState(false)
  const [nomConexion, setNomConexion] = useState('')
  const [saving, setSaving] = useState(false)

  const isEditing = !!initialData?.id_habitacion

  useEffect(() => {
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
  }, [initialData, currentPiso?.id_piso, categorias])

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
    } catch {
      // error handled by parent
    } finally {
      setSaving(false)
    }
  }, [nombre, categoriaId, pisoId, esConexion, nomConexion, initialData, isEditing, onSave, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? 'Editar ubicación' : 'Nueva ubicación'}
        className="panel-glass chamfer-top sm:chamfer scroll-slim relative max-h-[92vh] w-full max-w-md overflow-y-auto shadow-2xl shadow-black/80 animate-sheet-up sm:animate-pop-in"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/[0.07] bg-ink-900/95 px-5 py-3.5 backdrop-blur">
          <h2 className="flex items-center gap-2.5 font-display text-[15px] font-bold text-white">
            <span className="chamfer-sm grid h-8 w-8 place-items-center bg-brand-400/12 text-brand-400">
              <AssetIcon name={isEditing ? 'edit' : 'pin'} className="h-4 w-4" />
            </span>
            {isEditing ? 'Editar ubicación' : 'Nueva ubicación'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost chamfer-sm grid h-9 w-9 place-items-center"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

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
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !nombre.trim()}
              className="btn btn-primary chamfer-sm flex-1 py-3 text-sm"
            >
              {saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear ubicación'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-outline chamfer-sm px-5 py-3 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
