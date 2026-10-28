/** SAVE-01: archived legal commands, not a new browser acceptance run. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { GameEngine, replayGame } from '../../frontend/src/features/richman/game/engine';
import type { Action, Command, GameState } from '../../frontend/src/features/richman/game/engine';
import type { ControlledReplay } from '../../frontend/src/features/richman/game/computer';
import { decideComputer, observeResearch } from '../../frontend/src/features/richman/game/computer-research';
import type { ResearchMemory } from '../../frontend/src/features/richman/game/computer-research';
import { createSave, parseSave, restoreSave, savePoint, SAVE_LIMITS } from '../../frontend/src/features/richman/game/save';
import type { SavedControl } from '../../frontend/src/features/richman/game/save';
import type { Manifest } from '../../frontend/src/features/richman/types';
import nodes from '../../shared/richman/japan-topology.fixture.json';

export const saveManifest: Manifest = { version: 1, map: { name: '日本', nodes, width: 2304, height: 2304, scenery: [] }, sprites: {},
  characters: ['xiaomei', 'tuu', 'chyan', 'salonbus'].map(id => ({ id, name: id, color: '#fff', idle: [], walk: [], walkFramesPerDirection: 10 })) };
export const saveCases = [
  { name: 'surrender-v47-2', indices: [3] },
  { name: 'surrender-v47-4', indices: [399, 410, 431] },
  { name: 'god-closure-v47-research', indices: [176, 1871, 2297, 2298, 2442] },
  { name: 'presentation-v47-g7-changed-set', indices: [91, 101, 282, 766, 2104, 2105, 2114] },
] as const;
function execute(engine: GameEngine, memory: ResearchMemory, command: Command) {
  const before = engine.state, result = engine.dispatch(command);
  assert.ok(result.ok, `${command.id}: ${JSON.stringify(result)}`);
  return observeResearch(memory, before, command.action, engine.state, result.events);
}
export async function verifySaveCase(name: string, indices: readonly number[]) {
  const bytes = readFileSync(new URL(`../../frontend/src/features/richman/game/fixtures/${name}-replay.json`, import.meta.url));
  const replay: ControlledReplay = JSON.parse(bytes.toString());
  const engine = replayGame(nodes, { ...replay, commands: [] });
  let memory: ResearchMemory = {};
  const checkpoints: { index: number; serialized: string; state: GameState; memory: ResearchMemory; createMs: number }[] = [];
  for (const [i, command] of replay.commands.entries()) {
    memory = execute(engine, memory, command);
    if (!indices.includes(i + 1)) continue;
    const state = engine.state;
    assert.ok(savePoint(state).ok, `${name}:${i + 1} is not stable (${state.phase})`);
    // Keep the recorded human/AI seats. Use research-v1 as an explicit host
    // variant to verify non-empty observation memory on these legal histories;
    // this does NOT claim the original browser used research-v1 for every action.
    const control: SavedControl = { mode: 'surrender', computerIds: replay.control?.computerIds ?? [],
      computerPolicy: 'research-v1', commandSerial: Number(command.id.slice('command-'.length)) };
    const start = performance.now();
    const serialized = await createSave(saveManifest, engine, control, memory);
    checkpoints.push({ index: i + 1, serialized, state, memory: structuredClone(memory), createMs: performance.now() - start });
  }
  assert.equal(checkpoints.length, indices.length);
  const metrics = [];
  for (const checkpoint of checkpoints) {
    const startParse = performance.now(); parseSave(checkpoint.serialized); const parseMs = performance.now() - startParse;
    const start = performance.now(), restored = await restoreSave(saveManifest, checkpoint.serialized), restoreMs = performance.now() - start;
    assert.deepEqual(restored.engine.state, checkpoint.state);
    assert.deepEqual(restored.researchMemory, checkpoint.memory);
    assert.deepEqual(decideComputer(restored.engine.state, nodes, 'research-v1', restored.researchMemory),
      decideComputer(checkpoint.state, nodes, 'research-v1', checkpoint.memory));
    let restoredMemory = restored.researchMemory;
    for (const command of replay.commands.slice(checkpoint.index)) restoredMemory = execute(restored.engine, restoredMemory, command);
    assert.deepEqual(restored.engine.state, engine.state);
    assert.deepEqual(restored.engine.events, engine.events);
    assert.deepEqual(restoredMemory, memory);
    metrics.push({ index: checkpoint.index, phase: checkpoint.state.phase, pending: checkpoint.state.pending?.kind ?? null,
      respondingPlayer: checkpoint.state.pending && 'responderId' in checkpoint.state.pending ? checkpoint.state.pending.responderId : null,
      activePlayer: checkpoint.state.players[checkpoint.state.active].id,
      memoryPlayers: Object.keys(checkpoint.memory), bytes: Buffer.byteLength(checkpoint.serialized),
      createMs: Math.round(checkpoint.createMs), parseMs: Math.round(parseMs * 100) / 100, restoreMs: Math.round(restoreMs),
      suffixCommands: replay.commands.length - checkpoint.index, stateEventsRandomAndMemoryEqual: true });
  }
  return { name, sourceSha256: createHash('sha256').update(bytes).digest('hex'), commands: replay.commands.length,
    seats: replay.config.characterIds.length, originalPolicy: replay.control?.policy ?? null,
    testedPolicy: 'research-v1', checkpointResults: metrics };
}

/** Generated legal v47 path, deliberately not labelled a browser export. */
export async function verifyDebtSave() {
  const engine = new GameEngine(nodes, { gameId: 'save-debt', seed: 'save-debt-0', rulesId: 'japan-events-candidate-v47',
    characterIds: ['xiaomei', 'tuu', 'chyan'], initialFunds: 10000 });
  const next = (e: GameEngine) => {
    const state = e.state, pending = state.pending;
    const decision = pending && (pending.kind === 'roll' || pending.kind === 'segment')
      ? { playerId: state.players[state.active].id, action: { type: 'animationDone', token: pending.id } as Action }
      : decideComputer(state, nodes, 'basic-v1');
    assert.ok(decision, `missing legal decision: ${state.phase}`);
    if (pending?.kind === 'property' && pending.operation !== 'rent') decision.action = { type: 'property', decisionId: pending.id,
      accept: state.economy!.balances[state.players[state.active].id].cash >= pending.amount,
      ...(pending.buildingChoices ? { buildingType: 1 } : {}) };
    return { gameId: state.gameId, id: `command-${state.revision + 1}`, expectedRevision: state.revision, playerId: decision.playerId, action: decision.action };
  };
  while (engine.state.phase !== 'debt' && engine.state.revision < 2000 && engine.state.phase !== 'finished') {
    assert.ok(engine.dispatch(next(engine)).ok);
  }
  const debtState = engine.state;
  assert.equal(debtState.phase, 'debt');
  const prefix = engine.state.revision;
  const serialized = await createSave(saveManifest, engine, { mode: 'surrender', computerIds: [], computerPolicy: 'basic-v1', commandSerial: prefix }, {});
  const start = performance.now(), restored = await restoreSave(saveManifest, serialized), restoreMs = performance.now() - start;
  assert.deepEqual(restored.engine.state, engine.state);
  for (let i = 0; i < 40 && engine.state.phase !== 'finished'; i++) {
    const command = next(engine);
    assert.deepEqual(next(restored.engine), command);
    assert.deepEqual(restored.engine.dispatch(command), engine.dispatch(command));
  }
  assert.deepEqual(restored.engine.state, engine.state);
  assert.deepEqual(restored.engine.events, engine.events);
  assert.ok(engine.events.some(event => event.type === 'disposalCompleted'));
  return { source: 'generated legal v47 actions, no state injection or browser claim', seed: 'save-debt-0',
    prefixCommands: prefix, suffixCommands: engine.state.revision - prefix, bytes: Buffer.byteLength(serialized),
    restoreMs: Math.round(restoreMs), fullStateEventsRandomEqual: true };
}

async function main() {
  const results = [];
  for (const test of saveCases) { const result = await verifySaveCase(test.name, test.indices); results.push(result); console.log(test.name, result.checkpointResults); }
  const output = { recordedAt: new Date().toISOString(), node: process.version, platform: process.platform, arch: process.arch,
    scope: 'Existing browser-exported commands replayed through SAVE-01; research-v1 host variant, not new browser evidence or original AI-policy acceptance.',
    limits: SAVE_LIMITS, results, debt: await verifyDebtSave() };
  writeFileSync('docs/richman/save-01-results.json', JSON.stringify(output, null, 2) + '\n');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
