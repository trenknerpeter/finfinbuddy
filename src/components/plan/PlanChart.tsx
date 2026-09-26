import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFormatters } from "@/lib/currency";
import type { PlanYearRow } from "@/lib/plan";

type Props = {
  rows: PlanYearRow[];
  target: number;
  stopAge: number;
  reachedAge: number | null;
};

export function PlanChart({ rows, target, stopAge, reachedAge }: Props) {
  const { money, compact } = useFormatters();
  const showTarget = isFinite(target);
  const reachedRow = reachedAge !== null ? rows.find((r) => r.age === reachedAge) : undefined;

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="age"
            type="number"
            domain={["dataMin", "dataMax"]}
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
            domain={[0, (dataMax: number) => Math.max(dataMax, showTarget ? target : 0) * 1.05]}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload as PlanYearRow;
              return (
                <div className="rounded-md border border-border bg-card p-3 text-xs">
                  <p className="mb-2 font-semibold">Age {label}</p>
                  <dl className="tnum space-y-1">
                    <div className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">Pot</dt>
                      <dd className="font-medium">{money(p.balance)}</dd>
                    </div>
                    <div className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">Put in</dt>
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
          <Line
            type="monotone"
            dataKey="balance"
            stroke="var(--foreground)"
            strokeWidth={1.5}
            dot={false}
            animationDuration={200}
          />
          {showTarget && (
            <ReferenceLine
              y={target}
              stroke="var(--muted-foreground)"
              strokeDasharray="6 4"
              label={{
                value: `Your number — ${money(target)}`,
                position: "insideTopRight",
                fill: "var(--muted-foreground)",
                fontSize: 12,
              }}
            />
          )}
          <ReferenceLine
            x={stopAge}
            stroke="var(--muted-foreground)"
            strokeDasharray="3 3"
            label={{
              value: `Target age ${stopAge}`,
              position: "insideTopLeft",
              fill: "var(--muted-foreground)",
              fontSize: 12,
            }}
          />
          {showTarget && reachedRow && (
            <ReferenceDot
              x={reachedRow.age}
              y={target}
              r={5}
              fill="var(--accent)"
              stroke="var(--background)"
              strokeWidth={2}
              label={{
                value: `${reachedRow.age} — you reach your number`,
                position: "top",
                fill: "var(--accent)",
                fontSize: 12,
                fontWeight: 600,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
