// @vitest-environment node
import { expect, it } from 'vitest';
import { saveCases, verifySaveCase, verifyDebtSave } from '../../../../../scripts/richman/verify-save-contract';
for (const test of saveCases) it(`SAVE-01 archived ${test.name}: full state, events, RNG, memory and suffix`, async () => {
  const result = await verifySaveCase(test.name, test.indices);
  expect(result.checkpointResults).toHaveLength(test.indices.length);
  expect(result.checkpointResults.every(check => check.stateEventsRandomAndMemoryEqual)).toBe(true);
  if (test.name === 'god-closure-v47-research') expect(result.checkpointResults.some(check => check.memoryPlayers.length > 0)).toBe(true);
}, 120000);

it('SAVE-01 generated legal v47 insolvency: resume debt, disposal and subsequent actions', async () => {
  const result = await verifyDebtSave();
  expect(result.fullStateEventsRandomEqual).toBe(true);
  expect(result.prefixCommands).toBe(1398);
  expect(result.suffixCommands).toBeGreaterThan(0);
}, 60000);
