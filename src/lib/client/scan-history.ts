import type { ScanReport, ScanSummary } from "@/lib/scanner/types";
import { toScanSummary } from "@/lib/scanner/types";

const INDEX_KEY = "accessforge.scans.v1";
const REPORT_PREFIX = "accessforge.report.v1.";
const HISTORY_EVENT = "accessforge:history";
const MAX_HISTORY = 25;

const EMPTY_HISTORY: ScanSummary[] = [];
let cachedHistory: ScanSummary[] | null = null;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSummary(value: unknown): value is ScanSummary {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.requestedUrl === "string" &&
    typeof value.finalUrl === "string" &&
    typeof value.pageTitle === "string" &&
    typeof value.scannedAt === "string" &&
    typeof value.durationMs === "number" &&
    typeof value.violationRules === "number" &&
    typeof value.affectedElements === "number" &&
    isRecord(value.severity)
  );
}

function notifyHistoryChanged() {
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

function invalidateScanCache() {
  cachedHistory = null;
  cachedReportId = null;
  cachedReport = null;
}

export function getScanHistory(): ScanSummary[] {
  if (!canUseStorage()) return EMPTY_HISTORY;
  if (cachedHistory) return cachedHistory;

  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    if (!raw) {
      cachedHistory = EMPTY_HISTORY;
      return cachedHistory;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedHistory = EMPTY_HISTORY;
      return cachedHistory;
    }
    cachedHistory = parsed
      .filter(isSummary)
      .sort((left, right) => right.scannedAt.localeCompare(left.scannedAt));
    return cachedHistory;
  } catch {
    cachedHistory = EMPTY_HISTORY;
    return cachedHistory;
  }
}

export function saveScan(report: ScanReport): ScanSummary {
  if (!canUseStorage()) {
    throw new Error("Browser storage is unavailable, so the report cannot be saved.");
  }

  const summary = toScanSummary(report);
  const history = getScanHistory().filter((item) => item.id !== report.id);
  const nextHistory = [summary, ...history].slice(0, MAX_HISTORY);
  const removed = history.slice(MAX_HISTORY - 1);

  try {
    window.localStorage.setItem(
      `${REPORT_PREFIX}${report.id}`,
      JSON.stringify(report),
    );

    for (const item of removed) {
      window.localStorage.removeItem(`${REPORT_PREFIX}${item.id}`);
    }

    window.localStorage.setItem(INDEX_KEY, JSON.stringify(nextHistory));
  } catch {
    window.localStorage.removeItem(`${REPORT_PREFIX}${report.id}`);
    throw new Error(
      "The report could not be saved. Browser storage may be full or disabled.",
    );
  }

  invalidateScanCache();
  notifyHistoryChanged();
  return summary;
}

let cachedReportId: string | null = null;
let cachedReport: ScanReport | null = null;

export function getScan(id: string): ScanReport | null {
  if (!canUseStorage() || !id) return null;
  if (cachedReportId === id) return cachedReport;

  try {
    const raw = window.localStorage.getItem(`${REPORT_PREFIX}${id}`);
    if (!raw) {
      cachedReportId = id;
      cachedReport = null;
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.id !== "string") {
      cachedReportId = id;
      cachedReport = null;
      return null;
    }
    cachedReportId = id;
    cachedReport = parsed as unknown as ScanReport;
    return cachedReport;
  } catch {
    cachedReportId = id;
    cachedReport = null;
    return null;
  }
}

export function deleteScan(id: string): void {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(`${REPORT_PREFIX}${id}`);
    const next = getScanHistory().filter((item) => item.id !== id);
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(next));
    invalidateScanCache();
    notifyHistoryChanged();
  } catch {
    // Silent: the UI will refresh the next time it loads history.
  }
}

export function clearScanHistory(): void {
  if (!canUseStorage()) return;

  try {
    for (const summary of getScanHistory()) {
      window.localStorage.removeItem(`${REPORT_PREFIX}${summary.id}`);
    }
    window.localStorage.removeItem(INDEX_KEY);
    invalidateScanCache();
    notifyHistoryChanged();
  } catch {
    // Silent: the UI will refresh the next time it loads history.
  }
}

export function subscribeToScanHistory(listener: () => void): () => void {
  if (!canUseStorage()) return () => undefined;

  const onHistory = () => {
    invalidateScanCache();
    listener();
  };

  const onStorage = (event: StorageEvent) => {
    if (
      event.key === INDEX_KEY ||
      event.key === null ||
      event.key?.startsWith(REPORT_PREFIX)
    ) {
      invalidateScanCache();
      listener();
    }
  };

  window.addEventListener(HISTORY_EVENT, onHistory);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(HISTORY_EVENT, onHistory);
    window.removeEventListener("storage", onStorage);
  };
}

export { HISTORY_EVENT };
