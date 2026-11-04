import type { ScanErrorPayload, ScanReport } from "@/lib/scanner/types";

interface ScanApiSuccess {
  ok: true;
  report: ScanReport;
}

interface ScanApiFailure {
  ok: false;
  error: ScanErrorPayload;
}

type ScanApiResponse = ScanApiSuccess | ScanApiFailure;

export class ScanRequestError extends Error {
  readonly code: string;

  constructor(message: string, code = "SCAN_FAILED") {
    super(message);
    this.name = "ScanRequestError";
    this.code = code;
  }
}

async function postScan(path: string, body?: unknown): Promise<ScanReport> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ScanRequestError(
      "Could not reach the scanner. Check that the development server and Chromium are running.",
      "NETWORK_ERROR",
    );
  }

  let payload: ScanApiResponse | null = null;
  try {
    payload = (await response.json()) as ScanApiResponse;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.ok !== true) {
    const message =
      payload && payload.ok === false
        ? payload.error.message
        : `The scanner returned an unexpected response (HTTP ${response.status}).`;
    const code =
      payload && payload.ok === false ? payload.error.code : "SCAN_FAILED";
    throw new ScanRequestError(message, code);
  }

  if (!payload.report?.id) {
    throw new ScanRequestError(
      "The scanner returned an invalid report.",
      "INVALID_RESPONSE",
    );
  }

  return payload.report;
}

export function requestUrlScan(url: string): Promise<ScanReport> {
  return postScan("/api/scan", { url });
}

export function requestDemoScan(): Promise<ScanReport> {
  return postScan("/api/demo-scan");
}
