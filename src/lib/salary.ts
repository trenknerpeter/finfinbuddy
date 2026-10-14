/**
 * Czech gross → net salary for employees on a standard contract (HPP), per month.
 * Pure: no React, no browser APIs. Rates are basis points so maths on whole crowns
 * stays exact (40,000 × 0.071 is 2840.0000000000005 in floating point).
 */

export type Disability = 0 | 1 | 3;

export type SalaryInput = {
  /** Monthly gross, whole Kč. */
  gross: number;
  /** "Prohlášení poplatníka" signed — required for credits and child benefit. */
  signed: boolean;
  kids: number;
  /** How many of `kids` hold a ZTP/P card (≤ kids). */
  kidsZtp: number;
  /** 0 none, 1 = degree I–II, 3 = degree III. */
  disability: Disability;
  /** Employee holds a ZTP/P card. */
  ztp: boolean;
};

/** Loose input as it arrives from URL params or localStorage. */
export type SalaryDraft = { [K in keyof SalaryInput]?: unknown };

export type SalaryRules = {
  year: number;
  employeeSocialBp: number;
  employeeHealthBp: number;
  employerSocialBp: number;
  employerHealthBp: number;
  taxBp: number;
  highTaxBp: number;
  /** Monthly tax base above which `highTaxBp` applies (36 × average wage / 12). */
  highTaxThreshold: number;
  /** Annual social insurance cap (48 × average wage). */
  socialCapYearly: number;
  payerCredit: number;
  disabilityCredit: { 1: number; 3: number };
  ztpCredit: number;
  /** Monthly benefit for the 1st, 2nd, and 3rd-and-later child. */
  childBenefit: readonly [number, number, number];
  /** Also the minimum health insurance base for employees. */
  minWage: number;
  /** Total health insurance rate (employee + employer). */
  healthTotalBp: number;
};

export const CZ_2026: SalaryRules = {
  year: 2026,
  employeeSocialBp: 710,
  employeeHealthBp: 450,
  employerSocialBp: 2480,
  employerHealthBp: 900,
  taxBp: 1500,
  highTaxBp: 2300,
  highTaxThreshold: 146901,
  socialCapYearly: 2350416,
  payerCredit: 2570,
  disabilityCredit: { 1: 210, 3: 420 },
  ztpCredit: 1345,
  childBenefit: [1267, 1860, 2320],
  minWage: 22400,
  healthTotalBp: 1350,
};

export type SalaryResult = {
  gross: number;
  social: number;
  /** Employee health insurance, including `healthTopUp`. */
  health: number;
  /** Extra health insurance the employee pays to reach the minimum base (gross below minimum wage). */
  healthTopUp: number;
  taxBase: number;
  taxBeforeCredits: number;
  credits: { payer: number; disability: number; ztp: number };
  taxAfterCredits: number;
  childBenefit: { total: number; reducesTax: number; bonus: number };
  /** Final monthly tax advance, ≥ 0. */
  tax: number;
  net: number;
  employerSocial: number;
  employerHealth: number;
  employerCost: number;
  /** Yearly gross exceeds the social cap; the cap is annual so it isn't applied here. */
  aboveSocialCap: boolean;
};

export const SALARY_KEY = "finbuddy.salary";

export const SALARY_DEFAULTS: {
  gross: number;
  signed: boolean;
  kids: number;
  kidsZtp: number;
  disability: number;
  ztp: boolean;
} = { gross: 48967, signed: true, kids: 0, kidsZtp: 0, disability: 0, ztp: false };

const MAX_KIDS = 6;

const toNum = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : 0;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** `amount` × basis points, rounded up to whole crowns. */
const pctUp = (amount: number, bp: number) => Math.ceil((amount * bp) / 10000);

export function normalizeInput(raw: SalaryDraft): SalaryInput {
  const gross = Math.max(0, Math.round(toNum(raw.gross)));
  const kids = clamp(Math.round(toNum(raw.kids)), 0, MAX_KIDS);
  const kidsZtp = clamp(Math.round(toNum(raw.kidsZtp)), 0, kids);
  const d = Math.round(toNum(raw.disability));
  const disability: Disability = d === 1 || d === 3 ? d : 0;
  return { gross, signed: raw.signed !== false, kids, kidsZtp, disability, ztp: raw.ztp === true };
}

/** ZTP/P children take the highest-order slots (largest benefit), which parents may choose. */
function childBenefitTotal(kids: number, kidsZtp: number, rules: SalaryRules) {
  let total = 0;
  for (let i = 0; i < kids; i++) {
    const amount = rules.childBenefit[Math.min(i, 2)] ?? 0;
    total += i >= kids - kidsZtp ? amount * 2 : amount;
  }
  return total;
}

export function calcSalary(input: SalaryDraft, rules: SalaryRules = CZ_2026): SalaryResult {
  const { gross, signed, kids, kidsZtp, disability, ztp } = normalizeInput(input);

  const employerSocial = pctUp(gross, rules.employerSocialBp);
  const employerHealth = pctUp(gross, rules.employerHealthBp);

  const social = pctUp(gross, rules.employeeSocialBp);
  const baseHealth = pctUp(gross, rules.employeeHealthBp);
  // Below the minimum wage the employee tops the premium up to the minimum base
  // (standard case; students, pensioners and others exempt by law are not modelled).
  const health =
    gross > 0 && gross < rules.minWage
      ? pctUp(rules.minWage, rules.healthTotalBp) - employerHealth
      : baseHealth;
  const healthTopUp = health - baseHealth;

  const taxBase = Math.ceil(gross / 100) * 100;
  const low = Math.min(taxBase, rules.highTaxThreshold);
  const high = Math.max(0, taxBase - rules.highTaxThreshold);
  const taxBeforeCredits = Math.ceil((low * rules.taxBp + high * rules.highTaxBp) / 10000);

  const credits = signed
    ? {
        payer: rules.payerCredit,
        disability: disability === 0 ? 0 : rules.disabilityCredit[disability],
        ztp: ztp ? rules.ztpCredit : 0,
      }
    : { payer: 0, disability: 0, ztp: 0 };
  const taxAfterCredits = Math.max(
    0,
    taxBeforeCredits - credits.payer - credits.disability - credits.ztp,
  );

  const total = signed ? childBenefitTotal(kids, kidsZtp, rules) : 0;
  const reducesTax = Math.min(total, taxAfterCredits);
  const bonus = gross >= rules.minWage / 2 ? total - reducesTax : 0;
  const tax = taxAfterCredits - reducesTax;

  return {
    gross,
    social,
    health,
    healthTopUp,
    taxBase,
    taxBeforeCredits,
    credits,
    taxAfterCredits,
    childBenefit: { total, reducesTax, bonus },
    tax,
    net: gross - social - health - tax + bonus,
    employerSocial,
    employerHealth,
    employerCost: gross + employerSocial + employerHealth,
    aboveSocialCap: gross * 12 > rules.socialCapYearly,
  };
}

/** Reads the Mzda tab's saved scenario (localStorage JSON). Null if absent or unusable. */
export function parseSalaryStore(raw: string | null): SalaryInput | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return normalizeInput(parsed as SalaryDraft);
  } catch {
    return null;
  }
}

const czk = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  maximumFractionDigits: 0,
});

/** Always Kč, independent of the app currency. */
export const formatCzk = (value: number) => czk.format(isFinite(value) ? value : 0);
