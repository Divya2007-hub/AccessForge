import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { ScanError } from "../src/lib/scanner/types";
import {
  getClientIp,
  LOCAL_CLIENT_ID,
  UNKNOWN_CLIENT_ID,
} from "../src/lib/server/client-ip";
import { readPositiveInteger } from "../src/lib/server/limits";
import { checkRateLimit } from "../src/lib/server/rate-limit";
import { isScanAuthorized } from "../src/lib/server/scan-auth";
import { checkScanAccess } from "../src/lib/server/scan-access";
import {
  acquireScanSlot,
  releaseScanSlot,
} from "../src/lib/server/scan-concurrency";

function basicAuth(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

function scanRequest(clientIp: string, authorization?: string): Request {
  const headers: Record<string, string> = {
    "cf-connecting-ip": clientIp,
    "content-type": "application/json",
  };

  if (authorization) {
    headers.authorization = authorization;
  }

  return new Request("https://example.com/api/scan", {
    method: "POST",
    headers,
    body: JSON.stringify({ url: "https://example.com" }),
  });
}

function expectBusy(action: () => void) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(ScanError);
    const scanError = error as ScanError;
    expect(scanError.code).toBe("BUSY");
    expect(scanError.status).toBe(503);
    expect(scanError.retryAfterSeconds).toBe(5);
    return;
  }

  throw new Error("Expected the scan slot request to be rejected.");
}

test.describe("Trusted proxy client identity", () => {
  test("ignores forwarding headers unless a trusted proxy is configured", () => {
    const request = new Request("https://example.com/api/scan", {
      headers: {
        "cf-connecting-ip": "198.51.100.7",
        "x-forwarded-for": "203.0.113.9",
        "x-real-ip": "192.0.2.4",
      },
    });

    expect(getClientIp(request, {})).toBe(LOCAL_CLIENT_ID);
    expect(
      getClientIp(request, { ACCESSFORGE_TRUSTED_PROXY: "none" }),
    ).toBe(LOCAL_CLIENT_ID);
  });

  test("reads only CF-Connecting-IP in Render mode", () => {
    const request = new Request("https://example.com/api/scan", {
      headers: {
        "cf-connecting-ip": "198.51.100.7",
        "x-forwarded-for": "203.0.113.9",
        "x-real-ip": "192.0.2.4",
      },
    });

    expect(
      getClientIp(request, { ACCESSFORGE_TRUSTED_PROXY: "render" }),
    ).toBe("198.51.100.7");
  });

  test("fails safely when the trusted header is missing or invalid", () => {
    const missing = new Request("https://example.com/api/scan", {
      headers: { "x-forwarded-for": "203.0.113.9" },
    });
    const invalid = new Request("https://example.com/api/scan", {
      headers: {
        "cf-connecting-ip": "not-an-ip",
        "x-forwarded-for": "203.0.113.9",
      },
    });

    expect(
      getClientIp(missing, { ACCESSFORGE_TRUSTED_PROXY: "render" }),
    ).toBe(UNKNOWN_CLIENT_ID);
    expect(
      getClientIp(invalid, { ACCESSFORGE_TRUSTED_PROXY: "render" }),
    ).toBe(UNKNOWN_CLIENT_ID);
  });

  test("accepts IPv6 client addresses", () => {
    const request = new Request("https://example.com/api/scan", {
      headers: { "cf-connecting-ip": "2606:4700:4700::1111" },
    });

    expect(
      getClientIp(request, { ACCESSFORGE_TRUSTED_PROXY: "render" }),
    ).toBe("2606:4700:4700::1111");
  });
});

