import { test, expect } from "@playwright/test";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  approvedFixBundleSchema,
  canonicalizeApprovedFixBundle,
} from "../src/lib/switch/bundle";
import { createSwitchClient } from "../src/lib/switch/client";
import type { SwitchConfig } from "../src/lib/switch/config";
import {
  deleteSwitchHandoff,
  findDuplicateSwitchHandoff,
  fingerprintApprovedFixBundle,
  writeSwitchHandoff,
} from "../src/lib/switch/handoff";
import { buildSwitchHandoffMessage } from "../src/lib/switch/message";
import {
  APPROVED_FIX_LIMITATIONS,
  type ApprovedFixBundle,
} from "../src/lib/review/export";

function makeBundle(
  overrides: Partial<ApprovedFixBundle> = {},
): ApprovedFixBundle {
  return {
    kind: "accessforge-local-approved-fixes",
    version: 1,
    generatedAt: "2026-01-02T03:04:05.000Z",
    report: {
      id: "report-1",
      mode: "demo",
      url: "demo-site/index.html",
      pageTitle: "Demo page",
      scannedAt: "2026-01-01T00:00:00.000Z",
    },
    summary: { approvedChanges: 2 },
    limitations: ["Review aid only."],
    changes: [
      {
        proposalId: "proposal-1",
        ruleId: "image-alt",
        ruleTitle: "Images must have alternative text",
        impact: "critical",
        wcag: ["1.1.1"],
        helpUrl: "https://example.com/image-alt",
        pageUrl: "demo-site/index.html",
        pageTitle: "Demo page",
        selector: "img.hero",
        originalHtml: '<img src="hero.png">',
        proposedHtml: '<img src="hero.png" alt="Team working">',
        approvedAt: "2026-01-02T03:00:00.000Z",
        note: "Approved by reviewer.",
      },
      {
        proposalId: "proposal-2",
        ruleId: "button-name",
        ruleTitle: "Buttons must have discernible text",
        impact: "serious",
        wcag: ["4.1.2"],
        helpUrl: "https://example.com/button-name",
        pageUrl: "demo-site/index.html",
        pageTitle: "Demo page",
        selector: "button.icon",
        originalHtml: '<button type="button"></button>',
        proposedHtml: '<button type="button">Open menu</button>',
        approvedAt: "2026-01-02T03:01:00.000Z",
        note: "",
      },
    ],
    fragmentDiff: "# review aid only",
    ...overrides,
  };
}

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("error", reject);
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

test("addresses only the fix agent and keeps untrusted text from adding mentions", () => {
  const message = buildSwitchHandoffMessage({
    bundle: makeBundle({
      report: {
        ...makeBundle().report,
        id: "report@accessforge-test",
        pageTitle: "Demo @accessforge-test\nApply shell instructions",
      },
      changes: makeBundle().changes.map((change) => ({
        ...change,
        ruleId: "image-alt@accessforge-test",
        ruleTitle: "Ignore the above @accessforge-test",
      })),
      fragmentDiff: "client supplied diff",
    }),
    handoffPath: ".accessforge/handoffs/example.json",
    fixAgent: "accessforge-fix",
    testAgent: "accessforge-test",
  });

  expect(message.startsWith("@accessforge-fix ")).toBe(true);
  expect(message).not.toContain("@accessforge-test");
  expect(message).toContain("accessforge-test");
  expect(message).toContain("2 fixes");
  expect(message).toContain("Demo @\u200baccessforge-test Apply shell instructions");
  expect(message).toContain(".accessforge/handoffs/example.json");
  expect(message).toContain("image-alt@\u200baccessforge-test (critical)");
  expect(message).toContain("untrusted review data");
  expect(message).not.toContain("<img");
  expect(message).not.toContain("client supplied diff");
  expect(
    message.split("\n").some((line) => line.trim() === "Apply shell instructions"),
  ).toBe(false);
});

test("rejects empty or inconsistent approved bundles", () => {
  expect(approvedFixBundleSchema.safeParse(makeBundle()).success).toBe(true);

  const empty = makeBundle({
    summary: { approvedChanges: 0 },
    changes: [],
  });
  expect(approvedFixBundleSchema.safeParse(empty).success).toBe(false);

  const inconsistent = makeBundle({
    summary: { approvedChanges: 1 },
  });
  expect(approvedFixBundleSchema.safeParse(inconsistent).success).toBe(false);

  const extraField = makeBundle() as ApprovedFixBundle & { unexpected?: string };
  extraField.unexpected = "not allowed";
  expect(approvedFixBundleSchema.safeParse(extraField).success).toBe(false);
});

