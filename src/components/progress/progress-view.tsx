"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  ScanSearch,
  Send,
  ShieldCheck,
  TestTube2,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { useDeveloperMode } from "@/components/developer-mode-provider";
import { ImpactBadge } from "@/components/report/impact-badge";
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
import { Notice } from "@/components/ui/notice";
import { useReviewState } from "@/lib/client/use-review";
import { useScanHistory } from "@/lib/client/use-scan-history";
import { useStoredReport } from "@/lib/client/use-stored-report";
import { useSwitchStatus } from "@/lib/client/use-switch-status";
import {
  buildReviewProposals,
  deriveReviewItems,
} from "@/lib/review/proposals";
import { formatDateTime, formatHostname } from "@/lib/utils";

export function ProgressView() {
  const developer = useDeveloperMode();
  const { history, hydrated: historyHydrated } = useScanHistory();
  const { state, hydrated: reviewHydrated } = useReviewState();
  const latest = history[0] ?? null;
  const report = useStoredReport(latest?.id ?? "");
  const { status, loading: statusLoading } = useSwitchStatus();

  const proposals = React.useMemo(
    () => (report ? buildReviewProposals(report) : []),
    [report],
  );
  const reviewItems = React.useMemo(
    () => deriveReviewItems(proposals, state),
    [proposals, state],
  );

  const counts = React.useMemo(
    () => ({
      total: reviewItems.length,
      pending: reviewItems.filter((item) => item.status === "pending").length,
      approved: reviewItems.filter((item) => item.status === "approved").length,
      rejected: reviewItems.filter((item) => item.status === "rejected").length,
    }),
    [reviewItems],
  );

  const approvedItems = reviewItems.filter(
    (item) => item.status === "approved",
  );
  const reviewedCount = counts.total - counts.pending;
  const reportName = latest
    ? latest.mode === "demo"
      ? "Bundled demo site"
      : formatHostname(latest.finalUrl)
    : null;
  const reviewHref = report ? `/review?report=${report.id}` : "/review";
  const agentsReady = Boolean(
    status?.configured &&
      status.online &&
      status.authorized &&
      status.fixAgent?.inRoom &&
      status.testAgent?.inRoom,
  );
  const agentText = statusLoading
    ? "Checking whether the agents are available..."
    : agentsReady
      ? `The agents are ready in ${status?.room?.name ?? "the shared room"}.`
      : "The agents are not available right now. You can still review fixes in this browser.";

  if (!historyHydrated || !reviewHydrated) {
    return (
      <div className="space-y-6" aria-busy="true">
        <PageHeader
          eyebrow="Progress"
          title="Your progress"
          description="See what has been reviewed and what still needs a person."
        />
        <div className="h-48 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-sm text-xs text-subtle transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to my scans
      </Link>

      <PageHeader
        eyebrow="Progress"
        title="Your progress"
        description="See what has been reviewed and what still needs a person."
        actions={
          report ? (
            <Button asChild>
              <Link href={reviewHref}>
                {counts.pending > 0 ? "Continue review" : "Open review"}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/scanner">
                Check a website
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          )
        }
      />

      <Notice variant="info" title="Only real progress is shown">
        AccessForge records your reviews in this browser. It does not apply code
        or verify that a fix works, so it will not mark a fix as complete.
      </Notice>

      <Card>
        <CardHeader>
          <CardTitle>Where things stand</CardTitle>
          <CardDescription>
            {latest
              ? `Latest check: ${reportName}, ${formatDateTime(latest.scannedAt)}.`
              : "No website has been checked in this browser yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="divide-y divide-white/[0.06]">
            <li className="flex gap-3 py-4 first:pt-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.02] text-violet-300">
                <ScanSearch className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    Check a page
                  </p>
                  <Badge variant={latest ? "success" : "secondary"}>
                    {latest ? "Done" : "Not started"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {latest
                    ? "AccessForge has a saved result to work from."
                    : "Start by checking a page you want to improve."}
                </p>
              </div>
            </li>

            <li className="flex gap-3 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.02] text-violet-300">
                <UserCheck className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    Review suggested fixes
                  </p>
                  <Badge
                    variant={
                      counts.total === 0 || counts.pending > 0
                        ? "warning"
                        : "success"
                    }
                  >
                    {counts.total === 0
                      ? "Nothing to review"
                      : `${reviewedCount} of ${counts.total} reviewed`}
                  </Badge>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {counts.total === 0
                    ? report
                      ? "This result has no suggested fixes to review."
                      : "Suggested fixes will appear after a check."
                    : `${counts.approved} approved and ${counts.rejected} rejected. You stay in control of every decision.`}
                </p>
              </div>
            </li>

            <li className="flex gap-3 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.02] text-violet-300">
                <Send className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    Send approved fixes
                  </p>
                  <Badge
                    variant={
                      counts.approved > 0
                        ? agentsReady
                          ? "success"
                          : "warning"
                        : "secondary"
                    }
                  >
                    {counts.approved > 0
                      ? agentsReady
                        ? "Ready"
                        : "Agents unavailable"
                      : "Waiting for approval"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {counts.approved > 0
                    ? `${counts.approved} approved fix${counts.approved === 1 ? "" : "es"} can be shared with the Fix Agent.`
                    : "Approve at least one fix before sharing it with the agents."}
                </p>
                {counts.approved > 0 ? (
                  <Link
                    href={reviewHref}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-violet-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Review and send
                    <ArrowRight className="size-3" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            </li>

            <li className="flex gap-3 py-4 last:pb-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.02] text-subtle">
                <TestTube2 className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    Apply and verify
                  </p>
                  <Badge variant="outline">Not tracked here</Badge>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  A person or the Testing Agent must confirm the fix outside
                  AccessForge. This page will not mark it as done.
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-violet-300" aria-hidden="true" />
              Agent availability
            </CardTitle>
            <CardDescription>
              This is the real agent connection. No progress is simulated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
              {agentsReady ? (
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-emerald-300"
                  aria-hidden="true"
                />
              ) : (
                <CircleDashed
                  className="mt-0.5 size-4 shrink-0 text-subtle"
                  aria-hidden="true"
                />
              )}
              {agentText}
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href={report ? reviewHref : "/scanner"}>
                {report ? "Open review" : "Check a website"}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approved fixes</CardTitle>
            <CardDescription>
              These are the suggestions you approved for the latest check.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {approvedItems.length > 0 ? (
              <ul className="space-y-2">
                {approvedItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <ImpactBadge
                      impact={item.impact}
                      className="px-2 py-0 text-[10px]"
                    />
                    <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                      {item.ruleTitle}
                    </span>
                    <Badge variant="success">Approved</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-white/[0.08] bg-white/[0.015] px-4 py-6 text-sm leading-relaxed text-muted-foreground">
                No fixes have been approved for the latest check.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <SwitchActivityFeed />

      {developer.enabled ? (
        <section aria-labelledby="progress-developer-heading" className="space-y-4">
          <div>
            <h2
              id="progress-developer-heading"
              className="text-xl font-semibold tracking-tight text-foreground"
            >
              Developer details
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Bridge configuration and agent health checks.
            </p>
          </div>
          <SwitchStatusPanel />
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
        <p className="text-xs text-subtle">
          Real state only. Nothing is marked complete by AccessForge.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard">Back to my scans</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={report ? reviewHref : "/scanner"}>
              {report
                ? counts.pending > 0
                  ? "Continue review"
                  : "Open review"
                : "Check a website"}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
