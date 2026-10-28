import type { GameProjection } from '../../../../../shared/richman/projection';
import type { SessionSnapshot } from '../game/session';
import type { Manifest } from '../types';
import { PROPERTY_CATALOG } from '../game/economy';
import { directionFor } from '../traversal';
export type NetworkView = GameProjection & { canControl: boolean; hostError: string | null;
  recovery?: { id: string; resolution: 'committed' | 'missing' | 'conflict' | null; receipt: { revision: number } | null } | null };
export type NetworkStatus = { sending?: boolean; connected: boolean; pending: boolean; message: string; readOnly: boolean };
/** Rendering adapter only. Defaults describe unavailable display fields, never an executable GameState. */
export function networkSnapshot(v: NetworkView, manifest: Manifest, status: NetworkStatus): SessionSnapshot {
  const p = v.presentation, participants = v.players.map(player => manifest.characters.findIndex(c => c.id === player.characterId));
  const active = participants[v.players.findIndex(player => player.id === v.activePlayerId)];
  const actors = manifest.characters.map(c => {
    const player = v.players.find(player => player.characterId === c.id), node = manifest.map.nodes.find(n => n.id === player?.node) ?? manifest.map.nodes[0];
    const previous = manifest.map.nodes.find(n => n.id === player?.previous);
    const mobility = player && p.mobility[player.id], location = mobility && (mobility.prison ? '監獄' : mobility.hospital ? '醫院' : null);
    const facility = location && manifest.map.scenery.find(s => s.name === location);
    return { node: node.id, previous: player?.previous ?? null, x: facility ? facility.x : node.x, y: facility ? facility.y : node.y,
      direction: player && p.facing[player.id] !== undefined ? p.facing[player.id] : previous ? directionFor(node.x - previous.x, node.y - previous.y) : 4 };
  });
  const d = v.decision?.responderId === v.self ? v.decision : null;
  const decision = (kind: string) => d?.kind === kind ? d : null;
  const waiting = v.responderId !== v.self, responder = v.players.find(player => player.id === v.responderId)!;
  const name = manifest.characters.find(c => c.id === responder.characterId)!.name;
  const message = status.message || (v.phase === 'finished' ? '本局已结束' : waiting ? `等待${name}${responder.computer ? '（电脑）' : responder.online ? '' : '重新连接'}应答` : '轮到你操作；每次操作经服务器确认后生效');
  const supplies = p.supplies;
  // Fields below are the established UI contract. Hidden domain fields are deliberately absent.
  const view = {
    network: { ...status, self: v.self, responderId: v.responderId, waiting, gameId: v.gameId },
    actors, active, participants, mode: 'surrender', seed: '', phase: v.phase, paused: v.paused,
    dice: v.dice, remaining: v.remaining, completed: v.completed, turn: v.turn, round: p.round, revision: v.revision,
    message, nextName: '', recentEvents: [], choices: d?.kind === 'branch' && 'choices' in d ? d.choices : [],
    eliminated: v.players.filter(player => player.eliminated).map(player => manifest.characters.findIndex(c => c.id === player.characterId)),
    economy: { balances: Object.fromEntries(v.players.map(player => [player.id, { cash: player.cash, bank: player.bank }])), properties: v.properties },
    finance: { eliminated: v.players.filter(player => player.eliminated).map(player => player.id), winnerId: v.winnerId, round: p.round, sales: p.sales },
    items: { points: p.points, supply: supplies?.item ?? 0 },
    effects: { inventory: p.inventory, pending: p.effect, active: [] },
    g1: { supply: supplies?.g1 ?? {}, facing: p.facing },
    g2: { supply: supplies?.g2 ?? {}, players: p.mobility, lastDice: p.lastDice },
    g3: { supply: supplies?.g3 ?? {}, slots: p.slots, allies: p.allies },
    g4: { supply: supplies?.g4 ?? {}, hotel: p.hotel },
    g5: { supply: supplies?.g5 ?? {}, hazards: p.hazards, engineers: p.engineers },
    g6: { supply: supplies?.g6 ?? {}, gods: p.gods, objects: p.objects, stocks: p.stocks, holdings: p.holdings, market: { last: null } },
    g7: { checkpoint: p.timeAnchor }, wealth: { supply: supplies?.wealth ?? 0 }, cards: { supply: supplies?.card ?? 0 },
    roadTools: { blocks: p.blocks, supply: supplies?.road ?? {} },
    g1Choices: p.g1Choices, g2Choices: p.g2Choices, g3Choices: p.g3Choices, g4Choices: p.g4Choices, g5Choices: p.g5Choices, g6Choices: p.g6Choices, g7Choices: p.g7Choices,
    workerTargets: p.workerTargets, robotRoute: p.robotRoute, roadTargets: p.roadTargets,
    cardTargets: p.cardTargets.map(t => ({ ...t, name: manifest.characters.find(c => c.id === t.characterId)!.name })),
    wealthPlayers: v.players.filter(player => !player.eliminated).map(player => ({ id: player.id, name: manifest.characters.find(c => c.id === player.characterId)!.name, cash: player.cash })),
    calendar: p.calendar, lottery: p.lottery,
    news: { publicFund: p.publicFund, business: { companies: p.companies, loans: p.loans, noLoans: p.noLoans, halted: p.halted, marketClosed: p.marketClosed, bankRejected: p.bankRejected, insurance: p.insurance } },
    canTrade: p.canTrade, salesAvailable: p.salesAvailable, canSurrender: p.canSurrender, loanLimit: p.loanLimit, researchChoices: p.researchChoices, shopSales: p.shopSales,
    decision: decision('property'), bankDecision: decision('bank'), debtDecision: decision('debt'), auction: decision('auction'), surrenderDecision: decision('surrender'),
    reaction: d?.kind === 'reaction' && 'reactionInfo' in d ? { ...d, continuation: d.reactionInfo } : null,
    shopDecision: d?.kind === 'shop' && 'cards' in d && 'tools' in d ? { ...d, shelf: { cards: d.cards, tools: d.tools } } : null,
    fortuneDecision: decision('fortune'), newsDecision: decision('news'), facilityDecision: d?.kind === 'facility' ? { ...d, helped: [] } : null,
    insuranceDecision: decision('insurance'), commerceDecision: decision('construction') ?? decision('subscription'), companyDecision: decision('company'), lotteryDecision: decision('lottery'),
    minigame: decision('minigame'), magicDecision: decision('magic'),
    currentPropertyId: PROPERTY_CATALOG.properties.find(prop => prop.nodeIds.includes(actors[active].node))?.id ?? null,
  };
  return view as unknown as SessionSnapshot;
}
