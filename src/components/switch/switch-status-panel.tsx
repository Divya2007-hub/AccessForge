"use client";

import * as React from "react";
import { Bot, MessagesSquare, Radio, RefreshCw } from "lucide-react";
import { useSwitchStatus } from "@/lib/client/use-switch-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import type { SwitchStatusAgent } from "@/lib/switch/types";

function statusBadge(status: ReturnType<typeof useSwitchStatus>["status"]) {
  if (!status?.configured) {
    return { label: "Not configured", variant: "secondary" as const };
  }
  if (!status.online) {
    return { label: "Offline", variant: "danger" as const };
  }
  if (!status.authorized) {
    return { label: "Needs attention", variant: "warning" as const };
  }
  if (!status.room) {
    return { label: "No room access", variant: "warning" as const };
  }
  if (
    !status.fixAgent?.present ||
    !status.testAgent?.present ||
    !status.fixAgent.inRoom ||
    !status.testAgent.inRoom
  ) {
    return { label: "Missing agent", variant: "warning" as const };
  }
  return { label: "Connected", variant: "success" as const };
}

function AgentRow({
  label,
  agent,
}: {
  label: string;
  agent: SwitchStatusAgent | null;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm">
        {agent ? (
          <>
            <span className="font-medium">{agent.name}</span>
            <span className="block text-xs text-muted-foreground">
              {agent.present
                ? agent.inRoom
                  ? `Registered · ${agent.connectionModel}`
                  : "Registered · not in the configured room"
                : "Not found on this Switch instance"}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Not checked</span>
        )}
      </dd>
    </div>
  );
}

export function SwitchStatusPanel() {
  const { status, loading, error, refresh } = useSwitchStatus();
  const badge = statusBadge(status);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle>Switch bridge</CardTitle>
            <CardDescription>
              Server-side handoff to the existing Switch room. Credentials stay
              in the server environment and are never sent to the browser.
            </CardDescription>
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !status ? (
          <p className="text-sm text-muted-foreground">
            Checking the Switch bridge...
          </p>
        ) : null}

        {status ? (
          <dl className="divide-y divide-border rounded-lg border border-border px-4">
            <div className="flex items-start justify-between gap-4 py-2">
              <dt className="text-sm text-muted-foreground">Room</dt>
              <dd className="text-right text-sm">
                {status.room?.name ?? (
                  <span className="text-muted-foreground">Not available</span>
                )}
              </dd>
            </div>
            <AgentRow label="Bridge agent" agent={status.bridgeAgent} />
            <AgentRow label="Fix Agent" agent={status.fixAgent} />
            <AgentRow label="Testing Agent" agent={status.testAgent} />
          </dl>
        ) : null}

        {error || status?.error ? (
          <Notice variant="warning" title="Bridge status">
            {error ?? status?.error}
          </Notice>
        ) : null}

        {status && !status.configured ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Add a Switch registration key to <code>.env.local</code>, then run{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              npm run switch:setup
            </code>
            . The setup writes only the bridge credentials and room to the local
            environment file.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw aria-hidden="true" />
            Refresh status
          </Button>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Radio className="size-3.5" aria-hidden="true" />
            Checked {status ? new Date(status.checkedAt).toLocaleString() : "—"}
          </span>
        </div>

        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <p className="flex items-start gap-2">
            <Bot className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            The bridge posts approved bundles and reads room activity.
          </p>
          <p className="flex items-start gap-2">
            <MessagesSquare
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            Fix and Testing agents remain separate Switch agents.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
