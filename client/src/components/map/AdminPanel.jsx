import { useState, useEffect, useCallback, useMemo } from 'react'
import AssetIcon from '../icons/AssetIcon.jsx'
import { crud } from '../../services/crud.js'

const TABS = [
  { key: 'edificios', label: 'Edificios' },
  { key: 'pisos', label: 'Pisos' },
  { key: 'categorias', label: 'Categorías' },
  { key: 'habitaciones', label: 'Habitaciones' }
]

const inputCls = 'field chamfer-sm px-3 py-2 text-sm'
const labelCls = 'field-label'
const primaryBtn = 'btn btn-primary chamfer-sm px-4 py-2 text-xs'
const ghostBtn = 'btn btn-outline chamfer-sm px-4 py-2 text-xs'
const addBtn = 'btn btn-success chamfer-sm w-full px-3 py-2 text-xs'
const rowCls =
  'flex items-center gap-2 border border-white/[0.06] bg-ink-900/60 px-3 py-2 transition-colors duration-150 hover:border-white/[0.13] hover:bg-ink-850'
const iconBtn = 'btn chamfer-sm grid h-8 w-8 place-items-center'
const editBtn = `${iconBtn} text-slate-400 hover:text-brand-300`
const delBtn = `${iconBtn} text-slate-500 hover:text-rose-300`

function FormShell({ children }) {
  return <div className="space-y-3 animate-fade-rise">{children}</div>
}

function FormActions({ onSave, onCancel, saveLabel = 'Guardar' }) {
  return (
    <div className="flex gap-2 pt-1">
      <button onClick={onSave} className={primaryBtn}>
        {saveLabel}
      </button>
      <button onClick={onCancel} className={ghostBtn}>
        Cancelar
      </button>
    </div>
  )
}

function Row({ children }) {
  return <div className={rowCls}>{children}</div>
}

function RowActions({ onEdit, onDelete }) {
  return (
    <>
      <button onClick={onEdit} className={editBtn} aria-label="Editar">
        <AssetIcon name="edit" className="h-3.5 w-3.5" />
      </button>
      <button onClick={onDelete} className={delBtn} aria-label="Eliminar">
        <AssetIcon name="trash" className="h-3.5 w-3.5" />
      </button>
    </>
  )
}

function EmptyState({ text }) {
  return (
    <div className="chamfer-sm border border-dashed border-white/10 px-3 py-6 text-center text-xs text-slate-500">
      {text}
    </div>
  )
}

function TabEdificios({ onStatusMsg }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(null)
  const [editId, setEditId] = useState(null)
  const [nom, setNom] = useState('')
  const [sedeFk, setSedeFk] = useState(1)

  const load = useCallback(async () => {
    try {
      setItems(await crud.readCollection('edificio'))
    } catch {}
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm('create')
    setEditId(null)
    setNom('')
    setSedeFk(1)
  }

  const openEdit = (item) => {
    setForm('edit')
    setEditId(item.id_edificio)
    setNom(item.nom_edificio)
    setSedeFk(item.id_sede_fk)
  }

  const handleSave = async () => {
    if (!nom.trim()) return
    try {
      const body = { nom_edificio: nom.trim(), id_sede_fk: sedeFk }
      if (form === 'edit') {
        await crud.update('edificio', editId, body)
      } else {
        await crud.insert('edificio', body)
      }
      onStatusMsg(form === 'edit' ? 'Edificio actualizado' : 'Edificio creado')
      setForm(null)
      load()
    } catch {}
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.nom_edificio}"?`)) return
    try {
      await crud.remove('edificio', item.id_edificio)
      onStatusMsg('Edificio eliminado')
      load()
    } catch {}
  }

  if (form)
    return (
      <FormShell>
        <div>
          <label className={labelCls}>Nombre</label>
          <input value={nom} onChange={(e) => setNom(e.target.value)} className={inputCls} autoFocus />
        </div>
        <FormActions onSave={handleSave} onCancel={() => setForm(null)} />
      </FormShell>
    )

  return (
    <div className="space-y-2">
      <button onClick={openCreate} className={addBtn}>
        + Agregar edificio
      </button>
      {items.length === 0 && <EmptyState text="Sin edificios registrados" />}
      {items.map((item) => (
        <Row key={item.id_edificio}>
          <span className="flex-1 truncate text-[13px] text-slate-200">{item.nom_edificio}</span>
          <RowActions onEdit={() => openEdit(item)} onDelete={() => handleDelete(item)} />
        </Row>
      ))}
    </div>
  )
}

