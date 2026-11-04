import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tones = {
  violet: "border-violet-400/15 bg-violet-400/[0.07] text-violet-300",
  rose: "border-rose-400/15 bg-rose-400/[0.07] text-rose-300",
  amber: "border-amber-400/15 bg-amber-400/[0.07] text-amber-300",
  emerald: "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300",
  indigo: "border-indigo-400/15 bg-indigo-400/[0.07] text-indigo-300",
} as const;

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ElementType;
  tone?: keyof typeof tones;
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "violet",
  className,
}: StatCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">
          {label}
        </p>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md border",
            tones[tone],
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      {hint ? (
        <p className="mt-1.5 truncate text-xs text-subtle">{hint}</p>
      ) : null}
    </Card>
  );
}
