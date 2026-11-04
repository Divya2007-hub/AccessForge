"use client";

import * as React from "react";
import { MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDeveloperMode } from "@/components/developer-mode-provider";
import { Notice } from "@/components/ui/notice";
import type { SwitchActivityEntry } from "@/lib/switch/types";
import { formatDateTime } from "@/lib/utils";

export function SwitchActivityFeed() {
  const developer = useDeveloperMode();
  const [entries, setEntries] = React.useState<SwitchActivityEntry[]>([]);
  const [roomName, setRoomName] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/switch/activity?limit=20", {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as {
        entries?: SwitchActivityEntry[];
        room?: { name: string };
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not read Switch room activity.");
      }

      setEntries(data?.entries ?? []);
      setRoomName(data?.room?.name ?? null);
      setError(null);
      setHasLoaded(true);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not read Switch room activity.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(initial);
  }, [refresh]);

  React.useEffect(() => {
    if (!hasLoaded || error) return;
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(timer);
  }, [error, hasLoaded, refresh]);

  return (
    <Card id="live-activity">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare
                className="size-4 text-violet-300"
                aria-hidden="true"
              />
              Agent activity
            </CardTitle>
            <CardDescription>
              Real messages from the agents. No progress is simulated.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw
              className={loading ? "animate-spin" : undefined}
              aria-hidden="true"
            />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {roomName ? (
          <p className="text-xs text-subtle">
            Room: <span className="text-muted-foreground">{roomName}</span>
          </p>
        ) : null}

        {error ? (
          <Notice variant="warning" title="Activity unavailable">
            {developer.enabled
              ? error
              : "Agent activity is not available right now. You can still review fixes in this browser."}
          </Notice>
        ) : null}

        {loading && entries.length === 0 ? (
          <p role="status" className="text-sm text-muted-foreground">
            Reading Switch room activity…
          </p>
        ) : null}

        {!loading && !error && entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/[0.08] bg-white/[0.015] px-4 py-6 text-sm leading-relaxed text-muted-foreground">
            No agent messages yet. Send approved fixes from the review page to
            start a handoff.
          </p>
        ) : null}

        {entries.length > 0 ? (
          <ol className="space-y-2" aria-label="Switch room messages">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-border bg-surface-2/60 px-3 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {entry.senderName}
                  </span>
                  <time dateTime={new Date(entry.timestamp).toISOString()}>
                    {formatDateTime(entry.timestamp)}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                  {entry.body}
                </p>
              </li>
            ))}
          </ol>
        ) : null}

        <p className="text-xs leading-relaxed text-subtle">
          Activity refreshes every 10 seconds after a successful read. A message
          is not verification that code was applied or that a fix passed.
        </p>
      </CardContent>
    </Card>
  );
}
