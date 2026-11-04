import { NextResponse } from "next/server";
import { createSwitchClient } from "@/lib/switch/client";
import { getSwitchConfig } from "@/lib/switch/config";
import { publicSwitchError } from "@/lib/switch/http";
import { sanitizeSwitchText } from "@/lib/switch/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 2000;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const config = getSwitchConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Switch is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const url = new URL(request.url);
  const rawLimit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
    : 20;
  const since = url.searchParams.get("since")?.trim() || undefined;

  if (since && Number.isNaN(Date.parse(since))) {
    return NextResponse.json(
      { error: "since must be an ISO-8601 timestamp." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const client = createSwitchClient(config);
    const context = await client.readContext(config.roomId, limit, since);
    const entries = context.entries.slice(-limit).map((entry) => {
      const sender = sanitizeSwitchText(entry.sender, {
        maxLength: MAX_BODY,
        singleLine: true,
      });
      const senderName = sanitizeSwitchText(
        entry.senderName || entry.sender,
        { maxLength: MAX_BODY, singleLine: true },
      );
      const body = sanitizeSwitchText(entry.body, { maxLength: MAX_BODY });

      return {
        id: sanitizeSwitchText(entry.id, {
          maxLength: 200,
          singleLine: true,
        }).text,
        kind: sanitizeSwitchText(entry.kind, {
          maxLength: 50,
          singleLine: true,
        }).text,
        sender: sender.text,
        senderName: senderName.text || sender.text,
        body: body.text,
        timestamp: entry.timestamp,
        truncated: body.truncated,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        room: { name: config.roomName ?? "Switch room" },
        entries,
        truncated: context.truncated,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: publicSwitchError(error) },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
