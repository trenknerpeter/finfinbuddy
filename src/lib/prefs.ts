/**
 * Language and currency defaults changed to cs/CZK. People who used the app before
 * and never picked either still expect en/EUR, so they keep the old default.
 */

/** Keys that exist only if someone used the app before Mzda was added. */
const LEGACY_KEYS = [
  "finbuddy.invest",
  "finbuddy.mortgage",
  "finbuddy.profile.v1",
  "finbuddy.dashboard.v1",
  "finbuddy.snapshots.v1",
] as const;

export function hasLegacyData(getItem: (key: string) => string | null): boolean {
  return LEGACY_KEYS.some((k) => getItem(k) !== null);
}

/**
 * What to use on mount: the saved choice, else the old default for existing users,
 * else the new default. Anything not already saved is persisted, so a new visitor's
 * own scenario data never makes them look like an existing user on the next load.
 */
export function resolvePref<T>(
  stored: unknown,
  isValid: (v: unknown) => v is T,
  legacy: boolean,
  legacyDefault: T,
  newDefault: T,
): { value: T; persist: boolean } {
  if (isValid(stored)) return { value: stored, persist: false };
  return { value: legacy ? legacyDefault : newDefault, persist: true };
}
