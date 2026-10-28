import { readFileSync } from 'node:fs';
import path from 'node:path';
import { GameEngine } from '../../shared/richman/game/engine';
import type { Replay, GameState } from '../../shared/richman/game/engine';
import { SERVER_MANIFEST } from '../../shared/richman/content';
import { GameHost } from '../../shared/richman/host';
import type { Seat } from '../../shared/richman/host';
import { observeResearch } from '../../shared/richman/game/computer-research';
import type { ResearchMemory } from '../../shared/richman/game/computer-research';

/** Only legal recorded command prefixes; no fabricated world or RNG state. */
export function fixtureHost(name: string, stop: (state: GameState, index: number) => boolean, gameId?: string) {
  let serialized = readFileSync(path.resolve(`frontend/src/features/richman/game/fixtures/${name}-replay.json`), 'utf8');
  const original = JSON.parse(serialized) as Replay;
  if (gameId) serialized = serialized.replaceAll(original.config.gameId, gameId);
  const replay = JSON.parse(serialized) as Replay;
  const engine = new GameEngine(SERVER_MANIFEST.map.nodes, replay.config);
  let researchMemory: ResearchMemory = {};
  const trackResearch = (replay.config.humanIds?.length ?? 0) < replay.config.characterIds.length;
  for (let i = 0; i <= replay.commands.length; i++) {
    if (stop(engine.state, i)) {
      const seats: Seat[] = replay.config.characterIds.map((characterId, n) => ({
        playerId: `player-${n + 1}`, userId: replay.config.humanIds?.includes(`player-${n + 1}`) ? `user-${n + 1}` : null,
        characterId, policy: replay.config.humanIds?.includes(`player-${n + 1}`) ? null : 'research-v1',
      }));
      return { host: GameHost.restore({ hostVersion: 1, engine: engine.checkpoint(), seats,
        researchMemory, clock: { key: '', elapsed: 0 } }), replay, index: i };
    }
    const command = replay.commands[i];
    if (!command) break;
    const before = trackResearch ? engine.state : null, result = engine.dispatch(command);
    if (!result.ok) throw new Error(`invalid fixture command ${i}: ${result.reason}`);
    if (before) researchMemory = observeResearch(researchMemory, before, command.action, engine.state, result.events);
  }
  throw new Error(`fixture target not found: ${name}`);
}
