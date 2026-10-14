import { describe, expect, it } from "vitest";
import { calcSalary, formatCzk, normalizeInput, parseSalaryStore, SALARY_DEFAULTS } from "./salary";

const base = { gross: 40000, signed: true, kids: 0, kidsZtp: 0, disability: 0, ztp: false };

describe("calcSalary", () => {
  it("40,000 Kč, signed, no kids → 31,930 net (published example)", () => {
    const r = calcSalary(base);
    expect(r.social).toBe(2840);
    expect(r.health).toBe(1800);
    expect(r.taxBase).toBe(40000);
    expect(r.taxBeforeCredits).toBe(6000);
    expect(r.credits).toEqual({ payer: 2570, disability: 0, ztp: 0 });
    expect(r.tax).toBe(3430);
    expect(r.net).toBe(31930);
    expect(r.employerSocial).toBe(9920);
    expect(r.employerHealth).toBe(3600);
    expect(r.employerCost).toBe(53520);
    expect(r.aboveSocialCap).toBe(false);
  });

  it("40,000 Kč, signed, 2 kids → 35,057 net (published example)", () => {
    const r = calcSalary({ ...base, kids: 2 });
    expect(r.childBenefit).toEqual({ total: 3127, reducesTax: 3127, bonus: 0 });
    expect(r.tax).toBe(303);
    expect(r.net).toBe(35057);
  });

  it("160,000 Kč hits the 23 % band", () => {
    const r = calcSalary({ ...base, gross: 160000 });
    expect(r.social).toBe(11360);
    expect(r.health).toBe(7200);
    // 15 % × 146,901 + 23 % × 13,099 = 25,047.92 → 25,048
    expect(r.taxBeforeCredits).toBe(25048);
    expect(r.tax).toBe(22478);
    expect(r.net).toBe(118962);
    expect(r.aboveSocialCap).toBe(false);
  });

  it("200,000 Kč flags the annual social cap but does not apply it", () => {
    const r = calcSalary({ ...base, gross: 200000 });
    expect(r.social).toBe(14200);
    expect(r.taxBeforeCredits).toBe(34248);
    expect(r.net).toBe(145122);
    expect(r.aboveSocialCap).toBe(true);
  });

  it("20,000 Kč with 3 kids: tax goes to 0 and the rest is paid as bonus (mzdy.cz: 22,373)", () => {
    const r = calcSalary({ ...base, gross: 20000, kids: 3 });
    // below the minimum wage the employee tops health insurance up to the minimum base:
    // 13.5 % × 22,400 = 3,024 total, minus the employer's 9 % × 20,000 = 1,800
    expect(r.health).toBe(1224);
    expect(r.healthTopUp).toBe(324);
    expect(r.taxAfterCredits).toBe(430);
    expect(r.childBenefit).toEqual({ total: 5447, reducesTax: 430, bonus: 5017 });
    expect(r.tax).toBe(0);
    expect(r.net).toBe(22373);
  });

  it("bonus is paid at exactly half the minimum wage (11,200; mzdy.cz: 9,655)", () => {
    const r = calcSalary({ ...base, gross: 11200, kids: 1 });
    expect(r.social).toBe(796);
    expect(r.health).toBe(2016);
    expect(r.childBenefit.bonus).toBe(1267);
    expect(r.net).toBe(9655);
    expect(r.employerCost).toBe(14986);
  });

  it("employer health = 13.5 % total minus employee share (mzdy.cz, non-round gross)", () => {
    const low = calcSalary({ ...base, gross: 20001 });
    expect(low.employerHealth).toBe(1800);
    expect(low.health).toBe(1224);
    expect(low.net).toBe(16911);
    expect(low.employerCost).toBe(26762);
    const mid = calcSalary({ ...base, gross: 40001 });
    expect(mid.employerHealth).toBe(3600);
    expect(mid.health).toBe(1801);
    expect(mid.net).toBe(31914);
    expect(mid.employerCost).toBe(53522);
  });

  it("no bonus just below half the minimum wage (11,199)", () => {
    const r = calcSalary({ ...base, gross: 11199, kids: 1 });
    expect(r.childBenefit.bonus).toBe(0);
  });

  it("10,000 Kč with 1 kid: no tax, no bonus", () => {
    const r = calcSalary({ ...base, gross: 10000, kids: 1 });
    expect(r.tax).toBe(0);
    expect(r.childBenefit).toEqual({ total: 1267, reducesTax: 0, bonus: 0 });
    expect(r.health).toBe(2124);
    expect(r.net).toBe(7166);
  });

  it("unsigned declaration: no credits and no child benefit", () => {
    const r = calcSalary({ ...base, signed: false, kids: 2 });
    expect(r.credits).toEqual({ payer: 0, disability: 0, ztp: 0 });
    expect(r.childBenefit.total).toBe(0);
    expect(r.tax).toBe(6000);
    expect(r.net).toBe(29360);
  });

  it("disability III + ZTP/P stack with the payer credit", () => {
    const r = calcSalary({ ...base, disability: 3, ztp: true });
    expect(r.credits).toEqual({ payer: 2570, disability: 420, ztp: 1345 });
    expect(r.tax).toBe(1665);
    expect(r.net).toBe(33695);
  });

  it("disability I–II credit is 210", () => {
    expect(calcSalary({ ...base, disability: 1 }).credits.disability).toBe(210);
  });

  it("ZTP/P children take the highest-order slots and are doubled", () => {
    // 1,267 + 1,860 + 2 × 2,320 = 7,767
    const r = calcSalary({ ...base, kids: 3, kidsZtp: 1 });
    expect(r.childBenefit.total).toBe(7767);
    expect(r.childBenefit.bonus).toBe(4337);
    expect(r.net).toBe(39697);
  });

  it("4th and later children use the 3rd-child amount", () => {
    expect(calcSalary({ ...base, kids: 4 }).childBenefit.total).toBe(1267 + 1860 + 2320 + 2320);
  });

  it("zero gross gives zeros everywhere", () => {
    const r = calcSalary({ ...base, gross: 0, kids: 2 });
    expect(r.net).toBe(0);
    expect(r.tax).toBe(0);
    expect(r.childBenefit.bonus).toBe(0);
    expect(r.employerCost).toBe(0);
  });

  it("no health top-up at or above the minimum wage, none at zero gross", () => {
    expect(calcSalary({ ...base, gross: 22400 }).healthTopUp).toBe(0);
    expect(calcSalary({ ...base, gross: 22400 }).health).toBe(1008);
    expect(calcSalary({ ...base, gross: 0 }).health).toBe(0);
  });

  it("pay below the top-up: nothing is paid out and the rest is owed (mzdy.cz: −2,005)", () => {
    const r = calcSalary({ ...base, gross: 1000 });
    expect(r.health).toBe(2934);
    expect(r.net).toBe(-2005);
    expect(r.payout).toBe(0);
    expect(r.owed).toBe(2005);
  });

  it("break-even around 2,968 Kč", () => {
    expect(calcSalary({ ...base, gross: 2967 })).toMatchObject({ net: -1, payout: 0, owed: 1 });
    expect(calcSalary({ ...base, gross: 2968 })).toMatchObject({ net: 0, payout: 0, owed: 0 });
    expect(calcSalary({ ...base, gross: 3000 })).toMatchObject({ net: 33, payout: 33, owed: 0 });
  });

  it("payout equals net for normal salaries", () => {
    expect(calcSalary(base)).toMatchObject({ net: 31930, payout: 31930, owed: 0 });
  });

  it("exempt from the minimum base: no health top-up", () => {
    const r = calcSalary({ ...base, gross: 10000, kids: 1, exempt: true });
    expect(r.health).toBe(450);
    expect(r.healthTopUp).toBe(0);
    expect(r.net).toBe(8840);
    expect(calcSalary({ ...base, gross: 10000, kids: 1, exempt: false }).net).toBe(7166);
    expect(calcSalary({ ...base, gross: 1000, exempt: true })).toMatchObject({
      payout: 884,
      owed: 0,
    });
  });

  it("insurance never drifts by a crown from floating point (sweep)", () => {
    for (let g = 22400; g <= 300000; g += 137) {
      const r = calcSalary({ ...base, gross: g });
      expect(r.social).toBe(Math.ceil((g * 710) / 10000));
      expect(r.health).toBe(Math.ceil((g * 450) / 10000));
      expect(r.net).toBe(g - r.social - r.health - r.tax + r.childBenefit.bonus);
    }
  });
});

