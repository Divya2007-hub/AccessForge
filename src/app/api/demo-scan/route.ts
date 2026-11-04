import { NextResponse } from "next/server";
import { runScan } from "@/lib/scanner/run-scan";
import { ScanError } from "@/lib/scanner/types";
import { errorResponse, noStoreHeaders } from "@/lib/server/api";
import { checkRateLimit, requestIp } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const ip = requestIp(request);
  const rate = checkRateLimit(`demo:${ip}`, 6, 60_000);

  if (!rate.allowed) {
    return errorResponse(
      "RATE_LIMITED",
      `Too many demo audits. Try again in ${rate.retryAfterSeconds} seconds.`,
      429,
      {
        ...noStoreHeaders(),
        "Retry-After": String(rate.retryAfterSeconds),
      },
    );
  }

  try {
    const report = await runScan({ mode: "demo" });
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
        noStoreHeaders(),
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
