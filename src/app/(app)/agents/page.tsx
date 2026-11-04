import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Code2,
  Database,
  Download,
  GitPullRequest,
  LockKeyhole,
  ScanSearch,
  ShieldCheck,
  TestTube2,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { SwitchActivityFeed } from "@/components/switch/switch-activity-feed";
import { SwitchStatusPanel } from "@/components/switch/switch-status-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdvancedDetails } from "@/components/ui/advanced-details";
import { Notice } from "@/components/ui/notice";

export const metadata: Metadata = {
  title: "AI Activity",
  description:
    "Live Switch bridge status, real room activity, and the Audit, Fix, and Testing agent workflow for AccessForge.",
};

const agents = [
  {
    name: "Audit Agent",
    icon: ScanSearch,
    badge: "Scanner live",
    variant: "success" as const,
    description:
      "Owns detection. It coordinates the scanner, groups duplicate findings, and prepares a reviewable report.",
    guardrail: "Read-only. Cannot change code or approve fixes.",
  },
  {
    name: "Fix Agent",
    icon: Code2,
    badge: "Switch agent",
    variant: "info" as const,
    description:
      "Owns repair proposals for findings a human has explicitly approved for handoff.",
    guardrail: "Cannot merge, deploy, or modify a repository by itself.",
  },
  {
    name: "Testing Agent",
    icon: TestTube2,
    badge: "Switch agent",
    variant: "info" as const,
    description:
      "Owns verification evidence after a proposed patch is available.",
    guardrail: "Cannot approve or merge. Human decision remains final.",
  },
];

const workflow = [
  {
    title: "Select a target",
    description: "A human chooses a public page or the bundled demo site.",
    icon: CheckCircle2,
  },
  {
    title: "Audit",
    description: "The local scanner gathers real axe-core findings.",
    icon: ScanSearch,
  },
  {
    title: "Triage",
    description: "A human reviews impact, technical detail, and manual checks.",
    icon: UserCheck,
  },
  {
    title: "Approve locally",
    description:
      "A human edits and approves a rule-based draft. The decision stays in this browser.",
    icon: ClipboardCheck,
  },
  {
    title: "Send to Switch",
    description:
      "An approved snapshot can be posted to the configured room for the Fix and Testing agents.",
    icon: Download,
  },
  {
    title: "Verify",
    description:
      "Application and verification happen outside AccessForge. Evidence must come from the agents or a human.",
    icon: TestTube2,
  },
];

