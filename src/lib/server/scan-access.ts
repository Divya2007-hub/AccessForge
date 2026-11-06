import { getClientIp } from "./client-ip";
import { getScanRateLimit, type ServerEnv } from "./limits";
import { checkRateLimit } from "./rate-limit";
import { isScanAuthorized } from "./scan-auth";

export type ScanAccessResult =
  | { ok: true; clientId: string }
  | { ok: false; code: "UNAUTHORIZED" }
  | { ok: false; code: "RATE_LIMITED"; retryAfterSeconds: number };

export function checkScanAccess(
  request: Request,
  env: ServerEnv = process.env,
): ScanAccessResult {
  if (!isScanAuthorized(request, env)) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const clientId = getClientIp(request, env);
  const rateLimit = getScanRateLimit(env);
  const rate = checkRateLimit(
    `scan:${clientId}`,
    rateLimit.limit,
    rateLimit.windowMs,
  );

  if (!rate.allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      retryAfterSeconds: rate.retryAfterSeconds,
    };
  }

  return { ok: true, clientId };
}
