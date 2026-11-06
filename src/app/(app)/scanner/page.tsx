"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Globe,
  KeyRound,
  LockKeyhole,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { PageNavigation } from "@/components/app/page-navigation";
import { useDeveloperMode } from "@/components/developer-mode-provider";
import { ScanLauncher } from "@/components/scan/scan-launcher";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MANUAL_CHECKS } from "@/lib/scanner/manual-checks";

const boundaries = [
  "Only public HTTP and HTTPS targets",
  "Standard ports 80 and 443 only",
  "Blocks localhost, private, link-local, and reserved IPs",
  "Blocks cloud metadata hostnames and addresses",
  "Re-checks every browser request and redirect",
  "One page per scan with a 30 second load limit",
];

export default function ScannerPage() {
  const developer = useDeveloperMode();

  return (
    <div className="space-y-6">
      <PageNavigation
        back={{ href: "/dashboard", label: "Back to my scans" }}
        breadcrumbs={[
          { href: "/dashboard", label: "My scans" },
          { label: "Check a website" },
        ]}
      />

      <PageHeader
        eyebrow="Check"
        title="Check a website"
        description="Enter one public page. We will look for accessibility problems and explain them in plain language."
        actions={
          <Button asChild variant="secondary">
            <Link href="/demo-site" target="_blank" rel="noreferrer">
              <Globe aria-hidden="true" />
              View demo site
            </Link>
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="h-px w-full hairline-gradient" aria-hidden="true" />
        <CardHeader>
          <CardTitle>Where should we look?</CardTitle>
          <CardDescription>
            One page at a time. No account, setup, or code changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScanLauncher />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            title: "We look at one page",
            detail: "A real browser loads the page and checks what people see.",
            icon: ScanSearch,
          },
          {
            title: "You get plain answers",
            detail: "Each result explains the problem, who it affects, and a suggested fix.",
            icon: CheckCircle2,
          },
          {
            title: "Nothing changes by itself",
            detail: "You review every suggestion before it can be handed off.",
            icon: ShieldCheck,
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-border bg-card/60 p-4"
          >
            <item.icon className="size-4 text-violet-300" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-foreground">
              {item.title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {item.detail}
            </p>
          </div>
        ))}
      </div>

      {developer.enabled ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Scan method</CardTitle>
              <CardDescription>
                Server-side Chromium and axe-core.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              {[
                "Playwright loads the page at 1366x900.",
                "axe-core runs WCAG 2.0-2.2 A/AA plus best-practice rules.",
                "Reports are stored in this browser, not a database.",
              ].map((item) => (
                <p key={item} className="flex gap-2">
                  <ScanSearch
                    className="mt-0.5 size-3.5 shrink-0 text-violet-300"
                    aria-hidden="true"
                  />
                  {item}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Safety boundaries</CardTitle>
              <CardDescription>
                Targets that cannot be scanned.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {boundaries.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    <LockKeyhole
                      className="mt-0.5 size-3.5 shrink-0 text-subtle"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manual checks</CardTitle>
              <CardDescription>
                {MANUAL_CHECKS.length} human checks automation cannot replace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <p className="flex gap-2">
                <KeyRound
                  className="mt-0.5 size-3.5 shrink-0 text-subtle"
                  aria-hidden="true"
                />
                Keyboard operation, reading order, alt-text quality, and media
                alternatives remain human work.
              </p>
              <p>
                Automated results are not a compliance certificate.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
