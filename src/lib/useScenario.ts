import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrency } from "./currency";

type Scalar = number | boolean;

/**
 * Keeps a tab's scenario in the URL query string (replace, not push) and mirrors
 * it to localStorage. On a cold visit with no query params, localStorage wins.
 */
export function useScenario<T extends Record<string, Scalar>>(storageKey: string, defaults: T) {
  const [state, setState] = useState<T>(defaults);
  const { currency } = useCurrency();
  const hydrated = useRef(false);

  const decode = useCallback(
    (params: URLSearchParams): Partial<T> => {
      const out: Record<string, Scalar> = {};
      for (const key of Object.keys(defaults)) {
        const raw = params.get(key);
        if (raw === null) continue;
        if (typeof defaults[key] === "boolean") out[key] = raw === "1" || raw === "true";
        else {
          const n = parseFloat(raw);
          if (isFinite(n)) out[key] = n;
        }
      }
      return out as Partial<T>;
    },
    [defaults],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = decode(params);
    if (Object.keys(fromUrl).length > 0) {
      setState((s) => ({ ...s, ...fromUrl }));
    } else {
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<T>;
          setState((s) => ({ ...s, ...parsed }));
        }
      } catch {
        /* ignore */
      }
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(state)) {
      params.set(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
    }
    params.set("currency", currency);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, currency, storageKey]);

  const patch = useCallback((p: Partial<T>) => setState((s) => ({ ...s, ...p })), []);

  return [state, patch] as const;
}
