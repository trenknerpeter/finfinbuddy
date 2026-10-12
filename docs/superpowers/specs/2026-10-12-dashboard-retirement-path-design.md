# Dashboard rethink: where you stand, where you're headed

Date: 2026-10-12

## Problem

- The Dashboard's net-worth chart ends at the target age while a large mortgage is still outstanding, so it answers nothing.
- Plan says "retire at 47" without knowing about the mortgage; at 47 a big balance would still be owed.
- Net worth is shown deeply negative because the app never asks what the home is worth.
- The debt-to-assets card isn't readable as good or bad.

## Intent

The Dashboard answers two questions, in order: **where do I stand today** (a fair balance sheet) and **where am I headed** (when can I stop working, mortgage included). Tone stays encouraging: progress numbers that go up.

## 1. Two retirement milestones (shared maths)

New module `src/lib/retirement.ts`, used by both Plan and the Dashboard so they always agree.

- **Milestone 1 — "live on X from A1"**: first month the combined pot (investments + savings, as today) reaches the number (`spend × 12 / withdrawal rate`). Unchanged.
- **Milestone 2 — "debt-free from A2"**: first month the pot reaches number + remaining mortgage balance at that month. Contributions continue at the current pace; the mortgage amortises on its normal schedule.
- The mortgage balance is nominal; it is deflated to today's money with the plan's inflation so it compares with the pot.
- If the mortgage is already paid off by milestone 1, the milestones coincide.
- Mortgage schedule respects both Mortgage-tab modes (fixed term → solved payment; fixed payment → solved term). The extra one-time payment and rate comparison are what-ifs and are ignored.
- Searches run to age 90; a milestone that is never reached is `null`.

## 2. Mortgage tab

New optional inputs, stored in `finbuddy.mortgage` (so snapshots and links carry them):

- `homeValue` — "Property value", 0 = not entered.
- `homeGrowth` — "Include price growth" toggle, off by default.
- `homeRate` — growth above inflation, 0–3 %, default 1 %. Copy states it's on top of inflation.

Home value affects **net worth only**, never the retirement milestones.

## 3. Dashboard — where you stand (cards)

| Card | Value | Caption |
|---|---|---|
| Net worth | home + investments + savings − mortgage | breakdown; without a home value: "excl. home" + "Add your home's value →" |
| Savings rate | unchanged | unchanged |
| Home ownership (replaces debt-to-assets) | `(home − balance) / home` | "Mortgage-free at {age}" (or "in {years}" without a plan) |
| Retirement readiness | pot ÷ number | "Stop work at A1" or "From A1 · debt-free from A2" |

Home ownership without a home value shows "Mortgage-free at {age}" as the value with the add-value link. Without a mortgage it shows 100 % if a home value exists, otherwise the card is hidden.

## 4. Dashboard — where you're headed

Replaces the net-worth chart. Requires a plan; otherwise a prompt to answer the plan questions.

- Pot as a filled area; the number as a flat dashed line; number + remaining mortgage as a second dashed line sloping into the first at payoff.
- Dots for milestone 1 and milestone 2; a vertical marker at the target age.
- X-axis in ages, ending 3 years after the later of target age and milestone 2 (cap 90).
- One line underneath: "At A2: net worth {v}, home fully yours" (home value known), "…mortgage paid off" (no home value), or "At A1: net worth {v}" (no mortgage). Net worth there includes home appreciation if enabled.

## 5. Plan tab

When a mortgage is saved:

- Headline gets a second sentence: "You'd still owe {d} on the mortgage at A1. Keep going until A2 to clear it." (or just the first half if A2 is never reached).
- Chart gets the number + mortgage line and the milestone 2 dot; the axis extends to cover A2.
- Levers move both milestones (they feed the same maths).

Without a mortgage, Plan is unchanged.

## Out of scope

- "Coast" variant (stop contributing, let the pot grow).
- Changes to how levers work.
- Using home equity to fund retirement.

## Localisation

All new strings get Czech translations.
