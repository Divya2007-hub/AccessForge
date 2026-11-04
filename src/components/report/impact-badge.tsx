import { cn } from "@/lib/utils";
import type { Impact } from "@/lib/scanner/types";

const styles: Record<Impact, { label: string; className: string; dot: string }> =
  {
    critical: {
      label: "Critical",
      className: "border-rose-400/25 bg-rose-400/[0.08] text-rose-300",
      dot: "bg-rose-400",
    },
    serious: {
      label: "Serious",
      className: "border-orange-400/25 bg-orange-400/[0.08] text-orange-300",
      dot: "bg-orange-400",
    },
    moderate: {
      label: "Moderate",
      className: "border-amber-300/25 bg-amber-300/[0.08] text-amber-200",
      dot: "bg-amber-300",
    },
    minor: {
      label: "Minor",
      className: "border-slate-400/25 bg-slate-400/[0.08] text-slate-300",
      dot: "bg-slate-400",
    },
  };

export function ImpactBadge({
  impact,
  className,
}: {
  impact: Impact;
  className?: string;
}) {
  const style = styles[impact];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        style.className,
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", style.dot)}
        aria-hidden="true"
      />
      {style.label}
    </span>
  );
}
