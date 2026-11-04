"use client";

import * as React from "react";
import type { SwitchStatus } from "@/lib/switch/types";

export function useSwitchStatus(pollMs = 0) {
  const [status, setStatus] = React.useState<SwitchStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/switch/status", {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as
        | SwitchStatus
        | null;
      if (!response.ok || !data) {
        throw new Error("Could not read the Switch bridge status.");
      }
      setStatus(data);
      setError(data.error);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not read the Switch bridge status.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    if (pollMs <= 0) return () => window.clearTimeout(initial);
    const timer = window.setInterval(() => void refresh(), pollMs);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [pollMs, refresh]);

  return { status, loading, error, refresh };
}