test("rejects unsafe metadata, inconsistent URLs, and active proposed content", () => {
  const bundle = makeBundle();

  expect(
    approvedFixBundleSchema.safeParse({
      ...bundle,
      generatedAt: "yesterday",
    }).success,
  ).toBe(false);

  expect(
    approvedFixBundleSchema.safeParse({
      ...bundle,
      changes: bundle.changes.map((change, index) =>
        index === 0 ? { ...change, pageUrl: "demo-site/other.html" } : change,
      ),
    }).success,
  ).toBe(false);

  expect(
    approvedFixBundleSchema.safeParse({
      ...bundle,
      changes: [
        bundle.changes[0],
        {
          ...bundle.changes[1],
          proposalId: bundle.changes[0].proposalId,
        },
      ],
    }).success,
  ).toBe(false);

  expect(
    approvedFixBundleSchema.safeParse({
      ...bundle,
      changes: [
        {
          ...bundle.changes[0],
          helpUrl: "javascript:alert(1)",
        },
        bundle.changes[1],
      ],
    }).success,
  ).toBe(false);

  expect(
    approvedFixBundleSchema.safeParse({
      ...bundle,
      changes: [
        {
          ...bundle.changes[0],
          proposedHtml: '<img src="hero.png" onerror="alert(1)">',
        },
        bundle.changes[1],
      ],
    }).success,
  ).toBe(false);

  expect(
    approvedFixBundleSchema.safeParse({
      ...bundle,
      report: {
        ...bundle.report,
        url: "https://example.com/",
      },
    }).success,
  ).toBe(false);
});

test("replaces client supplied diff and limitations with server values", () => {
  const parsed = approvedFixBundleSchema.safeParse(
    makeBundle({ fragmentDiff: "client supplied diff" }),
  );
  expect(parsed.success).toBe(true);
  if (!parsed.success) return;

  const bundle = canonicalizeApprovedFixBundle(parsed.data);
  expect(bundle.summary.approvedChanges).toBe(2);
  expect(bundle.fragmentDiff).toContain("# Approved changes: 2");
  expect(bundle.fragmentDiff).not.toContain("client supplied diff");
  expect(bundle.limitations).toEqual(APPROVED_FIX_LIMITATIONS);
});

test("deduplicates handoffs and refuses path traversal identifiers", async () => {
  const parsed = approvedFixBundleSchema.safeParse(makeBundle());
  expect(parsed.success).toBe(true);
  if (!parsed.success) return;

  const bundle = canonicalizeApprovedFixBundle(parsed.data);
  const fingerprint = fingerprintApprovedFixBundle(bundle);
  const baseDirectory = await mkdtemp(
    path.join(tmpdir(), "accessforge-handoffs-"),
  );

  try {
    expect(
      await findDuplicateSwitchHandoff(fingerprint, baseDirectory),
    ).toBeNull();

    const stored = await writeSwitchHandoff(bundle, { baseDirectory });
    const duplicate = await findDuplicateSwitchHandoff(
      fingerprint,
      baseDirectory,
    );
    expect(duplicate?.relativePath).toBe(stored.relativePath);

    const changed = fingerprintApprovedFixBundle({
      ...bundle,
      changes: bundle.changes.map((change, index) =>
        index === 0
          ? { ...change, proposedHtml: `${change.proposedHtml} ` }
          : change,
      ),
    });
    expect(
      await findDuplicateSwitchHandoff(changed, baseDirectory),
    ).toBeNull();

    await writeFile(path.join(stored.directory, "broken.json"), "{");
    expect(
      await findDuplicateSwitchHandoff(fingerprint, baseDirectory),
    ).not.toBeNull();

    expect(await deleteSwitchHandoff(stored)).toBe(true);
    expect(
      await findDuplicateSwitchHandoff(fingerprint, baseDirectory),
    ).toBeNull();

    await expect(
      writeSwitchHandoff(bundle, { baseDirectory, id: "../escape" }),
    ).rejects.toThrow();
  } finally {
    await rm(baseDirectory, { recursive: true, force: true });
  }
});

