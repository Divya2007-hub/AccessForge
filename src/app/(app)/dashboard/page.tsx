"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  FlaskConical,
  Globe,
  ScanSearch,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { ScanLauncher } from "@/components/scan/scan-launcher";
import { useDeveloperMode } from "@/components/developer-mode-provider";
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
import { Notice } from "@/components/ui/notice";
import { useScanHistory } from "@/lib/client/use-scan-history";
import type { ScanSummary } from "@/lib/scanner/types";
import {
  formatDateTime,
  formatDuration,
  formatHostname,
  pluralize,
} from "@/lib/utils";

function reportTitle(scan: ScanSummary) {
  return scan.mode === "demo" ? "Bundled demo site" : formatHostname(scan.finalUrl);
}

function ScanRow({ scan }: { scan: ScanSummary }) {
  return (
    <li>
      <Link
        href={`/report/${scan.id}`}
        className="group flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-surface-2 text-violet-300">
          {scan.mode === "demo" ? (
            <FlaskConical className="size-4" aria-hidden="true" />
          ) : (
            <Globe className="size-4" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="truncate text-sm font-medium text-foreground">
            {reportTitle(scan)}
          </span>
          <span className="mt-0.5 block truncate text-xs text-subtle">
            {scan.pageTitle}
          </span>
          <span className="mt-1 block text-[11px] text-subtle">
            {scan.violationRules} {pluralize(scan.violationRules, "issue type")} ·{" "}
            {formatDateTime(scan.scannedAt)}
          </span>
        </span>
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
          Open results
        </span>
        <ChevronRight
          className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

export default function DashboardPage() {
  const { history, hydrated, clear } = useScanHistory();
  const developer = useDeveloperMode();
  const recent = history.slice(0, 6);

  function handleClear() {
    const confirmed = window.confirm(
      "Clear all saved scan reports from this browser? This cannot be undone.",
    );
    if (confirmed) clear();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Saved scans"
        title="Your scans"
        description="Pick up where you left off, or check another website."
        actions={
          <>
            {hydrated && history.length > 0 ? (
              <Button asChild variant="secondary">
                <Link href="/progress">View progress</Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href="/scanner">
                <ScanSearch aria-hidden="true" />
                Check a website
              </Link>
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="h-px w-full hairline-gradient" aria-hidden="true" />
        <CardHeader>
          <CardTitle>Check a website</CardTitle>
          <CardDescription>
            Enter a public page, or try the demo to see how this works.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScanLauncher />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Recent results</CardTitle>
            <CardDescription className="mt-1">
              Your latest checks, newest first.
            </CardDescription>
          </div>
          {hydrated && history.length > 0 ? (
            <Badge variant="secondary">
              {history.length} {pluralize(history.length, "check")}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {!hydrated ? (
            <div className="space-y-3 p-5 sm:p-6" aria-busy="true">
              <span className="sr-only">Loading saved scans</span>
              <div className="h-14 animate-pulse rounded-lg bg-white/[0.04]" />
              <div className="h-14 animate-pulse rounded-lg bg-white/[0.03]" />
            </div>
          ) : recent.length > 0 ? (
            <>
              <ul className="divide-y divide-white/[0.05]">
                {recent.map((scan) => (
                  <ScanRow key={scan.id} scan={scan} />
                ))}
              </ul>
              {history.length > recent.length && !developer.enabled ? (
                <p className="border-t border-white/[0.05] px-5 py-3 text-xs text-subtle sm:px-6">
                  Showing your latest {recent.length} checks. Turn on Developer
                  Mode to see the full local history.
                </p>
              ) : null}
            </>
          ) : (
            <div className="p-5 pt-0 sm:p-6 sm:pt-0">
              <EmptyState
                icon={ScanSearch}
                title="No saved checks yet"
                description="Check a public website or try the demo. Your results will appear here."
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
          )}
        </CardContent>
      </Card>

      {developer.enabled ? (
        <Card>
          <CardHeader>
            <CardTitle>Developer details</CardTitle>
            <CardDescription>
              Full history, storage behavior, and local data controls.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {history.length > 0 ? (
              <>
                <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <caption className="sr-only">
                      Full scan history stored in this browser
                    </caption>
                    <thead>
                      <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-[0.12em] text-subtle">
                        <th scope="col" className="px-4 py-3 font-medium">
                          Target
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Scanned
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Issues
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Duration
                        </th>
                        <th scope="col" className="px-4 py-3 text-right font-medium">
                          <span className="sr-only">Open report</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {history.map((scan) => (
                        <tr key={scan.id} className="hover:bg-white/[0.02]">
                          <td className="max-w-[260px] px-4 py-3">
                            <Link
                              href={`/report/${scan.id}`}
                              className="block truncate rounded-sm font-medium text-foreground hover:text-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {reportTitle(scan)}
                            </Link>
                            <span className="mt-0.5 block truncate text-xs text-subtle">
                              {scan.pageTitle}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                            {formatDateTime(scan.scannedAt)}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {scan.violationRules}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {formatDuration(scan.durationMs)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/report/${scan.id}`}>Open</Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-subtle">
                    Reports are stored only in this browser.
                  </p>
                  <Button variant="ghost" size="sm" onClick={handleClear}>
                    <Trash2 aria-hidden="true" />
                    Clear all scans
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                There are no saved scans yet.
              </p>
            )}
            <Notice variant="info" title="Local data">
              Reports, drafts, and review decisions live in this browser.
              Approved fixes can be exported or sent to an optional Switch room,
              but are never applied automatically.
            </Notice>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
