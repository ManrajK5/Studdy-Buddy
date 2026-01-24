import { cn } from "@/lib/utils";

export function ProgressRing({
  value,
  label = "Progress",
  caption = "Stay on track.",
  centerLabel = "progress",
  className,
}: {
  value: number; // 0..1
  label?: string;
  caption?: string;
  centerLabel?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const size = 104;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * clamped;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative">
        <svg width={size} height={size} className="block">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            className="fill-none stroke-slate-100"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            strokeLinecap="round"
            className="fill-none stroke-slate-900"
            style={{
              strokeDasharray: `${dash} ${c - dash}`,
              transform: "rotate(-90deg)",
              transformOrigin: "50% 50%",
            }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-xl font-semibold text-slate-900">
              {Math.round(clamped * 100)}%
            </div>
            <div className="text-[11px] text-slate-500">{centerLabel}</div>
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <div className="mt-1 text-xs text-slate-500">{caption}</div>
      </div>
    </div>
  );
}
