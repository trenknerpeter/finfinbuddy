import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CURRENCIES, isCurrency, useCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { isLangValue, useLang, useT } from "@/lib/i18n";

function LangSelect() {
  const { lang, setLang } = useLang();
  const { t } = useT();
  return (
    <select
      value={lang}
      onChange={(e) => isLangValue(e.target.value) && setLang(e.target.value)}
      aria-label={t("Language")}
      className="h-9 rounded-md border border-border bg-card px-2 text-sm font-medium text-foreground outline-none focus:border-primary"
    >
      <option value="en">EN</option>
      <option value="cs">CZ</option>
    </select>
  );
}

function CurrencySelect() {
  const { currency, setCurrency } = useCurrency();
  const { t } = useT();
  return (
    <select
      value={currency}
      onChange={(e) => isCurrency(e.target.value) && setCurrency(e.target.value)}
      aria-label={t("Currency")}
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
  { label: "Plan", to: "/plan" },
  { label: "Dashboard", to: "/dashboard" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" />
            <span className="text-base font-semibold tracking-tight">FinBuddy</span>
          </div>
          <div className="flex items-center gap-2">
            <LangSelect />
            <CurrencySelect />
          </div>
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
                  {t(tab.label)}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-5 py-10">{children}</main>
    </div>
  );
}
