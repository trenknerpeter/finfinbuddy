import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { hasLegacyData, resolvePref } from "./prefs";

export const CURRENCIES = [
  { code: "EUR", symbol: "€", locale: "de-DE" },
  { code: "CZK", symbol: "Kč", locale: "cs-CZ" },
  { code: "USD", symbol: "$", locale: "en-US" },
  { code: "GBP", symbol: "£", locale: "en-GB" },
  { code: "CHF", symbol: "CHF", locale: "de-CH" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const isCurrency = (v: unknown): v is CurrencyCode => CURRENCIES.some((c) => c.code === v);

const CurrencyContext = createContext<{
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
}>({ currency: "CZK", setCurrency: () => {} });

const STORAGE_KEY = "finbuddy.currency";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyCode>("CZK");

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("currency");
    if (isCurrency(fromUrl)) {
      setCurrency(fromUrl);
      return;
    }
    const ls = window.localStorage;
    const pref = resolvePref(
      ls.getItem(STORAGE_KEY),
      isCurrency,
      hasLegacyData((k) => ls.getItem(k)),
      "EUR",
      "CZK",
    );
    setCurrency(pref.value);
    if (pref.persist) {
      try {
        ls.setItem(STORAGE_KEY, pref.value);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const update = (c: CurrencyCode) => {
    setCurrency(c);
    try {
      window.localStorage.setItem(STORAGE_KEY, c);
    } catch {
      /* ignore */
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency: update }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);

export function useFormatters() {
  const { currency } = useCurrency();
  const meta = CURRENCIES.find((c) => c.code === currency)!;

  const money = (value: number) => {
    const v = isFinite(value) ? value : 0;
    const decimals = Math.abs(v) >= 1000 ? 0 : 2;
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v);
  };

  const signedMoney = (value: number) => (value > 0 ? `+${money(value)}` : money(value));

  const compact = (value: number) => {
    const v = isFinite(value) ? value : 0;
    const abs = Math.abs(v);
    const unit = abs >= 1_000_000 ? "M" : abs >= 1000 ? "k" : "";
    const divisor = unit === "M" ? 1_000_000 : unit === "k" ? 1000 : 1;
    const n = v / divisor;
    const digits = unit && Math.abs(n) < 10 ? 1 : 0;
    return `${meta.symbol}${n.toFixed(digits)}${unit}`;
  };

  const percent = (value: number) => `${(isFinite(value) ? value : 0).toFixed(1)}%`;

  return { money, signedMoney, compact, percent, symbol: meta.symbol, currency };
}

/** Multiplier for money slider ranges, so CZK amounts aren't capped at EUR-sized limits. */
export const CURRENCY_SCALE: Record<CurrencyCode, number> = {
  EUR: 1,
  CZK: 25,
  USD: 1,
  GBP: 1,
  CHF: 1,
};

export const useCurrencyScale = () => CURRENCY_SCALE[useCurrency().currency];
