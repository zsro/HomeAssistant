import { NEARBY_WORKER_EFFECT } from './game/nearby-construction';
import { WORKER, WORKER_EFFECT } from './game/construction';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ItemPanel } from './ItemPanel';
import { GameSession } from './game/session';
import { REMOTE_EFFECT } from './game/items';
import type { Manifest } from './types';
import nodes from './japan-topology.fixture.json';
afterEach(cleanup);
const manifest: Manifest = { version: 1, map: { name: '日本', width: 2304, height: 2304, nodes, scenery: [] }, sprites: {},
  characters: ['孙小美', '阿土伯', '钱夫人', '沙隆巴斯'].map((name, i) => ({ id: String(i), name, color: '#fff', idle: [], walk: [], walkFramesPerDirection: 10 })) };
function fixture() {
  let id = 0;
  const session = new GameSession(manifest, { id: () => `ui-${++id}`, seed: () => 'ui' }, 'tools');
  session.start({ mode: 'tools', characterIds: ['1', '3'], seed: 'ui' });
  return { session, props: { snapshot: session.snapshot(), onUse: vi.fn(() => true), buy: vi.fn(() => true), leave: vi.fn() } };
}
describe('remote dice UI and session bridge', () => {
  it('requires explicit dice selection, targets the roster player rather than character index, and disables during pause', () => {
    const { session, props } = fixture();
    session.useItem({ type: 'begin', definitionId: REMOTE_EFFECT }); props.snapshot = session.snapshot();
    const { rerender } = render(<ItemPanel {...props} />);
    expect(screen.getByRole('button', { name: '确认并出发' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText('4 点'));
    fireEvent.click(screen.getByRole('button', { name: '确认并出发' }));
    expect(props.onUse).toHaveBeenCalledWith({ type: 'confirm', decisionId: props.snapshot.effects!.pending!.id, target: { kind: 'player', id: 'player-1' } }, 4);
    props.snapshot.paused = true; rerender(<ItemPanel {...props} />);
    expect(screen.getByLabelText('4 点')).toBeDisabled();
    expect(screen.getByRole('button', { name: '取消使用' })).toBeDisabled();
    props.snapshot.paused = false; rerender(<ItemPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '取消使用' }));
    expect(props.onUse).toHaveBeenLastCalledWith({ type: 'cancel', decisionId: props.snapshot.effects!.pending!.id });
  });
  it('shows affordable shop actions with current token and blocks insufficient points, capacity, stock and pause', () => {
    const { props } = fixture();
    props.snapshot.phase = 'shop'; props.snapshot.shopDecision = { kind: 'shop', id: 'shop-1', node: 50, companyId: 'japan:company:1' };
    const { rerender } = render(<ItemPanel {...props} />);
    expect(screen.getByRole('button', { name: '购买遥控骰子' })).toBeDisabled();
    props.snapshot.items!.points['player-1'] = 60; rerender(<ItemPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '购买遥控骰子' })); expect(props.buy).toHaveBeenCalledWith('shop-1');
    for (const block of ['capacity', 'stock', 'paused']) {
      props.snapshot.effects!.inventory['player-1']['tool:08'] = block === 'capacity' ? 9 : 1;
      props.snapshot.items!.supply = block === 'stock' ? 0 : 8;
      props.snapshot.paused = block === 'paused'; rerender(<ItemPanel {...props} />);
      expect(screen.getByRole('button', { name: '购买遥控骰子' })).toBeDisabled();
    }
  });
  it('cancel and reset invalidate old decisions, restore inventories and never reuse old animations', () => {
    const { session } = fixture();
    expect(session.useItem({ type: 'begin', definitionId: REMOTE_EFFECT })?.ok).toBe(true);
    const decisionId = session.state.effects!.pending!.id;
    session.reset();
    expect(session.useItem({ type: 'confirm', decisionId, target: { kind: 'player', id: 'player-1' } }, 6)?.ok).toBe(false);
    expect(session.state.phase).toBe('idle');
    expect(session.state.effects!.inventory['player-1']['tool:08']).toBe(1);
    expect(session.exportReplay()!.commands).toEqual([]);
    session.useItem({ type: 'begin', definitionId: REMOTE_EFFECT });
    session.useItem({ type: 'confirm', decisionId: session.state.effects!.pending!.id, target: { kind: 'player', id: 'player-1' } }, 2);
    session.reset(); session.tick(1000);
    expect(session.state.phase).toBe('idle'); expect(session.state.actors[session.state.active].node).toBe(nodes[0].id);
  });  it('worker requires explicit selection, submits the property ID and freezes or cancels without a dice value', () => {
    const { props } = fixture();
    props.snapshot.phase = 'effect'; props.snapshot.actors[props.snapshot.active].node = 3;
    props.snapshot.effects!.inventory['player-1'][WORKER] = 1;
    props.snapshot.effects!.pending = { id: 'worker-choice', definitionId: WORKER_EFFECT, playerId: 'player-1', timing: 'beforeRoll' };
    const { rerender } = render(<ItemPanel {...props} />);
    expect(screen.getByRole('button', { name: '确认建造' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /大阪 · 3 号路格/ }));
    props.snapshot.paused = true; rerender(<ItemPanel {...props} />);
    expect(screen.getByRole('button', { name: '确认建造' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '取消使用' })).toBeDisabled();
    props.snapshot.paused = false; rerender(<ItemPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '确认建造' }));
    expect(props.onUse).toHaveBeenCalledWith({ type: 'confirm', decisionId: 'worker-choice', target: { kind: 'property', id: 'japan:land:19' } });
    fireEvent.click(screen.getByRole('button', { name: '取消使用' }));
    expect(props.onUse).toHaveBeenLastCalledWith({ type: 'cancel', decisionId: 'worker-choice' });
  });
  it('worker appears only when supported and explains location/capacity restrictions without offering a shop purchase', () => {
    const { props } = fixture(); const { rerender } = render(<ItemPanel {...props} />);
    expect(screen.queryByRole('button', { name: '使用机器工人' })).not.toBeInTheDocument();
    props.snapshot.effects!.inventory['player-1'][WORKER] = 1; rerender(<ItemPanel {...props} />);
    expect(screen.getByRole('button', { name: '使用机器工人' })).toBeDisabled();
    props.snapshot.actors[props.snapshot.active].node = 3; rerender(<ItemPanel {...props} />);
    expect(screen.getByRole('button', { name: '使用机器工人' })).toBeEnabled();
    props.snapshot.economy!.properties.find(p => p.id === 'japan:land:19')!.level = 5; rerender(<ItemPanel {...props} />);
    expect(screen.getByRole('button', { name: '使用机器工人' })).toBeDisabled();
    props.snapshot.phase = 'shop'; props.snapshot.shopDecision = { kind: 'shop', id: 'shop', node: 50, companyId: 'japan:company:1' }; rerender(<ItemPanel {...props} />);
    expect(screen.getByText('开局持有 1 个，不在商店出售。')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '购买机器工人' })).not.toBeInTheDocument();
  });
  it('resets a real worker selection and rejects its old token after restarting the same seed', () => {
    const ordered = [nodes[2], ...nodes.filter(n => n.id !== nodes[2].id)];
    let id = 0;
    const session = new GameSession({ ...manifest, map: { ...manifest.map, nodes: ordered } }, { id: () => `worker-${++id}`, seed: () => 'worker-ui' }, 'construction');
    expect(session.useItem({ type: 'begin', definitionId: WORKER_EFFECT })?.ok).toBe(true);
    const decisionId = session.state.effects!.pending!.id;
    session.reset();
    expect(session.useItem({ type: 'confirm', decisionId, target: { kind: 'property', id: 'japan:land:19' } })?.ok).toBe(false);
    session.useItem({ type: 'begin', definitionId: WORKER_EFFECT });
    expect(session.useItem({ type: 'confirm', decisionId: session.state.effects!.pending!.id, target: { kind: 'property', id: 'japan:land:19' } })?.ok).toBe(true);
    expect(session.state.effects!.inventory['player-1'][WORKER]).toBe(0);
    session.reset(); session.tick(1000);
    expect(session.state.effects!.inventory['player-1'][WORKER]).toBe(1);
    expect(session.state.economy!.properties.find(p => p.id === 'japan:land:19')!.level).toBe(0);
    expect(session.state.phase).toBe('idle'); expect(session.exportReplay()!.commands).toEqual([]);
  });

});

