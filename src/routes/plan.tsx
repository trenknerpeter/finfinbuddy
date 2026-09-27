import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { NumberSlider } from "@/components/NumberSlider";
import { Panel } from "@/components/Panel";
import { PlanChart } from "@/components/plan/PlanChart";
import { useCurrencyScale, useFormatters } from "@/lib/currency";
import {
  DEFAULT_ASSUMPTIONS,
  affordableSpend,
  loadPlan,
  monthsToTarget,
  planRows,
  requiredMonthly,
  requiredReturn,
  savePlan,
  targetPotFor,
  potAfterMonths,
  realMonthlyRate,
  type PlanAssumptions,
  type PlanProfile,
  type SavedPlan,
} from "@/lib/plan";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Plan — FinBuddy" },
      {
        name: "description",
        content:
          "Answer five quick questions and see when you can realistically stop working — and what would have to change if you're behind.",
      },
      { property: "og:title", content: "Plan — FinBuddy" },
      {
        property: "og:description",
        content: "Work out when you can stop working, in today's money. No sign-up.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlanPage,
});

/* ------------------------------ Questionnaire ----------------------------- */

type QuestionKey = keyof PlanProfile;

const QUESTIONS: {
  key: QuestionKey;
  title: string;
  helper?: string;
  def: number;
  min: number;
  max: number;
  money?: boolean;
}[] = [
  { key: "age", title: "How old are you?", def: 35, min: 18, max: 75 },
  {
    key: "stop",
    title: "At what age would you like to stop working?",
    helper: "Aiming early is fine — that's the point of working it out.",
    def: 60,
    min: 19,
    max: 85,
  },
  {
    key: "spend",
    title: "How much would you need each month to live on?",
    helper: "In today's money — what your life costs now is usually a good guide.",
    def: 2500,
    min: 0,
    max: 1000000,
    money: true,
  },
  {
    key: "pot",
    title: "How much do you have saved or invested today?",
    helper: "Everything you'd count towards this: investments, savings, pension pots.",
    def: 25000,
    min: 0,
    max: 100000000,
    money: true,
  },
  {
    key: "save",
    title: "How much do you put aside each month?",
    helper: "Whatever you're actually managing right now, not the aspiration.",
    def: 500,
    min: 0,
    max: 1000000,
    money: true,
  },
];

function Questionnaire({
  initial,
  onDone,
}: {
  initial: PlanProfile | null;
  onDone: (p: PlanProfile) => void;
}) {
  const navigate = useNavigate();
  const { symbol } = useFormatters();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<PlanProfile>(
    initial ?? { age: 35, stop: 60, spend: 2500, pot: 25000, save: 500 },
  );
  const [text, setText] = useState(String(initial?.age ?? QUESTIONS[0]!.def));
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = QUESTIONS[step]!;

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [step]);

  const goTo = (next: number, currentAnswers: PlanProfile) => {
    setStep(next);
    setText(String(currentAnswers[QUESTIONS[next]!.key]));
    setError(null);
  };

  const advance = () => {
    const n = parseFloat(text.replace(/[^0-9.,-]/g, "").replace(",", "."));
    if (!isFinite(n) || isNaN(n)) {
      setError("Enter a number to continue.");
      return;
    }
    const value = Math.round(n);
    if (value < q.min || value > q.max) {
      setError(`Between ${q.min} and ${q.max}, please.`);
      return;
    }
    if (q.key === "stop" && value <= answers.age) {
      setError("It has to be above your current age — otherwise you'd already be there.");
      return;
    }
    const next = { ...answers, [q.key]: value };
    setAnswers(next);
    if (step === QUESTIONS.length - 1) {
      onDone(next);
    } else {
      goTo(step + 1, next);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center py-10">
      <div className="mb-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => step > 0 && goTo(step - 1, answers)}
          aria-label="Back"
          className={cn(
            "flex size-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground",
            step === 0 && "pointer-events-none opacity-0",
          )}
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex items-center gap-2">
          {QUESTIONS.map((qq, i) => (
            <span
              key={qq.key}
              className={cn(
                "size-2 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-neutral-fill",
              )}
            />
          ))}
        </div>
        <span className="size-11" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          advance();
        }}
      >
        <h1 className="text-3xl font-semibold tracking-tight">{q.title}</h1>
        {q.helper && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{q.helper}</p>}

        <div className="mt-10 flex items-baseline gap-3 border-b-2 border-border pb-3 focus-within:border-primary">
          {q.money && <span className="text-2xl text-muted-foreground">{symbol}</span>}
          <input
            ref={inputRef}
            inputMode="decimal"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            aria-label={q.title}
            className="tnum w-full bg-transparent text-4xl font-semibold tracking-tight outline-none"
          />
        </div>
        {error && <p className="mt-3 text-sm text-muted-foreground">{error}</p>}

        <button
          type="submit"
          className="mt-10 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {step === QUESTIONS.length - 1 ? "See my plan" : "Continue"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => navigate({ to: "/invest" })}
        className="mt-16 self-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Skip for now
      </button>
    </div>
  );
}

