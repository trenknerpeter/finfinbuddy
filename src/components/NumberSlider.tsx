import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  suffixPosition?: "left" | "right";
};

export function NumberSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  suffixPosition = "right",
}: Props) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText((prev) => (parseFloat(prev) === value ? prev : String(value)));
  }, [value]);

  const commit = (raw: string) => {
    setText(raw);
    const n = parseFloat(raw.replace(/[^0-9.,-]/g, "").replace(",", "."));
    onChange(!isFinite(n) || isNaN(n) ? 0 : Math.max(0, n));
  };

  const sliderValue = Math.min(Math.max(value, min), max);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm text-muted-foreground">{label}</label>
        <div className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 focus-within:border-primary">
          {suffix && suffixPosition === "left" && (
            <span className="text-sm text-muted-foreground">{suffix}</span>
          )}
          <input
            inputMode="decimal"
            value={text}
            onChange={(e) => commit(e.target.value)}
            onBlur={() => setText(String(value))}
            className="tnum w-24 bg-transparent text-right text-sm font-medium tabular-nums outline-none"
            aria-label={label}
          />
          {suffix && suffixPosition === "right" && (
            <span className="text-sm text-muted-foreground">{suffix}</span>
          )}
        </div>
      </div>
      <Slider
        value={[sliderValue]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? 0)}
        aria-label={`${label} slider`}
      />
    </div>
  );
}
