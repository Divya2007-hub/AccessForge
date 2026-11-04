"use client";

import * as React from "react";
import {
  clearScanHistory,
  getScanHistory,
  subscribeToScanHistory,
} from "@/lib/client/scan-history";
import { useHydrated } from "@/lib/client/use-hydrated";
import type { ScanSummary } from "@/lib/scanner/types";

const SERVER_HISTORY: ScanSummary[] = [];

function getServerHistory() {
  return SERVER_HISTORY;
}

export function useScanHistory() {
  const history = React.useSyncExternalStore(
    subscribeToScanHistory,
    getScanHistory,
    getServerHistory,
  );
  const hydrated = useHydrated();

  const clear = React.useCallback(() => {
    clearScanHistory();
  }, []);

  return { history, hydrated, clear };
}
