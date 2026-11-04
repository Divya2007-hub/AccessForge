"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
} from "lucide-react";
import { useDeveloperMode } from "@/components/developer-mode-provider";
import { useSwitchStatus } from "@/lib/client/use-switch-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import type { ApprovedFixBundle } from "@/lib/review/export";
import type {
  SwitchActivityEntry,
  SwitchHandoffResult,
} from "@/lib/switch/types";
import { formatDateTime } from "@/lib/utils";

interface SwitchHandoffCardProps {
  approvedCount: number;
  buildBundle: () => ApprovedFixBundle;
}

export function SwitchHandoffCard({
  approvedCount,
  buildBundle,
}: SwitchHandoffCardProps) {
  const developer = useDeveloperMode();
  const { status, loading, error, refresh } = useSwitchStatus();
  const [sending, setSending] = React.useState(false);
  const [requestError, setRequestError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SwitchHandoffResult | null>(null);
  const [activity, setActivity] = React.useState<SwitchActivityEntry[]>([]);
  const [activityError, setActivityError] = React.useState<string | null>(null);
  const [activityLoading, setActivityLoading] = React.useState(false);

  const ready = Boolean(
    approvedCount > 0 &&
      status?.configured &&
      status.online &&
      status.authorized &&
      status.room &&
      status.fixAgent?.inRoom &&
      status.testAgent?.inRoom,
  );

  const refreshActivity = React.useCallback(async () => {
    setActivityLoading(true);
    try {
      const response = await fetch("/api/switch/activity?limit=20", {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as {
        entries?: SwitchActivityEntry[];
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Could not read Switch room activity.");
      }
      setActivity(data?.entries ?? []);
      setActivityError(null);
    } catch (nextError) {
      setActivityError(
        nextError instanceof Error
          ? nextError.message
          : "Could not read Switch room activity.",
      );
    } finally {
      setActivityLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!result) return;
    const timer = window.setInterval(() => void refreshActivity(), 5000);
    return () => window.clearInterval(timer);
  }, [refreshActivity, result]);

  async function sendHandoff() {
    setRequestError(null);
    setResult(null);
    setActivity([]);
    setActivityError(null);
    setSending(true);

    try {
      const bundle = buildBundle();
      const response = await fetch("/api/switch/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle }),
      });
      const data = (await response.json().catch(() => null)) as
        | (SwitchHandoffResult & { error?: string })
        | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error ?? "The Switch handoff was not accepted.");
      }
      setResult(data);
      void refresh();
      void refreshActivity();
    } catch (nextError) {
      setRequestError(
        nextError instanceof Error
          ? nextError.message
          : "The Switch handoff failed.",
      );
    } finally {
      setSending(false);
    }
  }

  const statusText = loading
    ? "Checking whether the agents are available..."
    : !status?.configured
      ? "The agent connection is not set up yet."
      : !status.online
        ? "The agents are offline right now."
        : !status.authorized
          ? "AccessForge could not connect to the agents."
          : !status.room
            ? "The agents are not in a shared room."
            : !status.fixAgent?.present || !status.testAgent?.present
              ? "The Fix or Testing agent is not available."
              : !status.fixAgent.inRoom || !status.testAgent.inRoom
                ? "The Fix or Testing agent is not ready."
                : "Ready to send.";

  return (
    <Card id="switch-handoff">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle>Send suggestions to the Fix Agent</CardTitle>
            <CardDescription>
              This shares the fixes you approved with the Fix Agent and Testing
              Agent. It does not apply code or prove that a fix works.
            </CardDescription>
          </div>
          <Badge variant={ready ? "success" : "secondary"}>
            {ready ? "Ready" : "Not available"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MessageSquare className="size-4" aria-hidden="true" />
            {statusText}
          </span>
          {status?.room ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs">
              {status.room.name}
            </span>
          ) : null}
        </div>

        {error && !status ? (
          <Notice variant="danger" title="Switch status">
            {error}
          </Notice>
        ) : null}

        {requestError ? (
          <Notice variant="danger" title="Handoff failed">
            {requestError}
          </Notice>
        ) : null}

        {result ? (
          <Notice variant="success" title="Suggestions sent">
            <p>
              Your approved suggestions are in{" "}
              <span className="font-medium">{result.room.name}</span>. The Fix
              Agent can pick them up from there.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              This is not proof that anything was changed or tested.
            </p>
            {developer.enabled ? (
              <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                {result.handoffPath}
              </p>
            ) : null}
          </Notice>
        ) : null}

        {result ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium">Room activity</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void refreshActivity()}
                disabled={activityLoading}
              >
                <RefreshCw aria-hidden="true" />
                Refresh
              </Button>
            </div>

            {activityError ? (
              <Notice variant="warning" title="Activity">
                {activityError}
              </Notice>
            ) : null}

            {activity.length > 0 ? (
              <ol className="space-y-2" aria-live="polite">
                {activity.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-lg border border-border bg-surface-2/60 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {entry.senderName}
                      </span>
                      <time dateTime={new Date(entry.timestamp).toISOString()}>
                        {formatDateTime(entry.timestamp)}
                      </time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {entry.body}
                    </p>
                  </li>
                ))}
              </ol>
            ) : activityLoading ? (
              <p className="text-sm text-muted-foreground">
                Reading room activity...
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No room messages were returned yet.
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Room activity refreshes every 5 seconds while this page is open.
            </p>
          </div>
        ) : null}

        <div className="rounded-lg border border-amber-400/15 bg-amber-400/[0.04] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          Sending a suggestion is not proof that a fix was applied or that it
          works.
        </div>

        {approvedCount === 0 ? (
          <Notice variant="info">
            Approve at least one fix before sending suggestions to the agents.
          </Notice>
        ) : null}
      </CardContent>

      <CardFooter className="flex-wrap">
        <Button
          type="button"
          onClick={() => void sendHandoff()}
          disabled={!ready || sending}
        >
          {sending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Send aria-hidden="true" />
          )}
          {sending ? "Sending..." : "Send approved fixes"}
        </Button>
        {developer.enabled ? (
          <>
            <Button type="button" variant="ghost" asChild>
              <a href="#approved-export">
                View local export
                <ArrowUpRight aria-hidden="true" />
              </a>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/agents">Agent setup</Link>
            </Button>
          </>
        ) : null}
      </CardFooter>
    </Card>
  );
}
