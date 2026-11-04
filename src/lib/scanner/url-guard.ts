import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { ScanError } from "./types";

const MAX_URL_LENGTH = 2048;
const DNS_TIMEOUT_MS = 6_000;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "instance-data.ec2.internal",
  "kubernetes.default",
  "kubernetes.default.svc",
]);

const BLOCKED_SUFFIXES = [
  ".localhost",
  ".local",
  ".localdomain",
  ".internal",
  ".intranet",
  ".lan",
  ".home.arpa",
  ".arpa",
  ".test",
  ".invalid",
  ".example",
  ".onion",
];

export type AddressResolver = (
  hostname: string,
) => Promise<Array<{ address: string; family: number }>>;

const defaultResolver: AddressResolver = async (hostname) => {
  const result = await Promise.race([
    lookup(hostname, { all: true, verbatim: true }),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("DNS lookup timed out")),
        DNS_TIMEOUT_MS,
      ),
    ),
  ]);

  return result.map(({ address, family }) => ({ address, family }));
};

function stripIpv6Brackets(hostname: string) {
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

function isPrivateIPv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }

  const [a, b, c] = parts;

  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;
  if (a === 255 && b === 255 && c === 255) return true;

  return false;
}

function isPrivateIPv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];

  // Covers ::, ::1, IPv4-compatible and IPv4-mapped (including hex form).
  // Legitimate public targets do not need these representations.
  if (normalized.startsWith("::")) return true;

  const firstGroup = Number.parseInt(normalized.split(":")[0] || "0", 16);
  if (Number.isNaN(firstGroup)) return true;

  // Unique local (fc00::/7)
  if ((firstGroup & 0xfe00) === 0xfc00) return true;
  // Link local (fe80::/10)
  if ((firstGroup & 0xffc0) === 0xfe80) return true;
  // Multicast (ff00::/8)
  if ((firstGroup & 0xff00) === 0xff00) return true;
  // Documentation (2001:db8::/32), Teredo (2001::/32), benchmarking (2001:2::/48)
  if (normalized.startsWith("2001:db8:")) return true;
  if (normalized.startsWith("2001:0:")) return true;
  if (normalized.startsWith("2001:2:")) return true;
  // 6to4 can embed private IPv4 addresses
  if (normalized.startsWith("2002:")) return true;
  // Discard-only prefix (100::/64)
  if (normalized.startsWith("100:")) return true;
  // NAT64 (64:ff9b::/96) can embed private IPv4 addresses
  if (normalized.startsWith("64:ff9b:")) return true;

  return false;
}

export function isPrivateOrReservedAddress(address: string): boolean {
  const value = stripIpv6Brackets(address.trim());
  const family = isIP(value);
  if (family === 4) return isPrivateIPv4(value);
  if (family === 6) return isPrivateIPv6(value);
  return true;
}

export function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  if (!normalized) return true;
  if (BLOCKED_HOSTNAMES.has(normalized)) return true;
  if (BLOCKED_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) {
    return true;
  }
  return false;
}

export interface NormalizedTarget {
  url: URL;
  hostname: string;
}

export function normalizeTargetUrl(rawValue: string): NormalizedTarget {
  const raw = rawValue.trim();

  if (!raw) {
    throw new ScanError("INVALID_URL", "Enter a website URL to scan.", 400);
  }

  if (raw.length > MAX_URL_LENGTH) {
    throw new ScanError("INVALID_URL", "That URL is too long.", 400);
  }

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
    ? raw
    : raw.startsWith("//")
      ? `https:${raw}`
      : `https://${raw}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new ScanError(
      "INVALID_URL",
      "That does not look like a valid URL. Try https://example.com.",
      400,
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ScanError(
      "INVALID_URL",
      "Only public HTTP and HTTPS URLs can be scanned.",
      400,
    );
  }

  if (url.username || url.password) {
    throw new ScanError(
      "INVALID_URL",
      "URLs containing credentials are not supported.",
      400,
    );
  }

  const hostname = stripIpv6Brackets(url.hostname).toLowerCase();
  if (!hostname) {
    throw new ScanError("INVALID_URL", "The URL must include a hostname.", 400);
  }

  if (hostname.length > 253) {
    throw new ScanError("INVALID_URL", "That hostname is too long.", 400);
  }

  const allowedPort =
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443") ||
    url.port === "";

  if (!allowedPort) {
    throw new ScanError(
      "BLOCKED_TARGET",
      "Only standard ports 80 (HTTP) and 443 (HTTPS) are allowed.",
      400,
    );
  }

  if (isBlockedHostname(hostname)) {
    throw new ScanError(
      "BLOCKED_TARGET",
      "That hostname is blocked. Local, private, and metadata addresses cannot be scanned.",
      400,
    );
  }

  if (isIP(hostname) !== 0 && isPrivateOrReservedAddress(hostname)) {
    throw new ScanError(
      "BLOCKED_TARGET",
      "Private, loopback, and reserved IP addresses cannot be scanned.",
      400,
    );
  }

  return { url, hostname };
}

export class TargetGuard {
  private readonly resolver: AddressResolver;
  private readonly cache = new Map<string, string[]>();

  constructor(resolver: AddressResolver = defaultResolver) {
    this.resolver = resolver;
  }

  private async resolveHostname(hostname: string): Promise<string[]> {
    const cached = this.cache.get(hostname);
    if (cached) return cached;

    const family = isIP(hostname);
    const addresses =
      family === 0
        ? (await this.resolver(hostname)).map((entry) => entry.address)
        : [hostname];

    if (addresses.length === 0) {
      throw new ScanError(
        "DNS_FAILURE",
        "The hostname did not resolve to any address.",
        422,
      );
    }

    for (const address of addresses) {
      if (isPrivateOrReservedAddress(address)) {
        throw new ScanError(
          "BLOCKED_TARGET",
          "The hostname resolves to a private or reserved address, so the scan was blocked.",
          400,
        );
      }
    }

    this.cache.set(hostname, addresses);
    return addresses;
  }

  async assertAllowed(rawValue: string): Promise<NormalizedTarget> {
    const target = normalizeTargetUrl(rawValue);

    try {
      await this.resolveHostname(target.hostname);
    } catch (error) {
      if (error instanceof ScanError) throw error;
      throw new ScanError(
        "DNS_FAILURE",
        "The hostname could not be resolved. Check the URL and try again.",
        422,
      );
    }

    return target;
  }

  async assertRequestUrl(rawUrl: string): Promise<void> {
    const target = normalizeTargetUrl(rawUrl);
    try {
      await this.resolveHostname(target.hostname);
    } catch (error) {
      if (error instanceof ScanError) throw error;
      throw new ScanError(
        "BLOCKED_TARGET",
        "A network request to a blocked or unresolvable host was stopped.",
        400,
      );
    }
  }
}
