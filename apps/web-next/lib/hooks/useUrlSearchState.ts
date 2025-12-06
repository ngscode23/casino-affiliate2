"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Serializer<T> = (state: T) => URLSearchParams;
type Parser<T> = (params: URLSearchParams) => T;

type Options<T> = {
  initialState: T;
  parse: Parser<T>;
  serialize: Serializer<T>;
  mode?: "push" | "replace";
};

/**
 * Универсальный хук для синхронизации состояния с URL-параметрами без зацикливания.
 */
export function useUrlSearchState<T>({ initialState, parse, serialize, mode = "replace" }: Options<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<T>(() => initialState);
  const lastSerializedRef = useRef<string>("");
  const isApplyingFromUrl = useRef(false);
  const modeRef = useRef<"push" | "replace">(mode);

  // парсим URL при первом рендере и при смене searchParams
  useEffect(() => {
    if (!searchParams) return;
    const parsed = parse(new URLSearchParams(searchParams.toString()));
    const next = { ...initialState, ...parsed };
    const currentKey = JSON.stringify(state);
    const nextKey = JSON.stringify(next);
    if (currentKey !== nextKey) {
      isApplyingFromUrl.current = true;
      setState(next);
      isApplyingFromUrl.current = false;
    }
  }, [searchParams, parse, initialState, state]);

  // при изменении state синхронизируем в URL
  useEffect(() => {
    if (isApplyingFromUrl.current) return;
    const params = serialize(state);
    const qs = params.toString();
    if (qs === lastSerializedRef.current) return;
    lastSerializedRef.current = qs;
    const href = qs ? `?${qs}` : "";
    const effectiveMode = modeRef.current;
    if (effectiveMode === "push") {
      router.push(href, { scroll: false });
    } else {
      router.replace(href, { scroll: false });
    }
  }, [state, serialize, router]);

  const update = useCallback((partial: Partial<T>, opts?: { mode?: "push" | "replace" }) => {
    if (opts?.mode) {
      modeRef.current = opts.mode;
    }
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  return { state, setState, update };
}