describe("normalizeInput", () => {
  it("clamps nonsense from a hand-edited URL", () => {
    expect(
      normalizeInput({ gross: -5, kids: 9, kidsZtp: 12, disability: 2, signed: true, ztp: "yes" }),
    ).toEqual({
      gross: 0,
      signed: true,
      kids: 6,
      kidsZtp: 6,
      disability: 0,
      ztp: false,
      exempt: false,
    });
  });

  it("rounds fractional values", () => {
    expect(normalizeInput({ gross: 40000.6, kids: 2.4, kidsZtp: 0.6 })).toMatchObject({
      gross: 40001,
      kids: 2,
      kidsZtp: 1,
    });
  });

  it("kidsZtp can never exceed kids", () => {
    expect(normalizeInput({ kids: 1, kidsZtp: 3 }).kidsZtp).toBe(1);
  });

  it("missing signed defaults to true", () => {
    expect(normalizeInput({ gross: 1 }).signed).toBe(true);
  });

  it("NaN and non-numbers become 0", () => {
    expect(normalizeInput({ gross: Number.NaN, kids: "abc" })).toMatchObject({ gross: 0, kids: 0 });
  });
});

describe("parseSalaryStore", () => {
  it("returns null for missing, invalid or non-object data", () => {
    expect(parseSalaryStore(null)).toBeNull();
    expect(parseSalaryStore("not json")).toBeNull();
    expect(parseSalaryStore("[1,2]")).toBeNull();
    expect(parseSalaryStore("42")).toBeNull();
  });

  it("parses and normalises a stored scenario", () => {
    expect(parseSalaryStore(JSON.stringify({ ...SALARY_DEFAULTS, kids: 2 }))).toEqual({
      gross: 48967,
      signed: true,
      kids: 2,
      kidsZtp: 0,
      disability: 0,
      ztp: false,
      exempt: false,
    });
  });
});

describe("formatCzk", () => {
  it("never shows a minus sign on zero", () => {
    expect(formatCzk(-0)).toBe(formatCzk(0));
    expect(formatCzk(-0)).not.toContain("-");
  });
});
