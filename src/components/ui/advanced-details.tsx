import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdvancedDetailsProps {
  summary: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
  id?: string;
}

export function AdvancedDetails({
  summary,
  description,
  children,
  defaultOpen = false,
  className,
  contentClassName,
  id,
}: AdvancedDetailsProps) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className={cn(
        "group rounded-xl border border-border bg-card/70 open:bg-card",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-xl px-4 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block">{summary}</span>
          {description ? (
            <span className="mt-0.5 block text-xs font-normal leading-relaxed text-muted-foreground">
              {description}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className="mt-0.5 size-4 shrink-0 text-subtle transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div
        className={cn(
          "border-t border-white/[0.06] px-4 py-4 sm:px-5",
          contentClassName,
        )}
      >
        {children}
      </div>
    </details>
  );
}
