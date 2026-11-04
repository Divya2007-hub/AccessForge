import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Database,
  FileSearch,
  GitPullRequest,
  HelpCircle,
  Keyboard,
  LockKeyhole,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
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

export const metadata: Metadata = {
  title: "Help",
  description:
    "How AccessForge scans pages, explains findings, records human review decisions, exports approved fixes, and connects to Switch.",
};

const workflow = [
  {
    title: "Scan",
    description:
      "Enter a public URL or run the bundled demo. A server-side Chromium session renders the page and axe-core checks the rendered DOM.",
    icon: ScanSearch,
  },
  {
    title: "Understand",
    description:
      "The report separates automated failures from manual checks. Each issue explains the impact, the affected elements, and suggested remediation.",
    icon: FileSearch,
  },
  {
    title: "Review",
    description:
      "Rule-based drafts can be edited in the browser. A human approves, rejects, or requests changes. Decisions are stored locally.",
    icon: GitPullRequest,
  },
  {
    title: "Hand off",
    description:
      "Approved snapshots can be exported or posted to an optional Switch room for separate Fix and Testing agents.",
    icon: Bot,
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Help"
        title="How AccessForge works"
        description="A practical guide to scanning, reading reports, reviewing fixes, and understanding what AccessForge does not do."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/scanner">
                <ScanSearch aria-hidden="true" />
                Scan a page
              </Link>
            </Button>
            <Button asChild>
              <Link href="/review">
                <GitPullRequest aria-hidden="true" />
                Review fixes
              </Link>
            </Button>
          </>
        }
      />

      <section aria-labelledby="workflow-heading" className="space-y-4">
        <div>
          <h2
            id="workflow-heading"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            The workflow
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Detection, human review, and agent handoff stay deliberately
            separate.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {workflow.map((step, index) => (
            <Card key={step.title} className="bg-card/70">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex size-9 items-center justify-center rounded-lg border border-violet-400/15 bg-violet-400/[0.06] text-violet-300">
                    <step.icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-[10px] text-subtle">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card id="scanning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck
                className="size-4 text-emerald-300"
                aria-hidden="true"
              />
              What the scanner checks
            </CardTitle>
            <CardDescription>
              Real browser rendering, not a mocked result.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2.5">
              {[
                "One public HTTP or HTTPS page per scan",
                "Chromium rendering at a 1366 × 900 viewport",
                "axe-core WCAG 2.0–2.2 A/AA and best-practice rules",
                "Duplicate findings grouped by rule",
                "Manual checks separated from automated failures",
              ].map((item) => (
                <li
                  key={item}
                  className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                >
                  <CheckCircle2
                    className="mt-0.5 size-3.5 shrink-0 text-emerald-400/80"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
            <AdvancedDetailsContent />
          </CardContent>
        </Card>

        <Card id="limits">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole
                className="size-4 text-amber-300"
                aria-hidden="true"
              />
              Automated limits
            </CardTitle>
            <CardDescription>
              What automation cannot prove on its own.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Notice variant="warning" title="Not a compliance certificate">
              A clean automated scan does not prove accessibility. Automated
              tools detect only a subset of WCAG failures.
            </Notice>
            <ul className="space-y-2.5">
              {[
                "Whether alternative text is genuinely useful",
                "Screen reader reading order and announcement quality",
                "Complete keyboard-only task flows",
                "Caption and transcript accuracy",
                "Cognitive load and plain-language clarity",
                "Real-world zoom, reflow, and assistive technology combinations",
              ].map((item) => (
                <li
                  key={item}
                  className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                >
                  <Keyboard
                    className="mt-0.5 size-3.5 shrink-0 text-subtle"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed text-subtle">
              Use the manual checklist in every report and test with real
              assistive technology before claiming conformance.
            </p>
          </CardContent>
        </Card>

        <Card id="data">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-4 text-indigo-300" aria-hidden="true" />
              Where your data lives
            </CardTitle>
            <CardDescription>
              Local-first by default, with an optional server-side bridge.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Scan reports, fix drafts, and review decisions are stored in this
              browser&apos;s local storage. Clearing browser data removes them.
            </p>
            <p>
              Approved bundles download locally or post to a configured Switch
              room. Switch credentials stay in server-side environment
              variables.
            </p>
            <p>
              There is no account system, database sync, or GitHub connection in
              this build.
            </p>
          </CardContent>
        </Card>

        <Card id="switch">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-4 text-violet-300" aria-hidden="true" />
              Optional Switch handoff
            </CardTitle>
            <CardDescription>
              Separate agents, explicit human approval, no automatic code
              changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              When configured, the bridge posts approved snapshots to a Switch
              room for a Fix Agent and Testing Agent. It also reads real room
              activity so you can see what was posted.
            </p>
            <p>
              AccessForge does not apply, commit, merge, or verify code. Any code
              change or verification happens outside this app and must be
              evidenced separately.
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/agents">
                Open AI Activity
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="size-4 text-subtle" aria-hidden="true" />
            Common questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {[
            {
              question: "Why is there no accessibility score?",
              answer:
                "No validated composite scoring model is implemented. The report shows rule failures, affected elements, severity, and manual checks instead of inventing a single number.",
            },
            {
              question: "Does approving a fix change my code?",
              answer:
                "No. Approval records a local decision only. Exports and Switch handoffs contain approved snapshots, not an applyable Git patch.",
            },
            {
              question: "Can I scan a localhost or internal site?",
              answer:
                "No. The scanner blocks localhost, private networks, link-local addresses, cloud metadata hosts, and non-standard ports.",
            },
            {
              question: "Where can I see what the Switch agents did?",
              answer:
                "Open AI Activity. It shows the current bridge status and real Switch room messages. It does not simulate agent progress.",
            },
          ].map((item) => (
            <div key={item.question}>
              <h3 className="text-sm font-semibold text-foreground">
                {item.question}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
        <p className="text-xs text-subtle">
          Need the technical architecture? Advanced tools are in the sidebar.
        </p>
        <Button asChild variant="secondary" size="sm">
          <Link href="/agents#architecture">
            View agent architecture
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function AdvancedDetailsContent() {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3">
      <p className="text-xs font-medium text-foreground">Target boundaries</p>
      <p className="mt-1 text-xs leading-relaxed text-subtle">
        Private networks, localhost, link-local and reserved IPs, cloud metadata
        endpoints, and non-standard ports are rejected before a browser opens.
        Every request and redirect is checked again.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="outline">Standard ports only</Badge>
        <Badge variant="outline">One page per scan</Badge>
        <Badge variant="outline">30 second load limit</Badge>
      </div>
    </div>
  );
}