describe('nearby worker UI and authoritative session targets', () => {
  it('lists multiple distinct targets, previews explicit choice, freezes on pause and clears cancelled choice', () => {
    const { session, props } = fixture();
    session.start({ mode: 'nearby', characterIds: ['1', '3'], seed: 'nearby-ui' });
    expect(session.useItem({ type: 'begin', definitionId: NEARBY_WORKER_EFFECT })?.ok).toBe(true);
    props.snapshot = session.snapshot(); const preview = vi.fn();
    const { rerender } = render(<ItemPanel {...props} preview={preview} />);
    const radios = screen.getAllByRole('radio'); expect(radios.length).toBeGreaterThan(1);
    expect(screen.getByRole('button', { name: '确认建造' })).toBeDisabled();
    fireEvent.click(radios[1]);
    const target = props.snapshot.workerTargets![1];
    expect(preview).toHaveBeenLastCalledWith(target);
    fireEvent.click(screen.getByRole('button', { name: '定位所选地块' })); expect(preview).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: '确认建造' }));
    expect(props.onUse).toHaveBeenLastCalledWith({ type: 'confirm', decisionId: props.snapshot.effects!.pending!.id, target: { kind: 'property', id: target } });
    props.snapshot.paused = true; rerender(<ItemPanel {...props} preview={preview} />);
    expect(screen.getByRole('button', { name: '定位所选地块' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '确认建造' })).toBeDisabled();
    expect(screen.getAllByRole('radio')[1]).toBeDisabled();
    session.useItem({ type: 'cancel', decisionId: props.snapshot.effects!.pending!.id });
    session.useItem({ type: 'begin', definitionId: NEARBY_WORKER_EFFECT });
    props.snapshot = session.snapshot(); rerender(<ItemPanel {...props} preview={preview} />);
    expect(screen.getByRole('button', { name: '确认建造' })).toBeDisabled();
    expect(screen.getAllByRole('radio').every(r => !(r as HTMLInputElement).checked)).toBe(true);
  });
  it('keeps target lists stable through pause and restores inventories/candidates while rejecting pre-reset token', () => {
    const { session } = fixture();
    session.start({ mode: 'nearby', characterIds: ['3', '1'], seed: 'nearby-ui' });
    const targets = session.state.workerTargets!;
    session.useItem({ type: 'begin', definitionId: NEARBY_WORKER_EFFECT });
    const old = session.state.effects!.pending!.id;
    session.useItem({ type: 'confirm', decisionId: old, target: { kind: 'property', id: targets[0] } });
    expect(session.state.effects!.inventory['player-1'][WORKER]).toBe(0);
    session.reset(); session.tick(1000);
    expect(session.state.workerTargets).toEqual(targets);
    expect(session.state.effects!.inventory['player-1'][WORKER]).toBe(1);
    session.useItem({ type: 'begin', definitionId: NEARBY_WORKER_EFFECT });
    expect(session.useItem({ type: 'confirm', decisionId: old, target: { kind: 'property', id: targets[0] } })?.ok).toBe(false);
    session.pause(true); expect(session.state.workerTargets).toEqual(targets);
    session.pause(false); expect(session.state.workerTargets).toEqual(targets);
    expect(session.state.economy!.properties.every(p => p.level === 0)).toBe(true);
  });
});

