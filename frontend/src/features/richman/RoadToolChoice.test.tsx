import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ItemPanel } from './ItemPanel';
import { GameSession } from './game/session';
import { ROBOT_EFFECT, ROADBLOCK_EFFECT } from './game/road-tools';
import type { Manifest } from './types';
import nodes from '../../../../shared/richman/japan-topology.fixture.json';
afterEach(cleanup);
const manifest: Manifest = { version: 1, map: { name: '日本', width: 2304, height: 2304, nodes, scenery: [] }, sprites: {},
  characters: ['a', 'b', 'c', 'd'].map(id => ({ id, name: id, color: '#fff', idle: [], walk: [], walkFramesPerDirection: 10 })) };
function fixture(definitionId: string) {
  let id = 0; const session = new GameSession(manifest, { id: () => `road-${++id}`, seed: () => 'ui' });
  session.start({ mode: 'roadTools', characterIds: ['b', 'd'], seed: 'ui' }); session.useItem({ type: 'begin', definitionId });
  const props = { snapshot: session.snapshot(), onUse: vi.fn(() => true), buy: vi.fn(() => true), leave: vi.fn(), locateRoad: vi.fn() };
  return { session, props };
}
it('requires an explicit road selection, locates it, and disables confirmation and cancellation during pause', () => {
  const { session, props } = fixture(ROADBLOCK_EFFECT); const view = render(<ItemPanel {...props} />);
  expect(screen.getByRole('button', { name: '确认放置路障' })).toBeDisabled();
  const node = session.state.roadTargets![0]; fireEvent.change(screen.getByLabelText('目标路格'), { target: { value: String(node) } });
  expect(props.locateRoad).toHaveBeenCalledWith(node);
  fireEvent.click(screen.getByRole('button', { name: '确认放置路障' }));
  expect(props.onUse).toHaveBeenCalledWith({ type: 'confirm', decisionId: session.state.effects!.pending!.id, target: { kind: 'node', id: String(node) } });
  session.pause(true); view.rerender(<ItemPanel {...props} snapshot={session.snapshot()} />);
  expect(screen.getByLabelText('目标路格')).toBeDisabled(); expect(screen.getByRole('button', { name: '取消使用' })).toBeDisabled();
});
it('previews exactly nine route nodes and confirms against the roster player identity', () => {
  const { session, props } = fixture(ROBOT_EFFECT); render(<ItemPanel {...props} />);
  expect(session.state.robotRoute).toHaveLength(9);
  expect(screen.getByLabelText('清路路线')).toHaveTextContent(session.state.robotRoute!.join(' → '));
  expect(screen.getByText(/当前路线没有障碍/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '确认清路' }));
  expect(props.onUse).toHaveBeenCalledWith({ type: 'confirm', decisionId: session.state.effects!.pending!.id, target: { kind: 'player', id: 'player-1' } });
});
it('resets inventory and world and rejects a pre-reset confirmation', () => {
  const { session } = fixture(ROADBLOCK_EFFECT); const old = session.state.effects!.pending!.id;
  session.useItem({ type: 'confirm', decisionId: old, target: { kind: 'node', id: String(session.state.roadTargets![0]) } });
  expect(session.state.roadTools!.blocks).toHaveLength(1); session.reset();
  expect(session.state.roadTools!.blocks).toEqual([]); expect(session.state.effects!.inventory['player-1']['tool:02']).toBe(1);
  session.useItem({ type: 'begin', definitionId: ROADBLOCK_EFFECT });
  expect(session.useItem({ type: 'confirm', decisionId: old, target: { kind: 'node', id: '1' } })?.ok).toBe(false);
});
it('shows both shop goods with distinct prices and forwards item IDs, including stock/points/pause gates', () => {
  const { session, props } = fixture(ROADBLOCK_EFFECT);
  const snapshot = session.snapshot(); snapshot.phase = 'shop'; snapshot.effects!.pending = null;
  snapshot.shopDecision = { kind: 'shop', id: 'shop', node: 50, companyId: 'japan:company:1' }; snapshot.items!.points['player-1'] = 20;
  const view = render(<ItemPanel {...props} snapshot={snapshot} />);
  expect(screen.getByRole('button', { name: '购买机器娃娃' })).not.toBeDisabled();
  expect(screen.getByRole('button', { name: '购买路障' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '购买机器娃娃' })); expect(props.buy).toHaveBeenCalledWith('shop', 'tool:01');
  snapshot.items!.points['player-1'] = 60; snapshot.roadTools!.supply['tool:01'] = 0;
  view.rerender(<ItemPanel {...props} snapshot={snapshot} />);
  expect(screen.getByRole('button', { name: '购买机器娃娃' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '购买路障' })); expect(props.buy).toHaveBeenCalledWith('shop', 'tool:02');
  snapshot.paused = true; view.rerender(<ItemPanel {...props} snapshot={snapshot} />);
  expect(screen.getByRole('button', { name: '购买路障' })).toBeDisabled();
});

it('counts ground hazards on robot path and excludes carried/outside hazards', () => {
  const { props } = fixture(ROBOT_EFFECT), path = props.snapshot.robotRoute!;
  props.snapshot.g5 = { supply: {}, serial: 4, landedTurn: 0, engineers: {}, hazards: [
    {id:1,itemId:'tool:03',node:path[0],carrier:null,remaining:0},
    {id:2,itemId:'tool:04',node:path[1],carrier:null,remaining:0},
    {id:3,itemId:'tool:04',node:path[2],carrier:'player-2',remaining:12},
    {id:4,itemId:'tool:03',node:999,carrier:null,remaining:0},
  ]};
  render(<ItemPanel {...props} />);
  expect(screen.getByText(/1 个地雷和 1 个未携带炸弹/)).toBeInTheDocument();
  expect(screen.queryByText(/当前路线没有障碍/)).not.toBeInTheDocument();
});
