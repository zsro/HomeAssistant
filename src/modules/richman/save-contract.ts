// Transport types only. Rule execution lives in the isolated worker build.
export const SAVE_BYTES = 8 * 1024 * 1024;
export const SAVE_HTTP_BYTES = 9 * 1024 * 1024;
export const SAVE_TIMEOUT_MS = 30_000;
export const SLOT_KEYS = ['manual-1', 'manual-2', 'manual-3', 'auto'] as const;
export type SlotKey = typeof SLOT_KEYS[number];
export type SaveSummary = {
  gameId: string;
  revision: number;
  rulesId: string;
  mapId: 'japan';
  characterIds: string[];
  computerIds: string[];
  gameDate: string | null;
  turn: number;
  activePlayerId: string | null;
  paused: boolean;
  phase: string;
  stateDigest: string;
};
export type SaveWrite = { requestId: string; expectedSlotVersion: number; save: string };
export type SaveReceipt = {
  slot: SlotKey;
  slotVersion: number;
  revisionId: string;
  savedAt: string;
  bytes: number;
  summary: SaveSummary;
};
export type WorkerReply = { ok: true; summary: SaveSummary } | { ok: false; code: string; message: string };
