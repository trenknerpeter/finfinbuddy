# Mzda: net salary calculator (CZ 2026)

Date: 2026-10-14

## Intent

Add a gross-to-net salary calculator for Czech employees as a new tab, **Mzda** (EN: **Salary**).

- **Why:** "čistá mzda kalkulačka" is the most-searched money calculator in Czechia, so it brings new visitors to the app. It also fixes a gap: Dashboard's "Monthly net income" is currently a guess.
- **Who:** Czech employees on a standard employment contract (HPP). Czech tax law only for now, but the rules live in their own module so another year or country can be added without rewriting the page.
- **Success:** net pay matches a 2026 payslip to the crown for common cases. Dashboard can take the number with one click.

Alongside this, the app defaults to **Czech language and CZK** for first-time visitors.

## 1. Calculation module — `src/lib/salary.ts`

A pure function plus a rules table. No React, no browser APIs.

```ts
type SalaryInput = {
  gross: number;          // monthly gross, Kč
  signed: boolean;        // "prohlášení poplatníka" signed
  kids: number;           // 0–6
  kidsZtp: number;        // how many of `kids` hold ZTP/P (≤ kids)
  disability: 0 | 1 | 3;  // 0 none, 1 = degree I–II, 3 = degree III
  ztp: boolean;           // employee holds ZTP/P
};
```

`calcSalary(input, rules = CZ_2026)` returns:

`gross, social, health, taxBase, taxBeforeCredits, credits { payer, disability, ztp }, taxAfterCredits, childBenefit { total, reducesTax, bonus }, tax (final, ≥ 0), net, employerSocial, employerHealth, employerCost, aboveSocialCap: boolean`.

### Rules table `CZ_2026`

| Rule | Value |
|---|---|
| Employee social / health | 7.1 % / 4.5 % |
| Employer social / health | 24.8 % / 9 % |
| Tax rate | 15 %; 23 % on the part of the monthly base above 146,901 Kč (36 × 48,967 / 12) |
| Social insurance annual cap | 2,350,416 Kč (48 × 48,967) |
| Payer credit | 2,570 Kč / month |
| Disability credit I–II / III / ZTP/P | 210 / 420 / 1,345 Kč / month (ZTP/P adds to the degree credit) |
| Child benefit 1st / 2nd / 3rd+ | 1,267 / 1,860 / 2,320 Kč / month; doubled for a ZTP/P child |
| Minimum wage (for bonus eligibility) | 22,400 Kč |

### Algorithm (monthly)

1. `social = ceil(gross × 7.1 %)`, `health = ceil(gross × 4.5 %)` (rounded up to the crown, per payroll practice).
2. `taxBase = ceil(gross / 100) × 100` (rounded up to whole hundreds).
3. `taxBeforeCredits = 15 % × min(base, 146,901) + 23 % × max(0, base − 146,901)`, rounded up to the crown.
4. If `signed` is false: no credits, no child benefit. `tax = taxBeforeCredits`. (The flat withholding tax for small incomes without a signed form is out of scope.)
5. If `signed`: subtract payer, disability and ZTP/P credits, floored at 0 → `taxAfterCredits`.
6. Child benefit: the ZTP/P children take the **highest-order slots** (e.g. 3 kids, 1 ZTP/P → 1,267 + 1,860 + 2 × 2,320), since parents choose the order and this maximises the benefit. The benefit first reduces `taxAfterCredits` to 0; the rest is `bonus`, paid only if `gross ≥ minWage / 2` (11,200 Kč). Otherwise the bonus is 0.
7. `net = gross − social − health − tax + bonus`.
8. Employer: `employerSocial = ceil(gross × 24.8 %)`, `employerHealth = ceil(gross × 9 %)`, `employerCost = gross + both`.
9. `aboveSocialCap = gross × 12 > 2,350,416`. The page shows a note. The calculation does not apply the cap, because the cap is annual and depends on earnings across the year.

### Testing

Add **Vitest** as a dev dependency with an `npm test` script. Tests in `src/lib/salary.test.ts`:

