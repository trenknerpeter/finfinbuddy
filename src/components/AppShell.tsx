import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CURRENCIES, isCurrency, useCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

function CurrencySelect() {
  const { currency, setCurrency } = useCurrency();
  return (
    <select
      value={currency}
      onChange={(e) => isCurrency(e.target.value) && setCurrency(e.target.value)}
      aria-label="Currency"
      className="h-9 rounded-md border border-border bg-card px-2 text-sm font-medium text-foreground outline-none focus:border-primary"
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.code} ({c.symbol})
        </option>
      ))}
    </select>
  );
}

const TABS = [
  { label: "Invest", to: "/invest" },
  { label: "Mortgage", to: "/mortgage" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" />
            <span className="text-base font-semibold tracking-tight">FinBuddy</span>
          </div>
          <CurrencySelect />
        </div>
        <div className="mx-auto max-w-[1200px] px-5">
          <nav className="flex items-center gap-7">
            {TABS.map((tab) => {
              const active = pathname.startsWith(tab.to);
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn(
                    "-mb-px flex h-11 items-center border-b-2 text-sm transition-colors",
                    active
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
            <span
              aria-disabled="true"
              className="-mb-px flex h-11 cursor-not-allowed items-center gap-2 border-b-2 border-transparent text-sm text-foreground opacity-40"
            >
              Dashboard
              <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                Soon
              </span>
            </span>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-5 py-10">{children}</main>
    </div>
  );
}
