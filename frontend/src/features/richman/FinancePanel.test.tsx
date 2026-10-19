import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FinancePanel } from './FinancePanel';
import { GameSession } from './game/session';
import type { Manifest } from './types';
import nodes from './japan-topology.fixture.json';

afterEach(cleanup);
const manifest: Manifest = { version: 1, map: { name: '日本', width: 2304, height: 2304, nodes, scenery: [] }, sprites: {},
  characters: ['孙小美', '阿土伯', '钱夫人', '沙隆巴斯'].map((name, i) => ({ id: String(i), name, color: '#fff', idle: [], walk: [], walkFramesPerDirection: 10 })) };
function fixture() {
  const session = new GameSession(manifest, { id: () => 'ui', seed: () => 'ui' }, 'economy');
  session.start({ mode: 'economy', characterIds: ['1', '3'], seed: 'ui' });
  return { snapshot: session.snapshot(), manifest, transfer: vi.fn(), leaveBank: vi.fn(), settleDebt: vi.fn(), newGame: vi.fn() };
}

describe('bank, debt and results UI', () => {
  it('validates integer input, submits the exact bank decision and allows skipping the bank without a transfer', () => {
    const props = fixture(); props.snapshot.phase = 'bank'; props.snapshot.remaining = 3;
    props.snapshot.bankDecision = { kind: 'bank', id: 'bank-1', node: 1, arrival: 'passing' };
    render(<FinancePanel {...props} />);
    for (const input of ['0', '-1', '1.5', '1e3', '50001']) {
      fireEvent.change(screen.getByLabelText(/金额（整数元）/), { target: { value: input } });
      expect(screen.getByRole('button', { name: '确认取款' })).toBeDisabled();
    }
    fireEvent.click(screen.getByRole('button', { name: '全部取出' }));
    fireEvent.click(screen.getByRole('button', { name: '确认取款' }));
    expect(props.transfer).toHaveBeenCalledWith('bank-1', 'withdraw', 50000);
    fireEvent.click(screen.getByRole('button', { name: '离开银行，继续 3 步' }));
    expect(props.leaveBank).toHaveBeenCalledWith('bank-1');
  });
  it('pauses all bank controls and resets input after a successful transfer gets a new token', () => {
    const props = fixture(); props.snapshot.phase = 'bank'; props.snapshot.bankDecision = { kind: 'bank', id: 'bank-1', node: 1, arrival: 'landing' };
    const { rerender } = render(<FinancePanel {...props} />);
    fireEvent.change(screen.getByLabelText('业务'), { target: { value: 'deposit' } });
    fireEvent.change(screen.getByLabelText(/金额（整数元）/), { target: { value: '20' } });
    props.snapshot.paused = true; rerender(<FinancePanel {...props} />);
    expect(screen.getByRole('button', { name: '确认存款' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '离开银行，结束移动' })).toBeDisabled();
    props.snapshot.paused = false; props.snapshot.bankDecision.id = 'bank-2'; rerender(<FinancePanel {...props} />);
    expect(screen.getByLabelText(/金额（整数元）/)).toHaveValue('');
    expect(screen.getByRole('button', { name: '确认取款' })).toBeDisabled();
  });
  it('shows debt, lost properties and an explicit settlement action, respecting pause', () => {
    const props = fixture(); props.snapshot.phase = 'debt';
    props.snapshot.debtDecision = { kind: 'debt', id: 'debt-1', propertyId: 'japan:land:19', recipientId: 'player-2', amount: 101000, available: 100000, shortfall: 1000, lines: [] };
    props.snapshot.economy!.properties[0] = { id: 'japan:land:1', ownerId: 'player-1', level: 2 };
    const { rerender } = render(<FinancePanel {...props} />);
    expect(screen.getByText(/应付沙隆巴斯/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('差额 1,000 元');
    const button = screen.getByRole('button', { name: '确认支付现有资金并破产' });
    fireEvent.click(button); expect(props.settleDebt).toHaveBeenCalledWith('debt-1');
    props.snapshot.paused = true; rerender(<FinancePanel {...props} />); expect(button).toBeDisabled();
  });
  it('renders the winner with non-contiguous characters and cost-based assets, without gameplay actions', () => {
    const props = fixture(); props.snapshot.phase = 'finished';
    props.snapshot.finance = { winnerId: 'player-2', eliminated: ['player-1'], round: 2 };
    props.snapshot.economy!.balances['player-1'] = { cash: 0, bank: 0 };
    render(<FinancePanel {...props} />);
    expect(screen.getByRole('heading', { name: '沙隆巴斯获胜' })).toBeInTheDocument();
    expect(screen.getByText('阿土伯 · 已破产')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '再开一局' })); expect(props.newGame).toHaveBeenCalledOnce();
  });
});

