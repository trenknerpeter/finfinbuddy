# Optional mortgage rate comparison

## What will change
- Add a **Compare another rate** switch, off by default.
- Hide the what-if rate field and comparison-only results until that switch is enabled.
- Replace the default remaining-balance comparison with an annual stacked bar chart showing how each year's mortgage payments split between principal and interest.
- When comparison is enabled, retain the existing current-versus-what-if summary, balance chart, and interest comparison.
- Keep the year-by-year table available in both modes, with scenario switching only when comparison is enabled.

## Technical details
- Store the comparison switch with the rest of the mortgage scenario so copied links preserve it.
- Build the annual payment chart from the existing amortization rows; no calculation model or backend changes are needed.
- Use the existing green and neutral design tokens, currency formatting, and responsive chart conventions.
- Verify both switch states, URL updates without scroll jumps, and desktop/mobile layouts in the running app.
