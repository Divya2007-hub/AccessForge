"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDashed,
  Download,
  FileCode2,
  FileWarning,
  History,
  PenLine,
  RotateCcw,
  ScanSearch,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { useDeveloperMode } from "@/components/developer-mode-provider";
import { ImpactBadge } from "@/components/report/impact-badge";
import { CodePane, DiffView } from "@/components/review/proposal-code";
import { getIssueAudience } from "@/lib/accessibility/audience";
import { AdvancedDetails } from "@/components/ui/advanced-details";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { Textarea } from "@/components/ui/textarea";
import { SwitchHandoffCard } from "@/components/switch/switch-handoff-card";
import {
  clearProposalDraft,
  recordReviewEvent,
  saveProposalDraft,
} from "@/lib/client/review-store";
import { useReviewState } from "@/lib/client/use-review";
import { useScanHistory } from "@/lib/client/use-scan-history";
import { useStoredReport } from "@/lib/client/use-stored-report";
import {
  buildReviewProposals,
  deriveReviewItems,
  getUnsupportedFindings,
} from "@/lib/review/proposals";
import {
  approvedFixFilename,
  buildApprovedFixBundle,
} from "@/lib/review/export";
import type {
  ReviewAction,
  ReviewEvent,
  ReviewItem,
  ReviewStatus,
  UnsupportedFinding,
} from "@/lib/review/types";
import type { ScanSummary } from "@/lib/scanner/types";
import { cn, formatDateTime, formatHostname } from "@/lib/utils";

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Needs changes",
};

const STATUS_VARIANTS: Record<
  ReviewStatus,
  "warning" | "success" | "danger" | "info"
> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  changes_requested: "info",
};

const ACTION_LABELS: Record<ReviewAction, string> = {
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Changes requested",
  reopened: "Reopened",
};

const decisionLabel = (action: ReviewAction) => ACTION_LABELS[action];

function ReviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only">Loading the review workspace</span>
      <div className="h-28 animate-pulse rounded-xl border border-white/[0.05] bg-white/[0.02]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-xl border border-white/[0.05] bg-white/[0.02]"
          />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="h-96 animate-pulse rounded-xl border border-white/[0.05] bg-white/[0.02]" />
        <div className="h-96 animate-pulse rounded-xl border border-white/[0.05] bg-white/[0.02]" />
      </div>
    </div>
  );
}

function reportLabel(scan: ScanSummary) {
  const source =
    scan.mode === "demo" ? "Bundled demo site" : formatHostname(scan.finalUrl);
  return `${source} - ${scan.violationRules} rules - ${formatDateTime(scan.scannedAt)}`;
}

