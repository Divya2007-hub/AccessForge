export interface SwitchStatusAgent {
  name: string;
  connectionModel: string;
  present: boolean;
  inRoom: boolean;
}

export interface SwitchStatus {
  configured: boolean;
  online: boolean;
  authorized: boolean;
  room: { name: string } | null;
  bridgeAgent: SwitchStatusAgent | null;
  fixAgent: SwitchStatusAgent | null;
  testAgent: SwitchStatusAgent | null;
  agents: SwitchStatusAgent[];
  checkedAt: string;
  error: string | null;
}

export interface SwitchHandoffResult {
  ok: true;
  eventId: string;
  handoffPath: string;
  room: { name: string };
  fixAgent: string;
  testAgent: string;
}

export interface SwitchActivityEntry {
  id: string;
  kind: string;
  sender: string;
  senderName: string;
  body: string;
  timestamp: number;
  truncated: boolean;
}

export interface SwitchActivity {
  ok: true;
  room: { name: string };
  entries: SwitchActivityEntry[];
  truncated: boolean;
}
