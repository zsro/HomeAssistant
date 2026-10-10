import {GodTrafficPanel} from './GodTrafficPanel';
import {holdingSummary} from './game/stock-ledger';
import {marketBuyLimit} from './game/stock-market';
import {calendarClosed} from './game/calendar-date';
import { useState } from 'react';
import type { SessionSnapshot } from './game/session';
import { JAPAN_STOCKS } from './game/g6-catalog';
import { stockValue, tradeAmount, priceLimit } from './game/g6-market';
const price = (n: number) => (n / 100).toFixed(2);
export function G6Panel({ snapshot, trade }: { snapshot: SessionSnapshot; trade: (stockId: string, side: 'buy' | 'sell', quantity: number) => boolean }) {
  const [selected, setSelected] = useState('jp:24'), [side, setSide] = useState<'buy' | 'sell'>('buy'), [input, setInput] = useState(''), [message, setMessage] = useState('');
  const market = snapshot.g6!, id = `player-${snapshot.participants.indexOf(snapshot.active) + 1}`;
  const stock = market.stocks.find(k => k.id === selected)!, holding = market.holdings[id][selected], bank = snapshot.economy!.balances[id].bank;
  const ledger = holding.average !== undefined, summary = holdingSummary(holding,stock.price);
  const totals = market.stocks.reduce((total,k)=>{const row=holdingSummary(market.holdings[id][k.id],k.price);return {cost:total.cost+row.cost,value:total.value+row.value};},{cost:0,value:0});
  const quantity = /^\d+$/.test(input) ? Number(input) : NaN, amount = tradeAmount(stock.price, quantity);
  const max = side === 'buy' ? (market.market?marketBuyLimit(bank,stock.price,stock.pool,stock.quota):Math.min(stock.pool, stock.quota, Math.ceil((bank + 1) * 100 / stock.price) - 1)) : holding.quantity;
  const limit=market.market?priceLimit(stock):null,limitBlocked=limit===(side==='buy'?'up':'down');
  const valid = !limitBlocked && !snapshot.news?.business?.halted[selected] && snapshot.canTrade && Number.isSafeInteger(quantity) && quantity > 0 && quantity <= max;
  return <>
    <GodTrafficPanel snapshot={snapshot} />
    <section className="rm-property" aria-label="股票市场"><h2>股票市场 · 第{snapshot.round}期</h2>
      {snapshot.news?.business && <p role="status">{snapshot.news.business.marketClosed?`全市休市：${snapshot.news.business.marketClosed===128?'下轮解除':`剩余${snapshot.news.business.marketClosed}轮边界`}`:snapshot.calendar&&calendarClosed(snapshot.calendar.date)?`${snapshot.calendar.date} ${calendarClosed(snapshot.calendar.date)}`:'全市开放'} · 所选股票{snapshot.news.business.halted[selected]?`停牌剩余${snapshot.news.business.halted[selected]}轮`:'可交易'}</p>}
      {market.market && <div aria-label="每日行情结算"><p>普通行情包含大盘共同波动与个股累计涨跌，并参考公司资本或股票初价调整，每日涨跌最多10%。</p><p>{market.market.last?`${market.market.last.date} · 大盘指数 ${market.market.last.index.toLocaleString()} · 共同波动 ${market.market.last.shared.toFixed(3)}%`:'尚未跨过首个交易日。'}</p><p>买入股数按银行余额除以现价向下取整，再受公共余股和本回合限额约束。</p></div>}
      {limit && <p aria-label="涨跌停限制">{limit==='up'?'涨停：暂停手动买入，仍可卖出。':'跌停：暂停手动卖出，仍可买入。'}</p>}
      {ledger && <div aria-label="持仓账本"><p>全部持仓：市值 {totals.value.toLocaleString()} 元 · 剩余成本 {totals.cost.toLocaleString()} 元 · 未实现盈亏 {(totals.value-totals.cost).toLocaleString()} 元</p><p>所选持仓 {holding.quantity} 股 · 均价 {summary.average.toFixed(2)} 元 · 成本 {summary.cost.toLocaleString()} 元 · 市值 {summary.value.toLocaleString()} 元 · 未实现盈亏 {summary.unrealized.toLocaleString()} 元</p><p>部分卖出保留均价，清仓归零；再次买入按剩余持仓与实付重算。未实现盈亏仅供估值，不计入银行余额，也不包含已卖出收益。</p></div>}
      <p>当前玩家银行 {bank.toLocaleString()} 元 · 股票估值 {stockValue(market, id).toLocaleString()} 元</p>
      <p>{snapshot.calendar?'每个交易日更新行情，日历休市期间停止买卖和普通行情更新；':'每轮更新行情，'}交易按总额向下取整元。红黑卡覆盖同一期基准价，不重复复利。租金不足会在反应卡处理后自动卖出实际付款人的必要持仓。</p>
      <details><summary>12支股票行情与当前持仓</summary><div className="rm-market-scroll"><table><thead><tr><th>股票</th><th>现价 / 基准</th><th>红黑行情</th><th>可购 / 公共余股</th><th>{ledger?'持股 / 均价 / 成本 / 市值 / 未实现盈亏':'持股 / 成本'}</th></tr></thead><tbody>{market.stocks.map(k => { const h = market.holdings[id][k.id],row=holdingSummary(h,k.price); return <tr key={k.id}><th>{JAPAN_STOCKS.find(d => d.id === k.id)!.name}</th><td>{price(k.price)} / {price(k.base)}<br />{((k.price / k.base - 1) * 100).toFixed(2)}%</td><td>{snapshot.news?.business?.halted[k.id]?`停牌${snapshot.news.business.halted[k.id]}轮；`:''}{k.trend ? `${k.trend === 'red' ? '红' : '黑'}（${k.remaining}）` : '普通'}</td><td>{k.quota} / {k.pool}</td><td>{h.quantity} / {ledger?`${row.average.toFixed(2)} / ${row.cost.toLocaleString()} / ${row.value.toLocaleString()} / ${row.unrealized.toLocaleString()}元`:`${h.cost.toLocaleString()}元`}</td></tr>; })}</tbody></table></div></details>
      <form onSubmit={e => { e.preventDefault(); if (!valid) return; const ok = trade(selected, side, quantity); setMessage(ok ? '交易完成，已更新银行及持仓。' : '交易条件已改变，请重新确认。'); if (ok) setInput(''); }}>
        <fieldset disabled={!snapshot.canTrade}>
          <label className="rm-form-field">股票<select value={selected} onChange={e => { setSelected(e.target.value); setInput(''); setMessage(''); }}>{JAPAN_STOCKS.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}</select></label>
          <label className="rm-form-field">交易方向<select value={side} onChange={e => { setSide(e.target.value as 'buy' | 'sell'); setInput(''); }}><option value="buy">买入</option><option value="sell">卖出</option></select></label>
          <label className="rm-form-field">股数<input inputMode="numeric" value={input} onChange={e => setInput(e.target.value)} autoComplete="off" /><small>最多 {max} 股；持仓均价 {summary.average.toFixed(2)} 元</small></label>
          <p>单价 {price(stock.price)} 元。{valid ? `成交 ${amount.toLocaleString()} 元，银行余额 → ${(bank + (side === 'buy' ? -amount : amount)).toLocaleString()} 元。` : '请输入额度内的正整数股数。'}</p>
          <button className="rm-button" type="submit" disabled={!valid}>确认{side === 'buy' ? '买入' : '卖出'}</button>
        </fieldset>
      </form>
      {!snapshot.canTrade && <p>仅可在未暂停、可行动的掷骰前或回合结束时交易。</p>}
      {message && <p role="status">{message}</p>}
      <details><summary>所选股票近12期价格</summary><p>{stock.history.slice(-12).map(price).join(' → ')}</p></details>
      {snapshot.news?.business ? <><details><summary>日本地图六家公司经营与账面资金</summary><ul>{snapshot.news.business.companies.map(c=><li key={c.id}>{c.name} · 经营者 {c.ownerId?`玩家${c.ownerId.split('-')[1]}`:'无'} · 本期 {c.funds.toLocaleString()} / 累计 {c.cumulative.toLocaleString()} 元</li>)}</ul></details><p className="rm-property-note">经营权取持股最多者，同量时已有排序者优先；公司账本与个人资金分开。{snapshot.calendar?'日历休市不阻止既有租金强制卖股；':'每轮代替日期，停牌不阻止债务强制卖股；'}{market.market?'每月15日结算公司分红；当前采用候选行情，原版走势图与声音尚未复现。':'分红和完整公司经营尚未实现。'}</p></> : <p className="rm-property-note">候选市场：每轮代替日期，暂不含休市、公司控股、分红与原版随机行情。</p>}
    </section>
  </>;
}