it('v19 bank exposes debts, restricts borrowing during news22, still permits repayment and honors pause',()=>{
 const props=fixture(),session=new GameSession(manifest,{id:()=> 'loans',seed:()=> 'loans'},'completeNews');session.start({mode:'completeNews',characterIds:['1','3'],seed:'loans'});props.snapshot=session.snapshot();props.snapshot.bankDecision={kind:'bank',id:'loan-bank',node:1,arrival:'landing'};props.snapshot.phase='bank';props.snapshot.news!.business!.loans['player-1']=100;props.snapshot.news!.business!.noLoans['player-1']=15;
 const loan=vi.fn(()=>true),ui=render(<FinancePanel {...props} loan={loan}/>);
 fireEvent.change(screen.getByLabelText('贷款金额'),{target:{value:'1'}});expect(screen.getByRole('button',{name:'确认借款'})).toBeDisabled();expect(screen.getByText(/停止放款：剩余15/)).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('贷款业务'),{target:{value:'repay'}});fireEvent.change(screen.getByLabelText('贷款金额'),{target:{value:'10'}});fireEvent.click(screen.getByRole('button',{name:'确认还款'}));expect(loan).toHaveBeenCalledWith('loan-bank','repay',10);expect(screen.getByLabelText('贷款金额')).toHaveValue('');
 props.snapshot.paused=true;ui.rerender(<FinancePanel {...props} loan={loan}/>);fireEvent.change(screen.getByLabelText('贷款金额'),{target:{value:'1'}});expect(screen.getByRole('button',{name:'确认还款'})).toBeDisabled();
});
it('v19 session preserves nearby-worker choices alongside new financial snapshots',()=>{const session=new GameSession(manifest,{id:()=> 'latest',seed:()=> 'latest'},'completeNews');const s=session.snapshot();expect(s.workerTargets!.length).toBeGreaterThan(0);expect(s.news!.business!.companies).toHaveLength(6);expect(s.loanLimit).toBe(100000);});

it('v23 bank refusal disables every service but preserves exit and visible reason',()=>{
 const session=new GameSession(manifest);session.start({mode:'finalFortune',characterIds:['0','1'],seed:'bank-refusal'});const props={...fixture(),snapshot:session.snapshot(),loan:vi.fn(()=>true)};
 props.snapshot.phase='bank';props.snapshot.bankDecision={kind:'bank',id:'refused',node:1,arrival:'passing'};props.snapshot.news!.business!.bankRejected!['player-1']=30;
 render(<FinancePanel {...props}/>);expect(screen.getByRole('status')).toHaveTextContent('银行拒绝往来');expect(screen.getByLabelText('业务')).toBeDisabled();expect(screen.getByLabelText('贷款业务')).toBeDisabled();expect(screen.getByRole('button',{name:'确认取款'})).toBeDisabled();expect(screen.getByRole('button',{name:'确认借款'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:/离开银行/}));expect(props.leaveBank).toHaveBeenCalledWith('refused');expect(props.loan).not.toHaveBeenCalled();
});

it('native keypad edits drafts, supports repeated digits, clear/backspace/MAX, and never submits by itself', () => {
 const props=fixture();props.snapshot.phase='bank';props.snapshot.bankDecision={kind:'bank',id:'keypad-bank',node:1,arrival:'landing'};
 const ui=render(<FinancePanel {...props}/>);
 const input=screen.getByLabelText(/金额（整数元）/);
 fireEvent.click(screen.getByRole('button',{name:'输入 1'}),{detail:1});
 fireEvent.click(screen.getByRole('button',{name:'输入 1'}),{detail:2});
 fireEvent.click(screen.getByRole('button',{name:'输入 0'}));expect(input).toHaveValue('110');
 fireEvent.click(screen.getByRole('button',{name:'删除末位'}));expect(input).toHaveValue('11');
 fireEvent.click(screen.getByRole('button',{name:'清空金额'}));expect(input).toHaveValue('');
 fireEvent.click(screen.getByRole('button',{name:'填入最大金额'}));expect(input).toHaveValue('50000');
 expect(props.transfer).not.toHaveBeenCalled();
 props.snapshot.paused=true;ui.rerender(<FinancePanel {...props}/>);
 expect(screen.getByRole('button',{name:'输入 1'})).toBeDisabled();
 expect(screen.getByRole('button',{name:'填入最大金额'})).toBeDisabled();
});
