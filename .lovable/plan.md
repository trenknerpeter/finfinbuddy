# Dashboard — Financial Cockpit (local-first)

## Goal
Replace the Dashboard placeholder with a live financial cockpit that unifies Invest, Mortgage, and Plan into one high-level view. All data stays in the browser (localStorage); Lovable Cloud login/scenario-saving comes later.

## What to build

### 1. Data layer (local-first)
- `src/lib/dashboard.ts`: reads existing saved scenarios from localStorage (`finbuddy.invest.v1`-style keys used by `useScenario`, `finbuddy.profile.v1` for Plan) and derives dashboard metrics.
- New `finbuddy.dashboard.v1` store for dashboard-only inputs: **monthly net income** (asked once, editable), demo-data toggle state.
- Nothing is re-entered: the dashboard reads what the other tabs already saved.

### 2. Dashboard page (`src/routes/dashboard.tsx`)
Narrative top-to-bottom:

1. **Where you stand** — KPI row:
   - **Net Worth** = invest final balance (today's pot portion) + plan pot − mortgage remaining balance
   - **Savings Rate** = monthly saving / net income (income asked via a small inline field with a tooltip; empty state prompts for it)
   - **Debt-to-Asset Ratio** = mortgage balance / total assets
   - **Retirement Readiness** = current pot / Plan target number, with projected stop age
2. **Where your money goes** — monthly cash-flow breakdown: income vs mortgage payment vs monthly investing vs remaining free cash (simple horizontal bar / donut).
3. **Where you're headed** — mini projections: net-worth-over-time sparkline combining invest growth + mortgage paydown, and the Plan progress line.

### 3. Empty state + demo data
- If no scenarios exist yet: friendly empty state with a **"Load demo data"** toggle that fills realistic sample numbers (clearly marked as demo, one click to clear).
- Each section links to its tab ("Set up your mortgage →") when that data is missing.

### 4. Wiring
- Enable the Dashboard tab in `AppShell.tsx` (remove the disabled "Soon" chip).
- Czech + English translations for all new strings in `src/lib/i18n.tsx`.
- Head metadata for the dashboard route; no backend, no login.

## Technical notes
- Reuse `computeInvest`, `buildScenario`, plan helpers — no duplicated math.
- Currency reformatting only, consistent with existing tabs; tabular-nums, hairline cards, green accent per design system.
- All figures respect the Plan "today's money" assumption where relevant.

## Later (not in this plan)
- Lovable Cloud: login + named scenario saving/syncing.
