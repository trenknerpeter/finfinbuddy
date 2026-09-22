import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { InvestYear } from "@/lib/finance";
import { useFormatters } from "@/lib/currency";

export function InvestChart({ rows }: { rows: InvestYear[] }) {
  const { money, compact } = useFormatters();

  const data = rows.map((r) => ({
    year: r.year,
    contributed: r.totalContributed,
    growth: Math.max(0, r.growth),
    total: r.balance,
  }));

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickMargin={10}
            minTickGap={24}
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
              const p = payload[0]?.payload as (typeof data)[number];
              return (
                <div className="rounded-md border border-border bg-card p-3 text-xs">
                  <p className="mb-2 font-semibold">Year {label}</p>
                  <dl className="tnum space-y-1">
                    <div className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">Total</dt>
                      <dd className="font-medium">{money(p.total)}</dd>
                    </div>
                    <div className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">Contributed</dt>
                      <dd>{money(p.contributed)}</dd>
                    </div>
                    <div className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">Growth</dt>
                      <dd className="text-primary">{money(p.growth)}</dd>
                    </div>
                  </dl>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="contributed"
            stackId="1"
            stroke="var(--neutral-fill)"
            strokeWidth={1}
            fill="var(--neutral-fill)"
            fillOpacity={1}
            animationDuration={200}
          />
          <Area
            type="monotone"
            dataKey="growth"
            stackId="1"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="var(--accent)"
            fillOpacity={0.18}
            animationDuration={200}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
