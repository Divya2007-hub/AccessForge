import { cn } from "@/lib/utils";
import { IMPACTS, type SeverityCounts, type Impact } from "@/lib/scanner/types";

const meta: Record<
  Impact,
  { label: string; bar: string; text: string; dot: string }
> = {
  critical: {
    label: "Critical",
    bar: "bg-rose-400",
    text: "text-rose-300",
    dot: "bg-rose-400",
  },
  serious: {
    label: "Serious",
    bar: "bg-orange-400",
    text: "text-orange-300",
    dot: "bg-orange-400",
  },
  moderate: {
    label: "Moderate",
    bar: "bg-amber-300",
    text: "text-amber-200",
    dot: "bg-amber-300",
  },
  minor: {
    label: "Minor",
    bar: "bg-slate-400",
    text: "text-slate-300",
    dot: "bg-slate-400",
  },
};

interface SeverityBreakdownProps {
  counts: SeverityCounts;
  className?: string;
  showBars?: boolean;
}

export function SeverityBreakdown({
  counts,
  className,
  showBars = true,
}: SeverityBreakdownProps) {
  const total = IMPACTS.reduce((sum, impact) => sum + counts[impact], 0);

  return (
    <ul className={cn("space-y-3", className)}>
      {IMPACTS.map((impact) => {
        const config = meta[impact];
        const count = counts[impact];
        const percentage = total === 0 ? 0 : Math.round((count / total) * 100);

        return (
          <li key={impact}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className={cn("size-1.5 rounded-full", config.dot)}
                  aria-hidden="true"
                />
                {config.label}
              </span>
              <span className={cn("font-mono text-xs", config.text)}>
                {count}
                {showBars ? (
                  <span className="ml-2 text-subtle">{percentage}%</span>
                ) : null}
              </span>
            </div>
            {showBars ? (
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]"
                aria-hidden="true"
              >
                <div
                  className={cn("h-full rounded-full", config.bar)}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
