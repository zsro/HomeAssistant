import { networkPresentation } from './network-presentation';
import type { GameState, Pending } from './game/engine';
import { decisionPlayer } from './game/computer';
import type { GameHost } from './host';
import { HostError } from './host';

// All nested selections are deliberate; never serialize a GameState or raw event.
function fields(value: object | undefined | null, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}, source = value as Record<string, unknown> | null | undefined;
  for (const key of keys) if (source && source[key] !== undefined) out[key] = structuredClone(source[key]);
  return out;
}
function decision(p: Pending | null, state: GameState, self: string) {
  if (!p) return null;
  const common = { id: p.id, kind: p.kind, responderId: decisionPlayer(state) };
  // Other seats can see whose turn it is, but not a private decision's contents.
  if (common.responderId !== self) return common;
  switch (p.kind) {
    case 'roll': return common;
    case 'segment': return { ...common, from: p.from, to: p.to };
    case 'branch': return { ...common, choices: [...p.choices] };
    case 'property': case 'debt':
      return { ...common, ...fields(p, ['propertyId', 'operation', 'amount', 'recipientId', 'payerId', 'buildingChoices', 'hotelTurns']),
        lines: p.lines.map(line => fields(line, ['propertyId', 'level', 'amount'])) };
    case 'bank': return { ...common, node: p.node, arrival: p.arrival };
    case 'effect': return { ...common, ...fields(state.effects?.pending, ['definitionId', 'playerId', 'timing']) };
    case 'reaction': {
      const c = p.continuation;
      return { ...common, stage: p.stage, targets: [...p.targets], reason: c.kind,
        reactionInfo: { ...fields(c, ['kind', 'sourceId', 'originalId', 'itemId', 'originalAmount', 'name', 'amount', 'reason', 'detention', 'cursor', 'total']),
          ...('decision' in c ? { decision: fields(c.decision, ['amount', 'lines']) } : {}),
          ...('news' in c ? { news: fields(c.news, ['lines']) } : {}),
          ...('change' in c ? { change: { ...fields(c.change, ['traffic', 'final']) } } : {}) } };
    }
    case 'auction': return { ...common, ...fields(p, ['propertyId', 'sourceId', 'originalOwner', 'reserve', 'bid', 'leader', 'remaining', 'publicNews', 'disposalId', 'magicBatchId']) };
    case 'surrender': return { ...common, sourceId: p.sourceId, targets: [...p.targets] };
    case 'facility': return { ...common, facility: p.facility, node: p.node, targets: [...p.targets] };
    case 'construction': return { ...common, companyId: p.companyId, ownerId: p.ownerId,
      options: p.options.map(option => fields(option, ['id', 'title', 'detail', 'fee', 'buildingTypes'])) };
    case 'subscription': return { ...common, ...fields(p, ['companyId', 'name', 'price', 'available', 'maximum']) };
    case 'insurance': return { ...common, companyId: p.companyId, ownerId: p.ownerId };
    case 'lottery': return { ...common, node: p.node };
    case 'company': return { ...common, receipt: fields(p.receipt, ['companyId', 'payerId', 'ownerId', 'amount', 'paid', 'unpaid', 'cash', 'bank', 'free', 'bankrupt']) };
    case 'news': case 'fortune':
      return { ...common, ...fields(p, ['node', 'title', 'lines', 'fortuneId', 'newsId', 'scope']),
        ...(p.kind === 'fortune' && p.collection ? { collection: fields(p.collection, ['items', 'remaining', 'targetId', 'donors', 'cursor']) } : {}) };
    case 'magic': return { ...common, ...fields(p, ['node', 'stage', 'propertyId', 'group', 'targets', 'extended', 'nestedEnabled']),
      ...(p.receipt ? { receipt: { ...fields(p.receipt, ['node', 'group', 'targets', 'effect', 'title']), rows: p.receipt.rows.map(r => ({ playerId: r.playerId, lines: [...r.lines] })) } } : {}) };
    case 'shop': return { ...common, node: p.node,
      turnover: p.turnover, cards: p.shelf?.cards.map(item => fields(item, ['itemId', 'available'])) ?? [],
      tools: p.shelf?.tools.map(item => fields(item, ['itemId', 'available'])) ?? [] };
    case 'minigame': {
      const penguin = p.penguin;
      return { ...common, ...fields(p, ['game', 'node', 'stage', 'tick', 'remaining', 'score', 'reason', 'freeze', 'speed']),
        // Hidden treasure/traps never leave the host, even to the playing seat.
        ...(penguin ? { penguin: { ...fields(penguin, ['x', 'y', 'target', 'dug', 'step', 'dig']),
          cells: penguin.cells.map((value, i) => value < 0 ? -1 : penguin.dug.includes(i) ? 0 : null) } } : {}),
        ...(p.balloons ? { balloons: p.balloons.map(b => b ? fields(b, ['x', 'y', 'type', 'burst']) : null) } : {}),
        ...(p.sky ? { sky: { ...fields(p.sky, ['x', 'target', 'moving', 'source', 'mode', 'frame']),
          drops: p.sky.drops.map(d => d ? fields(d, ['x', 'y', 'type', 'vy', 'drift']) : null) } } : {}),
      };
    }
  }
}
export function projectGame(host: GameHost, userId: string, online: ReadonlySet<string>) {
  const self = host.seats.find(s => s.userId === userId);
  if (!self) throw new HostError('NET_NOT_MEMBER');
  const state = host.state, responderId = decisionPlayer(state);
  return {
    protocolVersion: 1, gameId: state.gameId, revision: state.revision, rulesId: state.rulesId, mapId: 'japan',
    self: self.playerId, phase: state.phase, paused: state.paused, turn: state.turn,
    activePlayerId: state.players[state.active].id, responderId,
    date: state.calendar?.date ?? null, dice: state.dice, remaining: state.remaining, completed: state.completed,
    motion: state.pending?.kind === 'segment' ? { id: state.pending.id, from: state.pending.from, to: state.pending.to } : null,
    winnerId: state.finance?.winnerId ?? null,
    players: state.players.map(p => ({ id: p.id, characterId: p.characterId, node: p.node, previous: p.previous,
      cash: state.economy?.balances[p.id].cash ?? 0, bank: state.economy?.balances[p.id].bank ?? 0, eliminated: state.finance?.eliminated.includes(p.id) ?? false,
      computer: !host.seats.find(s => s.playerId === p.id)!.userId,
      online: !!host.seats.find(s => s.playerId === p.id)!.userId && online.has(host.seats.find(s => s.playerId === p.id)!.userId!),
    })),
    properties: state.economy?.properties.map(p => ({ ...fields(p, ['id', 'ownerId', 'level', 'basePrice', 'buildingType', 'priceStatus']), ...(p.ownerId === self.playerId ? { research: p.research } : {}) })) ?? [],
    private: { inventory: structuredClone(state.effects?.inventory[self.playerId] ?? {}),
      points: state.items?.points[self.playerId] ?? 0, holdings: structuredClone(state.g6?.holdings[self.playerId] ?? {}) },
    decision: decision(state.pending, state, self.playerId),
    presentation: networkPresentation(state, self.playerId),
  };
}
export type GameProjection = ReturnType<typeof projectGame>;