function downloadTextFile(
  filename: string,
  content: string,
  type: string,
) {
  const blob = new Blob([content], { type });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function ProposalEditor({
  item,
  hasDraft,
  locked,
  onSaved,
}: {
  item: ReviewItem;
  hasDraft: boolean;
  locked: boolean;
  onSaved: () => void;
}) {
  const [value, setValue] = React.useState(item.currentProposed);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  function handleSave() {
    const next = value.trim();
    setSaved(false);

    if (!next) {
      setError("The proposed HTML cannot be empty.");
      return;
    }

    if (next.length > 5_000) {
      setError("Keep the proposed HTML under 5,000 characters.");
      return;
    }

    if (!next.startsWith("<") || !next.endsWith(">")) {
      setError("The proposed HTML must start with < and end with >.");
      return;
    }

    try {
      saveProposalDraft(item.id, next);
      setError(null);
      setSaved(true);
      onSaved();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The draft could not be saved.",
      );
    }
  }

  function handleReset() {
    setError(null);
    setSaved(false);

    try {
      clearProposalDraft(item.id);
      setValue(item.proposed);
      onSaved();
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "The draft could not be reset.",
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenLine className="size-4 text-violet-300" aria-hidden="true" />
          Make an edit (optional)
        </CardTitle>
        <CardDescription>
          {locked
            ? "Reopen the review to edit this suggestion. Your recorded decision stays unchanged until then."
            : "You can adjust the suggested code before deciding. It is saved in this browser only."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="proposed-html">Suggested code</Label>
          <Textarea
            id="proposed-html"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setSaved(false);
            }}
            disabled={locked}
            spellCheck={false}
            className="min-h-40 font-mono text-[12px] leading-6"
            aria-describedby="proposed-html-help"
          />
          <p
            id="proposed-html-help"
            className="text-[11px] leading-relaxed text-subtle"
          >
            {locked
              ? "This suggestion is locked because a decision has been recorded."
              : item.needsAuthorInput
                ? "Approval stays locked until you replace the bracketed placeholder."
                : "Replace the placeholder with wording that fits your page."}
          </p>
        </div>

        {error ? (
          <Notice variant="danger" role="alert">
            {error}
          </Notice>
        ) : null}

        {saved ? (
          <p role="status" className="text-xs text-emerald-300">
            Draft saved in this browser.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={locked}
          >
            <Check aria-hidden="true" />
            Save my edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={locked || !hasDraft}
          >
            <RotateCcw aria-hidden="true" />
            Use suggested version
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DecisionPanel({
  item,
  onRecord,
}: {
  item: ReviewItem;
  onRecord: (action: ReviewAction, note: string) => string | null;
}) {
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const currentDecision =
    item.lastEvent && item.lastEvent.action !== "reopened"
      ? item.lastEvent
      : null;

  function record(action: ReviewAction) {
    setError(null);

    if (action === "changes_requested" && !note.trim()) {
      setError("Add a note explaining what needs to change.");
      return;
    }

    const message = onRecord(action, note);
    if (message) setError(message);
  }

  if (currentDecision) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Your decision</CardTitle>
            <Badge
              variant={
                currentDecision.action === "approved"
                  ? "success"
                  : currentDecision.action === "rejected"
                    ? "danger"
                    : "info"
              }
            >
              {decisionLabel(currentDecision.action)}
            </Badge>
          </div>
          <CardDescription>
            Recorded {formatDateTime(currentDecision.at)} in this browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            role="status"
            className={cn(
              "rounded-lg border px-3 py-3",
              currentDecision.action === "approved"
                ? "border-emerald-400/20 bg-emerald-400/[0.06]"
                : currentDecision.action === "rejected"
                  ? "border-rose-400/20 bg-rose-400/[0.06]"
                  : "border-indigo-400/20 bg-indigo-400/[0.06]",
            )}
          >
            <p
              className={cn(
                "flex items-center gap-2 text-sm font-medium",
                currentDecision.action === "approved"
                  ? "text-emerald-200"
                  : currentDecision.action === "rejected"
                    ? "text-rose-200"
                    : "text-indigo-200",
              )}
            >
              {currentDecision.action === "approved" ? (
                <CheckCircle2 className="size-4" aria-hidden="true" />
              ) : currentDecision.action === "rejected" ? (
                <X className="size-4" aria-hidden="true" />
              ) : (
                <CircleDashed className="size-4" aria-hidden="true" />
              )}
              {currentDecision.action === "approved"
                ? "Approved in this browser"
                : currentDecision.action === "rejected"
                  ? "Rejected in this browser"
                  : "Changes requested in this browser"}
            </p>
            {currentDecision.note ? (
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                {currentDecision.note}
              </p>
            ) : null}
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              No files or agents were changed. This decision is stored only in
              this browser.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => record("reopened")}
          >
            <RotateCcw aria-hidden="true" />
            Reopen review
          </Button>

          {error ? (
            <Notice variant="danger" role="alert">
              {error}
            </Notice>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your decision</CardTitle>
        <CardDescription>
          Approve if this suggestion looks right for your page. Nothing is
          changed automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.lastEvent?.action === "reopened" ? (
          <p className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] leading-relaxed text-subtle">
            Reopened {formatDateTime(item.lastEvent.at)}. Earlier decisions
            remain in the audit trail.
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="review-note">Add a note (optional)</Label>
          <Textarea
            id="review-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Anything you want to remember about this decision."
            className="min-h-20"
          />
        </div>

        {item.needsAuthorInput ? (
          <p
            id="approval-note"
            className="rounded-md border border-amber-400/15 bg-amber-400/[0.05] px-3 py-2 text-[11px] leading-relaxed text-amber-100"
          >
            Approve is disabled until you replace the bracketed placeholder and
            save your edit.
          </p>
        ) : (
          <p
            id="approval-note"
            className="text-[11px] leading-relaxed text-subtle"
          >
            Approving saves your decision. It does not prove the fix works.
          </p>
        )}

        {error ? (
          <Notice variant="danger" role="alert">
            {error}
          </Notice>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => record("approved")}
            disabled={item.needsAuthorInput}
            aria-describedby="approval-note"
          >
            <Check aria-hidden="true" />
            Approve this fix
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => record("rejected")}
          >
            <X aria-hidden="true" />
            Reject this fix
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UnsupportedFindingsCard({
  findings,
}: {
  findings: UnsupportedFinding[];
}) {
  if (findings.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Findings without a rule-based draft</CardTitle>
        <CardDescription>
          These rules need source, design, or content context. Open the report and
          review them manually.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {findings.map((finding) => (
            <li
              key={finding.ruleId}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2"
            >
              <ImpactBadge
                impact={finding.impact}
                className="px-2 py-0 text-[10px]"
              />
              <span className="flex-1 text-xs text-muted-foreground">
                {finding.title}
              </span>
              <span className="text-[10px] text-subtle">
                {finding.elementCount} element
                {finding.elementCount === 1 ? "" : "s"}
              </span>
              <a
                href={finding.helpUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-violet-300 underline-offset-4 hover:underline"
              >
                Rule docs
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ApprovedExportCard({
  approvedCount,
  onExportBundle,
  onExportDiff,
}: {
  approvedCount: number;
  onExportBundle: () => string | null;
  onExportDiff: () => string | null;
}) {
  const [error, setError] = React.useState<string | null>(null);

  function runExport(action: () => string | null) {
    setError(null);
    const message = action();
    if (message) setError(message);
  }

  return (
    <Card id="approved-export">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="size-4 text-violet-300" aria-hidden="true" />
          Export approved fixes
        </CardTitle>
        <CardDescription>
          Create a local handoff bundle from approvals in this report. Nothing
          is applied or committed here; the bundle can also be posted to Switch
          below when the bridge is configured.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {approvedCount === 0
            ? "Approve at least one draft to enable export. Pending, rejected, and changes-requested drafts are excluded."
            : `${approvedCount} approved change${approvedCount === 1 ? "" : "s"} will be included with the exact approved HTML, decision note, and timestamp.`}
        </p>

        <p className="rounded-md border border-amber-400/15 bg-amber-400/[0.05] px-3 py-2 text-[11px] leading-relaxed text-amber-100">
          The fragment diff is not an applyable Git patch. AccessForge does not
          store repository paths or source line numbers, so apply each change in
          the real source and re-run verification.
        </p>

        {error ? (
          <Notice variant="danger" role="alert">
            {error}
          </Notice>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => runExport(onExportBundle)}
            disabled={approvedCount === 0}
          >
            <Download aria-hidden="true" />
            Export approved bundle
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => runExport(onExportDiff)}
            disabled={approvedCount === 0}
          >
            <FileCode2 aria-hidden="true" />
            Download fragment diff
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AuditTrail({
  events,
  onExport,
}: {
  events: ReviewEvent[];
  onExport: () => string | null;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const visible = events.slice(0, 12);

  function exportLog() {
    setError(null);
    const message = onExport();
    if (message) setError(message);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-violet-300" aria-hidden="true" />
            Local audit trail
          </CardTitle>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={exportLog}
            disabled={events.length === 0}
          >
            <Download aria-hidden="true" />
            Export review log
          </Button>
        </div>
        <CardDescription>
          Every decision and reopen is recorded in this browser. Clearing site
          data removes the log.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <Notice variant="danger" role="alert">
            {error}
          </Notice>
        ) : null}

        {visible.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No decisions have been recorded in this browser yet.
          </p>
        ) : (
          <ol className="divide-y divide-white/[0.05]">
            {visible.map((event) => (
              <li key={event.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      event.action === "approved"
                        ? "success"
                        : event.action === "rejected"
                          ? "danger"
                          : event.action === "changes_requested"
                            ? "info"
                            : "outline"
                    }
                  >
                    {decisionLabel(event.action)}
                  </Badge>
                  <span className="text-xs font-medium text-foreground">
                    {event.proposalTitle}
                  </span>
                  <span className="text-[11px] text-subtle">
                    {formatDateTime(event.at)}
                  </span>
                </div>
                <p className="mt-1 break-all font-mono text-[10px] text-subtle">
                  {event.ruleId} / {event.selector}
                </p>
                {event.note ? (
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {event.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}

        {events.length > visible.length ? (
          <p className="text-[11px] text-subtle">
            Showing the latest {visible.length} of {events.length} events. Export
            the log to inspect every event.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ReviewWorkspace({
  initialReportId,
}: {
  initialReportId: string | null;
}) {
  const router = useRouter();
  const developer = useDeveloperMode();
  const { history, hydrated: historyHydrated } = useScanHistory();
  const { state, hydrated: reviewHydrated } = useReviewState();

  const [selectedReportId, setSelectedReportId] = React.useState(
    initialReportId ?? "",
  );
  const [activeProposalId, setActiveProposalId] = React.useState<string | null>(
    null,
  );

  const historyIds = React.useMemo(
    () => new Set(history.map((scan) => scan.id)),
    [history],
  );

  const activeReportId =
    selectedReportId && historyIds.has(selectedReportId)
      ? selectedReportId
      : initialReportId && historyIds.has(initialReportId)
        ? initialReportId
        : (history[0]?.id ?? "");

  const report = useStoredReport(activeReportId);

  const proposals = React.useMemo(
    () => (report ? buildReviewProposals(report) : []),
    [report],
  );

  const reviewItems = React.useMemo(
    () => deriveReviewItems(proposals, state),
    [proposals, state],
  );

  const unsupportedFindings = React.useMemo(
    () => (report ? getUnsupportedFindings(report, proposals) : []),
    [proposals, report],
  );

  const counts = React.useMemo(
    () => ({
      total: reviewItems.length,
      pending: reviewItems.filter((item) => item.status === "pending").length,
      approved: reviewItems.filter((item) => item.status === "approved").length,
      rejected: reviewItems.filter((item) => item.status === "rejected").length,
      changes: reviewItems.filter(
        (item) => item.status === "changes_requested",
      ).length,
    }),
    [reviewItems],
  );

  const activeItem = React.useMemo(() => {
    if (activeProposalId) {
      const selected = reviewItems.find((item) => item.id === activeProposalId);
      if (selected) return selected;
    }
    return (
      reviewItems.find((item) => item.status === "pending") ??
      reviewItems[0] ??
      null
    );
  }, [activeProposalId, reviewItems]);

  const activeIndex = activeItem
    ? reviewItems.findIndex((item) => item.id === activeItem.id)
    : -1;
  const nextItem = activeIndex >= 0 ? (reviewItems[activeIndex + 1] ?? null) : null;
  const previousItem =
    activeIndex > 0 ? (reviewItems[activeIndex - 1] ?? null) : null;
  const activeReport = history.find((scan) => scan.id === activeReportId);
  const activeAudience = activeItem
    ? getIssueAudience(activeItem.ruleId, activeItem.impact)
    : null;
  const reviewedCount = counts.total - counts.pending;
  const progressPercent =
    counts.total > 0 ? Math.round((reviewedCount / counts.total) * 100) : 0;

  function selectReport(reportId: string) {
    setSelectedReportId(reportId);
    setActiveProposalId(null);
    router.replace(`/review?report=${encodeURIComponent(reportId)}`, {
      scroll: false,
    });
  }

  function recordDecision(action: ReviewAction, note: string) {
    if (!activeItem) return "Choose a suggestion before recording a decision.";

    if (action === "approved" && activeItem.needsAuthorInput) {
      return "Replace the bracketed placeholder and save your edit before approving.";
    }

    try {
      recordReviewEvent({
        proposalId: activeItem.id,
        reportId: activeItem.reportId,
        ruleId: activeItem.ruleId,
        proposalTitle: activeItem.ruleTitle,
        pageTitle: activeItem.pageTitle,
        selector: activeItem.selector,
        action,
        note,
        original: activeItem.original,
        proposed: activeItem.currentProposed,
      });

      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "The decision could not be saved in this browser.";
    }
  }

  function exportReviewLog() {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        kind: "accessforge-local-review-log",
        decisions: state.events,
        drafts: state.drafts,
      };
      downloadTextFile(
        "accessforge-review-log.json",
        JSON.stringify(payload, null, 2),
        "application/json",
      );
      return null;
    } catch {
      return "The review log could not be exported.";
    }
  }

  function buildCurrentBundle() {
    if (!report) throw new Error("Select a stored report before sending.");
    return buildApprovedFixBundle(report, reviewItems);
  }

  function exportApprovedBundle() {
    if (!report) return "Select a stored report before exporting.";

    try {
      const bundle = buildApprovedFixBundle(report, reviewItems);
      downloadTextFile(
        approvedFixFilename(report.id, "json"),
        JSON.stringify(bundle, null, 2),
        "application/json",
      );
      return null;
    } catch {
      return "The approved fix bundle could not be exported.";
    }
  }

  function exportApprovedDiff() {
    if (!report) return "Select a stored report before exporting.";

    try {
      const bundle = buildApprovedFixBundle(report, reviewItems);
      downloadTextFile(
        approvedFixFilename(report.id, "diff"),
        bundle.fragmentDiff,
        "text/plain;charset=utf-8",
      );
      return null;
    } catch {
      return "The fragment diff could not be exported.";
    }
  }

  if (!historyHydrated || !reviewHydrated) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Fixes"
          title="Review fixes"
          description="Look at one suggested change at a time. You decide what happens."
        />
        <ReviewSkeleton />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Fixes"
          title="Review fixes"
          description="Look at one suggested change at a time. You decide what happens."
        />
        <EmptyState
          icon={ScanSearch}
          title="There is nothing to review yet"
          description="Check a website first. Suggested fixes come from the problems found in that result."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild size="sm">
                <Link href="/scanner">
                  Check a website
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href="/dashboard">Back to my scans</Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  const reportHref = activeReportId ? `/report/${activeReportId}` : "/dashboard";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={reportHref}
          className="inline-flex items-center gap-1.5 rounded-sm text-xs text-subtle transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to results
        </Link>
        {counts.approved > 0 ? (
          <Link
            href="/progress"
            className="inline-flex items-center gap-1.5 rounded-sm text-xs font-medium text-violet-300 transition-colors hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View progress
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <PageHeader
        eyebrow="Fixes"
        title="Review fixes"
        description="Look at one suggested change at a time. You can edit it, approve it, or reject it."
      />

      <div className="flex flex-col gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.14em] text-subtle">
            Result
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-foreground">
            {activeReport
              ? activeReport.mode === "demo"
                ? "Bundled demo site"
                : formatHostname(activeReport.finalUrl)
              : "Saved result"}
          </p>
          {activeReport ? (
            <p className="text-xs text-subtle">
              {activeReport.violationRules} issue types,{" "}
              {activeReport.affectedElements} places to fix
            </p>
          ) : null}
        </div>
        {history.length > 1 ? (
          <div className="flex items-center gap-2">
            <Label htmlFor="review-report" className="sr-only">
              Choose result
            </Label>
            <select
              id="review-report"
              value={activeReportId}
              onChange={(event) => selectReport(event.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-surface px-3 text-xs text-foreground shadow-inner shadow-black/20 transition-colors focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:w-auto"
            >
              {history.map((scan) => (
                <option key={scan.id} value={scan.id}>
                  {reportLabel(scan)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <Notice variant="info" title="Nothing changes automatically">
        Approving saves your decision in this browser. No code or agent is
        changed, and no fix is verified.
      </Notice>

      {!report ? (
        <Notice variant="danger" title="This result is not stored here">
          The selected result is no longer in browser storage. Choose another
          result or check the website again.
        </Notice>
      ) : reviewItems.length === 0 ? (
        <div className="space-y-5">
          <EmptyState
            icon={FileWarning}
            title="No suggested fixes for this result"
            description={
              report.violations.length === 0
                ? "The automated checks found no problems. A person should still check the page with a keyboard and a screen reader."
                : "These problems need source or design context, so no suggestion was generated. Open the results to review them yourself."
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild size="sm">
                  <Link href={`/report/${report.id}`}>
                    Open results
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/scanner">Check another page</Link>
                </Button>
              </div>
            }
          />
          {developer.enabled ? (
            <UnsupportedFindingsCard findings={unsupportedFindings} />
          ) : null}
        </div>
      ) : activeItem ? (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Fix {activeIndex + 1} of {counts.total}
              </p>
              <p className="mt-0.5 text-xs text-subtle">
                {counts.approved} approved, {counts.pending} left to review
              </p>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06] sm:w-56"
              role="progressbar"
              aria-label="Review progress"
              aria-valuemin={0}
              aria-valuemax={counts.total}
              aria-valuenow={reviewedCount}
            >
              <div
                className="h-full rounded-full bg-violet-400/80 transition-[width] duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_VARIANTS[activeItem.status]}>
                  {STATUS_LABELS[activeItem.status]}
                </Badge>
                <ImpactBadge impact={activeItem.impact} />
                {activeItem.isEdited ? (
                  <Badge variant="outline">Edited</Badge>
                ) : null}
                {activeItem.needsAuthorInput ? (
                  <Badge variant="warning">Needs your input</Badge>
                ) : null}
                <span className="ml-auto text-[11px] text-subtle">
                  Fix {activeIndex + 1} of {counts.total}
                </span>
              </div>
              <CardTitle className="mt-2 text-xl">
                {activeItem.ruleTitle}
              </CardTitle>
              <CardDescription>
                Found in {activeItem.elementCount}{" "}
                {activeItem.elementCount === 1 ? "place" : "places"} on this
                page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {activeItem.description}
              </p>

              {activeAudience ? (
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-subtle">
                    Who this affects
                  </h3>
                  <p className="mt-1.5 text-sm font-medium text-foreground">
                    {activeAudience.audience}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {activeAudience.detail}
                  </p>
                </div>
              ) : null}

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-subtle">
                  What changes
                </h3>
                <div className="mt-2 grid gap-3 xl:grid-cols-2">
                  <CodePane
                    label="Before"
                    code={activeItem.original}
                    tone="neutral"
                    showBadge={false}
                  />
                  <CodePane
                    label="Suggested fix"
                    code={activeItem.currentProposed}
                    tone="proposed"
                    showBadge={false}
                  />
                </div>
              </div>

              {activeItem.truncated ? (
                <p className="text-[11px] leading-relaxed text-amber-200">
                  The stored snippet may be truncated. Check the real source
                  before relying on the exact markup.
                </p>
              ) : null}

              {developer.enabled ? (
                <AdvancedDetails
                  summary="Developer details"
                  description="Rule identifiers, reasoning, risk, and the exact line difference."
                  className="bg-white/[0.02]"
                >
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{activeItem.ruleId}</Badge>
                      {activeItem.wcag.map((reference) => (
                        <Badge key={reference} variant="outline">
                          {reference}
                        </Badge>
                      ))}
                    </div>
                    <p className="break-all font-mono text-[10px] text-subtle">
                      {activeItem.selector}
                    </p>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-subtle">
                        Why this change
                      </h4>
                      <ul className="mt-2 space-y-2">
                        {activeItem.explanation.map((entry) => (
                          <li
                            key={entry}
                            className="flex gap-2.5 text-xs leading-relaxed text-muted-foreground"
                          >
                            <CheckCircle2
                              className="mt-0.5 size-3.5 shrink-0 text-violet-300/80"
                              aria-hidden="true"
                            />
                            {entry}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-xs leading-relaxed text-subtle">
                      <span className="font-medium text-muted-foreground">
                        Risk note:
                      </span>{" "}
                      {activeItem.risk}
                    </p>
                    <DiffView
                      original={activeItem.original}
                      proposed={activeItem.currentProposed}
                    />
                    <a
                      href={activeItem.helpUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-xs text-violet-300 underline-offset-4 hover:underline"
                    >
                      Open rule documentation
                    </a>
                  </div>
                </AdvancedDetails>
              ) : null}
            </CardContent>
          </Card>

          {activeItem.status === "pending" ? (
            <ProposalEditor
              key={activeItem.id}
              item={activeItem}
              hasDraft={Boolean(state.drafts[activeItem.id])}
              locked={false}
              onSaved={() => undefined}
            />
          ) : null}

          <DecisionPanel
            key={`${activeItem.id}:${activeItem.status}:${activeItem.lastEvent?.id ?? "none"}`}
            item={activeItem}
            onRecord={recordDecision}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                previousItem && setActiveProposalId(previousItem.id)
              }
              disabled={!previousItem}
            >
              <ArrowLeft aria-hidden="true" />
              Previous
            </Button>
            <p className="text-xs text-subtle">
              {activeIndex + 1} of {counts.total}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => nextItem && setActiveProposalId(nextItem.id)}
              disabled={!nextItem}
            >
              Next
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>

          {developer.enabled ? (
            <UnsupportedFindingsCard findings={unsupportedFindings} />
          ) : null}
        </div>
      ) : null}

      {report ? (
        <section aria-labelledby="handoff-heading" className="space-y-4">
          <div>
            <h2
              id="handoff-heading"
              className="text-xl font-semibold tracking-tight text-foreground"
            >
              Send approved fixes to the agents
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              AccessForge can share the suggestions you approved with the Fix
              Agent. Sending a suggestion is not proof that a fix was applied or
              tested.
            </p>
          </div>
          <SwitchHandoffCard
            approvedCount={counts.approved}
            buildBundle={buildCurrentBundle}
          />
          {developer.enabled ? (
            <div className="space-y-4">
              <ApprovedExportCard
                approvedCount={counts.approved}
                onExportBundle={exportApprovedBundle}
                onExportDiff={exportApprovedDiff}
              />
              <AuditTrail events={state.events} onExport={exportReviewLog} />
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
        <p className="text-xs text-subtle">
          Decisions and approved suggestions stay in this browser.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href={reportHref}>Back to results</Link>
          </Button>
          {counts.approved > 0 ? (
            <Button asChild size="sm">
              <Link href="/progress">
                View progress
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/scanner">
                Check another page
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}