import type { SwitchConfig } from "./config";

export class SwitchClientError extends Error {
  status: number | null;
  kind: "network" | "http" | "protocol";

  constructor(
    message: string,
    kind: "network" | "http" | "protocol",
    status: number | null = null,
  ) {
    super(message);
    this.name = "SwitchClientError";
    this.kind = kind;
    this.status = status;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function errorDetail(body: string) {
  if (!body) return "";
  try {
    const parsed = JSON.parse(body) as unknown;
    const record = asRecord(parsed);
    const detail = record ? record.detail : null;
    if (typeof detail === "string") return detail.slice(0, 300);
  } catch {
    return body.slice(0, 300);
  }
  return body.slice(0, 300);
}

export function createSwitchClient(config: SwitchConfig) {
  async function request(
    path: string,
    init: RequestInit = {},
    authenticated = true,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(`${config.baseUrl}${path}`, {
        ...init,
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(authenticated
            ? { Authorization: `Bearer ${config.agentApiKey}` }
            : {}),
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...(init.headers ?? {}),
        },
      });

      const text = await response.text();

      if (!response.ok) {
        const detail = errorDetail(text);
        throw new SwitchClientError(
          detail || `Switch returned HTTP ${response.status}.`,
          "http",
          response.status,
        );
      }

      if (!text) return null;
      try {
        return JSON.parse(text) as unknown;
      } catch {
        throw new SwitchClientError(
          "Switch returned a response that was not valid JSON.",
          "protocol",
        );
      }
    } catch (error) {
      if (error instanceof SwitchClientError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new SwitchClientError(
          "The Switch request timed out.",
          "network",
        );
      }
      throw new SwitchClientError(
        "The Switch bridge could not be reached.",
        "network",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async function operation<T>(name: string, args: Record<string, unknown>) {
    const response = await request(
      `/agents/${encodeURIComponent(config.agentId)}/ops/${encodeURIComponent(name)}`,
      {
        method: "POST",
        body: JSON.stringify(args),
      },
    );

    const record = asRecord(response);
    if (!record || !("result" in record)) {
      throw new SwitchClientError(
        `Switch returned an invalid response for ${name}.`,
        "protocol",
      );
    }

    return record.result as T;
  }

  return {
    async health() {
      const response = await request("/health", {}, false);
      const record = asRecord(response);
      return record?.status === "ok";
    },

    async listAllRooms() {
      const result = await operation<unknown>("list_all_rooms", {
        include_archived: false,
        limit: 500,
      });
      const record = asRecord(result);
      return asArray(record?.rooms)
        .map((room) => {
          const item = asRecord(room);
          if (!item) return null;
          return {
            roomId: asString(item.room_id),
            name: asString(item.name),
            description: asString(item.description),
            archived: item.archived === true,
          };
        })
        .filter(
          (
            room,
          ): room is {
            roomId: string;
            name: string;
            description: string;
            archived: boolean;
          } => Boolean(room?.roomId && room.name),
        );
    },

    async listRooms() {
      const result = await operation<unknown>("list_rooms", {});
      return asArray(result)
        .map((room) => {
          const item = asRecord(room);
          if (!item) return null;
          return {
            roomId: asString(item.room_id),
            name: asString(item.name),
            description: asString(item.description),
            archived: item.archived === true,
          };
        })
        .filter(
          (
            room,
          ): room is {
            roomId: string;
            name: string;
            description: string;
            archived: boolean;
          } => Boolean(room?.roomId && room.name),
        );
    },

    async listAgents() {
      const result = await operation<unknown>("list_agents", {});
      return asArray(result)
        .map((agent) => {
          const item = asRecord(agent);
          if (!item) return null;
          return {
            id: asString(item.id),
            name: asString(item.name),
            connectionModel: asString(item.connection_model, "unknown"),
          };
        })
        .filter(
          (agent): agent is { id: string; name: string; connectionModel: string } =>
            Boolean(agent?.id && agent.name),
        );
    },

    async getRoomDetail(roomId: string) {
      const result = await operation<unknown>("get_room_detail", {
        room_id: roomId,
      });
      const record = asRecord(result);
      return {
        id: asString(record?.id, roomId),
        name: asString(record?.name),
        agentNames: asArray(record?.agent_names)
          .map((name) => (typeof name === "string" ? name : ""))
          .filter(Boolean),
      };
    },

    async readContext(roomId: string, limit = 20, since?: string) {
      const result = await operation<unknown>("read_context", {
        room_id: roomId,
        limit,
        ...(since ? { since } : {}),
      });
      const record = asRecord(result);
      const entries = asArray(record?.threads).flatMap((thread) => {
        const group = asRecord(thread);
        if (!group) return [];
        const root = asRecord(group.root);
        const replies = asArray(group.replies)
          .map((reply) => asRecord(reply))
          .filter((reply): reply is Record<string, unknown> => Boolean(reply));
        return [root, ...replies].filter(
          (entry): entry is Record<string, unknown> => Boolean(entry),
        );
      });

      return {
        truncated: record?.truncated === true,
        entries: entries
          .map((entry) => ({
            id: asString(entry.id),
            kind: asString(entry.kind, "message"),
            sender: asString(entry.sender),
            senderName: asString(entry.sender_name),
            body: asString(entry.body),
            timestamp: asNumber(entry.timestamp),
          }))
          .filter((entry) => Boolean(entry.id))
          .sort((left, right) => left.timestamp - right.timestamp),
      };
    },

    async postMessage(roomId: string, content: string) {
      const response = await request(
        `/agents/${encodeURIComponent(config.agentId)}/message`,
        {
          method: "POST",
          body: JSON.stringify({ room_id: roomId, content }),
        },
      );
      const record = asRecord(response);
      return {
        ok: record?.ok === true,
        eventId: asString(record?.event_id),
      };
    },

    async inviteAgentToRoom(roomId: string, agentName: string) {
      await operation<unknown>("invite_agent_to_room", {
        room_id: roomId,
        agent_name: agentName,
      });
    },
  };
}

export type SwitchClient = ReturnType<typeof createSwitchClient>;
