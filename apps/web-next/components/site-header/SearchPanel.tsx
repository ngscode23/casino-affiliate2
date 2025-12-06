"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Loader2, Search } from "lucide-react";

import { cn } from "@shared/lib/cn";
import { useSearchSuggestions } from "./useSearchSuggestions";
import styles from "./SiteHeader.module.css";

type SearchPanelProps = {
  open: boolean;
  value: string;
  label: string;
  placeholder: string;
  lang: string;
  applyLang: (href: string, lang: string) => string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

/**
 * Отдельная панель поиска с подсказками и клавиатурной навигацией.
 * Загружается динамически, чтобы не влиять на LCP.
 */
export default function SearchPanel({
  open,
  value,
  label,
  placeholder,
  lang,
  applyLang,
  onChange,
  onSubmit,
  onClose,
}: SearchPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const listboxId = useId();
  const router = useRouter();

  const {
    suggestions,
    isLoading,
    highlightedIndex,
    activeId,
    moveHighlight,
    reset: resetSuggestions,
  } = useSearchSuggestions(value, { debounceMs: 220, minLength: 2 });

  useEffect(() => {
    if (!open) {
      resetSuggestions();
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!panelRef.current) return;
      if (panelRef.current.contains(event.target as Node)) return;
      onClose();
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose, resetSuggestions]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
      return;
    }
    if (event.key === "Enter" && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
      event.preventDefault();
      const target = suggestions[highlightedIndex];
      const href = applyLang(target.href, lang);
      router.push(href);
      onClose();
      return;
    }
    if (event.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className={cn(styles.vhSearchPanel, open && styles.vhSearchPanelOpen)}
      role="search"
      aria-label={label}
    >
      <form className={styles.vhSearchForm} onSubmit={onSubmit} role="search">
        <label className={styles.vhSearchLabel} htmlFor={inputId}>
          {label}
        </label>
        <div className={styles.vhSearchControls}>
          <div className={styles.vhSearchInputWrapper}>
            <Search size={16} aria-hidden className={styles.vhSearchInputIcon} />
            <input
              id={inputId}
              type="search"
              name="q"
              autoComplete="off"
              placeholder={placeholder}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.vhSearchInput}
              role="combobox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
            />
            {isLoading ? <Loader2 className={styles.vhSearchSpinner} size={16} aria-hidden /> : null}
          </div>
          <button type="submit" className={styles.vhSearchSubmit}>
            {label}
          </button>
        </div>
      </form>

      <ul
        id={listboxId}
        role="listbox"
        className={styles.vhSearchList}
        aria-label={label}
        aria-live="polite"
      >
        {value.trim().length >= 2 && suggestions.length === 0 && !isLoading ? (
          <li className={styles.vhSearchEmpty} role="option" aria-selected="false">
            {placeholder}
          </li>
        ) : null}

        {suggestions.map((item, index) => {
          const active = index === highlightedIndex;
          const optionId = `search-suggestion-${item.id}`;
          const href = applyLang(item.href, lang);
          return (
            <li
              key={optionId}
              id={optionId}
              role="option"
              aria-selected={active}
              className={cn(styles.vhSearchItem, active && styles.vhSearchItemActive)}
            >
              <Link href={href} onClick={onClose}>
                <span className={styles.vhSearchItemLabel}>{item.label}</span>
                {item.description ? <span className={styles.vhSearchHint}>{item.description}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
