"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  ClipboardList,
  Download,
  ExternalLink,
  FileWarning,
  FlaskConical,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { PageNavigation } from "@/components/app/page-navigation";
import { useDeveloperMode } from "@/components/developer-mode-provider";
import { ImpactBadge } from "@/components/report/impact-badge";
import { IssueCard } from "@/components/report/issue-card";
import { SeverityBreakdown } from "@/components/report/severity-breakdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { useHydrated } from "@/lib/client/use-hydrated";
import { useStoredReport } from "@/lib/client/use-stored-report";
import type { ScanReport, ViolationIssue } from "@/lib/scanner/types";
import {
  formatDateTime,
  formatDuration,
  formatHostname,
  pluralize,
} from "@/lib/utils";

const severityWeight: Record<ViolationIssue["impact"], number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

type DeveloperTab = "manual" | "details";

const DEVELOPER_TABS: Array<{ id: DeveloperTab; label: string }> = [
  { id: "manual", label: "Manual checks" },
  { id: "details", label: "Report details" },
];

function ReportSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading saved report</span>
      <div className="h-28 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
      <div className="h-40 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
      <div className="h-64 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
    </div>
  );
}

function MissingReport() {
  return (
    <div className="space-y-6">
      <PageNavigation
        back={{ href: "/dashboard", label: "Back to my scans" }}
        breadcrumbs={[
          { href: "/dashboard", label: "My scans" },
          { label: "Results" },
        ]}
      />
      <PageHeader
        eyebrow="Results"
        title="We could not find this result"
        description="Saved results live in this browser. This one may have been cleared or created in another browser."
      />
      <EmptyState
        icon={FileWarning}
        title="This result is not stored here"
        description="Check the website again to create a fresh result."
        action={
          <Button asChild size="sm">
            <Link href="/scanner">
              Check a website
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        }
      />
    </div>
  );
}

