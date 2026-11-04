import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { ApprovedFixBundle } from "@/lib/review/export";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_HANDOFF_BYTES = 6_000_000;

const fingerprintBundleSchema = z.object({
  kind: z.literal("accessforge-local-approved-fixes"),
  version: z.literal(1),
  report: z.object({
    id: z.string(),
    mode: z.enum(["remote", "demo"]),
    url: z.string(),
    scannedAt: z.string(),
  }),
  changes: z.array(
    z.object({
      proposalId: z.string(),
      ruleId: z.string(),
      selector: z.string(),
      originalHtml: z.string(),
      proposedHtml: z.string(),
    }),
  ),
});

export interface ApprovedFixFingerprintInput {
  kind: "accessforge-local-approved-fixes";
  version: 1;
  report: {
    id: string;
    mode: "remote" | "demo";
    url: string;
    scannedAt: string;
  };
  changes: Array<{
    proposalId: string;
    ruleId: string;
    selector: string;
    originalHtml: string;
    proposedHtml: string;
  }>;
}

export interface StoredHandoff {
  id: string;
  relativePath: string;
  absolutePath: string;
  directory: string;
}

export interface DuplicateHandoff {
  id: string;
  relativePath: string;
  absolutePath: string;
}

export function fingerprintApprovedFixBundle(
  bundle: ApprovedFixFingerprintInput,
) {
  const changes = [...bundle.changes]
    .map((change) => ({
      proposalId: change.proposalId,
      ruleId: change.ruleId,
      selector: change.selector,
      originalHtml: change.originalHtml,
      proposedHtml: change.proposedHtml,
    }))
    .sort(
      (left, right) =>
        left.proposalId.localeCompare(right.proposalId) ||
        left.ruleId.localeCompare(right.ruleId) ||
        left.selector.localeCompare(right.selector),
    );

  return createHash("sha256")
    .update(
      JSON.stringify({
        kind: bundle.kind,
        version: bundle.version,
        report: {
          id: bundle.report.id,
          mode: bundle.report.mode,
          url: bundle.report.url,
          scannedAt: bundle.report.scannedAt,
        },
        changes,
      }),
    )
    .digest("hex");
}

function handoffDirectory(baseDirectory = process.cwd()) {
  return path.join(baseDirectory, ".accessforge", "handoffs");
}

function isInside(directory: string, target: string) {
  const relative = path.relative(directory, target);
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
}

function isEnoent(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

export async function writeSwitchHandoff(
  bundle: ApprovedFixBundle,
  options: { baseDirectory?: string; id?: string } = {},
): Promise<StoredHandoff> {
  const directory = handoffDirectory(options.baseDirectory);
  await mkdir(directory, { recursive: true, mode: 0o700 });

  const id = options.id ?? randomUUID();
  if (!UUID.test(id)) {
    throw new Error("Handoff identifiers must be UUIDs.");
  }

  const filename = `${id}.json`;
  const absolutePath = path.resolve(directory, filename);
  if (!isInside(directory, absolutePath)) {
    throw new Error("The handoff path must stay inside the handoff directory.");
  }

  const relativePath = path.join(".accessforge", "handoffs", filename);

  await writeFile(absolutePath, `${JSON.stringify(bundle, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });

  return { id, relativePath, absolutePath, directory };
}

export async function deleteSwitchHandoff(handoff: StoredHandoff) {
  const directory = path.resolve(handoff.directory);
  const absolutePath = path.resolve(handoff.absolutePath);
  const filename = `${handoff.id}.json`;

  if (
    path.basename(absolutePath) !== filename ||
    !isInside(directory, absolutePath)
  ) {
    return false;
  }

  try {
    await unlink(absolutePath);
    return true;
  } catch {
    return false;
  }
}

export async function findDuplicateSwitchHandoff(
  fingerprint: string,
  baseDirectory = process.cwd(),
): Promise<DuplicateHandoff | null> {
  const directory = handoffDirectory(baseDirectory);
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isEnoent(error)) return null;
    throw error;
  }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;

    const absolutePath = path.resolve(directory, entry.name);
    if (!isInside(directory, absolutePath)) continue;

    const info = await stat(absolutePath).catch(() => null);
    if (!info || info.size > MAX_HANDOFF_BYTES) continue;

    const raw = await readFile(absolutePath, "utf8").catch(() => null);
    if (!raw) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }

    const result = fingerprintBundleSchema.safeParse(parsed);
    if (!result.success) continue;

    if (fingerprintApprovedFixBundle(result.data) === fingerprint) {
      return {
        id: entry.name.slice(0, -5),
        relativePath: path.join(".accessforge", "handoffs", entry.name),
        absolutePath,
      };
    }
  }

  return null;
}
