import { useState, useRef, useEffect, useCallback } from 'react'
import AssetIcon from '../icons/AssetIcon.jsx'
import { categoriaIconName, categoriaNombre } from '../../lib/categorias.js'

export default function SearchInput({ label, placeholder, onSelect, searchFn, value, defaultValue, onChange }) {
  const [query, setQuery] = useState(() => value ?? defaultValue ?? '')
  const [results, setResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [focused, setFocused] = useState(false)
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const isControlled = value !== undefined

  const handleInput = useCallback(
    (e) => {
      const val = e.target.value
      if (!isControlled) setQuery(val)
      setSelectedId(null)
      setActiveIdx(-1)
      onChange?.(val)
      if (searchFn) {
        setResults(searchFn(val))
        setShowResults(true)
      }
    },
    [searchFn, onChange, isControlled]
  )

  const handleSelect = useCallback(
    (item) => {
      if (!isControlled) setQuery(item.name)
      setSelectedId(item.id)
      setShowResults(false)
      setActiveIdx(-1)
      onChange?.(item.name)
      onSelect?.(item)
    },
    [onChange, onSelect, isControlled]
  )

  const handleClear = useCallback(() => {
    setQuery('')
    setResults([])
    setSelectedId(null)
    setActiveIdx(-1)
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (e) => {
      if (!showResults || results.length === 0) {
        if (e.key === 'Escape') setShowResults(false)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => (i + 1) % results.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => (i <= 0 ? results.length - 1 : i - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleSelect(results[activeIdx >= 0 ? activeIdx : 0])
      } else if (e.key === 'Escape') {
        setShowResults(false)
        setActiveIdx(-1)
      }
    },
    [showResults, results, activeIdx, handleSelect]
  )

  useEffect(() => {
    if (isControlled && value !== query) setQuery(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    if (!isControlled && defaultValue !== undefined && defaultValue !== query) setQuery(defaultValue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowResults(false)
        setActiveIdx(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return
    const el = listRef.current.children[activeIdx]
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  const getIcon = (item) => categoriaIconName(item.categoriaId)
  const getCategoryName = (item) => categoriaNombre(item.categoriaId)

  return (
    <div ref={wrapperRef} className="w-full">
      {label && <label className="field-label">{label}</label>}

      <div className="relative">
        <span
          className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
            focused ? 'text-brand-400' : 'text-slate-500'
          }`}
        >
          <AssetIcon name="search" className="h-4 w-4" />
        </span>

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showResults && results.length > 0}
          aria-autocomplete="list"
          value={query}
          onChange={handleInput}
          onFocus={() => {
            setFocused(true)
            if (query && results.length > 0) setShowResults(true)
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Buscar…'}
          className={`field chamfer-sm py-2.5 pl-10 pr-9 text-sm no-tap-highlight ${
            focused ? 'text-white' : ''
          }`}
          autoComplete="off"
        />

        {query && (
          <button
            onClick={handleClear}
            className="no-tap-highlight absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 transition-colors hover:text-slate-200"
            aria-label="Limpiar búsqueda"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}

        {showResults && results.length > 0 && (
          <div
            ref={listRef}
            className="panel chamfer absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto scroll-slim p-1 shadow-2xl shadow-black/60 animate-pop-in"
            role="listbox"
          >
            {results.map((item, i) => {
              const active = i === activeIdx
              const picked = selectedId === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => handleSelect(item)}
                  className={`flex w-full items-center gap-3 px-2.5 py-2 text-left transition-colors duration-100 ${
                    active ? 'bg-white/[0.06]' : 'bg-transparent'
                  } ${picked ? 'text-brand-300' : 'text-slate-200'}`}
                >
                  <span
                    className={`chamfer-sm grid h-7 w-7 place-items-center border transition-colors duration-200 ${
                      active || picked
                        ? 'border-brand-400/40 bg-brand-400/10 text-brand-400'
                        : 'border-white/10 bg-white/[0.03] text-slate-400'
                    }`}
                  >
                    <AssetIcon name={getIcon(item)} className="h-3.5 w-3.5" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{item.name}</span>
                    <span className="block truncate text-[10px] text-slate-500">
                      {getCategoryName(item)}
                      {getCategoryName(item) && item.floor ? ' · ' : ''}
                      {item.floor || ''}
                    </span>
                  </span>

                  {item.display && (
                    <span className="chip chamfer-sm shrink-0 font-mono text-[10px] text-slate-400">
                      {item.display}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}