function ManualChecks({ checks }: { checks: ScanReport["manualChecks"] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {checks.map((check) => (
        <div
          key={check.id}
          className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-amber-300/15 bg-amber-300/[0.06] text-amber-200">
              <ClipboardList className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">
                {check.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {check.description}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-subtle">
                <span className="font-medium text-muted-foreground">
                  Why it matters:
                </span>{" "}
                {check.whyItMatters}
              </p>
              {check.wcag.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {check.wcag.map((reference) => (
                    <Badge key={reference} variant="outline">
                      {reference}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function NeedsManualReview({ report }: { report: ScanReport }) {
  if (report.needsReview.length === 0) return null;

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          Needs manual review
        </h3>
        <Badge variant="warning">{report.needsReview.length} rules</Badge>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Automation could not decide these. They are not counted as failures.
      </p>
      <ul className="mt-3 divide-y divide-white/[0.05]">
        {report.needsReview.map((item) => (
          <li
            key={item.ruleId}
            className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ImpactBadge impact={item.impact} />
                <p className="text-sm font-medium text-foreground">
                  {item.title}
                </p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </p>
              <p className="mt-1 text-[11px] text-subtle">
                {item.elementCount} {pluralize(item.elementCount, "element")}
                {item.wcag.length > 0 ? ` · ${item.wcag.join(", ")}` : ""}
              </p>
            </div>
            <a
              href={item.helpUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-sm text-xs font-medium text-violet-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Rule docs
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReportView() {
  const params = useParams<{ id: string }>();
  const id = React.useMemo(() => {
    if (Array.isArray(params.id)) return params.id[0] ?? "";
    return params.id ?? "";
  }, [params.id]);

  const hydrated = useHydrated();
  const report = useStoredReport(id);
  const developer = useDeveloperMode();
  const [developerTab, setDeveloperTab] =
    React.useState<DeveloperTab>("manual");

  const sortedViolations = React.useMemo(() => {
    if (!report) return [];
    return [...report.violations].sort(
      (left, right) =>
        severityWeight[left.impact] - severityWeight[right.impact] ||
        right.elementCount - left.elementCount ||
        left.title.localeCompare(right.title),
    );
  }, [report]);

  function downloadReport() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `accessforge-report-${report.id}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }

  if (!hydrated) return <ReportSkeleton />;
  if (!report) return <MissingReport />;

  const isDemo = report.mode === "demo";
  const targetLabel = isDemo ? "Bundled demo site" : formatHostname(report.finalUrl);
  const hasReviewable = report.violations.length > 0;
  const totalPlaces = report.stats.affectedElements;

  return (
    <div className="space-y-6">
      <PageNavigation
        back={{ href: "/dashboard", label: "Back to my scans" }}
        breadcrumbs={[
          { href: "/dashboard", label: "My scans" },
          { label: "Results" },
        ]}
      />

      <PageHeader
        eyebrow="Results"
        title={targetLabel}
        description={`We checked ${report.pageTitle}. Here is a plain-language summary of what we found.`}
        actions={
          hasReviewable ? (
            <Button asChild>
              <Link href={`/review?report=${report.id}`}>
                Review fixes
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/scanner">
                Check another page
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="h-px w-full hairline-gradient" aria-hidden="true" />
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isDemo ? "default" : "success"}>
              {isDemo ? (
                <FlaskConical className="size-3" aria-hidden="true" />
              ) : (
                <Globe className="size-3" aria-hidden="true" />
              )}
              {isDemo ? "Demo result" : "Website result"}
            </Badge>
            <Badge variant="outline">Suggestions only</Badge>
          </div>

          <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {hasReviewable
              ? `${report.stats.violationRules} ${pluralize(report.stats.violationRules, "kind")} of issue found`
              : "No automated issues found"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {hasReviewable
              ? `There are ${totalPlaces} ${pluralize(totalPlaces, "place")} on this page that may be hard for some people to use. We grouped repeated problems so you can review them one at a time.`
              : "The automated checks did not find a problem on this page. A person should still test the experiences listed under Developer details."}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-rose-400/15 bg-rose-400/[0.04] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-rose-200/80">
                Kinds of issues
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {report.stats.violationRules}
              </p>
            </div>
            <div className="rounded-lg border border-amber-300/15 bg-amber-300/[0.04] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-amber-200/80">
                Places to fix
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {totalPlaces}
              </p>
            </div>
            <div className="rounded-lg border border-indigo-400/15 bg-indigo-400/[0.04] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-indigo-200/80">
                Need a person to check
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {report.stats.needsReviewRules}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-subtle">
            No single accessibility score is shown. Nothing has been changed or
            verified yet.
          </p>
        </CardContent>
      </Card>

      <section aria-labelledby="findings-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="findings-heading"
              className="text-xl font-semibold tracking-tight text-foreground"
            >
              What we found
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Start with the first card. Each one explains the problem, who it
              affects, and what to change.
            </p>
          </div>
          {hasReviewable ? (
            <Badge variant="danger">
              {sortedViolations.length}{" "}
              {pluralize(sortedViolations.length, "issue type")}
            </Badge>
          ) : null}
        </div>

        {sortedViolations.length > 0 ? (
          <div className="space-y-4">
            {sortedViolations.map((issue, index) => (
              <IssueCard
                key={issue.ruleId}
                issue={issue}
                index={index}
                showTechnical={developer.enabled}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ShieldCheck}
            title="Nothing automated to fix"
            description="This does not prove the page is fully accessible. A person should still check keyboard use, reading order, and real assistive technology."
          />
        )}
      </section>

      {hasReviewable ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Ready to look at the suggested fixes?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                You will see one issue at a time and can edit or reject each
                suggestion.
              </p>
            </div>
            <Button asChild>
              <Link href={`/review?report=${report.id}`}>
                Review fixes
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {developer.enabled ? (
        <section aria-labelledby="developer-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="developer-heading"
                className="text-xl font-semibold tracking-tight text-foreground"
              >
                Developer details
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Technical evidence, manual checks, and raw report data.
              </p>
            </div>
            <Button variant="secondary" onClick={downloadReport}>
              <Download aria-hidden="true" />
              Export JSON
            </Button>
          </div>

          <Card>
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div
                role="tablist"
                aria-label="Developer report sections"
                className="flex flex-wrap gap-1 rounded-lg border border-white/[0.06] bg-surface/60 p-1"
              >
                {DEVELOPER_TABS.map((item) => {
                  const selected = developerTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls={`developer-panel-${item.id}`}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setDeveloperTab(item.id)}
                      className={
                        selected
                          ? "rounded-md bg-white/[0.07] px-3 py-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          : "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      }
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {developerTab === "manual" ? (
                <div
                  role="tabpanel"
                  id="developer-panel-manual"
                  aria-label="Manual checks"
                  className="space-y-3"
                >
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    These checks need a person. They are not pass or fail results
                    from this scan.
                  </p>
                  <ManualChecks checks={report.manualChecks} />
                </div>
              ) : (
                <div
                  role="tabpanel"
                  id="developer-panel-details"
                  aria-label="Report details"
                  className="space-y-5"
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                      <h3 className="text-sm font-semibold text-foreground">
                        Method and limits
                      </h3>
                      <dl className="mt-3 space-y-3 text-xs leading-relaxed text-muted-foreground">
                        {[
                          {
                            term: "Issue types",
                            detail: "Each unique axe-core rule that failed.",
                          },
                          {
                            term: "Places to fix",
                            detail:
                              "Every element flagged across all failed rules, not a unique element count.",
                          },
                          {
                            term: "Rule passes",
                            detail:
                              "Rules that completed without violations. Not an element count.",
                          },
                          {
                            term: "No score",
                            detail:
                              "No validated composite scoring model is implemented.",
                          },
                        ].map((item) => (
                          <div key={item.term}>
                            <dt className="font-medium text-foreground">
                              {item.term}
                            </dt>
                            <dd>{item.detail}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {report.engine.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                      <h3 className="text-sm font-semibold text-foreground">
                        Scan details
                      </h3>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <dt className="text-subtle">Scanned</dt>
                          <dd className="mt-0.5 text-muted-foreground">
                            {formatDateTime(report.scannedAt)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-subtle">Duration</dt>
                          <dd className="mt-0.5 text-muted-foreground">
                            {formatDuration(report.durationMs)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-subtle">Viewport</dt>
                          <dd className="mt-0.5 text-muted-foreground">
                            {report.viewport.width} x {report.viewport.height}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-subtle">Browser</dt>
                          <dd className="mt-0.5 text-muted-foreground">
                            {report.engine.browser}
                          </dd>
                        </div>
                      </dl>
                      <p className="mt-3 break-all font-mono text-[10px] text-subtle">
                        {report.finalUrl}
                      </p>
                      <p className="mt-1 break-all font-mono text-[10px] text-subtle">
                        Report ID: {report.id}
                      </p>
                    </div>
                  </div>

                  <NeedsManualReview report={report} />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                      <h3 className="text-sm font-semibold text-foreground">
                        Severity breakdown
                      </h3>
                      <div className="mt-3">
                        <SeverityBreakdown counts={report.stats.severity} />
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                      <h3 className="text-sm font-semibold text-foreground">
                        Automated passes
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {report.stats.automatedRulePasses} axe-core rules
                        completed without violations. This is a rule count, not
                        proof that the page is accessible.
                      </p>
                      <ul className="mt-3 space-y-2">
                        {report.notes.map((note) => (
                          <li
                            key={note}
                            className="text-xs leading-relaxed text-subtle"
                          >
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <Notice variant="warning" title="Automated findings only">
                    This report lists what automation detected on one page at one
                    viewport. It is not a compliance certificate.
                  </Notice>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
        <p className="text-xs text-subtle">
          Saved in this browser. Nothing has been applied or verified.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard">Back to my scans</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/scanner">
              Check another page
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
