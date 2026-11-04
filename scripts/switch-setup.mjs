import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ENV_FILE = path.join(process.cwd(), ".env.local");
const MANAGED_KEYS = new Set([
  "SWITCH_BRIDGE_URL",
  "SWITCH_AGENT_ID",
  "SWITCH_AGENT_API_KEY",
  "SWITCH_AGENT_NAME",
  "SWITCH_ROOM_ID",
  "SWITCH_ROOM_NAME",
  "SWITCH_FIX_AGENT",
  "SWITCH_TEST_AGENT",
  "SWITCH_REQUEST_TIMEOUT_MS",
  "SWITCH_REGISTRATION_KEY",
]);
const AGENT_NAME = /^[a-z0-9][a-z0-9._-]*$/;

function readEnv(filename) {
  if (!existsSync(filename)) return {};
  const values = {};
  for (const line of readFileSync(filename, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equals = line.indexOf("=");
    if (equals < 1) continue;
    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const fileEnv = readEnv(ENV_FILE);
const env = { ...fileEnv };
for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined) env[key] = value;
}

function value(name, fallback = "") {
  return (env[name] ?? fallback).trim();
}

function agentName(name, fallback) {
  const candidate = value(name, fallback);
  if (!AGENT_NAME.test(candidate)) {
    throw new Error(`${name} must match ${AGENT_NAME}.`);
  }
  return candidate;
}

function baseUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("SWITCH_BRIDGE_URL is not a valid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("SWITCH_BRIDGE_URL must use http or https.");
  }
  return parsed.origin;
}

async function requestJson(url, { method = "GET", token, body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let response;
  try {
    response = await fetch(url, {
      method,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The Switch request timed out.");
    }
    throw new Error(`Could not reach Switch at ${new URL(url).origin}.`);
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`Switch returned non-JSON data (HTTP ${response.status}).`);
    }
  }

  if (!response.ok) {
    const detail =
      payload && typeof payload.detail === "string"
        ? payload.detail
        : `HTTP ${response.status}`;
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }

  return payload;
}

function operationResult(payload, name) {
  if (!payload || typeof payload !== "object" || !("result" in payload)) {
    throw new Error(`Switch returned an invalid ${name} response.`);
  }
  return payload.result;
}

function writeEnv(values) {
  const lines = existsSync(ENV_FILE)
    ? readFileSync(ENV_FILE, "utf8").split(/\r?\n/)
    : [];
  const kept = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return true;
    const equals = trimmed.indexOf("=");
    if (equals < 1) return true;
    return !MANAGED_KEYS.has(trimmed.slice(0, equals).trim());
  });
  while (kept.length > 0 && kept[kept.length - 1] === "") kept.pop();

  const additions = Object.entries(values).map(
    ([key, item]) => `${key}=${JSON.stringify(item)}`,
  );
  writeFileSync(
    ENV_FILE,
    `${[...kept, ...(kept.length ? [""] : []), ...additions].join("\n")}\n`,
    "utf8",
  );
}

async function listAllRooms(origin, token, agentId) {
  const rooms = [];
  let cursor = null;
  for (let page = 0; page < 20; page += 1) {
    const result = operationResult(
      await requestJson(
        `${origin}/agents/${encodeURIComponent(agentId)}/ops/list_all_rooms`,
        {
          method: "POST",
          token,
          body: {
            include_archived: false,
            limit: 100,
            ...(cursor ? { cursor } : {}),
          },
        },
      ),
      "list_all_rooms",
    );
    if (!result || !Array.isArray(result.rooms)) {
      throw new Error("Switch returned an invalid room list.");
    }
    rooms.push(
      ...result.rooms.filter(
        (room) => room && typeof room.room_id === "string" && room.name,
      ),
    );
    cursor = result.next_cursor;
    if (!cursor) break;
  }
  return rooms;
}

async function memberRooms(origin, token, agentId) {
  const result = operationResult(
    await requestJson(
      `${origin}/agents/${encodeURIComponent(agentId)}/ops/list_rooms`,
      { method: "POST", token, body: { include_archived: false } },
    ),
    "list_rooms",
  );
  if (!Array.isArray(result)) {
    throw new Error("Switch returned an invalid membership list.");
  }
  return result;
}

