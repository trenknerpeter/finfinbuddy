import { num } from "./finance";

export type PlanProfile = {
  age: number;
  stop: number;
  spend: number;
  pot: number;
  save: number;
};

export type PlanAssumptions = {
  ret: number;
  wd: number;
  infl: number;
};

export type SavedPlan = PlanProfile & PlanAssumptions;

export const PLAN_KEY = "finbuddy.profile.v1";

export const DEFAULT_ASSUMPTIONS: PlanAssumptions = { ret: 7, wd: 4, infl: 2 };

export function loadPlan(): SavedPlan | null {
  try {
    const raw = window.localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<SavedPlan>;
    if (typeof p.age !== "number" || typeof p.stop !== "number") return null;
    return {
      age: num(p.age, 35),
      stop: num(p.stop, 60),
      spend: num(p.spend, 2500),
      pot: num(p.pot, 25000),
      save: num(p.save, 500),
      ret: num(p.ret, 7),
      wd: num(p.wd, 4),
      infl: num(p.infl, 2),
    };
  } catch {
    return null;
  }
}

export function savePlan(plan: SavedPlan) {
  try {
    window.localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch {
    /* ignore */
  }
}

/** Real (today's-money) monthly rate from a nominal annual return and inflation. */
export function realMonthlyRate(nominalAnnual: number, inflation: number): number {
  const realAnnual = (1 + num(nominalAnnual) / 100) / (1 + num(inflation) / 100) - 1;
  return realAnnual / 12;
}

/** The pot that funds `monthlySpend` forever at the given safe withdrawal rate. */
export function targetPotFor(monthlySpend: number, withdrawalRate: number): number {
  const wd = num(withdrawalRate);
  if (wd <= 0) return Infinity;
  return (num(monthlySpend) * 12) / (wd / 100);
}

/** Pot after n months of contributions at monthly rate r. */
export function potAfterMonths(P0: number, PMT: number, r: number, n: number): number {
  const months = Math.max(0, Math.round(n));
  if (months === 0) return num(P0);
  if (r === 0) return num(P0) + num(PMT) * months;
  const g = Math.pow(1 + r, months);
  return num(P0) * g + (num(PMT) * (g - 1)) / r;
}

/** First month from now where the pot reaches the target, searching to age 90. null if never. */
export function monthsToTarget(
  profile: PlanProfile,
  assumptions: PlanAssumptions,
  target: number,
): number | null {
  if (!isFinite(target)) return null;
  if (num(profile.pot) >= target) return 0;
  const r = realMonthlyRate(assumptions.ret, assumptions.infl);
  const maxMonths = Math.max(0, Math.round((90 - num(profile.age)) * 12));
  for (let m = 1; m <= maxMonths; m++) {
    if (potAfterMonths(profile.pot, profile.save, r, m) >= target) return m;
  }
  return null;
}

/** Monthly saving needed to hit the target exactly at the stop age. null if no time left. */
export function requiredMonthly(
  profile: PlanProfile,
  assumptions: PlanAssumptions,
  target: number,
): number | null {
  const n = Math.max(0, Math.round((num(profile.stop) - num(profile.age)) * 12));
  if (n === 0 || !isFinite(target)) return null;
  const r = realMonthlyRate(assumptions.ret, assumptions.infl);
  if (r === 0) return Math.max(0, (target - num(profile.pot)) / n);
  const g = Math.pow(1 + r, n);
  return Math.max(0, ((target - num(profile.pot) * g) * r) / (g - 1));
}

/** Monthly spending the projected pot at the stop age would actually fund. */
export function affordableSpend(
  profile: PlanProfile,
  assumptions: PlanAssumptions,
): number {
  const n = Math.max(0, Math.round((num(profile.stop) - num(profile.age)) * 12));
  const r = realMonthlyRate(assumptions.ret, assumptions.infl);
  const pot = potAfterMonths(profile.pot, profile.save, r, n);
  return (pot * (num(assumptions.wd) / 100)) / 12;
}

/** Nominal annual return needed to hit the target at the stop age. null if it exceeds 15%. */
export function requiredReturn(
  profile: PlanProfile,
  assumptions: PlanAssumptions,
  target: number,
): number | null {
  const n = Math.max(0, Math.round((num(profile.stop) - num(profile.age)) * 12));
  if (n === 0 || !isFinite(target)) return null;
  const f = (nominal: number) =>
    potAfterMonths(profile.pot, profile.save, realMonthlyRate(nominal, assumptions.infl), n);
  if (f(15) < target) return null;
  let lo = 0;
  let hi = 30;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) >= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

export type PlanYearRow = {
  age: number;
  contributed: number;
  growth: number;
  balance: number;
};

/** Yearly projection rows from the current age to a few years past the later of stop/reached. */
export function planRows(
  profile: PlanProfile,
  assumptions: PlanAssumptions,
  reachedAge: number | null,
): PlanYearRow[] {
  const r = realMonthlyRate(assumptions.ret, assumptions.infl);
  const start = Math.round(num(profile.age));
  const later = Math.max(Math.round(num(profile.stop)), reachedAge ?? 0);
  const end = Math.min(90, later + 3);
  const rows: PlanYearRow[] = [];
  for (let age = start; age <= end; age++) {
    const months = (age - start) * 12;
    const balance = potAfterMonths(profile.pot, profile.save, r, months);
    const contributed = num(profile.pot) + num(profile.save) * months;
    rows.push({
      age,
      contributed,
      growth: Math.max(0, balance - contributed),
      balance,
    });
  }
  return rows;
}