function TabPisos({ onStatusMsg }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(null)
  const [editId, setEditId] = useState(null)
  const [numPiso, setNumPiso] = useState('')
  const [display, setDisplay] = useState('')
  const [nomPiso, setNomPiso] = useState('')
  const [edifFk, setEdifFk] = useState(1)

  const load = useCallback(async () => {
    try {
      setItems(await crud.readCollection('piso'))
    } catch {}
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm('create')
    setEditId(null)
    setNumPiso('')
    setDisplay('')
    setNomPiso('')
    setEdifFk(1)
  }

  const openEdit = (item) => {
    setForm('edit')
    setEditId(item.id_piso)
    setNumPiso(String(item.num_piso))
    setDisplay(item.display || '')
    setNomPiso(item.nom_piso)
    setEdifFk(item.id_edificio_fk)
  }

  const handleSave = async () => {
    if (!nomPiso.trim()) return
    try {
      const body = {
        num_piso: parseInt(numPiso) || 0,
        display: display.trim() || String(parseInt(numPiso) || 0),
        nom_piso: nomPiso.trim(),
        id_edificio_fk: edifFk
      }
      if (form === 'edit') {
        await crud.update('piso', editId, body)
      } else {
        await crud.insert('piso', body)
      }
      onStatusMsg(form === 'edit' ? 'Piso actualizado' : 'Piso creado')
      setForm(null)
      load()
    } catch {}
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.nom_piso}"?`)) return
    try {
      await crud.remove('piso', item.id_piso)
      onStatusMsg('Piso eliminado')
      load()
    } catch {}
  }

  if (form)
    return (
      <FormShell>
        <div>
          <label className={labelCls}>Número de piso</label>
          <input
            type="number"
            value={numPiso}
            onChange={(e) => setNumPiso(e.target.value)}
            className={inputCls}
            autoFocus
          />
        </div>
        <div>
          <label className={labelCls}>Display (S, 1, 2…)</label>
          <input
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
            placeholder={String(parseInt(numPiso) || 0)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Nombre</label>
          <input value={nomPiso} onChange={(e) => setNomPiso(e.target.value)} className={inputCls} />
        </div>
        <FormActions onSave={handleSave} onCancel={() => setForm(null)} />
      </FormShell>
    )

  return (
    <div className="space-y-2">
      <button onClick={openCreate} className={addBtn}>
        + Agregar piso
      </button>
      {items.length === 0 && <EmptyState text="Sin pisos registrados" />}
      {items.map((item) => (
        <Row key={item.id_piso}>
          <span className="flex-1 truncate text-[13px] text-slate-200">
            {item.nom_piso}{' '}
            <span className="font-mono text-[11px] text-slate-500">
              {item.display || item.num_piso}
            </span>
          </span>
          <RowActions onEdit={() => openEdit(item)} onDelete={() => handleDelete(item)} />
        </Row>
      ))}
    </div>
  )
}

function TabCategorias({ onStatusMsg }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(null)
  const [editId, setEditId] = useState(null)
  const [nom, setNom] = useState('')

  const load = useCallback(async () => {
    try {
      setItems(await crud.readCollection('categoria'))
    } catch {}
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm('create')
    setEditId(null)
    setNom('')
  }

  const openEdit = (item) => {
    setForm('edit')
    setEditId(item.id_categoria)
    setNom(item.nom_categoria)
  }

  const handleSave = async () => {
    if (!nom.trim()) return
    try {
      const body = { nom_categoria: nom.trim() }
      if (form === 'edit') {
        await crud.update('categoria', editId, body)
      } else {
        await crud.insert('categoria', body)
      }
      onStatusMsg(form === 'edit' ? 'Categoría actualizada' : 'Categoría creada')
      setForm(null)
      load()
    } catch {}
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`¿Eliminar categoría "${item.nom_categoria}"?`)) return
    try {
      await crud.remove('categoria', item.id_categoria)
      onStatusMsg('Categoría eliminada')
      load()
    } catch {}
  }

  if (form)
    return (
      <FormShell>
        <div>
          <label className={labelCls}>Nombre</label>
          <input value={nom} onChange={(e) => setNom(e.target.value)} className={inputCls} autoFocus />
        </div>
        <FormActions onSave={handleSave} onCancel={() => setForm(null)} />
      </FormShell>
    )

  return (
    <div className="space-y-2">
      <button onClick={openCreate} className={addBtn}>
        + Agregar categoría
      </button>
      {items.length === 0 && <EmptyState text="Sin categorías registradas" />}
      {items.map((item) => (
        <Row key={item.id_categoria}>
          <span className="flex-1 truncate text-[13px] text-slate-200">{item.nom_categoria}</span>
          <RowActions onEdit={() => openEdit(item)} onDelete={() => handleDelete(item)} />
        </Row>
      ))}
    </div>
  )
}

