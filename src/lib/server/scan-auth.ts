import { createHash, timingSafeEqual } from "node:crypto";
import type { ServerEnv } from "./limits";

export const SCAN_AUTH_CHALLENGE =
  'Basic realm="AccessForge scan", charset="UTF-8"';

interface ScanAuthConfig {
  enabled: boolean;
  username: string;
  password: string;
}

export function getScanAuthConfig(
  env: ServerEnv = process.env,
): ScanAuthConfig {
  const password = env.ACCESSFORGE_SCAN_AUTH_PASSWORD ?? "";
  return {
    enabled: password.length > 0,
    username: env.ACCESSFORGE_SCAN_AUTH_USER?.trim() || "accessforge",
    password,
  };
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function safeEqual(left: string, right: string): boolean {
  return timingSafeEqual(digest(left), digest(right));
}

export function isScanAuthorized(
  request: Request,
  env: ServerEnv = process.env,
): boolean {
  const config = getScanAuthConfig(env);
  if (!config.enabled) return true;

  const match = /^Basic\s+(.+)$/i.exec(
    request.headers.get("authorization") ?? "",
  );
  if (!match) return false;

  const decoded = Buffer.from(match[1], "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;

  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);

  return (
    safeEqual(username, config.username) &&
    safeEqual(password, config.password)
  );
}
