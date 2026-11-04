import { NextResponse } from "next/server";
import {
  BundleValidationError,
  approvedFixBundleSchema,
  canonicalizeApprovedFixBundle,
} from "@/lib/switch/bundle";
import { createSwitchClient } from "@/lib/switch/client";
import { getSwitchConfig } from "@/lib/switch/config";
import {
  deleteSwitchHandoff,
  findDuplicateSwitchHandoff,
  fingerprintApprovedFixBundle,
  writeSwitchHandoff,
} from "@/lib/switch/handoff";
import { isSameOrigin, publicSwitchError, readJsonBody } from "@/lib/switch/http";
import { buildSwitchHandoffMessage } from "@/lib/switch/message";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inFlight = new Set<string>();

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin request refused." }, { status: 403 });
  }

  const config = getSwitchConfig();
  if (!config) {
    return NextResponse.json(
      {
        error:
          "Switch is not configured. Run npm run switch:setup before dispatching a handoff.",
      },
      { status: 503 },
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json(
      {
        error:
          body.reason === "too_large"
            ? "The approved handoff bundle is too large."
            : "The approved handoff bundle must be valid JSON.",
      },
      { status: body.reason === "too_large" ? 413 : 400 },
    );
  }

  const payload = body.value;
  const bundleValue =
    payload &&
    typeof payload === "object" &&
    "bundle" in payload &&
    (payload as { bundle?: unknown }).bundle;
  const parsed = approvedFixBundleSchema.safeParse(bundleValue);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "The approved handoff bundle is invalid.",
        issues: parsed.error.issues.slice(0, 5).map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  let bundle: ReturnType<typeof canonicalizeApprovedFixBundle>;
  try {
    bundle = canonicalizeApprovedFixBundle(parsed.data);
  } catch (error) {
    if (error instanceof BundleValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const fingerprint = fingerprintApprovedFixBundle(bundle);

  let duplicate;
  try {
    duplicate = await findDuplicateSwitchHandoff(fingerprint);
  } catch {
    return NextResponse.json(
      { error: "Could not check the local handoff history." },
      { status: 500 },
    );
  }

  if (duplicate) {
    return NextResponse.json(
      {
        error:
          "This approved bundle was already handed off. Use the existing handoff instead of dispatching it again.",
        handoffPath: duplicate.relativePath,
      },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (inFlight.has(fingerprint)) {
    return NextResponse.json(
      { error: "This approved bundle is already being handed off." },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }

  inFlight.add(fingerprint);
  const client = createSwitchClient(config);
  let handoff: Awaited<ReturnType<typeof writeSwitchHandoff>> | null = null;

  try {
    handoff = await writeSwitchHandoff(bundle);
    const content = buildSwitchHandoffMessage({
      bundle,
      handoffPath: handoff.relativePath,
      fixAgent: config.fixAgent,
      testAgent: config.testAgent,
    });
    const result = await client.postMessage(config.roomId, content);

    if (!result.ok || !result.eventId) {
      throw new Error("Switch did not confirm the room message.");
    }

    return NextResponse.json({
      ok: true,
      eventId: result.eventId,
      handoffPath: handoff.relativePath,
      room: { name: config.roomName ?? "Switch room" },
      fixAgent: config.fixAgent,
      testAgent: config.testAgent,
    });
  } catch (error) {
    if (handoff) await deleteSwitchHandoff(handoff);
    return NextResponse.json(
      { error: publicSwitchError(error) },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    inFlight.delete(fingerprint);
  }
}
