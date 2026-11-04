import { z } from "zod";
import type { ApprovedFixBundle } from "@/lib/review/export";
import {
  APPROVED_FIX_LIMITATIONS,
  buildFragmentDiff,
} from "@/lib/review/export";

const impactSchema = z.enum(["critical", "serious", "moderate", "minor"]);

const ISO_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

function isIsoTimestamp(value: string) {
  return ISO_TIMESTAMP.test(value) && Number.isFinite(Date.parse(value));
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function hasActiveContent(value: string) {
  return [
    /<\s*(?:script|iframe|object|embed|style|link|meta|base)\b/i,
    /\son[a-z]+\s*=/i,
    /\b(?:href|src|action|formaction)\s*=\s*["']?\s*javascript:/i,
    /\bsrcdoc\s*=/i,
    /data\s*:\s*text\/html/i,
  ].some((pattern) => pattern.test(value));
}

const timestampSchema = z
  .string()
  .max(100)
  .refine(isIsoTimestamp, "must be an ISO-8601 timestamp with a timezone.");

const helpUrlSchema = z
  .string()
  .max(2000)
  .refine(
    (value) => value === "" || isHttpUrl(value),
    "must be empty or an http(s) URL.",
  );

const changeSchema = z
  .object({
    proposalId: z.string().min(1).max(200),
    ruleId: z.string().min(1).max(200),
    ruleTitle: z.string().min(1).max(500),
    impact: impactSchema,
    wcag: z.array(z.string().max(100)).max(50),
    helpUrl: helpUrlSchema,
    pageUrl: z.string().max(2000),
    pageTitle: z.string().max(500),
    selector: z.string().min(1).max(4000),
    originalHtml: z.string().max(200_000),
    proposedHtml: z.string().max(200_000),
    approvedAt: timestampSchema,
    note: z.string().max(4000),
  })
  .strict()
  .superRefine((change, context) => {
    if (hasActiveContent(change.proposedHtml)) {
      context.addIssue({
        code: "custom",
        path: ["proposedHtml"],
        message:
          "proposedHtml must not contain scripts, embedded frames, styles, or inline event handlers.",
      });
    }
  });

export const approvedFixBundleSchema = z
  .object({
    kind: z.literal("accessforge-local-approved-fixes"),
    version: z.literal(1),
    generatedAt: timestampSchema,
    report: z
      .object({
        id: z.string().min(1).max(200),
        mode: z.enum(["remote", "demo"]),
        url: z.string().max(4000),
        pageTitle: z.string().max(500),
        scannedAt: timestampSchema,
      })
      .strict(),
    summary: z
      .object({
        approvedChanges: z.number().int().nonnegative().max(100),
      })
      .strict(),
    limitations: z.array(z.string().max(2000)).max(50),
    changes: z.array(changeSchema).min(1).max(100),
    fragmentDiff: z.string().max(2_000_000),
  })
  .strict()
  .superRefine((bundle, context) => {
    if (bundle.summary.approvedChanges !== bundle.changes.length) {
      context.addIssue({
        code: "custom",
        path: ["summary", "approvedChanges"],
        message: "approvedChanges must match the number of changes.",
      });
    }

    if (bundle.report.mode === "demo") {
      if (bundle.report.url !== "demo-site/index.html") {
        context.addIssue({
          code: "custom",
          path: ["report", "url"],
          message: "Demo reports must reference demo-site/index.html.",
        });
      }
    } else if (!isHttpUrl(bundle.report.url)) {
      context.addIssue({
        code: "custom",
        path: ["report", "url"],
        message: "Remote reports must use an http(s) URL.",
      });
    }

    const proposalIds = new Set<string>();
    bundle.changes.forEach((change, index) => {
      if (proposalIds.has(change.proposalId)) {
        context.addIssue({
          code: "custom",
          path: ["changes", index, "proposalId"],
          message: "proposalId must be unique within a bundle.",
        });
      }
      proposalIds.add(change.proposalId);

      if (change.pageUrl !== bundle.report.url) {
        context.addIssue({
          code: "custom",
          path: ["changes", index, "pageUrl"],
          message: "Every change must reference the report URL.",
        });
      }
    });
  });

export type ValidatedApprovedFixBundle = z.infer<
  typeof approvedFixBundleSchema
>;

export class BundleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BundleValidationError";
  }
}

export function canonicalizeApprovedFixBundle(
  bundle: ValidatedApprovedFixBundle,
): ApprovedFixBundle {
  const fragmentDiff = buildFragmentDiff(bundle.changes, bundle.generatedAt);

  if (fragmentDiff.length > 2_000_000) {
    throw new BundleValidationError(
      "The generated fragment diff is too large to hand off.",
    );
  }

  return {
    ...bundle,
    summary: { approvedChanges: bundle.changes.length },
    limitations: [...APPROVED_FIX_LIMITATIONS],
    fragmentDiff,
  };
}
