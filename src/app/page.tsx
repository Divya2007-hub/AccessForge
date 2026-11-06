import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  GitPullRequest,
  LockKeyhole,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ScanLauncher } from "@/components/scan/scan-launcher";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    number: "01",
    title: "Scan a real page",
    description:
      "Chromium loads the public page and axe-core checks the rendered DOM against WCAG 2.0–2.2 A and AA rules.",
    icon: ScanSearch,
  },
  {
    number: "02",
    title: "Understand the impact",
    description:
      "See what failed, who it affects, and how to fix it in plain language. Technical details stay available when you need them.",
    icon: FileSearch,
  },
  {
    number: "03",
    title: "Review fixes with a human",
    description:
      "Approve or reject drafts locally, then export an approved bundle or send it to an optional Switch room.",
    icon: GitPullRequest,
  },
];

const trustItems = [
  { label: "Real Chromium + axe-core", icon: ScanSearch },
  { label: "Reports stay in this browser", icon: LockKeyhole },
  { label: "Human-reviewed changes", icon: CheckCircle2 },
  { label: "Optional Switch handoff", icon: Sparkles },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />

      <main id="main-content" className="flex-1">
        <section className="relative isolate overflow-hidden border-b border-white/[0.06]">
          <div className="hero-glow absolute inset-0 -z-10" aria-hidden="true" />
          <div className="hero-arc" aria-hidden="true" />
          <div
            className="background-grid absolute inset-0 -z-10 opacity-45"
            aria-hidden="true"
          />

          <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-5 pb-16 pt-14 text-center sm:px-8 sm:pt-16 lg:pb-20 lg:pt-16">
            <div className="animate-enter flex w-full flex-col items-center">
              <Badge
                variant="outline"
                className="gap-2 border-violet-300/20 bg-violet-400/[0.06] px-3 py-1 text-violet-100/80"
              >
                <span
                  className="size-1.5 rounded-full bg-emerald-400"
                  aria-hidden="true"
                />
                Live accessibility audits
              </Badge>

              <h1 className="mt-6 max-w-4xl text-balance text-[2.85rem] font-semibold leading-[0.98] tracking-[-0.05em] text-foreground sm:text-6xl lg:text-[4.75rem]">
                Find and fix accessibility{" "}
                <span className="text-gradient">issues.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                Scan any public page, understand the real findings in plain
                language, and review fixes before anything leaves your browser.
              </p>

              <div className="mt-7 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-12 w-full rounded-xl px-6 shadow-[0_20px_55px_-28px_rgba(124,58,237,1)] sm:w-auto"
                >
                  <Link href="/scanner">
                    Start accessibility scan
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="secondary"
                  size="lg"
                  className="h-12 w-full rounded-xl border-white/[0.1] bg-white/[0.035] px-6 hover:bg-white/[0.06] sm:w-auto"
                >
                  <Link href="/help">How AccessForge works</Link>
                </Button>
              </div>

              <dl className="mt-8 grid w-full max-w-3xl grid-cols-2 gap-x-5 gap-y-3 text-xs text-muted-foreground sm:grid-cols-4">
                {trustItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-start gap-2 sm:justify-center"
                  >
                    <item.icon
                      className="size-3.5 shrink-0 text-violet-300/80"
                      aria-hidden="true"
                    />
                    <dt className="sr-only">Product capability</dt>
                    <dd>{item.label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="animate-enter animate-enter-delay-1 mt-8 w-full max-w-2xl">
              <Card className="overflow-hidden border-violet-300/[0.12] bg-card/85 shadow-[0_40px_120px_-60px_rgba(76,29,149,0.9)]">
                <div
                  className="h-px w-full hairline-gradient"
                  aria-hidden="true"
                />
                <CardContent className="p-5 text-left sm:p-7">
                  <div className="mb-5">
                    <p className="text-lg font-semibold tracking-tight text-foreground">
                      Start with a URL
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      One page per scan. No sign-in, API key, or setup.
                    </p>
                  </div>
                  <ScanLauncher variant="hero" />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
          className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:py-20"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300/80">
                How it works
              </p>
              <h2
                id="how-it-works-heading"
                className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
              >
                A clear path from finding to reviewed fix.
              </h2>
              <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
                AccessForge keeps detection, human review, and optional agent
                handoff separate so nothing is presented as fixed before it is.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/scanner">
                Open the scanner
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {steps.map((step) => (
              <Card key={step.number} className="bg-card/70">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg border border-violet-400/15 bg-violet-400/[0.06] text-violet-300">
                      <step.icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-[11px] text-subtle">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-white/[0.06] bg-surface/40">
          <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex gap-3">
              <ShieldCheck
                className="mt-0.5 size-5 shrink-0 text-emerald-300/80"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Automation is a starting point, not a compliance certificate.
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  Automated checks cover only part of WCAG. Every report includes
                  a manual checklist, and verification is never claimed unless a
                  real check has run.
                </p>
              </div>
            </div>
            <Button asChild variant="secondary">
              <Link href="/help#limits">Read the limits</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
