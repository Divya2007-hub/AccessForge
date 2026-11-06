import type {
  ProposalDraft,
  ReviewAction,
  ReviewEvent,
  ReviewState,
} from "@/lib/review/types";

const STORAGE_KEY = "accessforge.review.v1";
const EVENT_NAME = "accessforge:review";
const MAX_EVENTS = 500;
const MAX_DRAFTS = 300;
const MAX_PROPOSED_LENGTH = 5_000;

const EMPTY_STATE: ReviewState = {
  version: 1,
  drafts: {},
  events: [],
};

let cachedState: ReviewState | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAction(value: unknown): value is ReviewAction {
  return (
    value === "approved" ||
    value === "rejected" ||
    value === "changes_requested" ||
    value === "reopened"
  );
}

function parseDrafts(value: unknown): Record<string, ProposalDraft> {
  if (!isRecord(value)) return {};

  const drafts: Record<string, ProposalDraft> = {};

  for (const [key, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    if (typeof entry.proposed !== "string") continue;
    if (typeof entry.updatedAt !== "string") continue;

    drafts[key] = {
      proposed: entry.proposed.slice(0, MAX_PROPOSED_LENGTH),
      updatedAt: entry.updatedAt,
    };
  }

  return drafts;
}

function parseEvents(value: unknown): ReviewEvent[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .filter(
      (entry) =>
        typeof entry.id === "string" &&
        typeof entry.proposalId === "string" &&
        typeof entry.reportId === "string" &&
        typeof entry.ruleId === "string" &&
        typeof entry.proposalTitle === "string" &&
        typeof entry.pageTitle === "string" &&
        typeof entry.selector === "string" &&
        isAction(entry.action) &&
        typeof entry.note === "string" &&
        typeof entry.at === "string" &&
        typeof entry.original === "string" &&
        typeof entry.proposed === "string",
    )
    .map((entry) => ({
      id: entry.id as string,
      proposalId: entry.proposalId as string,
      reportId: entry.reportId as string,
      ruleId: entry.ruleId as string,
      proposalTitle: entry.proposalTitle as string,
      pageTitle: entry.pageTitle as string,
      selector: entry.selector as string,
      action: entry.action as ReviewAction,
      note: entry.note as string,
      at: entry.at as string,
      original: entry.original as string,
      proposed: entry.proposed as string,
    }))
    .slice(0, MAX_EVENTS);
}

function readState(): ReviewState {
  if (typeof window === "undefined") return EMPTY_STATE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) return EMPTY_STATE;

    return {
      version: 1,
      drafts: parseDrafts(parsed.drafts),
      events: parseEvents(parsed.events),
    };
  } catch {
    return EMPTY_STATE;
  }
}

export function getReviewState(): ReviewState {
  if (typeof window === "undefined") return EMPTY_STATE;

  if (!cachedState) {
    cachedState = readState();
  }

  return cachedState;
}

export function subscribeToReview(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handleCustomEvent = () => onChange();
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cachedState = null;
    onChange();
  };

  window.addEventListener(EVENT_NAME, handleCustomEvent);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(EVENT_NAME, handleCustomEvent);
    window.removeEventListener("storage", handleStorage);
  };
}

function persistState(nextState: ReviewState) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  cachedState = nextState;
  window.dispatchEvent(new Event(EVENT_NAME));
}

function createEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export interface RecordReviewEventInput {
  proposalId: string;
  reportId: string;
  ruleId: string;
  proposalTitle: string;
  pageTitle: string;
  selector: string;
  action: ReviewAction;
  note?: string;
  original: string;
  proposed: string;
}

export function recordReviewEvent(input: RecordReviewEventInput): ReviewEvent {
  const event: ReviewEvent = {
    id: createEventId(),
    proposalId: input.proposalId,
    reportId: input.reportId,
    ruleId: input.ruleId,
    proposalTitle: input.proposalTitle,
    pageTitle: input.pageTitle,
    selector: input.selector,
    action: input.action,
    note: (input.note ?? "").trim().slice(0, 2_000),
    at: new Date().toISOString(),
    original: input.original.slice(0, MAX_PROPOSED_LENGTH),
    proposed: input.proposed.slice(0, MAX_PROPOSED_LENGTH),
  };

  const current = getReviewState();
  const next: ReviewState = {
    version: 1,
    drafts: current.drafts,
    events: [event, ...current.events].slice(0, MAX_EVENTS),
  };

  try {
    persistState(next);
  } catch {
    throw new Error(
      "The review decision could not be saved in this browser. Check that site storage is available.",
    );
  }

  return event;
}

export function saveProposalDraft(proposalId: string, proposed: string) {
  const value = proposed.trim().slice(0, MAX_PROPOSED_LENGTH);
  const current = getReviewState();
  const drafts: Record<string, ProposalDraft> = { ...current.drafts };
  delete drafts[proposalId];
  drafts[proposalId] = {
    proposed: value,
    updatedAt: new Date().toISOString(),
  };

  const entries = Object.entries(drafts).slice(-MAX_DRAFTS);
  const next: ReviewState = {
    version: 1,
    drafts: Object.fromEntries(entries),
    events: current.events,
  };

  try {
    persistState(next);
  } catch {
    throw new Error(
      "The proposal draft could not be saved in this browser. Check that site storage is available.",
    );
  }
}

export function clearProposalDraft(proposalId: string) {
  const current = getReviewState();
  if (!current.drafts[proposalId]) return;

  const drafts = { ...current.drafts };
  delete drafts[proposalId];

  const next: ReviewState = {
    version: 1,
    drafts,
    events: current.events,
  };

  try {
    persistState(next);
  } catch {
    throw new Error(
      "The proposal draft could not be reset in this browser. Check that site storage is available.",
    );
  }
}
