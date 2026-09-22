import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFormatters } from "@/lib/currency";

export function BalanceChart({
  current,
  whatIf,
}: {
  current: number[];
  whatIf: number[];
}) {
  const { money, compact } = useFormatters();
  const length = Math.max(current.length, whatIf.length);
  const data = Array.from({ length }, (_, i) => ({
    year: i,
    current: current[i] ?? 0,
    whatIf: whatIf[i] ?? 0,
  }));

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                      <dt className="text-muted-foreground">Current</dt>
                      <dd className="font-medium">{money(p.current)}</dd>
                    </div>
                    <div className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">What-if</dt>
                      <dd className="text-primary">{money(p.whatIf)}</dd>
                    </div>
                  </dl>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="current"
            stroke="var(--foreground)"
            strokeWidth={2}
            dot={false}
            animationDuration={200}
          />
          <Line
            type="monotone"
            dataKey="whatIf"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            animationDuration={200}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