- 40,000 Kč, signed, no kids → net **31,930**.
- 40,000 Kč, signed, 2 kids → net **35,057**.
- 160,000 Kč, signed → exercises the 23 % band and `aboveSocialCap`.
- 20,000 Kč, signed, 3 kids → tax goes to 0, bonus paid.
- 10,000 Kč, signed, 1 kid → below 11,200, no bonus.
- `signed: false` → no credits.
- Disability III + ZTP/P → both credits applied.

Before writing the reference values for the cases without a published example, cross-check them against at least two public calculators (e.g. mzdy.cz, podnikatel.cz).

## 2. Page — `src/routes/mzda.tsx` (path `/mzda`)

The path is Czech in both languages, because that's the search term. `head()` uses the same format as `mortgage.tsx`, with a title and description targeting "Kalkulačka čisté mzdy 2026".

Two-column layout as on Mortgage, using `Panel`, `NumberSlider`, `Switch`, `Accordion`.

**Inputs (left):**
- Gross monthly pay: slider plus a number field, 0–300,000 Kč, default 48,967.
- "Signed tax declaration" switch, default on.
- Children: count 0–6, and "of which with ZTP/P" (0 to `kids`, clamped).
- Accordion "Other discounts": disability (none / I–II / III) and the employee's ZTP/P switch.

**Results (right):**
- Net pay as the large figure. When `bonus > 0`, the subtitle reads "including child bonus X Kč".
- Breakdown rows: gross, social, health, tax before credits, each non-zero credit, child benefit, final tax, net.
- A stacked bar splitting gross into net, insurance and tax.
- "Your employer pays X Kč" (employer cost), with social and health in a tooltip or a small second line.
- An `aboveSocialCap` note when applicable.
- Footer: "Valid for 2026 · educational estimate, not payroll advice".

**State:** `useScenario` with `DEFAULTS = { gross: 48967, signed: true, kids: 0, kidsZtp: 0, disability: 0, ztp: false }` and storage key `finbuddy.salary`. Links and localStorage work as on the other tabs. `CopyLinkButton` is included.

**Currency:** the page always formats Kč, whatever the app currency, using a CZK formatter rather than `useFormatters()`. A small "Calculated in CZK" note appears when the app currency isn't CZK. No currency scaling applies.

**i18n:** every string goes through `useT()`, with Czech entries added to the `CS` dictionary. Tab label: "Salary" → "Mzda".

## 3. Integration

**Navigation:** `TABS` in `AppShell.tsx` gets `{ label: "Salary", to: "/mzda" }` as the **first** entry: Mzda · Invest · Mortgage · Plan · Dashboard.

**Homepage:** a fourth card for Mzda, alongside Invest, Mortgage and Plan, with an illustration in `home/Illustrations.tsx` in the existing style.

**Dashboard (no button on Mzda):** below the "Monthly net income" field on Dashboard:
- If `finbuddy.salary` exists in localStorage and the app currency is CZK: a line "Z Mzdy: 31 930 Kč · **Použít**". Clicking "Použít" (EN "Use") sets `income` to that net value. The line is hidden when income already equals it.
- Otherwise: a link "Spočítat z hrubé mzdy →" (EN "Calculate from gross →") to `/mzda`.
- The net value is computed with `calcSalary` from the stored inputs, so it is always current. The two stay separate: nothing updates Dashboard automatically.

**Snapshots:** append `"finbuddy.salary"` to `SNAPSHOT_KEYS`. Change `hasAnyData()` from `slice(0, 4)` to "every key except `finbuddy.currency`", so salary data counts. Restoring an older snapshot that has no salary key clears Mzda back to defaults, the same as the other tabs.

**Defaults for first-time visitors:**
- `i18n.tsx`: the initial `lang` becomes `"cs"` (both the context default and the `useState`).
- `currency.tsx`: the initial currency becomes `"CZK"`.
- Saved choices in localStorage and `?currency=` in URLs still take priority. Existing users see no change.
- The server render is in Czech, so the indexed text is Czech.

**README:** add Mzda to the "What it does" table.

## Out of scope

Contract types other than HPP (DPP, DPČ); part-time pay below the minimum health insurance base; flat withholding tax without a signed form; the student discount (abolished from 2024 — add a rules row if it returns); spouse credit; annual and tax-return mode; other years and countries; self-employed people (OSVČ).

## Yearly maintenance

Each January, add a `CZ_2027` table and make it the default. Update the "Valid for" label and the test reference values.
