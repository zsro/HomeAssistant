import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import nodes from './japan-topology.fixture.json';
import type { Manifest } from './types';
import { GameSession } from './game/session';
import { ClassicGo } from './ClassicGo';
import { ClassicDice } from './ClassicDice';
import { ClassicPlayerPanel } from './ClassicPlayerPanel';
import { ClassicAuxiliary } from './ClassicAuxiliary';
import { calendarMonth, playerRows, seatId, turnControls } from './classic-presentation';
import { PROPERTY_CATALOG } from './game/economy';

const manifest: Manifest = { version: 1, map: { name: '日本', width: 2304, height: 2304, nodes, scenery: [] }, sprites: {},
  characters: ['xiaomei', 'tuu', 'chyan', 'salonbus'].map(id => ({ id, name: id, color: '#fff', idle: [], walk: [], walkFramesPerDirection: 10 })) };
function fixture() {
  const session = new GameSession(manifest, { id: () => 'ui02', seed: () => 'ui02' });
  // Deliberately reordered seats: asset ownership uses seat IDs, never the character index.
  session.start({ mode: 'surrender', seed: 'ui02', characterIds: ['chyan', 'xiaomei', 'salonbus'], startDate: '2000-02-29' });
  return session.snapshot();
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('maps reordered character seats and displays current balances, points, loans and constructed assets without mutation', () => {
  const s = fixture(), id = seatId(s);
  expect(id).toBe('player-1'); expect(s.active).toBe(2);
  s.economy!.balances[id] = { cash: 123, bank: 456 }; s.news!.business!.loans[id] = 25; s.items!.points[id] = 37;
  const property = s.economy!.properties[0], def = PROPERTY_CATALOG.properties.find(d => d.id === property.id)!;
  property.ownerId = id; property.level = 5; property.buildingType = 4;
  const before = structuredClone(s), rows = playerRows(s, id);
  expect(rows[0]).toEqual([['现金', '123'], ['存款', '456'], ['净资产估值', (123 + 456 - 25 + def.basePrice + def.upgradeCost).toLocaleString('zh-CN')]]);
  expect(rows[3].slice(0, 2)).toEqual([['点数', '37'], ['贷款', '25']]);
  expect(s).toEqual(before);
  render(<ClassicPlayerPanel manifest={manifest} snapshot={s} />);
  expect(screen.getByText('chyan')).toBeTruthy();
  fireEvent.click(screen.getByRole('tab', { name: '其他' }));
  expect(screen.getByText('37')).toBeTruthy(); expect(screen.getByText('暂未接入')).toBeTruthy();
  expect(s).toEqual(before);
});
it('keeps the active portrait while showing another player responding', () => {
  const s = fixture();
  s.decision = { kind: 'property', id: 'payment', operation: 'rent', propertyId: 'japan:land:1', amount: 100, recipientId: 'player-1', payerId: 'player-3', lines: [] };
  render(<ClassicPlayerPanel manifest={manifest} snapshot={s} />);
  expect(screen.getByText('chyan')).toBeTruthy(); expect(screen.getAllByText('应答：salonbus').length).toBeGreaterThan(0);
});
it('renders each actual die and a separate total, and clears previous faces at a new turn', () => {
  const s = fixture(); s.phase = 'moving'; s.dice = 15; s.g2!.lastDice = [6, 4, 5];
  const view = render(<ClassicDice snapshot={s} />);
  const region = screen.getByLabelText('本次掷骰结果');
  expect(region.querySelectorAll('img')).toHaveLength(3);
  expect(screen.getByText('总步数 15')).toBeTruthy(); expect(region.querySelector('img[src*="dice-15"]')).toBeNull();
  view.rerender(<ClassicDice snapshot={{ ...s, phase: 'rolling' }} />);
  expect(screen.getByText('掷骰中…')).toBeTruthy(); expect(region.querySelectorAll('img')).toHaveLength(0);
  view.rerender(<ClassicDice snapshot={{ ...s, phase: 'idle' }} />);
  expect(screen.getByText('尚未掷骰')).toBeTruthy(); expect(region.querySelectorAll('img')).toHaveLength(0);
  s.phase = 'turnEnd'; s.g2!.lastDice = [];
  view.rerender(<ClassicDice snapshot={s} />);
  expect(screen.getByText('本回合未掷骰')).toBeTruthy();
});
it('selects one to three dice via existing traffic callback without rolling', () => {
  const s = fixture(); s.g2!.players['player-1'].vehicle = 'tool:06'; s.g2!.players['player-1'].diceCount = 3;
  const go = vi.fn(), dice = vi.fn();
  render(<ClassicGo snapshot={s} ready onGo={go} onDiceCount={dice} />);
  expect(screen.getByRole('button', { name: '使用 3 颗骰子' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: '使用 2 颗骰子' })); expect(dice).toHaveBeenCalledWith(2); expect(go).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'GO：掷骰出发' })); expect(go).toHaveBeenCalledOnce();
});
it.each(['paused', 'computer', 'rolling', 'effect'] as const)('locks commands during %s', condition => {
  const s = fixture();
  if (condition === 'paused') s.paused = true;
  else if (condition === 'computer') s.computer = { ids: ['chyan'], playerId: 'player-1', automatic: true, reason: '', error: null, lastReason: null };
  else s.phase = condition;
  expect(turnControls(s, true).go).toBe(false); expect(turnControls(s, true).select).toBe(false);
});
it('supports stop, turtle, dream and skipped turns without treating stop artwork as a disabled turn', () => {
  const s = fixture(), m = s.g2!.players['player-1'];
  m.stop = 1; expect(turnControls(s, true)).toMatchObject({ go: true, frame: 2 });
  m.stop = 0; m.turtle = 2; expect(turnControls(s, true)).toMatchObject({ go: true, frame: 4 });
  m.turtle = 0; m.dream = 3; expect(turnControls(s, true)).toMatchObject({ go: true, select: false });
  m.prison = 3; expect(turnControls(s, true).go).toBe(false);
  s.phase = 'turnEnd'; expect(turnControls(s, true)).toMatchObject({ go: true, select: false });
  expect(turnControls(s, false).go).toBe(false);
});
it('hides GO during map decisions and confines keyboard dragging to map bounds', () => {
  const s = fixture(), props = { snapshot: s, ready: true, onGo: vi.fn(), onDiceCount: vi.fn() };
  const view = render(<ClassicGo {...props} />), handle = screen.getByRole('button', { name: /移动 GO/ });
  for (let i = 0; i < 90; i++) fireEvent.keyDown(handle, { key: 'ArrowLeft' });
  expect(view.container.firstElementChild?.getAttribute('style')).toContain('left: 0px');
  view.rerender(<ClassicGo {...props} snapshot={{ ...s, phase: 'effect' }} />);
  expect(screen.queryByRole('button', { name: /GO：/ })).toBeNull();
});
it('renders leap-day calendar and switches auxiliary views without touching the snapshot', () => {
  const s = fixture(), before = structuredClone(s), onView = vi.fn();
  render(<ClassicAuxiliary manifest={manifest} snapshot={s} view="calendar" onView={onView} onPan={vi.fn()} />);
  expect(calendarMonth('2000-02-29')).toEqual({ today: 29, first: 2, days: 29, season: 3 });
  expect(screen.getByLabelText('2000-02 月历').querySelector('[aria-current="date"]')?.textContent).toBe('29');
  fireEvent.click(within(screen.getByRole('group', { name: '辅助视图' })).getByRole('button', { name: '小地图' }));
  expect(onView).toHaveBeenCalledWith('map'); expect(s).toEqual(before);
});
it('minimap pointer and keyboard only request a camera position', () => {
  const s = fixture(), before = structuredClone(s), pan = vi.fn();
  render(<ClassicAuxiliary manifest={manifest} snapshot={s} view="map" onView={vi.fn()} onPan={pan} camera={{ x: 1000, y: 900, width: 440, height: 440 }} />);
  const map = screen.getByRole('button', { name: /小地图定位/ });
  vi.spyOn(map, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 156, height: 156 } as DOMRect);
  vi.stubGlobal('PointerEvent', MouseEvent);
  fireEvent.pointerDown(map, { button: 0, clientX: 88, clientY: 98 }); expect(pan).toHaveBeenLastCalledWith(1152, 1152);
  fireEvent.keyDown(map, { key: 'ArrowRight' }); expect(pan).toHaveBeenLastCalledWith(1120, 900);
  expect(s).toEqual(before);
});

it('draws one-way special links even when their destination has a lower node ID', () => {
  const s = fixture(), specialMap = { ...manifest, map: { ...manifest.map, nodes: [
    { id: 1, x: 10, y: 10, adjacent: [], kind: 0, name: '道路' },
    { id: 2, x: 20, y: 20, adjacent: [1], kind: 8002, name: '监狱' },
  ] } };
  render(<ClassicAuxiliary manifest={specialMap} snapshot={s} view="map" onView={vi.fn()} onPan={vi.fn()} />);
  expect(screen.getByRole('button', { name: /小地图定位/ }).querySelector('path')?.getAttribute('d')).toBe('M20 20L10 10');
});
