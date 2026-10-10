import type {ShopShelf} from './shop-acquisition';
import type {SaleReceipt} from './site-services';
import { createEffectRegistry } from './effects';
import type { MapNode } from '../types';
import sites from './japan-item-nodes.json';
import { hashSeed } from './random';

export const REMOTE_DICE = 'tool:08';
export const REMOTE_EFFECT = 'tool:08:select-dice-v1';
export const ITEM_RULES = Object.freeze({ id: 'japan-tools-candidate-v1', handlerVersion: 1,
  price: 30, supply: 10, capacity: 9, initialPerPlayer: 1, initialPoints: 0,
  controlledDiceRandom: 'no-draw', scope: 'walking-single-die-only', evidence: 'R07-cross-version-candidate' });
export const ITEM_EFFECTS = createEffectRegistry([{ id: REMOTE_EFFECT, itemId: REMOTE_DICE,
  operation: 'controlled-roll', target: 'self', consume: 1, timings: ['beforeRoll'], status: null }]);
export const ITEM_FINGERPRINT = hashSeed(JSON.stringify({ rules: ITEM_RULES, sites, effects: ITEM_EFFECTS.fingerprint })).toString(16);
export type ItemsState = { fingerprint: string; points: Record<string, number>; supply: number };
export type ShopDecision = { kind: 'shop'; id: string; node: number; companyId: 'japan:company:1'; shelf?:ShopShelf; turnover?:number; sales?:SaleReceipt[] };
export function itemSite(node: MapNode) { return sites.nodes.find(s => s.id === node.id && s.kind === node.kind); }
