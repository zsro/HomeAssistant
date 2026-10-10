import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PropertyPanel } from './PropertyPanel';
import { GameSession } from './game/session';
import type { Manifest } from './types';
import nodes from './japan-topology.fixture.json';

afterEach(cleanup);

const manifest: Manifest = { version: 1, map: { name: '日本', width: 2304, height: 2304, nodes, scenery: [] }, sprites: {},
  characters: ['孙小美', '阿土伯'].map((name, i) => ({ id: String(i), name, color: '#fff', idle: [], walk: [], walkFramesPerDirection: 10 })) };
function view() {
  const session = new GameSession(manifest, { id: () => 'ui', seed: () => 'ui' }, 'economy');
  const snapshot = session.snapshot();
  snapshot.currentPropertyId = 'japan:land:19'; snapshot.phase = 'property';
  snapshot.decision = { id: 'decision-1', kind: 'property', propertyId: 'japan:land:19', operation: 'buy', amount: 2000, recipientId: null, lines: [] };
  return snapshot;
}

describe('property decision interface', () => {
  it('submits the displayed decision ID and enables an exact cash balance', () => {
    const snapshot = view(); snapshot.economy!.balances['player-1'].cash = 2000; const decide = vi.fn();
    render(<PropertyPanel snapshot={snapshot} manifest={manifest} decide={decide} />);
    fireEvent.click(screen.getByRole('button', { name: '确认购买' }));
    expect(decide).toHaveBeenCalledWith('decision-1', true);
    expect(screen.getByText('大阪 · 19号地产')).toBeInTheDocument();
  });
  it('keeps insufficient cash purchases optional despite ample deposits and disables decisions when paused', () => {
    const snapshot = view(); snapshot.economy!.balances['player-1'].cash = 1999;
    const { rerender } = render(<PropertyPanel snapshot={snapshot} manifest={manifest} decide={vi.fn()} />);
    expect(screen.getByRole('button', { name: '确认购买' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '暂时放弃' })).toBeEnabled();
    snapshot.paused = true;
    rerender(<PropertyPanel snapshot={snapshot} manifest={manifest} decide={vi.fn()} />);
    expect(screen.getByRole('button', { name: '暂时放弃' })).toBeDisabled();
  });
  it('exposes unsettled debt, exact shortfall and no rent-skip action', () => {
    const snapshot = view(); snapshot.economy!.balances['player-1'] = { cash: 20, bank: 30 };
    snapshot.decision = { ...snapshot.decision!, operation: 'rent', amount: 400, recipientId: 'player-2', lines: [{ propertyId: 'japan:land:19', level: 0, amount: 400 }] };
    render(<PropertyPanel snapshot={snapshot} manifest={manifest} decide={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('还差 350 元');
    expect(screen.getByRole('button', { name: '支付租金' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '暂时放弃' })).not.toBeInTheDocument();
    expect(screen.getByText('19号 · 0级：400 元')).toBeInTheDocument();
  });
});
