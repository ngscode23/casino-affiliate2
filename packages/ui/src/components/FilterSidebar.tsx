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

  return (
    <aside
      className={`rounded-2xl border border-border bg-card text-text p-5 shadow-soft ${className ?? ''}`}
      aria-label="Панель фильтров"
    >
      <div className="flex items-center gap-2 mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" className="opacity-80">
          <path fill="currentColor" d="M3 5h18v2l-7 7v4l-4 2v-6L3 7z"/>
        </svg>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      {/* Поиск */}
      <label htmlFor={qId} className="block text-sm font-medium mb-2">Поиск</label>
      <input
        id={qId}
        ref={inputRef}
        value={query}
        onChange={e=>onQueryChange(e.target.value)}
        placeholder="Поиск товаров..."
        className="w-full rounded-xl border border-border bg-white px-4 py-3 text-text shadow-sm transition placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:bg-white/5"
      />

      {/* Категории */}
      <div className="mt-6">
        <div className="text-sm font-semibold mb-3">Категории</div>
        <ul className="space-y-3">
          {categories.map(c=>{
            const checked = selectedCategoryIds.includes(c.id)
            return (
              <li key={c.id} className="flex items-center gap-3">
                <input
                  id={`cat-${c.id}`}
                  type="checkbox"
                  checked={checked}
                  onChange={()=>onToggleCategory(c.id)}
                  className="h-5 w-5 rounded-md border-border text-accent accent-[var(--ui-accent)] shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)]"
                />
                <label htmlFor={`cat-${c.id}`} className="cursor-pointer select-none text-text">{c.label}</label>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Цена */}
      <div className="mt-6">
        <div className="text-sm font-semibold mb-2">
          Цена: ${valueMin} – ${valueMax}
        </div>

        {/* Обёртка с кастомным треком между ползунками */}
        <div className="relative h-10 select-none">
          {/* дорожка */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-border" />
          {/* выделенный диапазон */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-[color:var(--ui-accent)]"
            style={{ left: `${pct(valueMin)}%`, right: `${100 - pct(valueMax)}%` }}
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
            className="absolute inset-0 z-10 appearance-none bg-transparent cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[color:var(--ui-accent)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[color:var(--ui-accent-fg)] [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_var(--ui-accent-20)] [&::-moz-range-thumb]:height-6 [&::-moz-range-thumb]:width-6 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[color:var(--ui-accent-fg)] [&::-moz-range-thumb]:background-color:[color:var(--ui-accent)]"
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
            className="absolute inset-0 z-20 appearance-none bg-transparent cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[color:var(--ui-accent)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[color:var(--ui-accent-fg)] [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_var(--ui-accent-20)] [&::-moz-range-thumb]:height-6 [&::-moz-range-thumb]:width-6 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[color:var(--ui-accent-fg)] [&::-moz-range-thumb]:background-color:[color:var(--ui-accent)]"
            aria-label="Максимальная цена"
          />
        </div>
      </div>

      {/* Кнопка сброса */}
      <button
        onClick={onReset}
        className="mt-6 w-full rounded-xl border border-border bg-white px-4 py-3 font-medium text-text shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:bg-transparent dark:hover:bg-white/5"
      >
        Сбросить фильтры
      </button>
    </aside>
  )
}




