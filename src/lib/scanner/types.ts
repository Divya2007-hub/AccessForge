export const IMPACTS = ["critical", "serious", "moderate", "minor"] as const;

export type Impact = (typeof IMPACTS)[number];

export type ScanMode = "remote" | "demo";

export interface SeverityCounts {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
}

export interface AffectedElement {
  selector: string;
  html: string;
  failureSummary?: string;
}

export interface Remediation {
  summary: string;
  steps: string[];
  reference?: string;
}

export interface ViolationIssue {
  ruleId: string;
  title: string;
  description: string;
  impact: Impact;
  wcag: string[];
  tags: string[];
  helpUrl: string;
  elementCount: number;
  elements: AffectedElement[];
  remediation: Remediation;
}

export interface NeedsReviewIssue {
  ruleId: string;
  title: string;
  description: string;
  impact: Impact;
  wcag: string[];
  helpUrl: string;
  elementCount: number;
}

export interface ManualCheck {
  id: string;
  title: string;
  description: string;
  whyItMatters: string;
  wcag: string[];
}

export interface ScanStats {
  violationRules: number;
  affectedElements: number;
  needsReviewRules: number;
  automatedRulePasses: number;
  severity: SeverityCounts;
}

export interface ScanReport {
  id: string;
  mode: ScanMode;
  requestedUrl: string;
  finalUrl: string;
  pageTitle: string;
  scannedAt: string;
  durationMs: number;
  viewport: {
    width: number;
    height: number;
  };
  engine: {
    name: string;
    version: string;
    tags: string[];
    browser: string;
  };
  stats: ScanStats;
  violations: ViolationIssue[];
  needsReview: NeedsReviewIssue[];
  manualChecks: ManualCheck[];
  notes: string[];
}

export interface ScanSummary {
  id: string;
  mode: ScanMode;
  requestedUrl: string;
  finalUrl: string;
  pageTitle: string;
  scannedAt: string;
  durationMs: number;
  violationRules: number;
  affectedElements: number;
  severity: SeverityCounts;
}

export type ScanErrorCode =
  | "INVALID_URL"
  | "BLOCKED_TARGET"
  | "DNS_FAILURE"
  | "NAVIGATION_FAILED"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "BUSY"
  | "BROWSER_UNAVAILABLE"
  | "UNAUTHORIZED"
  | "SCAN_FAILED";

export interface ScanErrorPayload {
  code: ScanErrorCode;
  message: string;
}

export class ScanError extends Error {
  readonly code: ScanErrorCode;
  readonly status: number;
  readonly retryAfterSeconds?: number;

  constructor(
    code: ScanErrorCode,
    message: string,
    status = 400,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ScanError";
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function emptySeverityCounts(): SeverityCounts {
  return { critical: 0, serious: 0, moderate: 0, minor: 0 };
}

export function toScanSummary(report: ScanReport): ScanSummary {
  return {
    id: report.id,
    mode: report.mode,
    requestedUrl: report.requestedUrl,
    finalUrl: report.finalUrl,
    pageTitle: report.pageTitle,
    scannedAt: report.scannedAt,
    durationMs: report.durationMs,
    violationRules: report.stats.violationRules,
    affectedElements: report.stats.affectedElements,
    severity: report.stats.severity,
  };
}
