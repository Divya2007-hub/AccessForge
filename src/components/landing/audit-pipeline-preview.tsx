import {
  Bot,
  Download,
  Globe,
  ListChecks,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const stages = [
  {
    number: "01",
    title: "Load the page",
    detail: "Playwright · real Chromium",
    icon: Globe,
    status: "Live",
    tone: "success" as const,
  },
  {
    number: "02",
    title: "Run automated checks",
    detail: "axe-core · WCAG 2.x rules",
    icon: ScanSearch,
    status: "Live",
    tone: "success" as const,
  },
  {
    number: "03",
    title: "Explain every finding",
    detail: "Impact, selectors, remediation",
    icon: Sparkles,
    status: "Live",
    tone: "success" as const,
  },
  {
    number: "04",
    title: "Review and export fixes",
    detail: "Local bundle · human decisions",
    icon: Download,
    status: "Live",
    tone: "success" as const,
  },
  {
    number: "05",
    title: "Generate and verify patches",
    detail: "Switch handoff · GitHub PR",
    icon: Bot,
    status: "Partial",
    tone: "info" as const,
  },
];

export function AuditPipelinePreview() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]" aria-hidden="true">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.18),transparent_65%)] blur-2xl" />

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b12]/90 p-2 shadow-[0_40px_120px_-50px_rgba(0,0,0,1)] backdrop-blur-xl">
        <div className="rounded-xl border border-white/[0.06] bg-[#0e0e16]">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-md bg-violet-500/15 text-violet-300">
                <ShieldCheck className="size-3.5" />
              </span>
              <div>
                <p className="text-xs font-medium text-foreground">
                  Audit pipeline
                </p>
                <p className="text-[10px] text-subtle">
                  Architecture preview
                </p>
              </div>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-subtle">
              No live data
            </span>
          </div>

          <div className="space-y-2 p-3">
            {stages.map((stage) => (
              <div
                key={stage.number}
                className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5"
              >
                <span className="w-5 font-mono text-[10px] text-subtle">
                  {stage.number}
                </span>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.03] text-violet-300">
                  <stage.icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">
                    {stage.title}
                  </span>
                  <span className="block truncate text-[10px] text-subtle">
                    {stage.detail}
                  </span>
                </span>
                <Badge
                  variant={stage.tone}
                  className="px-2 py-0 text-[10px]"
                >
                  {stage.status}
                </Badge>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] p-3">
            <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-subtle">
                <ListChecks className="size-3" />
                Automated vs manual
              </div>
              <p className="mt-1 text-xs font-medium text-foreground">
                Clearly separated
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-subtle">
                <ShieldCheck className="size-3" />
                Composite score
              </div>
              <p className="mt-1 text-xs font-medium text-foreground">
                Not yet shown
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -right-3 top-16 hidden rounded-lg border border-white/10 bg-[#12121b] px-3 py-2 shadow-xl sm:block">
        <p className="text-[10px] font-medium text-foreground">axe-core</p>
        <p className="text-[10px] text-subtle">WCAG 2.0–2.2 A/AA</p>
      </div>
      <div className="absolute -left-4 bottom-20 hidden rounded-lg border border-white/10 bg-[#12121b] px-3 py-2 shadow-xl sm:block">
        <p className="text-[10px] font-medium text-foreground">Playwright</p>
        <p className="text-[10px] text-subtle">Chromium 156</p>
      </div>
    </div>
  );
}
