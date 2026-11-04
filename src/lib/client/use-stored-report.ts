"use client";

import * as React from "react";
import {
  getScan,
  subscribeToScanHistory,
} from "@/lib/client/scan-history";
import type { ScanReport } from "@/lib/scanner/types";

export function useStoredReport(reportId: string) {
  const cacheRef = React.useRef<{
    id: string;
    report: ScanReport | null;
  } | null>(null);

  const subscribe = React.useCallback((onChange: () => void) => {
    return subscribeToScanHistory(() => {
      cacheRef.current = null;
      onChange();
    });
  }, []);

  const getSnapshot = React.useCallback(() => {
    if (!reportId) return null;
    const cached = cacheRef.current;
    if (cached && cached.id === reportId) return cached.report;

    const stored = getScan(reportId);
    cacheRef.current = { id: reportId, report: stored };
    return stored;
  }, [reportId]);

  return React.useSyncExternalStore(subscribe, getSnapshot, () => null);
}
