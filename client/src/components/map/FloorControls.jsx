function StepButton({ direction, enabled, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      className={`chamfer-sm grid h-11 w-11 shrink-0 place-items-center border transition-colors duration-150 ${
        enabled
          ? 'btn-ghost border-white/10 text-slate-300 hover:border-brand-400/40 hover:text-brand-300'
          : 'cursor-not-allowed border-white/[0.04] text-slate-700'
      }`}
      aria-label={label}
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-4 w-4 ${direction === 'down' ? 'rotate-90' : '-rotate-90'}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  )
}

export default function FloorControls({
  currentPiso,
  canGoUp,
  canGoDown,
  goUp,
  goDown,
  sortedPisos,
  onSelectFloor
}) {
  if (!currentPiso) return null

  const currentIdx = sortedPisos.findIndex((p) => p.id_piso === currentPiso.id_piso)

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <StepButton direction="down" enabled={canGoDown} onClick={goDown} label="Piso anterior" />

      <div className="flex items-center gap-2 px-1">
        <div className="flex flex-col items-center">
          <span className="font-display text-2xl font-extrabold leading-none text-brand-400 sm:text-[28px]">
            {currentPiso.display || currentPiso.num_piso}
          </span>
          <span className="mt-1 max-w-[6.5rem] truncate text-center text-[10px] leading-tight text-slate-500">
            {currentPiso.nom_piso}
          </span>
        </div>

        {/* Escalera de pisos: barra activa + ticks navegables.
            Se oculta en móvil para dejar respirar a la barra inferior. */}
        <div className="hidden flex-col items-center gap-[3px] py-1 sm:flex">
          {sortedPisos.map((p, i) => {
            const active = i === currentIdx
            return (
              <button
                key={p.id_piso}
                type="button"
                onClick={() => onSelectFloor?.(p.id_piso)}
                disabled={!onSelectFloor}
                title={`Ir a ${p.nom_piso}`}
                aria-label={`Ir a ${p.nom_piso}`}
                aria-current={active}
                className={`h-[3px] rounded-full transition-all duration-300 no-tap-highlight ${
                  active
                    ? 'w-5 bg-brand-400'
                    : onSelectFloor
                      ? 'w-2.5 bg-slate-700 hover:w-4 hover:bg-slate-500'
                      : 'w-2.5 bg-slate-700'
                }`}
              />
            )
          })}
        </div>
      </div>

      <StepButton direction="up" enabled={canGoUp} onClick={goUp} label="Piso siguiente" />
    </div>
  )
}