it('syncs a map selection with the list and only confirms a matching decision token', () => {
  const { session, props } = fixture();
  session.start({ mode: 'nearby', characterIds: ['1', '3'], seed: 'picking-ui' });
  session.useItem({ type: 'begin', definitionId: NEARBY_WORKER_EFFECT });
  props.snapshot = session.snapshot(); const select = vi.fn();
  const target = props.snapshot.workerTargets![1], decisionId = props.snapshot.effects!.pending!.id;
  const { rerender } = render(<ItemPanel {...props} select={select} selection={null} />);
  fireEvent.click(screen.getAllByRole('radio')[0]);
  expect(select).toHaveBeenCalledWith(props.snapshot.workerTargets![0]);
  expect(props.onUse).not.toHaveBeenCalled();
  rerender(<ItemPanel {...props} select={select} selection={{ propertyId: target, decisionId }} />);
  expect(screen.getAllByRole('radio')[1]).toBeChecked();
  expect(screen.getByRole('status')).toHaveTextContent('已选择');
  expect(props.onUse).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '确认建造' }));
  expect(props.onUse).toHaveBeenCalledWith({ type: 'confirm', decisionId, target: { kind: 'property', id: target } });
  rerender(<ItemPanel {...props} select={select} selection={{ propertyId: target, decisionId: 'old-token' }} />);
  expect(screen.getByRole('button', { name: '确认建造' })).toBeDisabled();
  expect(screen.getAllByRole('radio').every(r => !(r as HTMLInputElement).checked)).toBe(true);
});

it.each(['events','news','propertyNews','operatingNews','statusNews'] as const)('%s keeps the inherited nearby worker enabled at non-property start and dispatches its correct effect',mode=>{
 const session=new GameSession(manifest,undefined,mode);
 const snapshot=session.snapshot(),onUse=vi.fn(action=>session.useItem(action)?.ok??false);
 expect(snapshot.workerTargets!.length).toBeGreaterThan(0);
 render(<ItemPanel snapshot={snapshot} onUse={onUse} buy={()=>false} leave={()=>undefined}/>);
 const use=screen.getByRole('button',{name:'使用机器工人'});expect(use).toBeEnabled();fireEvent.click(use);
 expect(onUse).toHaveBeenCalledWith({type:'begin',definitionId:NEARBY_WORKER_EFFECT});
 expect(session.snapshot().effects!.pending!.definitionId).toBe(NEARBY_WORKER_EFFECT);
});

for (const mode of ['commerce', 'stockCircuit'] as const) it(`${mode} keeps the nearby worker entry and effect instead of falling back to the legacy current tile`, () => {
  const {session, props} = fixture();
  session.start({mode, characterIds: ['1', '3'], seed: 'worker-inherited'});
  const snapshot = session.snapshot();
  expect(snapshot.workerTargets!.length).toBeGreaterThan(1);
  render(<ItemPanel {...props} snapshot={snapshot} />);
  expect(screen.getByText(/邻近建造候选版/)).toBeInTheDocument();
  const button = screen.getByRole('button', {name: '使用机器工人'});
  expect(button).toBeEnabled(); fireEvent.click(button);
  expect(props.onUse).toHaveBeenLastCalledWith({type: 'begin', definitionId: NEARBY_WORKER_EFFECT});
});