const prerequisites = [
  "Registered Switch bridge agent invited to the target room",
  "Fix and Testing agents configured in the same Switch room",
  "Sandboxed execution boundary for generated code",
  "Durable audit trail outside this browser",
  "Scoped GitHub App permissions and least-privilege tokens",
  "Preview environments and rollback procedures",
];

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Activity"
        title="AI Activity"
        description="See the real state of the optional Switch bridge, read room activity, and understand where each agent role begins and ends."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/review">
                <GitPullRequest aria-hidden="true" />
                Review Fixes
              </Link>
            </Button>
            <Button asChild>
              <Link href="/scanner">
                <ScanSearch aria-hidden="true" />
                Scan a page
              </Link>
            </Button>
          </>
        }
      />

      <Notice variant="info" title="Switch handoff is optional and server-side">
        The bridge, approved-fix dispatch, and room activity read are real.
        Nothing is simulated. Switch credentials stay in the server environment
        and are never sent to the browser. AccessForge does not apply or verify
        code.
      </Notice>

      <div className="grid gap-5 xl:grid-cols-2">
        <div id="bridge-setup" className="scroll-mt-24">
          <SwitchStatusPanel />
        </div>
        <SwitchActivityFeed />
      </div>

      <section id="architecture" aria-labelledby="workflow-heading" className="scroll-mt-24 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="workflow-heading"
              className="text-xl font-semibold tracking-tight text-foreground"
            >
              Agent workflow architecture
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Detection, human approval, handoff, and verification stay separate.
              A human decision sits between every state change.
            </p>
          </div>
          <Badge variant="outline">Human-in-the-loop</Badge>
        </div>

        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workflow.map((stage, index) => (
            <li
              key={stage.title}
              className="rounded-xl border border-border bg-card/60 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-8 items-center justify-center rounded-md border border-white/[0.06] bg-surface-2 text-violet-300">
                  <stage.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="font-mono text-[10px] text-subtle">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">
                {stage.title}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-subtle">
                {stage.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="agent-roles-heading" className="space-y-4">
        <div>
          <h2
            id="agent-roles-heading"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            Agent roles
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            The scanner runs locally. The Fix and Testing roles are separate
            Switch agents when the bridge is configured.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.name} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg border border-violet-400/15 bg-violet-400/[0.06] text-violet-300">
                    <agent.icon className="size-5" aria-hidden="true" />
                  </span>
                  <Badge variant={agent.variant}>
                    <Bot className="size-3" aria-hidden="true" />
                    {agent.badge}
                  </Badge>
                </div>
                <CardTitle as="h3" className="mt-2">
                  {agent.name}
                </CardTitle>
                <CardDescription>{agent.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                  <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-subtle">
                    <LockKeyhole className="size-3" aria-hidden="true" />
                    Guardrail
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {agent.guardrail}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <AdvancedDetails
        summary="Implementation details and remaining work"
        description="What is live, what is still missing, and where the data boundary sits."
        className="bg-card/60"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.04] p-4">
            <div className="flex items-center gap-2">
              <span
                className="size-1.5 rounded-full bg-emerald-400"
                aria-hidden="true"
              />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
                Implemented now
              </p>
            </div>
            <ol className="mt-3 space-y-2">
              {[
                "Next.js scanner interface",
                "POST /api/scan and /api/demo-scan",
                "URL guard and request-level safety checks",
                "Playwright Chromium + axe-core analysis",
                "Local browser report storage",
                "Deterministic fix drafts for supported rules",
                "Local approve, reject, reopen, and audit trail",
                "Approved-fix bundle and fragment diff export",
                "Server-only Switch bridge configuration and health checks",
                "Approved-fix handoff posted to a Switch room",
                "Real Switch room activity polling",
              ].map((item, index) => (
                <li
                  key={item}
                  className="flex gap-2.5 text-xs text-muted-foreground"
                >
                  <span className="font-mono text-[10px] text-subtle">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-white/[0.12] bg-white/[0.015] p-4">
              <div className="flex items-center gap-2">
                <CircleDashed
                  className="size-3.5 text-subtle"
                  aria-hidden="true"
                />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subtle">
                  Remaining work
                </p>
              </div>
              <ol className="mt-3 space-y-2">
                {[
                  "Server-side approval record and durable audit trail",
                  "Source-file mapping for applyable patches",
                  "GitHub repository and permission model",
                  "Fix Agent source-repository apply",
                  "Testing Agent preview verification",
                  "Pull request creation and merge controls",
                ].map((item, index) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-xs text-subtle"
                  >
                    <span className="font-mono text-[10px]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-subtle">
                <Database className="size-3.5" aria-hidden="true" />
                Data boundary
              </p>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
                <li className="flex gap-2">
                  <ShieldCheck
                    className="mt-0.5 size-3.5 shrink-0 text-emerald-300/80"
                    aria-hidden="true"
                  />
                  Playwright runs server-side only. Browser cookies and provider
                  credentials never reach the client.
                </li>
                <li className="flex gap-2">
                  <Bot
                    className="mt-0.5 size-3.5 shrink-0 text-violet-300/80"
                    aria-hidden="true"
                  />
                  Switch credentials live in server-side environment variables
                  and are used only by API routes.
                </li>
                <li className="flex gap-2">
                  <GitPullRequest
                    className="mt-0.5 size-3.5 shrink-0 text-subtle"
                    aria-hidden="true"
                  />
                  GitHub tokens are not requested or stored.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </AdvancedDetails>

      <Card>
        <CardHeader>
          <CardTitle>Operational prerequisites</CardTitle>
          <CardDescription>
            The local bridge is implemented. Full agent automation still depends
            on these controls.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {prerequisites.map((item) => (
              <li
                key={item}
                className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
              >
                <CircleDashed
                  className="mt-0.5 size-3.5 shrink-0 text-subtle"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
        <p className="text-xs text-subtle">
          AI Activity reports real bridge state only. No fake progress or
          completion.
        </p>
        <Button asChild variant="secondary" size="sm">
          <Link href="/help#switch">
            Switch setup help
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
