import {
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Users,
  Wrench,
} from "lucide-react";
import { ImpactBadge } from "@/components/report/impact-badge";
import { AdvancedDetails } from "@/components/ui/advanced-details";
import { Badge } from "@/components/ui/badge";
import { getIssueAudience } from "@/lib/accessibility/audience";
import type { ViolationIssue } from "@/lib/scanner/types";

export function IssueCard({
  issue,
  index,
  showTechnical = false,
}: {
  issue: ViolationIssue;
  index: number;
  showTechnical?: boolean;
}) {
  const shownElements = issue.elements.length;
  const audience = getIssueAudience(issue.ruleId, issue.impact);

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <ImpactBadge impact={issue.impact} />
          <Badge variant="warning" className="gap-1.5">
            <ShieldAlert className="size-3" aria-hidden="true" />
            Suggested fix
          </Badge>
          <span className="ml-auto text-[10px] text-subtle">#{index + 1}</span>
        </div>

        <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
          {issue.title}
        </h3>
        <p className="mt-1 text-xs text-subtle">
          Found in {issue.elementCount}{" "}
          {issue.elementCount === 1 ? "place" : "places"} on this page
        </p>
      </div>

      <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-2">
        <section aria-labelledby={`issue-${index}-problem`}>
          <h4
            id={`issue-${index}-problem`}
            className="text-xs font-semibold uppercase tracking-[0.14em] text-subtle"
          >
            The problem
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {issue.description}
          </p>
        </section>

        <section aria-labelledby={`issue-${index}-audience`}>
          <h4
            id={`issue-${index}-audience`}
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-subtle"
          >
            <Users className="size-3.5" aria-hidden="true" />
            Who this affects
          </h4>
          <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">
            {audience.audience}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {audience.detail}
          </p>
        </section>

        <section
          aria-labelledby={`issue-${index}-fix`}
          className="lg:col-span-2"
        >
          <h4
            id={`issue-${index}-fix`}
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-subtle"
          >
            <Wrench className="size-3.5" aria-hidden="true" />
            Suggested fix
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {issue.remediation.summary}
          </p>
          {issue.remediation.steps.length > 0 ? (
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-violet-300/70">
              {issue.remediation.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : null}
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-subtle">
            <CheckCircle2 className="size-3" aria-hidden="true" />
            Suggestion only. Nothing has been changed or verified.
          </p>
        </section>
      </div>

      {showTechnical ? (
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <AdvancedDetails
            summary="Technical details and affected HTML"
          description={`Rule ${issue.ruleId} · ${shownElements} stored element${
            shownElements === 1 ? "" : "s"
          }${issue.wcag.length > 0 ? ` · ${issue.wcag.join(", ")}` : ""}`}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded border border-white/[0.08] bg-white/[0.02] px-2 py-0.5 font-mono text-[11px] text-violet-200">
                {issue.ruleId}
              </code>
              {issue.wcag.length > 0 ? (
                issue.wcag.map((reference) => (
                  <Badge key={reference} variant="outline">
                    {reference}
                  </Badge>
                ))
              ) : (
                <Badge variant="secondary">Best practice</Badge>
              )}
              <a
                href={issue.helpUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1.5 rounded-sm text-xs font-medium text-violet-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Rule documentation
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            </div>

            {shownElements < issue.elementCount ? (
              <p className="text-[11px] text-subtle">
                Showing the first {shownElements} of {issue.elementCount}{" "}
                elements.
              </p>
            ) : null}

            <ul className="space-y-3">
              {issue.elements.map((element, elementIndex) => (
                <li
                  key={`${issue.ruleId}-${elementIndex}`}
                  className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#09090e]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <code className="break-all font-mono text-[11px] text-violet-200">
                      {element.selector}
                    </code>
                    <span className="text-[10px] text-subtle">
                      Element {elementIndex + 1}
                    </span>
                  </div>
                  <pre
                    className="overflow-x-auto px-3 py-3 text-[11px] leading-relaxed text-muted-foreground"
                    tabIndex={0}
                    aria-label={`HTML for ${element.selector}`}
                  >
                    <code>{element.html}</code>
                  </pre>
                  {element.failureSummary ? (
                    <div className="border-t border-white/[0.06] bg-white/[0.015] px-3 py-2.5">
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-subtle">
                        Why it failed
                      </p>
                      <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-muted-foreground">
                        {element.failureSummary}
                      </p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>

            <dl className="grid gap-2 text-xs sm:grid-cols-3">
              {[
                { term: "Detection", detail: "Automated by axe-core" },
                { term: "Remediation", detail: "Suggested, not applied" },
                { term: "Verification", detail: "Not run" },
              ].map((item) => (
                <div
                  key={item.term}
                  className="rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-2"
                >
                  <dt className="text-[10px] uppercase tracking-[0.12em] text-subtle">
                    {item.term}
                  </dt>
                  <dd className="mt-0.5 text-muted-foreground">
                    {item.detail}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          </AdvancedDetails>
        </div>
      ) : null}
    </article>
  );
}
