import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card p-6", className)}>
      {title && (
        <h2 className="mb-5 text-sm font-semibold tracking-tight text-foreground">{title}</h2>
      )}
      {children}
    </section>
  );
}