export default function AdminPanel({
  isOpen,
  onClose,
  pisos,
  habitaciones,
  onEdit,
  onDelete,
  loading,
  categorias
}) {
  const [activeTab, setActiveTab] = useState('habitaciones')
  const [statusMsg, setStatusMsg] = useState('')

  const grouped = useMemo(() => {
    if (!habitaciones || habitaciones.length === 0) return {}
    const map = {}
    for (const h of habitaciones) {
      const key = h.id_piso_fk || 0
      if (!map[key]) map[key] = []
      map[key].push(h)
    }
    return map
  }, [habitaciones])

  const getCategoriaName = (catId) => {
    const c = (categorias || []).find((c) => c.id_categoria === catId)
    return c ? c.nom_categoria : '—'
  }

  const getPisoName = (pisoId) => {
    const p = (pisos || []).find((p) => p.id_piso === pisoId)
    return p ? p.nom_piso : `Piso ${pisoId}`
  }

  useEffect(() => {
    if (!statusMsg) return
    const t = setTimeout(() => setStatusMsg(''), 3000)
    return () => clearTimeout(t)
  }, [statusMsg])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-ink-950/75 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className="panel-glass chamfer-tl absolute inset-y-0 right-0 flex w-full flex-col border-l border-white/[0.08] shadow-2xl shadow-black/80 animate-slide-in-right"
        role="dialog"
        aria-label="Administración de ubicaciones"
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3.5">
          <h2 className="flex items-center gap-2.5 font-display text-[15px] font-bold text-white">
            <span className="chamfer-sm grid h-8 w-8 place-items-center bg-brand-400/12 text-brand-400">
              <AssetIcon name="list" className="h-4 w-4" />
            </span>
            Administración
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost chamfer-sm grid h-9 w-9 place-items-center"
            aria-label="Cerrar panel"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <nav className="flex border-b border-white/[0.07] px-2" role="tablist">
          {TABS.map((tab) => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex-1 px-1 py-3 text-center text-[11px] font-semibold transition-colors duration-200 sm:text-xs ${
                  active ? 'text-brand-300' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label}
                <span
                  className={`absolute inset-x-2 bottom-0 h-[2px] origin-center bg-brand-400 transition-transform duration-300 ${
                    active ? 'scale-x-100' : 'scale-x-0'
                  }`}
                  aria-hidden="true"
                />
              </button>
            )
          })}
        </nav>

        {statusMsg && (
          <div
            role="status"
            className="border-b border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-[11px] font-medium text-emerald-200"
          >
            {statusMsg}
          </div>
        )}

        <div className="scroll-slim flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
          {activeTab === 'edificios' && <TabEdificios onStatusMsg={setStatusMsg} />}
          {activeTab === 'pisos' && <TabPisos onStatusMsg={setStatusMsg} />}
          {activeTab === 'categorias' && <TabCategorias onStatusMsg={setStatusMsg} />}
          {activeTab === 'habitaciones' &&
            (loading ? (
              <div className="py-8 text-center text-xs text-slate-500">Cargando…</div>
            ) : Object.keys(grouped).length === 0 ? (
              <EmptyState text="Sin ubicaciones registradas" />
            ) : (
              Object.entries(grouped).map(([pisoId, items]) => (
                <div key={pisoId}>
                  <h3 className="field-label mb-2 px-1">{getPisoName(parseInt(pisoId))}</h3>
                  <div className="space-y-1.5">
                    {items.map((h) => (
                      <div
                        key={h.id_habitacion}
                        className="flex items-center gap-2 border border-white/[0.06] bg-ink-900/60 px-3 py-2 transition-colors duration-150 hover:border-white/[0.13] hover:bg-ink-850"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-slate-200">
                            {h.nom_codigo}
                          </span>
                          <span className="block truncate font-mono text-[10px] text-slate-500">
                            {typeof h.coord_x === 'number' ? h.coord_x.toFixed(3) : h.coord_x}
                            {', '}
                            {typeof h.coord_y === 'number' ? h.coord_y.toFixed(3) : h.coord_y}
                            {' · '}
                            {getCategoriaName(h.id_categoria_fk)}
                          </span>
                        </div>
                        <button
                          onClick={() => onEdit(h)}
                          className={editBtn}
                          aria-label={`Editar ${h.nom_codigo}`}
                        >
                          <AssetIcon name="edit" className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(h)}
                          className={delBtn}
                          aria-label={`Eliminar ${h.nom_codigo}`}
                        >
                          <AssetIcon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ))}
        </div>
      </aside>
    </div>
  )
}