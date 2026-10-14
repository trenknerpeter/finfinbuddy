import { describe, expect, it } from "vitest";
import { hasLegacyData, resolvePref } from "./prefs";

const storage = (items: Record<string, string>) => (k: string) => items[k] ?? null;

describe("hasLegacyData", () => {
  it("is false for a first-time visitor", () => {
    expect(hasLegacyData(storage({}))).toBe(false);
  });

  it("is true when any pre-Mzda scenario is saved", () => {
    expect(hasLegacyData(storage({ "finbuddy.invest": "{}" }))).toBe(true);
    expect(hasLegacyData(storage({ "finbuddy.snapshots.v1": "[]" }))).toBe(true);
  });

  it("ignores Mzda's own key, which only exists after this release", () => {
    expect(hasLegacyData(storage({ "finbuddy.salary": "{}" }))).toBe(false);
  });
});

describe("resolvePref", () => {
  const isLang = (v: unknown): v is "en" | "cs" => v === "en" || v === "cs";

  it("a saved choice always wins", () => {
    expect(resolvePref("cs", isLang, true, "en", "cs")).toEqual({ value: "cs", persist: false });
  });

  it("an existing user who never chose keeps the old default, and it gets saved", () => {
    expect(resolvePref(null, isLang, true, "en", "cs")).toEqual({ value: "en", persist: true });
  });

  it("a first-time visitor gets the new default, saved so later visits don't look like an old user", () => {
    expect(resolvePref(null, isLang, false, "en", "cs")).toEqual({ value: "cs", persist: true });
  });

  it("an invalid saved value counts as no choice", () => {
    expect(resolvePref("de", isLang, true, "en", "cs")).toEqual({ value: "en", persist: true });
  });
});
