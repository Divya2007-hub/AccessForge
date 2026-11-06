import { isIP } from "node:net";
import type { ServerEnv } from "./limits";

export const LOCAL_CLIENT_ID = "local";
export const UNKNOWN_CLIENT_ID = "unknown";

export type TrustedProxyMode = "none" | "render";

export function getTrustedProxyMode(
  env: ServerEnv = process.env,
): TrustedProxyMode {
  return env.ACCESSFORGE_TRUSTED_PROXY?.trim().toLowerCase() === "render"
    ? "render"
    : "none";
}

function validAddress(value: string | null): string | null {
  const candidate = value?.trim();
  if (!candidate || candidate.includes(",")) return null;
  return isIP(candidate) ? candidate : null;
}

export function getClientIp(
  request: Request,
  env: ServerEnv = process.env,
): string {
  if (getTrustedProxyMode(env) === "render") {
    return (
      validAddress(request.headers.get("cf-connecting-ip")) ??
      UNKNOWN_CLIENT_ID
    );
  }

  return LOCAL_CLIENT_ID;
}
