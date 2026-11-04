"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { diffLines } from "@/lib/diff";
import { cn } from "@/lib/utils";

export function CodePane({
  label,
  code,
  tone,
  showBadge = true,
}: {
  label: string;
  code: string;
  tone: "neutral" | "proposed";
  showBadge?: boolean;
}) {
  const lines = code.split("\n");

  return (
    <div className="overflow-hidden rounded-lg border border-white/[0.07] bg-[#09090e]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.02] px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {showBadge ? (
          <Badge variant={tone === "proposed" ? "success" : "outline"}>
            {tone === "proposed" ? "Current draft" : "Original"}
          </Badge>
        ) : null}
      </div>
      <pre
        className="overflow-x-auto py-3 text-[11px] leading-6"
        tabIndex={0}
        aria-label={`${label} code`}
      >
        <code>
          {lines.map((line, index) => (
            <span key={`${label}-${index}`} className="flex min-w-max">
              <span
                className="w-9 shrink-0 select-none border-r border-white/[0.04] pr-3 text-right text-subtle"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span className="whitespace-pre px-3 text-muted-foreground">
                {line || " "}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

export function DiffView({
  original,
  proposed,
}: {
  original: string;
  proposed: string;
}) {
  const lines = React.useMemo(
    () => diffLines(original, proposed),
    [original, proposed],
  );

  return (
    <div className="overflow-hidden rounded-lg border border-white/[0.07] bg-[#09090e]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-white/[0.02] px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">
          Unified difference
        </p>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="inline-flex items-center gap-1 text-rose-300">
            <span className="font-mono">-</span> removed
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-300">
            <span className="font-mono">+</span> added
          </span>
        </div>
      </div>
      <div
        className="overflow-x-auto"
        tabIndex={0}
        aria-label="Unified difference"
      >
        <div className="min-w-[620px] py-2 font-mono text-[11px] leading-6">
          {lines.map((line, index) => {
            const isAdded = line.type === "added";
            const isRemoved = line.type === "removed";

            return (
              <div
                key={`${line.type}-${index}`}
                className={cn(
                  "flex px-3",
                  isAdded && "bg-emerald-400/[0.06]",
                  isRemoved && "bg-rose-400/[0.06]",
                )}
              >
                <span
                  className="w-8 shrink-0 select-none text-right text-subtle"
                  aria-hidden="true"
                >
                  {line.oldLine ?? ""}
                </span>
                <span
                  className="w-8 shrink-0 select-none text-right text-subtle"
                  aria-hidden="true"
                >
                  {line.newLine ?? ""}
                </span>
                <span
                  className={cn(
                    "w-6 shrink-0 select-none text-center",
                    isAdded && "text-emerald-300",
                    isRemoved && "text-rose-300",
                    line.type === "context" && "text-subtle",
                  )}
                  aria-hidden="true"
                >
                  {isAdded ? "+" : isRemoved ? "-" : " "}
                </span>
                <span
                  className={cn(
                    "whitespace-pre pr-4",
                    isAdded && "text-emerald-200",
                    isRemoved && "text-rose-200",
                    line.type === "context" && "text-muted-foreground",
                  )}
                >
                  {line.text || " "}
                </span>
                <span className="sr-only">
                  {isAdded
                    ? "Added line: "
                    : isRemoved
                      ? "Removed line: "
                      : "Unchanged line: "}
                  {line.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
