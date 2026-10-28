import { parentPort, workerData } from 'node:worker_threads';
import { SERVER_MANIFEST } from '../shared/richman/content';
import { restoreSave, SaveError } from '../shared/richman/game/save';
import type { WorkerReply } from '../src/modules/richman/save-contract';

// Trusted server content; artwork is unnecessary for deterministic restoration.

async function main(): Promise<WorkerReply> {
  try {
    const { engine, control } = await restoreSave(SERVER_MANIFEST, workerData as string);
    const state = engine.state;
    const envelope = JSON.parse(workerData as string) as { stateDigest: string; replay: { config: { characterIds: string[] } } };
    return { ok: true, summary: {
      gameId: state.gameId, revision: state.revision, rulesId: state.rulesId, mapId: 'japan',
      characterIds: envelope.replay.config.characterIds, phase: state.phase, stateDigest: envelope.stateDigest,
      computerIds: control.computerIds, gameDate: state.calendar?.date ?? null, turn: state.turn,
      activePlayerId: state.players[state.active]?.id ?? null, paused: state.paused,
    } };
  } catch (error) {
    if (error instanceof SaveError) return { ok: false, code: error.code, message: error.message };
    return { ok: false, code: 'invalid-save', message: '存档无法恢复' };
  }
}
void main().then(result => parentPort?.postMessage(result));