async function main() {
  const origin = baseUrl(value("SWITCH_BRIDGE_URL", "http://127.0.0.1:53371"));
  const bridgeName = agentName("SWITCH_AGENT_NAME", "accessforge-bridge");
  const fixAgent = agentName("SWITCH_FIX_AGENT", "accessforge-fix");
  const testAgent = agentName("SWITCH_TEST_AGENT", "accessforge-test");
  const overwrite = process.argv.includes("--overwrite");

  let agentId = value("SWITCH_AGENT_ID");
  let apiKey = value("SWITCH_AGENT_API_KEY");
  const registrationKey = value("SWITCH_REGISTRATION_KEY");

  const health = await requestJson(`${origin}/health`);
  if (!health || health.status !== "ok") {
    throw new Error(`Switch health check failed at ${origin}.`);
  }
  console.log(`Switch is reachable at ${origin}.`);

  if (!agentId || !apiKey) {
    if (!registrationKey) {
      throw new Error(
        "Create a Switch registration key and set SWITCH_REGISTRATION_KEY in .env.local, then rerun npm run switch:setup.",
      );
    }

    console.log(`Registering bridge agent ${bridgeName}...`);
    let registration;
    try {
      registration = await requestJson(`${origin}/agents`, {
        method: "POST",
        token: registrationKey,
        body: {
          name: bridgeName,
          display_name: "AccessForge Bridge",
          description:
            "Server-side AccessForge approved-fix handoff bridge. Posts approved bundles and reads room activity.",
          connector_type: "accessforge",
          integration_profile: {
            connection_model: "session_passive",
            message_exchange: true,
            pre_invocation_mediation: [],
            post_invocation_mediation: [],
            event_reporting: [],
          },
          tools: [],
          models: [],
          metadata: {
            app: "accessforge",
            role: "approved-fix-handoff",
          },
          overwrite,
        },
      });
    } catch (error) {
      if (error.status === 409) {
        throw new Error(
          `The agent name ${bridgeName} is already registered. Use an existing SWITCH_AGENT_ID and SWITCH_AGENT_API_KEY, choose another SWITCH_AGENT_NAME, or rerun with --overwrite.`,
        );
      }
      throw error;
    }

    if (!registration?.id || !registration?.api_key) {
      throw new Error("Switch did not return an agent id and API key.");
    }
    agentId = registration.id;
    apiKey = registration.api_key;
    console.log("Bridge agent registered.");
  } else {
    console.log("Using the existing bridge agent credentials.");
  }

  const rooms = await memberRooms(origin, apiKey, agentId);
  let selected = value("SWITCH_ROOM_ID");
  const requestedName = value("SWITCH_ROOM_NAME");

  if (selected) {
    const match = rooms.find((room) => room.room_id === selected);
    if (!match) {
      throw new Error(
        "The bridge agent is not a member of SWITCH_ROOM_ID. Invite it to the room in Switch Console, then rerun.",
      );
    }
    if (requestedName && match.name !== requestedName) {
      throw new Error(
        `SWITCH_ROOM_ID resolves to "${match.name}", not "${requestedName}".`,
      );
    }
    selected = match;
  } else {
    let candidates = rooms;
    if (requestedName) {
      candidates = rooms.filter(
        (room) => String(room.name).toLowerCase() === requestedName.toLowerCase(),
      );
      if (candidates.length === 0) {
        const all = await listAllRooms(origin, apiKey, agentId);
        const match = all.find(
          (room) => String(room.name).toLowerCase() === requestedName.toLowerCase(),
        );
        if (!match) {
          throw new Error(`No Switch room is named "${requestedName}".`);
        }
        console.log(`Inviting the bridge to "${match.name}"...`);
        try {
          await requestJson(
            `${origin}/agents/${encodeURIComponent(agentId)}/ops/invite_agent_to_room`,
            {
              method: "POST",
              token: apiKey,
              body: { room_id: match.room_id, agent_name: bridgeName },
            },
          );
        } catch (error) {
          console.warn(
            `Automatic invite failed: ${error.message}. Invite ${bridgeName} in Switch Console if it is not already a member.`,
          );
        }
        selected = match;
      } else {
        selected = candidates[0];
      }
    } else if (rooms.length === 1) {
      selected = rooms[0];
    } else if (rooms.length === 0) {
      const all = await listAllRooms(origin, apiKey, agentId);
      if (all.length === 0) throw new Error("This Switch instance has no rooms.");
      console.log("The bridge is not in any room yet. Available rooms:");
      for (const room of all) console.log(`  ${room.name} (${room.room_id})`);
      throw new Error(
        "Set SWITCH_ROOM_NAME (preferred) or SWITCH_ROOM_ID, then rerun so the bridge can be invited.",
      );
    } else {
      console.log("The bridge belongs to multiple rooms:");
      for (const room of rooms) console.log(`  ${room.name} (${room.room_id})`);
      throw new Error(
        "Set SWITCH_ROOM_NAME (preferred) or SWITCH_ROOM_ID, then rerun.",
      );
    }
  }

  const selectedRoom =
    typeof selected === "string" ? { room_id: selected, name: "" } : selected;
  const roomId = selectedRoom.room_id;
  const roomName = selectedRoom.name || requestedName;

  const memberships = await memberRooms(origin, apiKey, agentId);
  const member = memberships.find((room) => room.room_id === roomId);
  if (!member) {
    throw new Error(
      `The bridge agent is not a member of ${roomName || roomId}. Invite ${bridgeName} in Switch Console, then rerun.`,
    );
  }

  try {
    const detail = operationResult(
      await requestJson(
        `${origin}/agents/${encodeURIComponent(agentId)}/ops/get_room_detail`,
        {
          method: "POST",
          token: apiKey,
          body: { room_id: roomId },
        },
      ),
      "get_room_detail",
    );
    const roomAgents = Array.isArray(detail?.agent_names)
      ? detail.agent_names
      : [];
    for (const name of [fixAgent, testAgent]) {
      if (!roomAgents.includes(name)) {
        console.warn(
          `${name} is not in "${member.name || roomName}". Invite it in Switch Console before dispatching a handoff.`,
        );
      }
    }
  } catch (error) {
    console.warn(`Could not verify room agent membership: ${error.message}`);
  }

  writeEnv({
    SWITCH_BRIDGE_URL: origin,
    SWITCH_AGENT_ID: agentId,
    SWITCH_AGENT_API_KEY: apiKey,
    SWITCH_AGENT_NAME: bridgeName,
    SWITCH_ROOM_ID: roomId,
    SWITCH_ROOM_NAME: member.name || roomName,
    SWITCH_FIX_AGENT: fixAgent,
    SWITCH_TEST_AGENT: testAgent,
  });

  console.log(`Bridge configured for room "${member.name || roomName}".`);
  console.log("Wrote server-only values to .env.local. Restart the dev server.");
}

main().catch((error) => {
  console.error(`Switch setup failed: ${error.message}`);
  process.exitCode = 1;
});
