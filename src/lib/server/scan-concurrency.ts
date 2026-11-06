import { ScanError } from "../scanner/types";
import {
  getMaxConcurrentScans,
  getMaxConcurrentScansPerClient,
  type ServerEnv,
} from "./limits";

const activeScansByClient = new Map<string, number>();
let activeScans = 0;

function normalizeClientId(clientId: string): string {
  const trimmed = clientId.trim();
  return trimmed ? trimmed.slice(0, 128) : "unknown";
}

export function acquireScanSlot(
  clientId: string,
  env: ServerEnv = process.env,
): void {
  const clientKey = normalizeClientId(clientId);
  const clientActive = activeScansByClient.get(clientKey) ?? 0;

  if (clientActive >= getMaxConcurrentScansPerClient(env)) {
    throw new ScanError(
      "BUSY",
      "You already have a scan running. Wait for it to finish and try again.",
      503,
      5,
    );
  }

  if (activeScans >= getMaxConcurrentScans(env)) {
    throw new ScanError(
      "BUSY",
      "The scanner is handling other audits right now. Please try again in a moment.",
      503,
      5,
    );
  }

  activeScans += 1;
  activeScansByClient.set(clientKey, clientActive + 1);
}

export function releaseScanSlot(clientId: string): void {
  const clientKey = normalizeClientId(clientId);
  const clientActive = activeScansByClient.get(clientKey) ?? 0;

  activeScans = Math.max(0, activeScans - 1);
  if (clientActive <= 1) {
    activeScansByClient.delete(clientKey);
    return;
  }

  activeScansByClient.set(clientKey, clientActive - 1);
}
