export interface SwitchConfig {
  baseUrl: string;
  agentId: string;
  agentApiKey: string;
  agentName: string;
  roomId: string;
  roomName: string | null;
  fixAgent: string;
  testAgent: string;
  timeoutMs: number;
}

const AGENT_NAME = /^[a-z0-9][a-z0-9._-]*$/;

function clean(value: string | undefined) {
  const next = value?.trim();
  return next ? next : null;
}

function validAgent(value: string | null, fallback: string) {
  return value && AGENT_NAME.test(value) ? value : fallback;
}

export function getSwitchConfig(): SwitchConfig | null {
  const baseUrl = clean(process.env.SWITCH_BRIDGE_URL) ?? "http://127.0.0.1:53371";
  const agentId = clean(process.env.SWITCH_AGENT_ID);
  const agentApiKey = clean(process.env.SWITCH_AGENT_API_KEY);
  const roomId = clean(process.env.SWITCH_ROOM_ID);

  if (!agentId || !agentApiKey || !roomId) return null;

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const timeout = Number.parseInt(
    clean(process.env.SWITCH_REQUEST_TIMEOUT_MS) ?? "5000",
    10,
  );

  return {
    baseUrl: parsed.origin,
    agentId,
    agentApiKey,
    agentName: validAgent(clean(process.env.SWITCH_AGENT_NAME), "accessforge-bridge"),
    roomId,
    roomName: clean(process.env.SWITCH_ROOM_NAME),
    fixAgent: validAgent(clean(process.env.SWITCH_FIX_AGENT), "accessforge-fix"),
    testAgent: validAgent(clean(process.env.SWITCH_TEST_AGENT), "accessforge-test"),
    timeoutMs: Number.isFinite(timeout)
      ? Math.min(Math.max(timeout, 500), 30_000)
      : 5_000,
  };
}

export function isSwitchConfigured() {
  return getSwitchConfig() !== null;
}
