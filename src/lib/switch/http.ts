import { SwitchClientError } from "./client";

export const MAX_DISPATCH_BYTES = 8_000_000;

export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: "invalid" | "too_large" };

export async function readJsonBody(
  request: Request,
  maxBytes = MAX_DISPATCH_BYTES,
): Promise<JsonBodyResult> {
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  const text = await request.text().catch(() => null);
  if (text === null) return { ok: false, reason: "invalid" };
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function publicSwitchError(error: unknown) {
  if (error instanceof SwitchClientError) {
    if (error.kind === "network") return "The Switch bridge is not reachable.";
    if (error.kind === "protocol") {
      return "Switch returned an unexpected response.";
    }
    if (error.status === 401 || error.status === 403) {
      return "Switch rejected the bridge credentials or room access.";
    }
    if (error.status === 404) {
      return "Switch could not find the configured room or agent.";
    }
    return "Switch could not complete the request.";
  }
  if (error instanceof Error && error.message.includes("ENOENT")) {
    return "The local handoff directory is not writable.";
  }
  return "The Switch request failed.";
}
