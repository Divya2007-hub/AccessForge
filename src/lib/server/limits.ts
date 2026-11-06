export type ServerEnv = Record<string, string | undefined>;

export function readPositiveInteger(
  name: string,
  fallback: number,
  env: ServerEnv = process.env,
  maximum = 10_000,
): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    return fallback;
  }

  return value;
}

export function getScanRateLimit(env: ServerEnv = process.env) {
  return {
    limit: readPositiveInteger("ACCESSFORGE_SCAN_RATE_LIMIT", 5, env, 100),
    windowMs: readPositiveInteger(
      "ACCESSFORGE_RATE_LIMIT_WINDOW_MS",
      60_000,
      env,
      3_600_000,
    ),
  };
}

export function getDemoRateLimit(env: ServerEnv = process.env) {
  return {
    limit: readPositiveInteger("ACCESSFORGE_DEMO_RATE_LIMIT", 6, env, 100),
    windowMs: readPositiveInteger(
      "ACCESSFORGE_RATE_LIMIT_WINDOW_MS",
      60_000,
      env,
      3_600_000,
    ),
  };
}

export function getMaxConcurrentScans(env: ServerEnv = process.env): number {
  return readPositiveInteger("ACCESSFORGE_MAX_CONCURRENT_SCANS", 1, env, 20);
}

export function getMaxConcurrentScansPerClient(
  env: ServerEnv = process.env,
): number {
  return readPositiveInteger(
    "ACCESSFORGE_MAX_CONCURRENT_SCANS_PER_CLIENT",
    1,
    env,
    10,
  );
}
