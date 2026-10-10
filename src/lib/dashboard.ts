import { buildScenario, num, solvePayment } from "./finance";
import {
  DEFAULT_ASSUMPTIONS,
  loadPlan,
  monthsToTarget,
  potAfterMonths,
  realMonthlyRate,
  targetPotFor,
  type SavedPlan,
} from "./plan";

export type InvestScenario = {
  initial: number;
  monthly: number;
  rate: number;
  years: number;
  inflation: number;
  real: boolean;
  withdrawRate: number;
  savings: boolean;
  sInitial: number;
  sMonthly: number;
  sRate: number;
};

export type MortgageScenario = {
  principal: number;
  rate: number;
  years: number;
  payment: number;
  solveTerm: boolean;
};

export type DashboardStore = {
  income: number;
};

export const DASH_KEY = "finbuddy.dashboard.v1";

function readJson<T>(key: string): Partial<T> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<T>;
  } catch {
    return null;
  }
}

export function loadInvest(): InvestScenario | null {
  const p = readJson<InvestScenario>("finbuddy.invest");
  if (!p || typeof p.initial !== "number") return null;
  return {
    initial: num(p.initial),
    monthly: num(p.monthly),
    rate: num(p.rate, 7),
    years: num(p.years, 20),
    inflation: num(p.inflation, 2),
    real: Boolean(p.real),
    withdrawRate: num(p.withdrawRate, 4),
    savings: Boolean(p.savings),
    sInitial: num(p.sInitial),
    sMonthly: num(p.sMonthly),
    sRate: num(p.sRate, 3),
  };
}

export function loadMortgage(): MortgageScenario | null {
  const p = readJson<MortgageScenario>("finbuddy.mortgage");
  if (!p || typeof p.principal !== "number") return null;
  return {
    principal: num(p.principal),
    rate: num(p.rate, 3.5),
    years: num(p.years, 20),
    payment: num(p.payment),
    solveTerm: Boolean(p.solveTerm),
  };
}

export function loadDashboard(): DashboardStore {
  const p = readJson<DashboardStore>(DASH_KEY);
  return { income: num(p?.income) };
}

export function saveDashboard(store: DashboardStore) {
  try {
    window.localStorage.setItem(DASH_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export type NetWorthRow = { year: number; assets: number; debt: number; netWorth: number };

export type DashboardMetrics = {
  assets: number;
  invested: number;
  cash: number;
  assetsSource: "plan" | "invest" | "none";
  mortgageBalance: number;
  netWorth: number;
  savingsRate: number | null;
  debtToAssets: number | null;
  readiness: number | null;
  projectedStopAge: number | null;
  targetAge: number;
  mortgagePayment: number;
  monthlyInvesting: number;
  freeCash: number | null;
  income: number;
  rows: NetWorthRow[];
};

export function deriveMetrics(input: {
  invest: InvestScenario | null;
  mortgage: MortgageScenario | null;
  plan: SavedPlan | null;
  income: number;
}): DashboardMetrics {
  const { invest, mortgage, plan, income } = input;

  // Single source of truth for what you own today: Plan if answered, otherwise the Invest tab.
  const investSavings = invest?.savings ? invest.sInitial : 0;
  const invested = plan ? num(plan.invested) : invest ? num(invest.initial) : 0;
  const cash = plan ? num(plan.cash) : investSavings;
  const assets = invested + cash;
  const pot = assets;

  const mortgageBalance = mortgage ? num(mortgage.principal) : 0;
  const netWorth = assets - mortgageBalance;

  const monthlySaving = plan
    ? num(plan.save)
    : invest
      ? num(invest.monthly) + (invest.savings ? num(invest.sMonthly) : 0)
      : 0;
  const savingsRate = income > 0 && monthlySaving > 0 ? monthlySaving / income : null;
  const debtToAssets = assets > 0 && mortgageBalance > 0 ? mortgageBalance / assets : null;

  const assumptions = plan
    ? { ret: num(plan.ret, 7), wd: num(plan.wd, 4), infl: num(plan.infl, 2) }
    : DEFAULT_ASSUMPTIONS;

  let readiness: number | null = null;
  let projectedStopAge: number | null = null;
  if (plan) {
    const target = targetPotFor(plan.spend, assumptions.wd);
    if (isFinite(target) && target > 0) readiness = pot / target;
    const months = monthsToTarget(plan, assumptions, target);
    if (months !== null) projectedStopAge = num(plan.age) + months / 12;
  }

  const mortgagePayment = mortgage
    ? mortgage.solveTerm && mortgage.payment > 0
      ? num(mortgage.payment)
      : solvePayment(mortgage.principal, mortgage.rate, mortgage.years)
    : 0;

  const freeCash = income > 0 ? income - mortgagePayment - monthlySaving : null;

  // Net worth projection: savings pot growth (real terms) minus mortgage balance.
  const rows: NetWorthRow[] = [];
  const horizon = Math.min(40, Math.max(plan ? num(plan.stop) - num(plan.age) : 0, mortgage ? Math.ceil(num(mortgage.years)) : 0, 10));
  const r = realMonthlyRate(assumptions.ret, assumptions.infl);
  const balanceByYear = mortgage
    ? buildScenario(mortgage.principal, mortgage.rate, mortgage.years * 12, mortgagePayment).balanceByYear
    : [];
  for (let y = 0; y <= horizon; y++) {
    const a = potAfterMonths(assets, monthlySaving, r, y * 12);
    const d = balanceByYear[Math.min(y, balanceByYear.length - 1)] ?? 0;
    rows.push({ year: y, assets: a, debt: d, netWorth: a - d });
  }

  return {
    assets,
    invested,
    cash,
    assetsSource: plan ? "plan" : invest ? "invest" : "none",
    mortgageBalance,
    netWorth,
    savingsRate,
    debtToAssets,
    readiness,
    projectedStopAge,
    targetAge: plan ? num(plan.stop) : 0,
    mortgagePayment,
    monthlyInvesting: monthlySaving,
    freeCash,
    income,
    rows,
  };
}
