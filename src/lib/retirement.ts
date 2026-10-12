import { num, solveMonths, solvePayment } from "./finance";
import {
  monthsToTarget,
  potsAfterMonths,
  startPot,
  targetPotFor,
  type PlanAssumptions,
  type PlanProfile,
} from "./plan";

/** The saved Mortgage-tab fields the retirement maths needs. */
export type MortgageInput = {
  principal: number;
  rate: number;
  years: number;
  payment: number;
  solveTerm: boolean;
};

export type MortgageSchedule = {
  payment: number;
  /** Months until paid off; null if the payment never amortises the loan. */
  months: number | null;
  /** Nominal balance after each month; index 0 is today. */
  balances: number[];
};

/** Month-by-month amortisation, honouring both Mortgage-tab modes. */
export function mortgageSchedule(m: MortgageInput): MortgageSchedule {
  const P = num(m.principal);
  const r = num(m.rate) / 100 / 12;
  const payment = m.solveTerm ? num(m.payment) : solvePayment(P, m.rate, m.years);
  const solved = m.solveTerm ? solveMonths(P, m.rate, payment) : Math.max(0, num(m.years)) * 12;
  const months = solved === null ? null : Math.round(solved);
  const balances = [P];
  // Without amortisation the balance never falls; cap the schedule at 90 years.
  const limit = months ?? 1080;
  let balance = P;
  for (let i = 1; i <= limit && balance > 0.5; i++) {
    balance = Math.max(0, balance + balance * r - payment);
    balances.push(balance);
  }
  if (months !== null) balances.push(0);
  return { payment, months, balances };
}

/** Remaining balance after n months, in today's money. */
export function realBalanceAt(s: MortgageSchedule | null, n: number, inflation: number): number {
  if (!s) return 0;
  const i = Math.max(0, Math.round(n));
  const nominal = i < s.balances.length ? s.balances[i]! : s.months === null ? s.balances[s.balances.length - 1]! : 0;
  return nominal / Math.pow(1 + num(inflation) / 100, i / 12);
}

export type Milestones = {
  target: number;
  /** Months until the pot covers spending (milestone 1). */
  livingMonths: number | null;
  /** Months until the pot also covers the remaining mortgage (milestone 2). */
  debtFreeMonths: number | null;
  /** Mortgage still owed at milestone 1, in today's money. */
  owedAtLiving: number;
};

/** Milestone 1 (live on your number) and milestone 2 (also clear the mortgage). */
export function retirementMilestones(
  profile: PlanProfile,
  assumptions: PlanAssumptions,
  schedule: MortgageSchedule | null,
): Milestones {
  const target = targetPotFor(profile.spend, assumptions.wd);
  const livingMonths = monthsToTarget(profile, assumptions, target);
  const debtAt = (m: number) => realBalanceAt(schedule, m, assumptions.infl);
  const owedAtLiving = livingMonths === null ? 0 : debtAt(livingMonths);

  let debtFreeMonths: number | null = livingMonths;
  if (livingMonths !== null && owedAtLiving > 0.5 && isFinite(target)) {
    debtFreeMonths = null;
    const maxMonths = Math.max(0, Math.round((90 - num(profile.age)) * 12));
    for (let m = livingMonths; m <= maxMonths; m++) {
      const pot = m === 0 ? startPot(profile) : potsAfterMonths(profile, assumptions, m).total;
      if (pot >= target + debtAt(m)) {
        debtFreeMonths = m;
        break;
      }
    }
  }
  return { target, livingMonths, debtFreeMonths, owedAtLiving };
}

export const ageAt = (profile: Pick<PlanProfile, "age">, months: number) =>
  Math.round(num(profile.age) + months / 12);

/** Home value after n months, in today's money. Grows only if price growth is on. */
export function homeValueAt(
  home: { homeValue: number; homeGrowth: boolean; homeRate: number },
  n: number,
): number {
  const v = num(home.homeValue);
  if (!home.homeGrowth) return v;
  return v * Math.pow(1 + num(home.homeRate) / 100, Math.max(0, n) / 12);
}
