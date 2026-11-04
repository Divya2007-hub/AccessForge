import { NextResponse } from "next/server";
import { z } from "zod";
import { runScan } from "@/lib/scanner/run-scan";
import { ScanError } from "@/lib/scanner/types";
import { errorResponse, noStoreHeaders } from "@/lib/server/api";
import { checkRateLimit, requestIp } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const scanRequestSchema = z
  .object({
    url: z.string().trim().min(1).max(2048),
  })
  .strict();

export async function POST(request: Request) {
  const ip = requestIp(request);
  const rate = checkRateLimit(`scan:${ip}`, 8, 60_000);

  if (!rate.allowed) {
    return errorResponse(
      "RATE_LIMITED",
      `Too many scans. Try again in ${rate.retryAfterSeconds} seconds.`,
      429,
      {
        ...noStoreHeaders(),
        "Retry-After": String(rate.retryAfterSeconds),
      },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4_096) {
    return errorResponse(
      "INVALID_URL",
      "The request body is too large.",
      413,
      noStoreHeaders(),
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "INVALID_URL",
      "Send a JSON body with a url field.",
      400,
      noStoreHeaders(),
    );
  }

  const parsed = scanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "INVALID_URL",
      "Enter a single website URL (up to 2,048 characters).",
      400,
      noStoreHeaders(),
    );
  }

  try {
    const report = await runScan({ mode: "remote", url: parsed.data.url });
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

    console.error("[accessforge] Unexpected scan error", error);
    return errorResponse(
      "SCAN_FAILED",
      "An unexpected error stopped the scan. Please try again.",
      500,
      noStoreHeaders(),
    );
  }
}
