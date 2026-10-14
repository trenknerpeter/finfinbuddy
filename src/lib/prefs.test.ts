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
    expect(resolvePref("cs", isLang, true, "en")).toEqual({ value: "cs", persist: false });
  });

  it("an existing user who never chose keeps the old default, and it gets saved", () => {
    expect(resolvePref(null, isLang, true, "en")).toEqual({ value: "en", persist: true });
  });

  it("a first-time visitor keeps the new default (nothing to change)", () => {
    expect(resolvePref(null, isLang, false, "en")).toBeNull();
  });

  it("an invalid saved value counts as no choice", () => {
    expect(resolvePref("de", isLang, true, "en")).toEqual({ value: "en", persist: true });
  });
});
