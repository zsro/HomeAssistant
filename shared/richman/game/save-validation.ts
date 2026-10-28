import type { Action } from './engine';

// This validates the persisted command vocabulary, not game legality. The engine
// still checks ownership, decisions, amounts and every transition during replay.
type Check = (value: unknown) => boolean;
export const record: Check = (v): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
export const text: Check = v => typeof v === 'string' && v.length > 0 && v.length <= 128;
export const integer: Check = v => Number.isSafeInteger(v);
const bool: Check = v => typeof v === 'boolean';
const finite: Check = v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e9;
export const oneOf = (...values: readonly unknown[]): Check => v => values.includes(v);
const nullable = (check: Check): Check => v => v === null || check(v);
export const strings: Check = v => Array.isArray(v) && v.length <= 4 && v.every(text) && new Set(v).size === v.length;
export function shape(required: Record<string, Check>, optional: Record<string, Check> = {}): Check {
  return value => {
    if (!record(value)) return false;
    const object = value as Record<string, unknown>;
    return Object.keys(object).every(key => Object.hasOwn(required, key) || Object.hasOwn(optional, key)) &&
      Object.entries(required).every(([key, check]) => Object.hasOwn(object, key) && check(object[key])) &&
      Object.entries(optional).every(([key, check]) => !Object.hasOwn(object, key) || check(object[key]));
  };
}
const target = shape({ kind: oneOf('player', 'node', 'property', 'stock', 'god', 'object'), id: text });
function union(key: string, variants: Record<string, Check>): Check {
  return value => record(value) && typeof (value as Record<string, unknown>)[key] === 'string' &&
    Object.hasOwn(variants, (value as Record<string, string>)[key]) && variants[(value as Record<string, string>)[key]](value);
}
const effect = union('type', {
  begin: shape({ type: oneOf('begin'), definitionId: text }),
  cancel: shape({ type: oneOf('cancel'), decisionId: text }),
  confirm: shape({ type: oneOf('confirm'), decisionId: text, target }, { destination: target }),
});
const mini = union('kind', {
  start: shape({ kind: oneOf('start') }), tick: shape({ kind: oneOf('tick') }),
  quit: shape({ kind: oneOf('quit') }), ack: shape({ kind: oneOf('ack') }),
  point: shape({ kind: oneOf('point'), x: finite, y: finite }),
  dig: shape({ kind: oneOf('dig'), cell: integer }),
});
const action = (type: Action['type'], fields: Record<string, Check> = {}, optional: Record<string, Check> = {}) =>
  shape({ type: oneOf(type), ...fields }, optional);
const decision = { decisionId: text };
// A new Action variant must explicitly choose its wire schema here.
const actions: Record<Action['type'], Check> = {
  surrender: action('surrender'), chooseDeath: action('chooseDeath', { ...decision, targetId: nullable(text) }),
  minigame: action('minigame', { ...decision, input: mini }),
  magicBuild: action('magicBuild', { ...decision, buildingType: integer }),
  magic: action('magic', decision, { effect: integer }), spinInsurance: action('spinInsurance', decision),
  constructCompany: action('constructCompany', { ...decision, propertyId: nullable(text) }, { buildingType: integer }),
  subscribeCompany: action('subscribeCompany', { ...decision, quantity: nullable(integer) }),
  ackCompany: action('ackCompany', decision), buyLottery: action('buyLottery', { ...decision, number: integer }),
  leaveLottery: action('leaveLottery', decision),
  loan: action('loan', { ...decision, operation: oneOf('borrow', 'repay'), amount: integer }),
  stockTrade: action('stockTrade', { stockId: text, side: oneOf('buy', 'sell'), quantity: integer }),
  research: action('research', { propertyId: text, itemId: text }),
  item: action('item', { action: effect }, { value: integer, stolenItemId: text }),
  auction: action('auction', { ...decision, increment: nullable(integer) }),
  reaction: action('reaction', { ...decision, choice: oneOf('use', 'decline') }, { targetId: text }),
  facility: action('facility', { ...decision, targetId: nullable(text) }),
  sellItem: action('sellItem', { ...decision, itemId: text }), buyItem: action('buyItem', { ...decision, itemId: text }),
  leaveShop: action('leaveShop', decision), traffic: action('traffic', { diceCount: integer }, { dismount: bool }),
  roll: action('roll'), animationDone: action('animationDone', { token: text }),
  choose: action('choose', { ...decision, node: integer }),
  property: action('property', { ...decision, accept: bool }, { buildingType: integer }),
  bank: action('bank', { ...decision, operation: oneOf('deposit', 'withdraw'), amount: integer }),
  leaveBank: action('leaveBank', decision), settleDebt: action('settleDebt', decision),
  collectFortuneCard: action('collectFortuneCard', { ...decision, itemId: nullable(text) }),
  ackFortune: action('ackFortune', decision), ackNews: action('ackNews', decision),
  endTurn: action('endTurn'), pause: action('pause', { value: bool }),
  listProperty: action('listProperty', { propertyId: text, price: integer }),
  cancelListing: action('cancelListing', { listingId: text }),
  buyListing: action('buyListing', { listingId: text, price: integer }),
};
export const validCommand = shape({
  id: text, gameId: text, expectedRevision: v => integer(v) && (v as number) >= 0,
  playerId: text, action: union('type', actions),
});
