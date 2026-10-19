import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ItemPanel } from './ItemPanel';
import { LotteryPanel } from './LotteryPanel';
import { ResearchPanel } from './G5Panel';
import { G6Panel } from './G6Panel';
import { ClassicStockHistory } from './ClassicBusinessArt';
import { GameSession } from './game/session';
import type { Manifest } from './types';
import nodes from './japan-topology.fixture.json';
const manifest: Manifest = { version: 1, map: { name: '日本', width: 2304, height: 2304, nodes, scenery: [] }, sprites: {}, characters: ['a', 'b'].map(id => ({ id, name: id, color: '#fff', idle: [], walk: [], walkFramesPerDirection: 10 })) };
afterEach(cleanup);
function snapshot() { const s = new GameSession(manifest, { id: () => 'ui05', seed: () => 'ui05' }, 'surrender'); s.start({ mode: 'surrender', seed: 'ui05', characterIds: ['a', 'b'], startDate: '1998-01-07' }); return s.snapshot(); }
it('toolbar category separates cards and tools without consuming inventory; owned filter preserves quantities and card slots', () => {
  const s = snapshot(), onUse = vi.fn(), onInventoryView = vi.fn();
  s.effects!.inventory['player-1']['card:01'] = 2; s.g3!.slots['player-1'] = ['card:01', 'card:01'];
  const props = { snapshot: s, onUse, buy: vi.fn(), leave: vi.fn(), onInventoryView };
  const v = render(<ItemPanel {...props} inventoryView="tools" />);
  expect(screen.getByRole('button', { name: '使用遥控骰子' })).toBeVisible();
  expect(screen.queryByRole('button', { name: '使用均富卡' })).toBeNull();
  fireEvent.click(within(screen.getByRole('group', { name: '物品分类' })).getByRole('button', { name: '卡片' }));
  expect(onInventoryView).toHaveBeenCalledWith('cards'); expect(onUse).not.toHaveBeenCalled();
  v.rerender(<ItemPanel {...props} inventoryView="cards" />);
  expect(screen.getByRole('button', { name: '使用均富卡' })).toBeVisible();
  expect(screen.queryByRole('button', { name: '使用遥控骰子' })).toBeNull();
  expect(within(screen.getByRole('group', { name: '卡包槽位' })).getAllByRole('button', { name: '查看均富卡' })).toHaveLength(2);
  fireEvent.click(screen.getByLabelText('只看已持有'));
  expect(screen.queryByRole('button', { name: '使用均贫卡' })).toBeNull();
  expect(screen.getByRole('button', { name: '使用均富卡' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '使用均富卡' })); expect(screen.getByRole('alert')).toBeVisible();
});
it('lottery board changes the draft only; sold tickets and paused purchases cannot be selected', () => {
  const s = snapshot(), buy = vi.fn(); s.lotteryDecision = { kind: 'lottery', id: 'ticket', node: 88 }; s.lottery!.tickets[0] = 'player-2';
  const props = { snapshot: s, buy, leave: vi.fn() }, v = render(<LotteryPanel {...props} />);
  const board = screen.getByRole('group', { name: '彩票号码板' });
  expect(within(board).getByRole('button', { name: '1号，玩家2已购' })).toBeDisabled();
  fireEvent.click(within(board).getByRole('button', { name: '36号' }));
  expect(buy).not.toHaveBeenCalled(); expect(screen.getByLabelText('彩票号码')).toHaveValue('36');
  fireEvent.click(screen.getByRole('button', { name: '确认购彩' })); expect(buy).toHaveBeenCalledExactlyOnceWith('ticket', 36);
  s.paused = true; v.rerender(<LotteryPanel {...props} />);
  for (const button of within(board).getAllByRole('button')) expect(button).toBeDisabled();
});
it('selecting a market row clears the old quantity and updates the real trade target', () => {
  const s = snapshot(), trade = vi.fn(() => true); render(<G6Panel snapshot={s} trade={trade} />);
  fireEvent.change(screen.getByLabelText(/^股数/), { target: { value: '2' } });
  const rowButtons = screen.getAllByRole('button', { name: /^选择/ }); fireEvent.click(rowButtons[1]);
  expect(screen.getByLabelText(/^股数/)).toHaveValue(''); expect(trade).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText(/^股数/), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: '确认买入' })); expect(trade).toHaveBeenCalledWith(s.g6!.stocks[1].id, 'buy', 1);
});
it('empty and flat stock history remain finite and accessible', () => {
  const v = render(<ClassicStockHistory values={[]} />); expect(screen.getByRole('img')).toHaveAccessibleName('暂无价格记录');
  expect(v.container.innerHTML).not.toMatch(/Infinity|NaN/); v.rerender(<ClassicStockHistory values={[100, 100]} />);
  expect(v.container.innerHTML).not.toMatch(/Infinity|NaN/); expect(screen.getByRole('img')).toHaveAccessibleName('价格（元）：1.00，1.00');
});

it('research tile selects a project without starting it; confirmation respects pause', () => {
  const s = snapshot(), start = vi.fn(() => true);
  s.researchChoices = [{ propertyId: 'p', itemId: 'tool:09', title: '研究所 · 机器工人' }];
  const v = render(<ResearchPanel snapshot={s} start={start} />);
  fireEvent.click(screen.getByRole('button', { name: '研究所 · 机器工人' })); expect(start).not.toHaveBeenCalled();
  s.paused = true; v.rerender(<ResearchPanel snapshot={s} start={start} />);
  expect(screen.getByRole('button', { name: '确认开始研究' })).toBeDisabled();
  s.paused = false; v.rerender(<ResearchPanel snapshot={s} start={start} />);
  fireEvent.click(screen.getByRole('button', { name: '确认开始研究' })); expect(start).toHaveBeenCalledExactlyOnceWith('p', 'tool:09');
});
