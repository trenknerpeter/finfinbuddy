import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { NumberSlider } from "@/components/NumberSlider";
import { Panel } from "@/components/Panel";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { InvestChart } from "@/components/invest/InvestChart";
import { useFormatters } from "@/lib/currency";
import { computeInvest } from "@/lib/finance";
import { useScenario } from "@/lib/useScenario";

export const Route = createFileRoute("/invest")({
  head: () => ({
    meta: [
      { title: "Invest — FinBuddy" },
      {
        name: "description",
        content:
          "See how monthly contributions compound over time, with growth split from what you put in — and what it's worth in today's money.",
      },
      { property: "og:title", content: "Invest — FinBuddy" },
      {
        property: "og:description",
        content: "Project investment growth live as you drag the sliders. No sign-up.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Invest,
});

const DEFAULTS = {
  initial: 10000,
  monthly: 500,
  rate: 7,
  years: 20,
  inflation: 2,
  real: false,
};

function Kpi({
  label,
  value,
  caption,
  accent,
  headline,
}: {
  label: string;
  value: string;
  caption?: string;
  accent?: boolean;
  headline?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`tnum mt-1.5 font-semibold tracking-tight ${headline ? "text-[36px] leading-none" : "text-xl"} ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}

function Invest() {
  const [s, patch] = useScenario("finbuddy.invest", DEFAULTS);
  const { money, percent } = useFormatters();

  const result = useMemo(
    () =>
      computeInvest({
        initial: s.initial,
        monthly: s.monthly,
        rate: s.rate,
        years: s.years,
        inflation: s.inflation,
      }),
    [s.initial, s.monthly, s.rate, s.years, s.inflation],
  );

  const emptyState = Math.round(s.years) <= 0;

  return (
    <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
      <div className="lg:sticky lg:top-32 lg:self-start">
        <Panel className="space-y-6">
          <NumberSlider
            label="Initial amount"
            value={s.initial}
            onChange={(v) => patch({ initial: v })}
            min={0}
            max={250000}
            step={500}
            suffix={useFormatters().symbol}
            suffixPosition="left"
          />
          <NumberSlider
            label="Monthly contribution"
            value={s.monthly}
            onChange={(v) => patch({ monthly: v })}
            min={0}
            max={5000}
            step={50}
            suffix={useFormatters().symbol}
            suffixPosition="left"
          />
          <NumberSlider
            label="Expected annual return"
            value={s.rate}
            onChange={(v) => patch({ rate: v })}
            min={0}
            max={15}
            step={0.1}
            suffix="%"
          />
          <NumberSlider
            label="Investment period"
            value={s.years}
            onChange={(v) => patch({ years: v })}
            min={1}
            max={40}
            step={1}
            suffix="years"
          />

          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="real" className="text-sm text-muted-foreground">
                Show in today's money
              </label>
              <Switch id="real" checked={s.real} onCheckedChange={(v) => patch({ real: v })} />
            </div>
            {s.real && (
              <div className="mt-6">
                <NumberSlider
                  label="Inflation rate"
                  value={s.inflation}
                  onChange={(v) => patch({ inflation: v })}
                  min={0}
                  max={10}
                  step={0.1}
                  suffix="%"
                />
              </div>
            )}
          </div>
        </Panel>
      </div>

      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Investment projection</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {Math.round(s.years)} years at {percent(s.rate)} a year, compounded monthly.
            </p>
          </div>
          <CopyLinkButton />
        </div>

        {emptyState ? (
          <Panel>
            <p className="text-sm text-muted-foreground">
              Set an investment period of at least one year to see a projection.
            </p>
          </Panel>
        ) : (
          <>
            <Panel>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi label="Final value" value={money(result.finalValue)} headline />
                <Kpi label="Total contributed" value={money(result.totalContributed)} />
                <Kpi
                  label="Total growth"
                  value={money(result.totalGrowth)}
                  accent
                  caption={`${(result.growthShare * 100).toFixed(0)}% of the final value`}
                />
                {s.real && (
                  <Kpi
                    label="In today's money"
                    value={money(result.realValue)}
                    caption={`At ${percent(s.inflation)} inflation`}
                  />
                )}
              </div>
            </Panel>

            <Panel title="Growth over time">
              <InvestChart rows={result.rows} />
              <div className="mt-4 flex items-center gap-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-neutral-fill" /> Money you put in
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-primary/30 ring-1 ring-primary" /> Growth
                </span>
              </div>
            </Panel>

            <Panel className="py-2">
              <Accordion type="single" collapsible>
                <AccordionItem value="years" className="border-none">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    Year by year
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="max-h-[420px] overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-card text-xs uppercase tracking-wide text-muted-foreground">
                          <tr className="border-b border-border">
                            <th className="py-2 text-left font-normal">Year</th>
                            <th className="py-2 text-right font-normal">Contributed</th>
                            <th className="py-2 text-right font-normal">Total contributed</th>
                            <th className="py-2 text-right font-normal">Growth</th>
                            <th className="py-2 text-right font-normal">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="tnum">
                          {result.rows.slice(1).map((r) => (
                            <tr key={r.year} className="border-b border-border/60 last:border-0">
                              <td className="py-2 text-left">{r.year}</td>
                              <td className="py-2 text-right">{money(r.contributedThisYear)}</td>
                              <td className="py-2 text-right">{money(r.totalContributed)}</td>
                              <td className="py-2 text-right text-primary">{money(r.growth)}</td>
                              <td className="py-2 text-right font-medium">{money(r.balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
