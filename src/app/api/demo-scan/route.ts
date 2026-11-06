import { NextResponse } from "next/server";
import { runScan } from "@/lib/scanner/run-scan";
import { ScanError } from "@/lib/scanner/types";
import { errorResponse, noStoreHeaders, scanErrorHeaders } from "@/lib/server/api";
import { getClientIp } from "@/lib/server/client-ip";
import { getDemoRateLimit } from "@/lib/server/limits";
import { checkRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const clientId = getClientIp(request);
  const rateLimit = getDemoRateLimit();
  const rate = checkRateLimit(
    `demo:${clientId}`,
    rateLimit.limit,
    rateLimit.windowMs,
  );

  if (!rate.allowed) {
    return errorResponse(
      "RATE_LIMITED",
      `Too many demo audits. Try again in ${rate.retryAfterSeconds} seconds.`,
      429,
      scanErrorHeaders(rate.retryAfterSeconds),
    );
  }

  try {
    const report = await runScan({ mode: "demo", clientId });
    return NextResponse.json(
      { ok: true, report },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    if (error instanceof ScanError) {
      return errorResponse(
        error.code,
        error.message,
        error.status,
        scanErrorHeaders(error.retryAfterSeconds),
      );
    }

    console.error("[accessforge] Unexpected demo scan error", error);
    return errorResponse(
      "SCAN_FAILED",
      "An unexpected error stopped the demo audit. Please try again.",
      500,
      noStoreHeaders(),
    );
  }
}