test.describe("Optional scan authentication", () => {
  test("is disabled when no password is configured", () => {
    const request = new Request("https://example.com/api/scan");
    expect(isScanAuthorized(request, {})).toBe(true);
  });

  test("accepts only matching Basic credentials when enabled", () => {
    const env = { ACCESSFORGE_SCAN_AUTH_PASSWORD: "s3cret" };
    const valid = new Request("https://example.com/api/scan", {
      headers: { authorization: basicAuth("accessforge", "s3cret") },
    });
    const wrongPassword = new Request("https://example.com/api/scan", {
      headers: { authorization: basicAuth("accessforge", "wrong") },
    });
    const missing = new Request("https://example.com/api/scan");

    expect(isScanAuthorized(valid, env)).toBe(true);
    expect(isScanAuthorized(wrongPassword, env)).toBe(false);
    expect(isScanAuthorized(missing, env)).toBe(false);
  });

  test("supports a custom username", () => {
    const env = {
      ACCESSFORGE_SCAN_AUTH_USER: "reviewer",
      ACCESSFORGE_SCAN_AUTH_PASSWORD: "s3cret",
    };
    const request = new Request("https://example.com/api/scan", {
      headers: { authorization: basicAuth("reviewer", "s3cret") },
    });
    const defaultUser = new Request("https://example.com/api/scan", {
      headers: { authorization: basicAuth("accessforge", "s3cret") },
    });

    expect(isScanAuthorized(request, env)).toBe(true);
    expect(isScanAuthorized(defaultUser, env)).toBe(false);
  });
});

test.describe("Authenticated scan quota", () => {
  test("unauthenticated requests do not consume the scan quota", () => {
    const env = {
      ACCESSFORGE_TRUSTED_PROXY: "render",
      ACCESSFORGE_SCAN_AUTH_PASSWORD: "s3cret",
      ACCESSFORGE_SCAN_RATE_LIMIT: "1",
      ACCESSFORGE_RATE_LIMIT_WINDOW_MS: "60000",
    };
    const clientIp = "198.51.100.77";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(checkScanAccess(scanRequest(clientIp), env)).toEqual({
        ok: false,
        code: "UNAUTHORIZED",
      });
    }

    expect(
      checkScanAccess(
        scanRequest(clientIp, basicAuth("accessforge", "wrong-password")),
        env,
      ),
    ).toEqual({ ok: false, code: "UNAUTHORIZED" });

    expect(
      checkScanAccess(
        scanRequest(clientIp, basicAuth("accessforge", "s3cret")),
        env,
      ),
    ).toEqual({ ok: true, clientId: clientIp });

    expect(
      checkScanAccess(
        scanRequest(clientIp, basicAuth("accessforge", "s3cret")),
        env,
      ),
    ).toEqual({
      ok: false,
      code: "RATE_LIMITED",
      retryAfterSeconds: expect.any(Number),
    });
  });
});

test.describe("Scan concurrency limits", () => {
  test("rejects a second concurrent scan from the same client", () => {
    const clientId = `same-client-${randomUUID()}`;
    const env = {
      ACCESSFORGE_MAX_CONCURRENT_SCANS: "2",
      ACCESSFORGE_MAX_CONCURRENT_SCANS_PER_CLIENT: "1",
    };

    acquireScanSlot(clientId, env);
    try {
      expectBusy(() => acquireScanSlot(clientId, env));
    } finally {
      releaseScanSlot(clientId);
    }
  });

  test("rejects a scan when the global slot limit is full", () => {
    const firstClient = `global-first-${randomUUID()}`;
    const secondClient = `global-second-${randomUUID()}`;
    const env = {
      ACCESSFORGE_MAX_CONCURRENT_SCANS: "1",
      ACCESSFORGE_MAX_CONCURRENT_SCANS_PER_CLIENT: "2",
    };

    acquireScanSlot(firstClient, env);
    try {
      expectBusy(() => acquireScanSlot(secondClient, env));
    } finally {
      releaseScanSlot(firstClient);
    }
  });
});

test.describe("Rate limit and environment parsing", () => {
  test("blocks a key after the configured number of attempts", () => {
    const key = `security-rate-${randomUUID()}`;

    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);

    const blocked = checkRateLimit(key, 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  test("falls back for invalid positive integer settings", () => {
    expect(readPositiveInteger("LIMIT", 5, { LIMIT: "0" })).toBe(5);
    expect(readPositiveInteger("LIMIT", 5, { LIMIT: "-1" })).toBe(5);
    expect(readPositiveInteger("LIMIT", 5, { LIMIT: "1.5" })).toBe(5);
    expect(readPositiveInteger("LIMIT", 5, { LIMIT: "abc" })).toBe(5);
    expect(readPositiveInteger("LIMIT", 5, { LIMIT: "7" })).toBe(7);
  });
});
