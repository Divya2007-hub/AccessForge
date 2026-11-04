import { NextResponse } from "next/server";
import { createSwitchClient } from "@/lib/switch/client";
import { getSwitchConfig } from "@/lib/switch/config";
import type { SwitchStatusAgent } from "@/lib/switch/types";
import { publicSwitchError } from "@/lib/switch/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function agentStatus(
  agents: { id: string; name: string; connectionModel: string }[],
  name: string,
  memberNames: Set<string>,
): SwitchStatusAgent {
  const match = agents.find((agent) => agent.name === name);
  return {
    name: match?.name ?? name,
    connectionModel: match?.connectionModel ?? "unknown",
    present: Boolean(match),
    inRoom: Boolean(match && memberNames.has(match.name)),
  };
}

function emptyStatus(error: string | null) {
  return {
    configured: false,
    online: false,
    authorized: false,
    room: null,
    bridgeAgent: null,
    fixAgent: null,
    testAgent: null,
    agents: [],
    checkedAt: new Date().toISOString(),
    error,
  };
}

export async function GET() {
  const config = getSwitchConfig();
  if (!config) {
    return NextResponse.json(
      emptyStatus(
        "Switch is not configured. Run npm run switch:setup to connect the bridge.",
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const client = createSwitchClient(config);

  try {
    const online = await client.health();
    if (!online) {
      return NextResponse.json(
        {
          ...emptyStatus("Switch health check did not report ok."),
          configured: true,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        ...emptyStatus(publicSwitchError(error)),
        configured: true,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const [rooms, agents] = await Promise.all([
      client.listRooms(),
      client.listAgents(),
    ]);
    const room = rooms.find((item) => item.roomId === config.roomId) ?? null;
    const detail = room ? await client.getRoomDetail(config.roomId) : null;
    const memberNames = new Set(detail?.agentNames ?? []);
    const bridgeAgent = agents.find((agent) => agent.id === config.agentId);
    const fixAgent = agentStatus(agents, config.fixAgent, memberNames);
    const testAgent = agentStatus(agents, config.testAgent, memberNames);
    const missingAgents = [fixAgent, testAgent]
      .filter((agent) => !agent.present)
      .map((agent) => agent.name);
    const outsideRoom = [fixAgent, testAgent]
      .filter((agent) => agent.present && !agent.inRoom)
      .map((agent) => agent.name);
    const relevantAgents = [
      ...(bridgeAgent
        ? [
            {
              name: bridgeAgent.name,
              connectionModel: bridgeAgent.connectionModel,
              present: true,
              inRoom: memberNames.has(bridgeAgent.name),
            },
          ]
        : []),
      fixAgent,
      testAgent,
    ];
    const issues = !room
      ? ["The bridge agent is not a member of the configured Switch room."]
      : [
          ...(missingAgents.length > 0
            ? [`Switch could not find ${missingAgents.join(" or ")} on this instance.`]
            : []),
          ...(outsideRoom.length > 0
            ? [`${outsideRoom.join(" or ")} is not a member of the configured room.`]
            : []),
        ];

    return NextResponse.json(
      {
        configured: true,
        online: true,
        authorized: true,
        room: room ? { name: detail?.name || room.name } : null,
        bridgeAgent: bridgeAgent
          ? {
              name: bridgeAgent.name,
              connectionModel: bridgeAgent.connectionModel,
              present: true,
              inRoom: memberNames.has(bridgeAgent.name),
            }
          : {
              name: config.agentName,
              connectionModel: "unknown",
              present: false,
              inRoom: false,
            },
        fixAgent,
        testAgent,
        agents: relevantAgents,
        checkedAt: new Date().toISOString(),
        error: issues.length > 0 ? issues.join(" ") : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ...emptyStatus(publicSwitchError(error)),
        configured: true,
        online: true,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
