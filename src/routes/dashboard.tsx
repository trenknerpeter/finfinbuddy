import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel } from "@/components/Panel";
import { SnapshotBar } from "@/components/dashboard/SnapshotBar";
import { useFormatters } from "@/lib/currency";
import {
  deriveMetrics,
  loadDashboard,
  loadInvest,
  loadMortgage,
  saveDashboard,
  type DashboardStore,
  type NetWorthRow,
} from "@/lib/dashboard";
import { useT } from "@/lib/i18n";
import { loadPlan } from "@/lib/plan";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — FinBuddy" },
      {
        name: "description",
        content:
          "Your whole financial picture on one page: net worth, savings rate, and where you're headed — built from your Invest, Mortgage and Plan tabs.",
      },
      { property: "og:title", content: "Dashboard — FinBuddy" },
      {
        property: "og:description",
        content: "Net worth, savings rate and retirement readiness, live from your other tabs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Kpi({
  label,
  value,
  caption,
  accent,
}: {
  label: string;
  value: string;
  caption?: string;
  accent?: boolean;
}) {
  const len = value.length;
  const size =
    len > 16
      ? "text-[clamp(1.05rem,1.6vw,1.4rem)]"
      : len > 13
        ? "text-[clamp(1.2rem,2vw,1.7rem)]"
        : "text-[clamp(1.4rem,2.4vw,2rem)]";
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tnum mt-2 whitespace-nowrap font-semibold tracking-tight",
          size,
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
      {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}

function NetWorthChart({ rows }: { rows: NetWorthRow[] }) {
  const { money, compact } = useFormatters();
  const { t } = useT();
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="year"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickMargin={10}
            minTickGap={24}
            tickFormatter={(y: number) => t("Year {n}", { n: y })}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={60}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(v: number) => compact(v)}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload as NetWorthRow;
              return (
                <div className="rounded-md border border-border bg-card p-3 text-xs">
                  <p className="mb-2 font-semibold">{t("Year {n}", { n: String(label) })}</p>
                  <dl className="tnum space-y-1">
                    <div className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">{t("Net worth")}</dt>
                      <dd className="font-medium">{money(p.netWorth)}</dd>
                    </div>
                    <div className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">{t("Assets")}</dt>
                      <dd className="text-primary">{money(p.assets)}</dd>
                    </div>
                    <div className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">{t("Debt")}</dt>
                      <dd>{money(p.debt)}</dd>
                    </div>
                  </dl>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="assets"
            stroke="var(--accent)"
            strokeWidth={1.5}
            fill="var(--accent)"
            fillOpacity={0.12}
            animationDuration={200}
          />
          <Line
            type="monotone"
            dataKey="netWorth"
            stroke="var(--foreground)"
            strokeWidth={2}
            dot={false}
            animationDuration={200}
          />
          <Line
            type="monotone"
            dataKey="debt"
            stroke="var(--muted-foreground)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            animationDuration={200}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function Dashboard() {
  const { t, count } = useT();
  const { money, percent } = useFormatters();
  const [store, setStore] = useState<DashboardStore>({ income: 0 });
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState<{
    invest: ReturnType<typeof loadInvest>;
    mortgage: ReturnType<typeof loadMortgage>;
    plan: ReturnType<typeof loadPlan>;
  }>({ invest: null, mortgage: null, plan: null });

  useEffect(() => {
    setStore(loadDashboard());
    setSaved({ invest: loadInvest(), mortgage: loadMortgage(), plan: loadPlan() });
    setHydrated(true);
  }, []);

  const update = (p: Partial<DashboardStore>) => {
    setStore((s) => {
      const next = { ...s, ...p };
      saveDashboard(next);
      return next;
    });
  };

  const hasAnyData = Boolean(saved.invest || saved.mortgage || saved.plan);
  const { invest, mortgage, plan } = saved;
  const income = store.income;

  const m = useMemo(
    () => deriveMetrics({ invest, mortgage, plan, income }),
    [invest, mortgage, plan, income],
  );

  if (!hydrated) return null;

  const showEmpty = !hasAnyData;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("Dashboard")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Based on what you've saved in the other tabs. Everything stays in your browser.")}
          </p>
        </div>
      </div>

      <SnapshotBar />

      {showEmpty ? (
        <Panel className="py-14 text-center">
          <p className="text-base font-semibold">{t("Nothing here yet")}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t("Fill in your numbers in Invest, Mortgage and Plan — the dashboard brings them together here.")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm font-medium">
            <Link to="/invest" className="text-primary hover:underline">
              {t("Set up your investments →")}
            </Link>
            <Link to="/mortgage" className="text-primary hover:underline">
              {t("Set up your mortgage →")}
            </Link>
            <Link to="/plan" className="text-primary hover:underline">
              {t("Answer the five questions →")}
            </Link>
          </div>
        </Panel>
      ) : (
        <>
          {/* Where you stand */}
          <section>
            <h2 className="mb-3 text-sm font-semibold tracking-tight">{t("Where you stand")}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi
                label={t("Net worth")}
                value={money(m.netWorth)}
                caption={t("Assets minus debts")}
                accent={m.netWorth >= 0}
              />
              <Kpi
                label={t("Savings rate")}
                value={m.savingsRate !== null ? percent(m.savingsRate * 100) : "—"}
                caption={
                  m.savingsRate !== null ? t("of your monthly income") : t("Add your income below")
                }
              />
              <Kpi
                label={t("Debt-to-assets")}
                value={m.debtToAssets !== null ? percent(m.debtToAssets * 100) : "—"}
                caption={t("Mortgage balance vs. what you own")}
              />
              <Kpi
                label={t("Retirement readiness")}
                value={m.readiness !== null ? percent(m.readiness * 100) : "—"}
                caption={
                  m.projectedStopAge !== null
                    ? t("Stop work at {age}", { age: Math.round(m.projectedStopAge) })
                    : m.readiness !== null
                      ? t("of your number")
                      : t("Answer the five questions →")
                }
              />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Where your money goes */}
            <Panel title={t("Where your money goes")}>
              <div className="mb-5">
                <label
                  htmlFor="dashboard-income"
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {t("Monthly net income")}
                </label>
                <input
                  id="dashboard-income"
                  type="number"
                  min={0}
                  value={store.income || ""}
                  placeholder={money(3000)}
                  onChange={(e) => update({ income: Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="tnum mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {t(
                    "What lands in your account each month. Used only for the savings rate — stored in this browser.",
                  )}
                </p>
              </div>
              {m.income > 0 ? (
                <>
                  <div className="flex h-4 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-foreground"
                      style={{ width: `${Math.min(100, (m.mortgagePayment / m.income) * 100)}%` }}
                    />
                    <div
                      className="bg-primary"
                      style={{ width: `${Math.min(100, (m.monthlyInvesting / m.income) * 100)}%` }}
                    />
                    <div className="flex-1 bg-muted" />
                  </div>
                  <dl className="tnum mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <span className="size-2.5 rounded-sm bg-foreground" />
                        {t("Mortgage payment")}
                      </dt>
                      <dd className="font-medium">{money(m.mortgagePayment)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <span className="size-2.5 rounded-sm bg-primary" />
                        {t("Investing")}
                      </dt>
                      <dd className="font-medium">{money(m.monthlyInvesting)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <span className="size-2.5 rounded-sm bg-muted" />
                        {t("Free cash")}
                      </dt>
                      <dd className="font-medium">{money(Math.max(0, m.freeCash ?? 0))}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("Add your income below")}</p>
              )}
            </Panel>

            {/* Where you're headed */}
            <Panel title={t("Where you're headed")}>
              <p className="mb-4 text-xs text-muted-foreground">
                {t("Net worth over time — savings growth minus the mortgage balance.")}
              </p>
              <NetWorthChart rows={m.rows} />
              <p className="tnum mt-3 text-xs text-muted-foreground">
                {t("In {years}: {v}", {
                  years: count(m.rows.length - 1, "year"),
                  v: money(m.rows[m.rows.length - 1]?.netWorth ?? 0),
                })}
              </p>
            </Panel>
          </div>

          {/* Missing-data hints */}
          {(!saved.invest || !saved.mortgage || !saved.plan) && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
              {!saved.invest && (
                <Link to="/invest" className="text-primary hover:underline">
                  {t("Set up your investments →")}
                </Link>
              )}
              {!saved.mortgage && (
                <Link to="/mortgage" className="text-primary hover:underline">
                  {t("Set up your mortgage →")}
                </Link>
              )}
              {!saved.plan && (
                <Link to="/plan" className="text-primary hover:underline">
                  {t("Answer the five questions →")}
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
