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
  const containerClass = [
    'flex flex-col gap-8 rounded-3xl bg-surface/5 p-6 shadow-md ring-1 ring-white/10 backdrop-blur',
    className ?? '',
  ].join(' ').trim()

  return (
    <aside
      className={containerClass.trim()}
      aria-label="Панель фильтров"
    >
      <header className="space-y-1 text-fg">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Каталог</span>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-sm text-muted">
          Настройте параметры поиска, чтобы быстрее найти нужные товары.
        </p>
      </header>

      {/* Поиск */}
      <div className="flex flex-col gap-2">
        <label htmlFor={qId} className="text-xs font-semibold uppercase tracking-wide text-muted">
          Поиск
        </label>
        <div className="relative">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M10 4a6 6 0 0 1 4.59 9.89l4.26 4.26l-1.42 1.42l-4.26-4.26A6 6 0 1 1 10 4m0 2a4 4 0 1 0 0 8a4 4 0 0 0 0-8"
            />
          </svg>
          <input
            id={qId}
            ref={inputRef}
            value={query}
            onChange={e=>onQueryChange(e.target.value)}
            placeholder="Поиск товаров..."
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-3 text-sm text-fg placeholder:text-muted shadow-sm transition focus:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          />
        </div>
      </div>

      {/* Категории */}
      <section className="flex flex-col gap-3">
        <div className="text-sm font-semibold text-fg">Категории</div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {categories.map(c=>{
            const checked = selectedCategoryIds.includes(c.id)
            const base = 'group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition'
            const state = checked
              ? 'border-primary/60 bg-primary/10 text-primary shadow-sm'
              : 'border-white/10 text-fg/80 hover:border-primary/40 hover:bg-white/10'
            const iconBase = 'flex h-5 w-5 items-center justify-center rounded-full border transition'
            const iconState = checked
              ? 'border-primary bg-primary text-white'
              : 'border-white/20 bg-white/10 text-transparent group-hover:border-primary/50 group-hover:bg-primary/10 group-hover:text-primary/80'
            return (
              <li key={c.id}>
                <label className={`${base} ${state}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={()=>onToggleCategory(c.id)}
                    className="peer sr-only"
                  />
                  <span className={`${iconBase} ${iconState}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M9.29 16.29L4.7 11.7l1.42-1.42l3.17 3.17l8.59-8.59l1.42 1.42z"
                      />
                    </svg>
                  </span>
                  <span className="font-medium">{c.label}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Цена */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-fg">Цена</span>
          <span className="text-sm font-medium text-primary">{`$${valueMin} – $${valueMax}`}</span>
        </div>

        <div className="relative h-10 select-none">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-white/10" />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-primary/40"
            style={{ left: `${rangeLeft}%`, right: `${rangeRight}%` }}
          />
          <input
            id={rangeMinId}
            type="range"
            min={minPrice}
            max={maxPrice}
            step={step}
            value={valueMin}
            onChange={e=>handleMin(Number(e.target.value))}
            className="absolute inset-0 z-10 cursor-pointer appearance-none bg-transparent focus-visible:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:height-6 [&::-moz-range-thumb]:width-6 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:background-color:rgb(var(--primary-rgb))"
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
            className="absolute inset-0 z-20 cursor-pointer appearance-none bg-transparent focus-visible:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:height-6 [&::-moz-range-thumb]:width-6 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:background-color:rgb(var(--primary-rgb))"
            aria-label="Максимальная цена"
          />
        </div>

        <div className="flex justify-between text-xs text-muted">
          <span>{`$${minPrice}`}</span>
          <span>{`$${maxPrice}`}</span>
        </div>
      </section>

      {/* Кнопка сброса */}
      <button
        onClick={onReset}
        className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
      >
        Сбросить фильтры
      </button>
    </aside>
  )
}
