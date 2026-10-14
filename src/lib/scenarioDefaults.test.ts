import { describe, expect, it } from "vitest";
import { byCurrency, fillUnowned, resolveDefaults } from "./scenarioDefaults";

const EUR = { amount: 500, rate: 3.5, on: false };
const CZK = { amount: 3000, rate: 4.5, on: false };

describe("byCurrency", () => {
  const pick = byCurrency(EUR, CZK);

  it("uses the CZK set for CZK", () => {
    expect(pick("CZK")).toBe(CZK);
  });

  it("uses the base set for every other currency", () => {
    expect(pick("EUR")).toBe(EUR);
    expect(pick("USD")).toBe(EUR);
    expect(pick("GBP")).toBe(EUR);
  });
});

describe("resolveDefaults", () => {
  it("returns a plain object as is", () => {
    expect(resolveDefaults(EUR, "CZK")).toBe(EUR);
  });

  it("calls a function with the currency", () => {
    expect(resolveDefaults(byCurrency(EUR, CZK), "CZK")).toBe(CZK);
  });
});

describe("fillUnowned", () => {
  it("replaces every field when the user owns none (untouched sample values)", () => {
    expect(fillUnowned(EUR, CZK, new Set())).toEqual(CZK);
  });

  it("keeps fields the user loaded or edited, fills the rest from the new defaults", () => {
    const saved = { amount: 180000, rate: 3.5, on: false };
    expect(fillUnowned(saved, EUR, new Set(["amount"]))).toEqual({
      amount: 180000,
      rate: 3.5,
      on: false,
    });
    expect(fillUnowned({ ...EUR, amount: 9 }, CZK, new Set(["amount"]))).toEqual({
      amount: 9,
      rate: 4.5,
      on: false,
    });
  });

  it("returns the same object when nothing changes (no extra render)", () => {
    expect(fillUnowned(CZK, CZK, new Set())).toBe(CZK);
  });
});
