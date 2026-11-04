import { test, expect } from "@playwright/test";
import {
  isBlockedHostname,
  isPrivateOrReservedAddress,
  normalizeTargetUrl,
  TargetGuard,
} from "../src/lib/scanner/url-guard";

test.describe("URL normalization and blocking", () => {
  test("adds https to a bare hostname", () => {
    const target = normalizeTargetUrl("example.com");
    expect(target.url.toString()).toBe("https://example.com/");
    expect(target.hostname).toBe("example.com");
  });

  test("accepts public HTTP and HTTPS URLs", () => {
    expect(normalizeTargetUrl("https://example.org/path?q=1").hostname).toBe(
      "example.org",
    );
    expect(normalizeTargetUrl("http://93.184.216.34/").hostname).toBe(
      "93.184.216.34",
    );
  });

  test("rejects non-HTTP protocols and credentials", () => {
    expect(() => normalizeTargetUrl("ftp://example.com")).toThrow();
    expect(() => normalizeTargetUrl("file:///etc/passwd")).toThrow();
    expect(() =>
      normalizeTargetUrl("https://user:pass@example.com"),
    ).toThrow();
  });

  test("rejects localhost, private, and metadata hosts", () => {
    for (const value of [
      "http://localhost:3000",
      "http://127.0.0.1",
      "http://10.0.0.1",
      "http://172.16.4.2",
      "http://192.168.1.10",
      "http://169.254.169.254/latest/meta-data",
      "http://[::1]/",
      "http://metadata.google.internal/",
      "http://app.internal/",
      "http://foo.local/",
    ]) {
      expect(() => normalizeTargetUrl(value), value).toThrow();
    }
  });

  test("rejects non-standard ports", () => {
    expect(() => normalizeTargetUrl("https://example.com:8443")).toThrow();
    expect(() => normalizeTargetUrl("http://example.com:22")).toThrow();
  });

  test("allows standard ports", () => {
    expect(normalizeTargetUrl("https://example.com:443").hostname).toBe(
      "example.com",
    );
    expect(normalizeTargetUrl("http://example.com:80").hostname).toBe(
      "example.com",
    );
  });
});

test.describe("address classification", () => {
  test("detects private and reserved IPv4 and IPv6", () => {
    for (const address of [
      "0.0.0.0",
      "10.1.2.3",
      "100.64.0.1",
      "127.0.0.1",
      "169.254.169.254",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.0.1",
      "198.18.0.1",
      "224.0.0.1",
      "::1",
      "::ffff:127.0.0.1",
      "fc00::1",
      "fd12:3456::1",
      "fe80::1",
      "2001:db8::1",
    ]) {
      expect(isPrivateOrReservedAddress(address), address).toBe(true);
    }
  });

  test("allows public addresses", () => {
    for (const address of [
      "8.8.8.8",
      "93.184.216.34",
      "172.32.0.1",
      "2606:4700:4700::1111",
    ]) {
      expect(isPrivateOrReservedAddress(address), address).toBe(false);
    }
  });

  test("detects blocked hostname suffixes", () => {
    expect(isBlockedHostname("localhost")).toBe(true);
    expect(isBlockedHostname("foo.local")).toBe(true);
    expect(isBlockedHostname("metadata.google.internal")).toBe(true);
    expect(isBlockedHostname("example.com")).toBe(false);
  });
});

test.describe("TargetGuard DNS enforcement", () => {
  test("blocks a public hostname that resolves to a private address", async () => {
    const guard = new TargetGuard(async () => [
      { address: "10.0.0.7", family: 4 },
    ]);

    await expect(
      guard.assertAllowed("https://internal.example.com"),
    ).rejects.toMatchObject({ code: "BLOCKED_TARGET" });
  });

  test("accepts a hostname with a public address and caches the lookup", async () => {
    let calls = 0;
    const guard = new TargetGuard(async () => {
      calls += 1;
      return [{ address: "93.184.216.34", family: 4 }];
    });

    await guard.assertAllowed("https://example.com");
    await guard.assertAllowed("https://example.com/another-page");
    expect(calls).toBe(1);
  });

  test("reports DNS failures", async () => {
    const guard = new TargetGuard(async () => {
      throw new Error("lookup failed");
    });

    await expect(
      guard.assertAllowed("https://does-not-resolve.example.org"),
    ).rejects.toMatchObject({ code: "DNS_FAILURE" });
  });
});