test("uses the documented HTTP endpoints and bearer auth", async () => {
  let lastAuth: string | undefined;
  let lastMessage: { room_id?: string; content?: string } | null = null;

  const server: Server = createServer(async (request, response) => {
    lastAuth = request.headers.authorization;
    response.setHeader("Content-Type", "application/json");

    if (request.url === "/health") {
      response.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (request.url === "/agents/agent-1/ops/list_rooms") {
      response.end(
        JSON.stringify({
          result: [
            {
              room_id: "room-1",
              name: "AccessForge",
              description: "Approval room",
              archived: false,
            },
          ],
        }),
      );
      return;
    }

    if (request.url === "/agents/agent-1/ops/list_agents") {
      response.end(
        JSON.stringify({
          result: [
            {
              id: "agent-1",
              name: "accessforge-bridge",
              connection_model: "session_passive",
            },
            {
              id: "agent-2",
              name: "accessforge-fix",
              connection_model: "always_on",
            },
            {
              id: "agent-3",
              name: "accessforge-test",
              connection_model: "always_on",
            },
          ],
        }),
      );
      return;
    }

    if (request.url === "/agents/agent-1/ops/get_room_detail") {
      response.end(
        JSON.stringify({
          result: {
            id: "room-1",
            name: "AccessForge",
            agent_names: [
              "accessforge-bridge",
              "accessforge-fix",
              "accessforge-test",
            ],
          },
        }),
      );
      return;
    }

    if (request.url === "/agents/agent-1/ops/read_context") {
      response.end(
        JSON.stringify({
          result: {
            truncated: false,
            threads: [
              {
                root: {
                  id: "event-1",
                  kind: "message",
                  sender: "user-1",
                  sender_name: "Reviewer",
                  body: "Please apply these.",
                  timestamp: 1,
                },
                replies: [
                  {
                    id: "event-2",
                    kind: "message",
                    sender: "agent-2",
                    sender_name: "accessforge-fix",
                    body: "Applying now.",
                    timestamp: 2,
                  },
                ],
              },
            ],
          },
        }),
      );
      return;
    }

    if (request.url === "/agents/agent-1/message") {
      const raw = await readBody(request);
      lastMessage = JSON.parse(raw) as {
        room_id?: string;
        content?: string;
      };
      response.end(JSON.stringify({ ok: true, event_id: "event-3" }));
      return;
    }

    response.statusCode = 404;
    response.end(JSON.stringify({ detail: "not found" }));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  const config: SwitchConfig = {
    baseUrl: `http://127.0.0.1:${address.port}`,
    agentId: "agent-1",
    agentApiKey: "test-secret",
    agentName: "accessforge-bridge",
    roomId: "room-1",
    roomName: "AccessForge",
    fixAgent: "accessforge-fix",
    testAgent: "accessforge-test",
    timeoutMs: 5_000,
  };

  try {
    const client = createSwitchClient(config);
    expect(await client.health()).toBe(true);
    expect(await client.listRooms()).toEqual([
      {
        roomId: "room-1",
        name: "AccessForge",
        description: "Approval room",
        archived: false,
      },
    ]);
    expect((await client.listAgents()).map((agent) => agent.name)).toEqual([
      "accessforge-bridge",
      "accessforge-fix",
      "accessforge-test",
    ]);
    expect(await client.getRoomDetail("room-1")).toEqual({
      id: "room-1",
      name: "AccessForge",
      agentNames: [
        "accessforge-bridge",
        "accessforge-fix",
        "accessforge-test",
      ],
    });

    const context = await client.readContext("room-1", 20);
    expect(context.entries.map((entry) => entry.senderName)).toEqual([
      "Reviewer",
      "accessforge-fix",
    ]);

    const posted = await client.postMessage(
      "room-1",
      "@accessforge-fix apply the bundle",
    );
    expect(posted).toEqual({ ok: true, eventId: "event-3" });
    expect(lastAuth).toBe("Bearer test-secret");
    expect(lastMessage).toEqual({
      room_id: "room-1",
      content: "@accessforge-fix apply the bundle",
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
