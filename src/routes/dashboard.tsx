import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — FinBuddy" },
      {
        name: "description",
        content:
          "Coming soon: upload your monthly bank statement and see where the money actually goes.",
      },
      { property: "og:title", content: "Dashboard — FinBuddy" },
      {
        property: "og:description",
        content: "Coming soon: income and spending by category, month over month.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm font-semibold">Coming soon</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Upload your monthly bank statement and see where the money actually goes: income and
          spending by category, month over month.
        </p>
      </div>
    </div>
  );
}
