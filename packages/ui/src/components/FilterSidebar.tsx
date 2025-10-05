import { useId } from 'react'
import type { Category } from './types'

type Props = {
  className?: string
  query: string
  onQueryChange: (v: string) => void
  inputRef?: React.Ref<HTMLInputElement>

  categories: Category[]
  selectedCategoryIds: string[]
  onToggleCategory: (id: string) => void

  minPrice: number
  maxPrice: number
  valueMin: number
  valueMax: number
  onPriceChange: (min: number, max: number) => void

  onReset: () => void
  title?: string
}

export default function FilterSidebar({
  className,
  query, onQueryChange, inputRef,
  categories, selectedCategoryIds, onToggleCategory,
  minPrice, maxPrice, valueMin, valueMax, onPriceChange,
  onReset,
  title = 'Фильтры',
}: Props){
  const qId = useId()
  const rangeMinId = useId()
  const rangeMaxId = useId()

  // предотвратить пересечение ползунков
  const step = 1
  const clamp = (v:number, lo:number, hi:number)=>Math.min(Math.max(v,lo),hi)
  const handleMin = (v:number)=>{
    const next = clamp(v, minPrice, valueMax - step)
    onPriceChange(next, valueMax)
  }
  const handleMax = (v:number)=>{
    const next = clamp(v, valueMin + step, maxPrice)
    onPriceChange(valueMin, next)
  }

  const pct = (v:number)=>((v - minPrice) / Math.max(1, (maxPrice - minPrice))) * 100
  const rangeLeft = Math.max(0, Math.min(100, Math.round(pct(valueMin))))
  const rangeRight = Math.max(0, Math.min(100, Math.round(100 - pct(valueMax))))

  const containerClass = `surface-elevated rounded-2xl border border-border/40 p-5 shadow-soft ${className ?? ''}`

  return (
    <aside
      className={containerClass.trim()}
      aria-label="Панель фильтров"
    >
      <div className="mb-4 flex items-center gap-2 text-fg">
        <svg width="20" height="20" viewBox="0 0 24 24" className="text-muted">
          <path fill="currentColor" d="M3 5h18v2l-7 7v4l-4 2v-6L3 7z"/>
        </svg>
        <h2 className="text-lg font-semibold text-fg">{title}</h2>
      </div>

      {/* Поиск */}
      <label htmlFor={qId} className="mb-2 block text-sm font-medium text-muted">Поиск</label>
      <input
        id={qId}
        ref={inputRef}
        value={query}
        onChange={e=>onQueryChange(e.target.value)}
        placeholder="Поиск товаров..."
        className="w-full rounded-xl border border-border/50 bg-card/70 px-4 py-3 text-sm text-fg placeholder:text-muted shadow-sm transition focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/30"
      />

      {/* Категории */}
      <div className="mt-6">
        <div className="mb-3 text-sm font-semibold text-fg">Категории</div>
        <ul className="space-y-3">
          {categories.map(c=>{
            const checked = selectedCategoryIds.includes(c.id)
            return (
              <li key={c.id} className="flex items-center gap-3 text-fg">
                <input
                  id={`cat-${c.id}`}
                  type="checkbox"
                  checked={checked}
                  onChange={()=>onToggleCategory(c.id)}
                  className="h-5 w-5 rounded-md border border-border/50 text-primary accent-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                />
                <label htmlFor={`cat-${c.id}`} className="cursor-pointer select-none text-sm text-fg">{c.label}</label>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Цена */}
      <div className="mt-6">
        <div className="mb-2 text-sm font-semibold text-fg">
          Цена: ${valueMin} – ${valueMax}
        </div>

        {/* Обёртка с кастомным треком между ползунками */}
        <div className="relative h-10 select-none">
          {/* дорожка */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-border/40" />
          {/* выделенный диапазон */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-primary/40 left-pct-${rangeLeft} right-pct-${rangeRight}`}
          />
          {/* два инпута поверх (double range) */}
          <input
            id={rangeMinId}
            type="range"
            min={minPrice}
            max={maxPrice}
            step={step}
            value={valueMin}
            onChange={e=>handleMin(Number(e.target.value))}
            className="absolute inset-0 z-10 cursor-pointer appearance-none bg-transparent focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-card [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:height-6 [&::-moz-range-thumb]:width-6 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-card [&::-moz-range-thumb]:background-color:rgb(var(--primary-rgb))"
            aria-label="Минимальная цена"
          />
          <input
            id={rangeMaxId}
            type="range"
            min={minPrice}
            max={maxPrice}
            step={step}
            value={valueMax}
            onChange={e=>handleMax(Number(e.target.value))}
            className="absolute inset-0 z-20 cursor-pointer appearance-none bg-transparent focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-card [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:height-6 [&::-moz-range-thumb]:width-6 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-card [&::-moz-range-thumb]:background-color:rgb(var(--primary-rgb))"
            aria-label="Максимальная цена"
          />
        </div>
      </div>

      {/* Кнопка сброса */}
      <button
        onClick={onReset}
        className="mt-6 w-full rounded-xl border border-border/50 bg-card/70 px-4 py-3 font-medium text-fg transition hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        Сбросить фильтры
      </button>
    </aside>
  )
}
