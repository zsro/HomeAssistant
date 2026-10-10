import { stockValue } from './game/g6-market';
import { useState } from 'react';
import type { Manifest } from './types';
import type { SessionSnapshot } from './game/session';
import type { Balance } from './game/economy';
import { PROPERTY_CATALOG } from './game/economy';
import { bankTransfer, propertyValue } from './game/finance';
import type { BankDecision } from './game/finance';

const money = (amount: number) => amount.toLocaleString('zh-CN');
type Props = {
  snapshot: SessionSnapshot; manifest: Manifest; loan?:(id:string,operation:'borrow'|'repay',amount:number)=>boolean;
  transfer: (id: string, operation: 'deposit' | 'withdraw', amount: number) => void;
  leaveBank: (id: string) => void; settleDebt: (id: string) => void; newGame: () => void;
};
function BankForm({ loan, snapshot, decision, balance, paused, transfer, leaveBank, remaining }: {
  snapshot:SessionSnapshot; loan?:Props['loan']; decision: BankDecision; balance: Balance; paused: boolean; remaining: number;
} & Pick<Props, 'transfer' | 'leaveBank'>) {
  const [operation, setOperation] = useState<'deposit' | 'withdraw'>('withdraw');
  const playerId=`player-${snapshot.participants.indexOf(snapshot.active)+1}`,rejected=snapshot.news?.business?.bankRejected?.[playerId]??0;
  const [input, setInput] = useState('');
  const amount = /^\d+$/.test(input) ? Number(input) : NaN;
  const valid = !rejected && bankTransfer(balance, operation, amount) !== null;
  const maximum = operation === 'deposit' ? balance.cash : balance.bank;
  return <section className="rm-property rm-finance" aria-label="银行存取款">
    <div className="rm-section-title"><h2>富士銀行</h2><span>{decision.arrival === 'passing' ? '途中停留' : '本次落点'}</span></div>
    <p>现金 {money(balance.cash)} · 存款 {money(balance.bank)}</p>{!!rejected && <p role="status">银行拒绝往来：{rejected&128?"下次自身行动解除":`剩余 ${rejected} 次自身行动边界`}，停止存取款及借还款。</p>}
    <form onSubmit={(event) => { event.preventDefault(); if (valid && !paused) transfer(decision.id, operation, amount); }}>
      <fieldset disabled={paused || !!rejected}>
        <label className="rm-form-field">业务<select value={operation} onChange={(event) => { setOperation(event.target.value as 'deposit' | 'withdraw'); setInput(''); }}><option value="withdraw">取款到现金</option><option value="deposit">存入银行</option></select></label>
        <label className="rm-form-field">金额（整数元）<input inputMode="numeric" value={input} onChange={(event) => setInput(event.target.value)} autoComplete="off" /><small>最多 {money(maximum)} 元</small></label>
        {input && !valid && <p role="alert">请输入余额范围内的正整数。</p>}
        <div className="rm-property-actions"><button type="button" className="rm-button rm-button-light" disabled={maximum === 0} onClick={() => setInput(String(maximum))}>全部{operation === 'deposit' ? '存入' : '取出'}</button><button className="rm-button" type="submit" disabled={!valid}>确认{operation === 'deposit' ? '存款' : '取款'}</button></div>
      </fieldset>
    </form>
    {snapshot.news?.business && loan ? <LoanForm snapshot={snapshot} loan={loan} /> : <p className="rm-property-note">本阶段仅开放基础存取款，不计利息，不提供贷款。</p>}
    <button className="rm-button rm-button-light" disabled={paused} onClick={() => leaveBank(decision.id)}>{remaining ? `离开银行，继续 ${remaining} 步` : '离开银行，结束移动'}</button>
  </section>;
}
function LoanForm({snapshot,loan}:{snapshot:SessionSnapshot;loan:NonNullable<Props['loan']>}){
 const [operation,setOperation]=useState<'borrow'|'repay'>('borrow'),[input,setInput]=useState(''),[message,setMessage]=useState('');
 const id=`player-${snapshot.participants.indexOf(snapshot.active)+1}`,b=snapshot.news!.business!,balance=snapshot.economy!.balances[id];
 const rejected=b.bankRejected?.[id]??0;
 const maximum=rejected?0:operation==='borrow'?(b.noLoans[id]?0:snapshot.loanLimit??0):Math.min(b.loans[id],balance.cash+balance.bank);
 const amount=/^\d+$/.test(input)?Number(input):NaN,valid=Number.isSafeInteger(amount)&&amount>0&&amount<=maximum&&!snapshot.paused;
 return <form aria-label="银行借还款" onSubmit={e=>{e.preventDefault();if(valid){const ok=loan(snapshot.bankDecision!.id,operation,amount);setMessage(ok?'借还款完成。':'条件已变化，未执行。');if(ok)setInput('');}}}>
 <h3>贷款</h3><p>未偿贷款 {money(b.loans[id])} 元 · {rejected?'银行拒绝往来，停止借还款':b.noLoans[id]?`停止放款：${b.noLoans[id]===128?'下次自身行动解除':`剩余${b.noLoans[id]}次自身行动边界`}`:'可正常申请'}</p>
 <fieldset disabled={snapshot.paused || !!rejected}><label className="rm-form-field">贷款业务<select value={operation} onChange={e=>{setOperation(e.target.value as 'borrow'|'repay');setInput('');}}><option value="borrow">借款存入银行</option><option value="repay">偿还贷款</option></select></label>
 <label className="rm-form-field">贷款金额<input aria-label="贷款金额" inputMode="numeric" value={input} onChange={e=>setInput(e.target.value)} /><small>本次最多 {money(maximum)} 元</small></label>
 <button className="rm-button" disabled={!valid}>确认{operation==='borrow'?'借款':'还款'}</button></fieldset>
 <p>借款计入银行和负债，还款先用银行再用现金。有贷款者不领新闻储金红利；{snapshot.calendar?`到期日 ${snapshot.calendar.due[id]??'无'}。首次借款90天，休市顺延，追加不延期。有贷款不领月息；到期自动收款。`:'暂不计利息或到期催收。'}</p>{message&&<p role="status">{message}</p>}</form>;
}
export function FinancePanel({ loan, snapshot, manifest, transfer, leaveBank, settleDebt, newGame }: Props) {
  const economy = snapshot.economy, finance = snapshot.finance;
  if (!economy || !finance) return null;
  const playerId = snapshot.debtDecision?.payerId ?? `player-${snapshot.participants.indexOf(snapshot.active) + 1}`;
  const name = (id: string) => manifest.characters[snapshot.participants[Number(id.split('-')[1]) - 1]].name;
  if (snapshot.bankDecision) return <BankForm snapshot={snapshot} loan={loan} key={snapshot.bankDecision.id} decision={snapshot.bankDecision}
    balance={economy.balances[playerId]} paused={snapshot.paused} remaining={snapshot.remaining} transfer={transfer} leaveBank={leaveBank} />;
  if (snapshot.debtDecision) {
    const debt = snapshot.debtDecision;
    const owned = economy.properties.filter((p) => p.ownerId === playerId);
    return <section className="rm-property rm-finance rm-debt" aria-label="债务处理">
      <h2>租金不足 · 破产清算</h2><p>付款人：{name(playerId)}</p>
      <p>应付{name(debt.recipientId)} <strong>{money(debt.amount)} 元</strong></p>
      <p>现金 {money(economy.balances[playerId].cash)} · 存款 {money(economy.balances[playerId].bank)}</p>
      <p role="status">可支付 {money(debt.available)} 元，差额 {money(debt.shortfall)} 元无法偿付。</p>
      <details><summary>查看租金明细</summary><ul>{debt.lines.map((line) => <li key={line.propertyId}>{line.propertyId.split(':')[2]}号地产 · {line.level}级：{money(line.amount)} 元</li>)}</ul></details>
      {snapshot.g6 && <p>已按当前行情卖出全部持仓，仍不足偿租；清算明细见对局日志。</p>}
      <p>{finance.disposal?'确认后先退出；仍有多人时释放地产，保留建筑，债权人实收在处置结束后入账。':<>确认后将现有资金付给对方，退出对局；你的 {owned.length} 块地产恢复待售，保留建筑等级。</>}</p>
      {!!owned.length && <details><summary>将失去的地产</summary><ul>{owned.map((p) => <li key={p.id}>{PROPERTY_CATALOG.properties.find((d) => d.id === p.id)?.name} · {p.id.split(':')[2]}号 · {p.level}级</li>)}</ul></details>}
      <p className="rm-property-note">候选破产规则：地产不自动抵债，不直接转给债权人。{finance.disposal?'多人继续且原持地超过三块时公开拍卖三块；仅剩一人则结束对局，不再处置资产。':'本阶段不进行后续拍卖。'}</p>
      {finance.disposal&&<p>确认后退出；若仍有多人且原持地超过三块，将公开处置三块地产。拍卖款不抵偿本笔欠款，债权人实收在处置结束后入账。</p>}
    <button className="rm-button" disabled={snapshot.paused} onClick={() => settleDebt(debt.id)}>确认支付现有资金并破产</button>
    </section>;
  }
  if (snapshot.phase === 'finished' && finance.winnerId) return <section className="rm-property rm-finance rm-result" aria-label="对局结果">
    <p className="rm-eyebrow">本局结束</p><h2>{name(finance.winnerId)}获胜</h2>
    <p>本局采用最后一位未破产玩家获胜的限定玩法。</p>
    <ul className="rm-result-list">{snapshot.participants.map((_, i) => {
      const id = `player-${i + 1}`, balance = economy.balances[id];
      const value = propertyValue(id, economy.properties, PROPERTY_CATALOG.properties);
      const stocks = stockValue(snapshot.g6, id),loans=snapshot.news?.business?.loans[id]??0;
      return <li key={id}><strong>{name(id)} · {finance.eliminated.includes(id) ? '已破产' : '胜者'}</strong><span>现金 {money(balance.cash)} / 存款 {money(balance.bank)}</span><span>地产估值 {money(value)}{snapshot.g6 ? ` / 股票 ${money(stocks)}` : ''} / 贷款 {money(loans)} / 净值 {money(balance.cash + balance.bank + value + stocks-loans)}</span></li>;
    })}</ul>
    <p className="rm-property-note">地产估值按地价加建造成本汇总，仅供查看，不作为本局胜负依据。</p>
    <button className="rm-button" onClick={newGame}>再开一局</button>
  </section>;
  return null;
}
