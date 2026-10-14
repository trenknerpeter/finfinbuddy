import type { CurrencyCode } from "./currency";

/** A tab's starting values: fixed, or chosen by currency (CZK amounts aren't EUR × 25). */
export type ScenarioDefaults<T> = T | ((currency: CurrencyCode) => T);

export const resolveDefaults = <T>(defaults: ScenarioDefaults<T>, currency: CurrencyCode): T =>
  typeof defaults === "function" ? (defaults as (c: CurrencyCode) => T)(currency) : defaults;

/** Realistic Czech sample values for CZK; `base` for every other currency. */
export const byCurrency =
  <T>(base: T, czk: T) =>
  (currency: CurrencyCode): T =>
    currency === "CZK" ? czk : base;

/**
 * Re-applies `defaults` to every field the user doesn't own (neither loaded from a
 * link or storage nor edited). Returns `state` itself when nothing changes.
 */
export function fillUnowned<T extends Record<string, unknown>>(
  state: T,
  defaults: T,
  owned: ReadonlySet<string>,
): T {
  let next: T | null = null;
  for (const key of Object.keys(defaults) as (keyof T & string)[]) {
    if (owned.has(key) || state[key] === defaults[key]) continue;
    next ??= { ...state };
    next[key] = defaults[key];
  }
  return next ?? state;
}
