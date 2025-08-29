// src/components/FilterBar.tsx
import { useId } from "react";
import Button from "@/components/common/button";

export type Props = {
  q: string;
  onChange: (value: string) => void;
  onReset?: () => void;
  children?: React.ReactNode;
  className?: string;
};

export default function FilterBar({
  q,
  onChange,
  onReset,
  children,
  className = "",
}: Props) {
  const qid = useId();

  return (
    <div className={`flex flex-col sm:flex-row gap-3 items-stretch sm:items-end ${className}`}>
      <div className="flex-1">
        <label htmlFor={qid} className="text-xs text-[var(--text-dim)]">
          Поиск по названию
        </label>
        <input
          id={qid}
          className="neon-input w-full mt-1"
          placeholder="Введите название…"
          value={q}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      {children ? <div className="flex items-end gap-3">{children}</div> : null}

      {onReset ? (
        <Button variant="soft" onClick={onReset} className="shrink-0">
          Сбросить
        </Button>
      ) : null}
    </div>
  );
}