/* --------------------------------- Levers --------------------------------- */

type Levers = { save: number; stop: number; spend: number; ret: number };

function LeverCard({
  title,
  now,
  solved,
  solvedLabel,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  suffixPosition,
  caption,
}: {
  title: string;
  now: string;
  solved: number | null;
  solvedLabel: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  suffixPosition?: "left" | "right";
  caption?: string;
}) {
  const atSolve = solved !== null && Math.abs(value - solved) <= step / 2;
  const markerPct =
    solved !== null && max > min ? Math.min(100, Math.max(0, ((solved - min) / (max - min)) * 100)) : null;

  return (
    <div className="rounded-lg border border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        {atSolve && (
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            <Check className="size-3.5" /> Closed
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Now: {now}</p>
      <p className="tnum mt-3 text-xl font-semibold tracking-tight">
        {solved === null ? "—" : solvedLabel}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {solved === null
          ? "This one can't close the gap on its own."
          : atSolve
            ? "This alone closes the gap."
            : "What this alone would have to be"}
      </p>
      <div className="relative mt-4">
        <NumberSlider
          label={title}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          step={step}
          suffix={suffix}
          suffixPosition={suffixPosition}
        />
        {markerPct !== null && (
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-[7px] h-2.5 w-0.5 -translate-x-1/2 bg-primary"
            style={{ left: `${markerPct}%` }}
          />
        )}
      </div>
      {caption && <p className="mt-3 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}

/* --------------------------------- Results -------------------------------- */

function Results({ plan, onEdit }: { plan: SavedPlan; onEdit: () => void }) {
  const router = useRouter();
  const { money, percent, symbol } = useFormatters();
  const scale = useCurrencyScale();

  const [assumptions, setAssumptions] = useState<PlanAssumptions>({
    ret: plan.ret,
    wd: plan.wd,
    infl: plan.infl,
  });
  const [levers, setLevers] = useState<Levers>({
    save: plan.save,
    stop: plan.stop,
    spend: plan.spend,
    ret: plan.ret,
  });

  const profile: PlanProfile = { age: plan.age, stop: plan.stop, spend: plan.spend, pot: plan.pot, save: plan.save };

  // Mirror to URL + localStorage (levers are never persisted).
  useEffect(() => {
    const params = new URLSearchParams({
      age: String(plan.age),
      stop: String(plan.stop),
      spend: String(plan.spend),
      pot: String(plan.pot),
      save: String(plan.save),
      ret: String(assumptions.ret),
      wd: String(assumptions.wd),
      infl: String(assumptions.infl),
    });
    const href = `${window.location.pathname}?${params.toString()}`;
    if (`${window.location.pathname}${window.location.search}` !== href) {
      void router.navigate({ href, replace: true, resetScroll: false });
    }
    savePlan({ ...profile, ...assumptions });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.age, plan.stop, plan.spend, plan.pot, plan.save, assumptions]);

  // Effective (lever-adjusted) scenario drives the hero and the chart.
  const effProfile: PlanProfile = {
    age: plan.age,
    stop: levers.stop,
    spend: levers.spend,
    pot: plan.pot,
    save: levers.save,
  };
  const effAssumptions: PlanAssumptions = { ...assumptions, ret: levers.ret };

  const target = targetPotFor(levers.spend, assumptions.wd);
  const months = monthsToTarget(effProfile, effAssumptions, target);
  const reachedAge = months === null ? null : months === 0 ? plan.age : Math.round(plan.age + months / 12);
  const r = realMonthlyRate(levers.ret, assumptions.infl);
  const potAtStop = potAfterMonths(plan.pot, levers.save, r, Math.max(0, (levers.stop - plan.age) * 12));
  const gap = isFinite(target) ? target - potAtStop : Infinity;

  const rows = useMemo(
    () => planRows(effProfile, effAssumptions, reachedAge !== null && reachedAge > plan.age ? reachedAge : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan.age, plan.pot, levers.save, levers.stop, levers.spend, levers.ret, assumptions, reachedAge],
  );

  // Solve points are computed from the saved plan, not the dragged levers.
  const baseTarget = targetPotFor(plan.spend, assumptions.wd);
  const solveSave = requiredMonthly(profile, assumptions, baseTarget);
  const baseMonths = monthsToTarget(profile, assumptions, baseTarget);
  const solveStop = baseMonths === null ? null : Math.round(plan.age + baseMonths / 12);
  const solveSpendRaw = affordableSpend(profile, assumptions);
  const solveSpend = baseMonths === 0 || solveSpendRaw < plan.spend ? solveSpendRaw : null;
  const solveRet = requiredReturn(profile, assumptions, baseTarget);

  const alreadyFunded = isFinite(target) && plan.pot >= target;
  const early = !alreadyFunded && reachedAge !== null && reachedAge < levers.stop;
  const onTrack = !alreadyFunded && reachedAge !== null && reachedAge === levers.stop;
  const unreachable = !alreadyFunded && reachedAge === null;
  const yearsEarly = early ? levers.stop - (reachedAge ?? levers.stop) : 0;
  const surplusAtStop = early ? potAtStop - target : 0;

  const leversDirty =
    levers.save !== plan.save ||
    levers.stop !== plan.stop ||
    levers.spend !== plan.spend ||
    levers.ret !== assumptions.ret;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {alreadyFunded ? (
            <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight text-primary">
              You could stop working now.
            </h1>
          ) : unreachable ? (
            <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight">
              On this path, you don't reach your number.
            </h1>
          ) : onTrack ? (
            <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight text-primary">
              You're on track to stop working at {levers.stop}.
            </h1>
          ) : (
            <>
              <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight">
                At this rate, you can stop working at {reachedAge}.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {(reachedAge ?? 0) - levers.stop} years later than your target of {levers.stop}. At{" "}
                {levers.stop} you'd have about {money(potAtStop)} — around {money(Math.max(0, gap))}{" "}
                short.
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Edit answers
        </button>
      </div>

      <Panel>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Your target</p>
            <p className="tnum mt-1.5 whitespace-nowrap text-[clamp(1.25rem,1.85vw,2rem)] font-semibold leading-tight tracking-tight">
              {isFinite(target) ? money(target) : "—"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {percent(assumptions.wd)} a year of it covers your yearly spending of{" "}
              {money(levers.spend * 12)} without touching the pot
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Projected at {levers.stop}
            </p>
            <p className="tnum mt-1.5 whitespace-nowrap text-[clamp(1.25rem,1.85vw,2rem)] font-semibold leading-tight tracking-tight">
              {money(potAtStop)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {money(levers.save)} a month at {percent(levers.ret)}, in today's money
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">The gap</p>
            <p className="tnum mt-1.5 whitespace-nowrap text-[clamp(1.25rem,1.85vw,2rem)] font-semibold leading-tight tracking-tight">
              {gap <= 0 ? "Covered" : isFinite(gap) ? money(gap) : "—"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {gap <= 0 ? "You're ahead of your number" : "What the projection is missing"}
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Getting there">
        <PlanChart rows={rows} target={target} stopAge={levers.stop} reachedAge={reachedAge} />
        <div className="mt-4 flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm bg-neutral-fill" /> Money you put in
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm bg-primary/30 ring-1 ring-primary" /> Growth
          </span>
        </div>
      </Panel>

      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold tracking-tight">Four ways to close the gap</h2>
          {leversDirty && (
            <button
              type="button"
              onClick={() =>
                setLevers({ save: plan.save, stop: plan.stop, spend: plan.spend, ret: plan.ret })
              }
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Reset levers
            </button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <LeverCard
            title="Save more each month"
            now={money(plan.save)}
            solved={solveSave}
            solvedLabel={solveSave !== null ? money(solveSave) : "—"}
            value={levers.save}
            onChange={(v) => setLevers((l) => ({ ...l, save: v }))}
            min={0}
            max={Math.max(5000 * scale, (solveSave ?? 0) * 1.2)}
            step={50 * scale}
            suffix={symbol}
            suffixPosition="left"
          />
          <LeverCard
            title="Work a bit longer"
            now={`${plan.stop}`}
            solved={solveStop !== null && solveStop <= 85 ? solveStop : null}
            solvedLabel={solveStop !== null && solveStop <= 85 ? `${solveStop}` : "—"}
            value={levers.stop}
            onChange={(v) => setLevers((l) => ({ ...l, stop: v }))}
            min={plan.age + 1}
            max={85}
            step={1}
            suffix="years old"
          />
          <LeverCard
            title="Live on less"
            now={`${money(plan.spend)}/mo`}
            solved={solveSpend}
            solvedLabel={solveSpend !== null ? `${money(solveSpend)}/mo` : "—"}
            value={levers.spend}
            onChange={(v) => setLevers((l) => ({ ...l, spend: v }))}
            min={0}
            max={Math.max(plan.spend * 1.5, 1000 * scale)}
            step={50 * scale}
            suffix={symbol}
            suffixPosition="left"
          />
          <LeverCard
            title="Higher returns"
            now={percent(plan.ret)}
            solved={solveRet}
            solvedLabel={solveRet !== null ? `≈${percent(solveRet)}` : "—"}
            value={levers.ret}
            onChange={(v) => setLevers((l) => ({ ...l, ret: v }))}
            min={0}
            max={15}
            step={0.1}
            suffix="%"
            caption="The one lever you don't control."
          />
        </div>
      </div>

      <Panel className="py-2">
        <Accordion type="single" collapsible>
          <AccordionItem value="assumptions" className="border-none">
            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
              Assumptions
            </AccordionTrigger>
            <AccordionContent>
              <p className="mb-6 text-sm text-muted-foreground">All figures are in today's money.</p>
              <div className="grid gap-6 sm:grid-cols-3">
                <NumberSlider
                  label="Expected annual return"
                  value={assumptions.ret}
                  onChange={(v) => {
                    setAssumptions((a) => ({ ...a, ret: v }));
                    setLevers((l) => ({ ...l, ret: v }));
                  }}
                  min={0}
                  max={15}
                  step={0.1}
                  suffix="%"
                />
                <NumberSlider
                  label="Safe withdrawal rate"
                  value={assumptions.wd}
                  onChange={(v) => setAssumptions((a) => ({ ...a, wd: v }))}
                  min={2}
                  max={8}
                  step={0.1}
                  suffix="%"
                />
                <NumberSlider
                  label="Inflation"
                  value={assumptions.infl}
                  onChange={(v) => setAssumptions((a) => ({ ...a, infl: v }))}
                  min={0}
                  max={10}
                  step={0.1}
                  suffix="%"
                />
              </div>
              <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
                Take out 4% of the pot in your first year and adjust for inflation after that, and
                the money has historically lasted 30 years or more. It's a rule of thumb, not a
                guarantee.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Panel>

      <p className="pb-4 text-xs leading-relaxed text-muted-foreground">
        FinBuddy does arithmetic, not advice. These are projections based on assumptions you can
        change — not a prediction, and not a recommendation to buy or sell anything.
      </p>
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

function PlanPage() {
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [editing, setEditing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("age") && params.has("stop")) {
      const n = (k: string, d: number) => {
        const v = parseFloat(params.get(k) ?? "");
        return isFinite(v) ? v : d;
      };
      setPlan({
        age: n("age", 35),
        stop: n("stop", 60),
        spend: n("spend", 2500),
        pot: n("pot", 25000),
        save: n("save", 500),
        ret: n("ret", DEFAULT_ASSUMPTIONS.ret),
        wd: n("wd", DEFAULT_ASSUMPTIONS.wd),
        infl: n("infl", DEFAULT_ASSUMPTIONS.infl),
      });
    } else {
      setPlan(loadPlan());
    }
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  if (plan === null || editing) {
    return (
      <Questionnaire
        initial={plan}
        onDone={(p) => {
          const assumptions: PlanAssumptions = plan
            ? { ret: plan.ret, wd: plan.wd, infl: plan.infl }
            : DEFAULT_ASSUMPTIONS;
          setPlan({ ...p, ...assumptions });
          setEditing(false);
        }}
      />
    );
  }

  return <Results plan={plan} onEdit={() => setEditing(true)} />;
}
