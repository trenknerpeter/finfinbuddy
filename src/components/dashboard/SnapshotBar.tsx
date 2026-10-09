import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Download, Link2, Pencil, Trash2, Upload } from "lucide-react";
import { Panel } from "@/components/Panel";
import { useT } from "@/lib/i18n";
import {
  applyData,
  captureData,
  decodeSnapshot,
  deleteSnapshot,
  encodeSnapshot,
  getActiveId,
  listSnapshots,
  parseSnapshot,
  renameSnapshot,
  saveSnapshot,
  setActiveId,
  type Snapshot,
} from "@/lib/snapshots";

function reloadDashboard() {
  window.location.assign("/dashboard");
}

const btn =
  "inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted";

export function SnapshotBar() {
  const { t, locale } = useT();
  const [list, setList] = useState<Snapshot[]>([]);
  const [activeId, setActive] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState<null | { mode: "new" | "rename"; value: string }>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    const l = listSnapshots();
    const id = getActiveId();
    const active = l.find((s) => s.id === id) ?? null;
    setList(l);
    setActive(active ? active.id : null);
    setDirty(active ? JSON.stringify(captureData()) !== JSON.stringify(active.data) : false);
  };

  useEffect(() => {
    refresh();
    const code = new URLSearchParams(window.location.search).get("s");
    if (code) setShared(decodeSnapshot(code));
  }, []);

  const active = list.find((s) => s.id === activeId) ?? null;
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });

  const switchTo = (s: Snapshot) => {
    setOpen(false);
    if (s.id === activeId && !dirty) return;
    if ((dirty || !active) && !window.confirm(t("Switching replaces the numbers in every tab with this snapshot. Unsaved changes will be lost. Continue?"))) return;
    applyData(s.data);
    setActiveId(s.id);
    reloadDashboard();
  };

  const submitName = () => {
    if (!naming) return;
    if (naming.mode === "new") saveSnapshot(naming.value);
    else if (active) renameSnapshot(active.id, naming.value);
    setNaming(null);
    refresh();
  };

  const copyLink = async () => {
    const code = encodeSnapshot({ name: active?.name ?? t("Financial snapshot"), data: captureData() });
    const url = `${window.location.origin}/dashboard?s=${code}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt(t("Copy share link"), url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const download = () => {
    const snap = { name: active?.name ?? t("Financial snapshot"), savedAt: new Date().toISOString(), data: captureData() };
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `finbuddy-${snap.name.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = async (file: File) => {
    setError(null);
    try {
      const snap = parseSnapshot(JSON.parse(await file.text()));
      if (!snap) throw new Error();
      setShared(snap);
    } catch {
      setError(t("That file isn't a FinBuddy backup."));
    }
  };

  const loadShared = () => {
    if (!shared) return;
    applyData(shared.data);
    saveSnapshot(shared.name, shared.data);
    reloadDashboard();
  };

  return (
    <div className="space-y-3">
      {shared && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm">
          <p className="font-semibold">
            {t("Someone shared a financial snapshot with you: {name}", { name: shared.name })}
          </p>
          <p className="mt-1 text-muted-foreground">
            {t("Loading it replaces the numbers in every tab. Save your own first if you want to keep them.")}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={loadShared} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
              {t("Load and save")}
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => {
                setShared(null);
                window.history.replaceState(null, "", "/dashboard");
              }}
            >
              {t("Dismiss")}
            </button>
          </div>
        </div>
      )}

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("Financial snapshot")}
            </p>
            <div className="relative mt-1">
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-label={t("Switch snapshot")}
                className="flex items-center gap-1.5 text-lg font-semibold tracking-tight hover:text-primary"
              >
                <span className="truncate">{active?.name ?? t("Unsaved current situation")}</span>
                {list.length > 0 && <ChevronDown className="size-4 shrink-0" />}
              </button>
              {open && list.length > 0 && (
                <div className="absolute left-0 z-20 mt-2 w-72 rounded-lg border border-border bg-card p-1">
                  {list.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => switchTo(s)}
                      className="flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <Check className={`mt-0.5 size-4 shrink-0 ${s.id === activeId ? "text-primary" : "invisible"}`} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{s.name}</span>
                        <span className="block text-xs text-muted-foreground">{fmtDate(s.savedAt)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {active
                ? dirty
                  ? t("Edited since saved")
                  : t("Saved {date}", { date: fmtDate(active.savedAt) })
                : t("Save your whole situation — every tab at once — and come back to it, compare, or share it.")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {active && dirty && (
              <button
                type="button"
                className={btn}
                onClick={() => {
                  saveSnapshot(active.name, captureData(), active.id);
                  refresh();
                }}
              >
                {t("Update")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setNaming({ mode: "new", value: "" })}
              className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
            >
              {t("Save as new")}
            </button>
            <button type="button" className={btn} onClick={copyLink}>
              <Link2 className="size-4" />
              {copied ? t("Link copied") : t("Copy share link")}
            </button>
          </div>
        </div>

        {naming && (
          <form
            className="mt-4 flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submitName();
            }}
          >
            <input
              autoFocus
              aria-label={t("Snapshot name")}
              value={naming.value}
              placeholder={t("e.g. Baseline Oct 2026")}
              onChange={(e) => setNaming({ ...naming, value: e.target.value })}
              className="h-9 min-w-[220px] flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <button type="submit" disabled={!naming.value.trim()} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {t("Save")}
            </button>
            <button type="button" className={btn} onClick={() => setNaming(null)}>
              {t("Cancel")}
            </button>
          </form>
        )}

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-3 text-xs font-medium text-muted-foreground">
          {active && (
            <>
              <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setNaming({ mode: "rename", value: active.name })}>
                <Pencil className="size-3.5" />
                {t("Rename")}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-negative"
                onClick={() => {
                  if (window.confirm(t("Delete “{name}”?", { name: active.name }))) {
                    deleteSnapshot(active.id);
                    refresh();
                  }
                }}
              >
                <Trash2 className="size-3.5" />
                {t("Delete")}
              </button>
            </>
          )}
          <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={download}>
            <Download className="size-3.5" />
            {t("Download backup")}
          </button>
          <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => fileRef.current?.click()}>
            <Upload className="size-3.5" />
            {t("Import backup")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              e.target.value = "";
            }}
          />
          {error && <span className="text-negative">{error}</span>}
        </div>
      </Panel>
    </div>
  );
}
