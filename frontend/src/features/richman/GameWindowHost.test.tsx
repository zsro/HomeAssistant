import { useRef } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GameSession } from './game/session';
import type { SessionSnapshot } from './game/session';
import type { Manifest } from './types';
import nodes from './japan-topology.fixture.json';
import { GameWindowHost, WindowPanel } from './GameWindowHost';
import { decisionWindow } from './window-state';
import { preventRepeatedClick, preventRepeatedKey } from './window-input';
import { navigateGame } from './decision-navigation';
import { FinancePanel } from './FinancePanel';

const manifest: Manifest = { version: 1, map: { name: '日本', width: 2304, height: 2304, nodes, scenery: [] }, sprites: {},
  characters: ['a', 'b'].map(id => ({ id, name: id, color: '#fff', idle: [], walk: [], walkFramesPerDirection: 10 })) };
function fixture() { return new GameSession(manifest, { id: () => 'ui03', seed: () => 'ui03' }, 'surrender').snapshot(); }
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = true; }) });
  Object.defineProperty(HTMLDialogElement.prototype, 'show', { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = true; }) });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = false; }) });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); for (const method of ['showModal', 'show', 'close']) Reflect.deleteProperty(HTMLDialogElement.prototype, method); });
function Harness({ snapshot, suspended = false, current = true, epoch = 0, transfer = vi.fn() }: { snapshot: SessionSnapshot; suspended?: boolean; current?: boolean; epoch?: number; transfer?: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  return <div ref={root} onClickCapture={preventRepeatedClick} onKeyDownCapture={preventRepeatedKey}>
    <button onClick={() => navigateGame(root.current!, '[data-richman-panel="settings"]')}>打开设置</button>
    <button onClick={() => navigateGame(root.current!, '[data-richman-panel="items"]')}>打开道具</button>
    <button onClick={() => navigateGame(root.current!, '[data-richman-panel="stocks"]')}>打开股票</button>
    <button onClick={() => navigateGame(root.current!, '.rm-board')}>返回地图</button>
    <section className="rm-board">地图</section>
    <GameWindowHost root={root} snapshot={snapshot} suspended={suspended} epoch={epoch} isCurrent={() => current} onPause={vi.fn()} onNewGame={vi.fn()}>
      <WindowPanel id="settings"><label>音量<input defaultValue="50" /></label></WindowPanel>
      <WindowPanel id="items"><section className="rm-items"><label>目标<input defaultValue="" /></label><button onClick={transfer}>确认使用</button></section></WindowPanel>
      <WindowPanel id="stocks">{null}</WindowPanel>
      <WindowPanel id="finance"><FinancePanel snapshot={snapshot} manifest={manifest} transfer={transfer} leaveBank={vi.fn()} settleDebt={vi.fn()} newGame={vi.fn()} /></WindowPanel>
      <WindowPanel id="reaction"><section aria-label="反应决策"><button>应答</button></section></WindowPanel>
      <WindowPanel id="insurance"><section aria-label="保险办理">保险</section></WindowPanel>
    </GameWindowHost>
  </div>;
}
const host = () => document.querySelector<HTMLDialogElement>('[data-window-host]')!;
it('opens a single browse window, restores opener focus, and retains input without remounting', () => {
  const snapshot = fixture(), before = structuredClone(snapshot);
  render(<Harness snapshot={snapshot} />);
  const opener = screen.getByRole('button', { name: '打开设置' }); opener.focus(); fireEvent.click(opener);
  expect(host().open).toBe(true); expect(document.activeElement).toBe(screen.getByRole('heading', { name: '声音设置' }));
  fireEvent.change(screen.getByLabelText('音量'), { target: { value: '75' } });
  fireEvent.keyDown(host(), { key: 'Escape' }); expect(host().open).toBe(false); expect(document.activeElement).toBe(opener);
  fireEvent.click(opener); expect(screen.getByLabelText('音量')).toHaveValue('75');
  expect(document.querySelectorAll('[data-window-host]')).toHaveLength(1); expect(document.querySelectorAll('input')).toHaveLength(2);
  expect(snapshot).toEqual(before);
});
it('keeps mandatory banking open on Escape and routes browse attempts back to the live decision', () => {
  const s = fixture(); s.phase = 'bank'; s.bankDecision = { kind: 'bank', id: 'bank-1', node: 1, arrival: 'passing' };
  render(<Harness snapshot={s} />);
  expect(screen.getByRole('dialog', { name: '银行与债务' })).toBeTruthy();
  fireEvent.keyDown(host(), { key: 'Escape' }); expect(host().open).toBe(true); expect(screen.getByRole('button', { name: '关闭窗口' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '打开设置' })); expect(screen.getByRole('dialog', { name: '银行与债务' })).toBeTruthy();
});
it('minimizes a map decision, retains its input, and resumes without submitting', () => {
  const s = fixture(); s.phase = 'effect'; const transfer = vi.fn();
  render(<Harness snapshot={s} transfer={transfer} />);
  fireEvent.change(screen.getByLabelText('目标'), { target: { value: '大阪' } });
  fireEvent.keyDown(host(), { key: 'Escape' }); expect(host().open).toBe(false); expect(document.activeElement).toHaveClass('rm-board');
  fireEvent.click(screen.getByRole('button', { name: '返回当前操作' }));
  expect(screen.getByLabelText('目标')).toHaveValue('大阪'); expect(transfer).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '返回地图' })); expect(host().open).toBe(false); expect(transfer).not.toHaveBeenCalled();
});
it('follows nested responder changes then closes only when the decision is resolved', () => {
  const s = fixture(); s.phase = 'bank'; s.bankDecision = { kind: 'bank', id: 'bank-1', node: 1, arrival: 'passing' };
  const view = render(<Harness snapshot={s} />);
  const r = { ...s, phase: 'reaction' as const, bankDecision: null, reaction: { kind: 'reaction' as const, id: 'r1', responderId: 'player-2' } } as SessionSnapshot;
  view.rerender(<Harness snapshot={r} />); expect(screen.getByRole('dialog', { name: '反应决策' })).toBeTruthy();
  const first = decisionWindow(r)!.key; expect(decisionWindow({ ...r, reaction: { ...r.reaction!, responderId: 'player-1' } })!.key).not.toBe(first);
  view.rerender(<Harness snapshot={{ ...s, phase: 'turnEnd', bankDecision: null }} />); expect(host().open).toBe(false);
});
it('prioritizes independent insurance decisions over the coarse phase', () => {
  const s = fixture(); s.insuranceDecision = { kind: 'insurance', id: 'insurance-1', companyId: 'company', ownerId: 'player-2' };
  render(<Harness snapshot={s} />); expect(screen.getByRole('dialog', { name: '保险办理' })).toBeTruthy();
});
it('suspends for configuration and restores the same required window and draft', () => {
  const s = fixture(); s.phase = 'bank'; s.bankDecision = { kind: 'bank', id: 'bank-1', node: 1, arrival: 'passing' };
  const view = render(<Harness snapshot={s} />);
  fireEvent.change(screen.getByLabelText(/金额（整数元）/), { target: { value: '123' } });
  view.rerender(<Harness snapshot={s} suspended />); expect(host().open).toBe(false);
  view.rerender(<Harness snapshot={s} />); expect(host().open).toBe(true); expect(screen.getByLabelText(/金额（整数元）/)).toHaveValue('123');
});
it('closes browse windows on a new game even with the same seed and turn', () => {
  const s = fixture(), view = render(<Harness snapshot={s} />);
  fireEvent.click(screen.getByRole('button', { name: '打开设置' })); expect(host().open).toBe(true);
  view.rerender(<Harness snapshot={s} epoch={1} />); expect(host().open).toBe(false);
});
it('keeps unavailable entries readable without fabricating a form', () => {
  render(<Harness snapshot={fixture()} />); fireEvent.click(screen.getByRole('button', { name: '打开股票' }));
  expect(screen.getByText(/当前模式或状态未启用/)).toBeTruthy(); expect(within(host()).queryByRole('spinbutton')).toBeNull();
});
it('blocks stale form callbacks before they can address a new snapshot', () => {
  const s = fixture(), transfer = vi.fn(), view = render(<Harness snapshot={s} transfer={transfer} />);
  fireEvent.click(screen.getByRole('button', { name: '打开道具' }));
  view.rerender(<Harness snapshot={s} transfer={transfer} current={false} />);
  fireEvent.click(screen.getByRole('button', { name: '确认使用' })); expect(transfer).not.toHaveBeenCalled();
  expect(screen.getByText('状态已更新，请重新操作。')).toBeTruthy();
});
it('bank double-click submits once while ordinary subsequent transactions remain available', () => {
  const s = fixture(); s.phase = 'bank'; s.bankDecision = { kind: 'bank', id: 'bank-1', node: 1, arrival: 'passing' };
  const transfer = vi.fn(); render(<Harness snapshot={s} transfer={transfer} />);
  fireEvent.change(screen.getByLabelText(/金额（整数元）/), { target: { value: '100' } });
  const button = screen.getByRole('button', { name: '确认取款' });
  fireEvent.click(button, { detail: 1 }); fireEvent.click(button, { detail: 2 }); expect(transfer).toHaveBeenCalledTimes(1);
  fireEvent.click(button, { detail: 1 }); expect(transfer).toHaveBeenCalledTimes(2);
  const repeated = new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true });
  act(() => screen.getByLabelText(/金额（整数元）/).dispatchEvent(repeated)); expect(repeated.defaultPrevented).toBe(true);
});
