export const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  if (!isFinite(n) || isNaN(n)) return fallback;
  return n < 0 ? 0 : n;
};

/* ---------------------------------- Invest --------------------------------- */

export type InvestYear = {
  year: number;
  contributedThisYear: number;
  totalContributed: number;
  growth: number;
  balance: number;
};

export type InvestResult = {
  finalValue: number;
  totalContributed: number;
  totalGrowth: number;
  realValue: number;
  growthShare: number;
  rows: InvestYear[];
};

export function computeInvest(input: {
  initial: number;
  monthly: number;
  rate: number;
  years: number;
  inflation: number;
}): InvestResult {
  const P0 = num(input.initial);
  const PMT = num(input.monthly);
  const years = Math.max(0, Math.round(num(input.years)));
  const r = num(input.rate) / 100 / 12;
  const n = years * 12;

  const fvAt = (months: number) =>
    r === 0
      ? P0 + PMT * months
      : P0 * Math.pow(1 + r, months) + PMT * ((Math.pow(1 + r, months) - 1) / r);

  const rows: InvestYear[] = [];
  for (let y = 0; y <= years; y++) {
    const months = y * 12;
    const balance = fvAt(months);
    const totalContributed = P0 + PMT * months;
    rows.push({
      year: y,
      contributedThisYear: y === 0 ? P0 : PMT * 12,
      totalContributed,
      growth: balance - totalContributed,
      balance,
    });
  }

  const finalValue = fvAt(n);
  const totalContributed = P0 + PMT * n;
  const totalGrowth = finalValue - totalContributed;
  const realValue = finalValue / Math.pow(1 + num(input.inflation) / 100, years);

  return {
    finalValue,
    totalContributed,
    totalGrowth,
    realValue,
    growthShare: finalValue > 0 ? totalGrowth / finalValue : 0,
    rows,
  };
}

/* --------------------------------- Mortgage -------------------------------- */

export type MortgageYear = {
  year: number;
  interestPaid: number;
  principalPaid: number;
  balance: number;
};

export type MortgageScenario = {
  rate: number;
  monthly: number;
  months: number;
  totalPaid: number;
  totalInterest: number;
  rows: MortgageYear[];
  balanceByYear: number[];
};

export function solvePayment(principal: number, annualRate: number, years: number): number {
  const P = num(principal);
  const n = Math.max(0, num(years)) * 12;
  if (n === 0) return 0;
  const r = num(annualRate) / 100 / 12;
  if (r === 0) return P / n;
  return (P * r) / (1 - Math.pow(1 + r, -n));
}

/** Returns months, or null when the payment never amortises the loan. */
export function solveMonths(principal: number, annualRate: number, monthly: number): number | null {
  const P = num(principal);
  const M = num(monthly);
  if (P === 0) return 0;
  if (M <= 0) return null;
  const r = num(annualRate) / 100 / 12;
  if (r === 0) return P / M;
  if (M <= P * r) return null;
  return -Math.log(1 - (P * r) / M) / Math.log(1 + r);
}

export function buildScenario(
  principal: number,
  annualRate: number,
  months: number,
  monthly: number,
): MortgageScenario {
  const P = num(principal);
  const r = num(annualRate) / 100 / 12;
  const n = Math.max(0, months);
  const M = num(monthly);

  const balanceAt = (k: number) => {
    const m = Math.min(k, n);
    const b =
      r === 0 ? P - M * m : P * Math.pow(1 + r, m) - M * ((Math.pow(1 + r, m) - 1) / r);
    return Math.max(0, b);
  };

  const totalYears = Math.ceil(n / 12);
  const rows: MortgageYear[] = [];
  const balanceByYear: number[] = [balanceAt(0)];

  let prevBalance = P;
  for (let y = 1; y <= totalYears; y++) {
    const monthsElapsed = Math.min(y * 12, n);
    const balance = balanceAt(monthsElapsed);
    const monthsThisYear = monthsElapsed - (y - 1) * 12;
    const paid = M * monthsThisYear;
    const principalPaid = prevBalance - balance;
    rows.push({
      year: y,
      interestPaid: Math.max(0, paid - principalPaid),
      principalPaid: Math.max(0, principalPaid),
      balance,
    });
    balanceByYear.push(balance);
    prevBalance = balance;
  }

  const totalPaid = M * n;
  return {
    rate: num(annualRate),
    monthly: M,
    months: n,
    totalPaid,
    totalInterest: Math.max(0, totalPaid - P),
    rows,
    balanceByYear,
  };
}
