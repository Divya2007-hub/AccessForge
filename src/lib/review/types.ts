import type { Impact } from "@/lib/scanner/types";

export type ReviewAction =
  | "approved"
  | "rejected"
  | "changes_requested"
  | "reopened";

export type ReviewStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "changes_requested";

export interface ReviewEvent {
  id: string;
  proposalId: string;
  reportId: string;
  ruleId: string;
  proposalTitle: string;
  pageTitle: string;
  selector: string;
  action: ReviewAction;
  note: string;
  at: string;
  original: string;
  proposed: string;
}

export interface ProposalDraft {
  proposed: string;
  updatedAt: string;
}

export interface ReviewState {
  version: 1;
  drafts: Record<string, ProposalDraft>;
  events: ReviewEvent[];
}

export interface ReviewProposal {
  id: string;
  reportId: string;
  ruleId: string;
  ruleTitle: string;
  description: string;
  impact: Impact;
  wcag: string[];
  helpUrl: string;
  pageTitle: string;
  pageUrl: string;
  scannedAt: string;
  selector: string;
  elementIndex: number;
  elementCount: number;
  original: string;
  proposed: string;
  placeholder: string;
  explanation: string[];
  risk: string;
  checks: string[];
  truncated: boolean;
}

export interface ReviewItem extends ReviewProposal {
  currentProposed: string;
  status: ReviewStatus;
  lastEvent: ReviewEvent | null;
  isEdited: boolean;
  needsAuthorInput: boolean;
}

export interface UnsupportedFinding {
  ruleId: string;
  title: string;
  impact: Impact;
  elementCount: number;
  helpUrl: string;
}
