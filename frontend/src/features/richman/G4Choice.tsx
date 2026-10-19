import { ClassicBidButton, ClassicEventScene, ClassicAuctionPass } from './ClassicEventArt';
import { G6_GOODS } from './game/g6-catalog';
import { G5_GOODS } from './game/g5-catalog';
import { useState } from 'react';
import type { SessionSnapshot } from './game/session';
import type { EffectAction } from './game/effects';
import { G4_GOODS, FACILITY_TYPES, BID_INCREMENTS } from './game/g4';
import { PROPERTY_CATALOG } from './game/economy';

export function G4Choice({ snapshot, onUse, preview, group = 4, locate }: { snapshot: SessionSnapshot; onUse: (action: EffectAction, value?: number) => boolean; preview?: (id: string) => void; group?: 4 | 5 | 6; locate?: (id: number) => void }) {
  const pending = snapshot.effects!.pending!, good = (group === 6 ? G6_GOODS : group === 5 ? G5_GOODS : G4_GOODS).find(g => g.effect === pending.definitionId)!;
  const options = (group === 6 ? snapshot.g6Choices : group === 5 ? snapshot.g5Choices : snapshot.g4Choices)?.[good.id] ?? [];
  const [selected, setSelected] = useState(''), [type, setType] = useState(''), [error, setError] = useState('');
  const option = options.find(o => o.target.id === selected);
  return <section className="rm-property rm-items" aria-label={`${good.name}选择`}>
    <h2>{good.name} · 效果预览</h2>
    <label className="rm-form-field">使用目标<select aria-label="使用目标" value={selected} disabled={snapshot.paused} onChange={e => { setSelected(e.target.value); setType(''); if (good.target === 'property') preview?.(e.target.value); else if (good.target === 'node') locate?.(Number(e.target.value)); }}>
      <option value="">请选择目标</option>{options.map(o => <option key={o.target.id} value={o.target.id}>{o.title}</option>)}</select></label>
    {option?.buildingTypes && <label className="rm-form-field">改建类型<select value={type} disabled={snapshot.paused} onChange={e => setType(e.target.value)}><option value="">请选择建筑</option>{option.buildingTypes.map(t => <option key={t} value={t}>{FACILITY_TYPES[t]}</option>)}</select></label>}
    <p aria-label={`${good.name}结算预览`}>{option?.detail ?? '选择目标后查看结算。'}</p>
    <p>确认消耗 1 件；取消不消耗。{good.id === 'card:08' && '拍卖开始后需完成全部竞价，不能撤回。'}</p>
    {error && <p role="alert">{error}</p>}
    <div className="rm-property-actions"><button className="rm-button" disabled={snapshot.paused || !option || (!!option.buildingTypes && type === '')} onClick={() => {
      if (option && !onUse({ type: 'confirm', decisionId: pending.id, target: option.target }, option.buildingTypes ? Number(type) : undefined)) setError('目标或库存已失效，未消费卡片，请取消重选。');
    }}>确认使用{good.name}</button><button className="rm-button rm-button-light" disabled={snapshot.paused} onClick={() => onUse({ type: 'cancel', decisionId: pending.id })}>取消使用</button></div>
  </section>;
}
export function AuctionPanel({ snapshot, bid }: { snapshot: SessionSnapshot; bid: (id: string, increment: number | null) => boolean }) {
  const a = snapshot.auction!, [error, setError] = useState('');
  const cash = snapshot.economy!.balances[a.responderId].cash;
  const send = (increment: number | null) => { if (!bid(a.id, increment)) setError('出价或竞价人已失效，请查看当前现金与轮次。'); };
  return <section className="rm-property rm-classic-auction" aria-label="地产拍卖">
    {a.disposalId&&<p aria-label="破产强拍说明">玩家已破产退出，正在处置其释放地产；拍卖收入进入公共资金，不恢复玩家资格。债权人实收将在全部处置后入账。</p>}
    <ClassicEventScene kind="auction"><h2>{PROPERTY_CATALOG.properties.find(p => p.id === a.propertyId)?.name} · 拍卖</h2>
    <p>请玩家 {a.responderId.split('-')[1]} 竞价 · 可用现金 {cash.toLocaleString()} 元</p>
    <p>标价 {a.reserve.toLocaleString()} 元；当前 {a.bid.toLocaleString()} 元{a.leader ? `（玩家 ${a.leader.split('-')[1]}领先）` : '（尚无人出价）'}</p></ClassicEventScene>
    <p>{a.magicBatchId ? <>成交款存入被选玩家 {a.sourceId.split('-')[1]}的银行；原业主可以竞价，流拍保留原产权。建筑保留，本位玩家不能竞价。</> : a.publicNews||a.disposalId ? '成交款进入公共资金；建筑保留，流拍保持待售。在局且符合条件的玩家可参加。' : <>成交款存入玩家 {a.sourceId.split('-')[1]}的银行；建筑保留。退出后本次不能重新竞价，无人出价则恢复待售。</>}</p>
    <div className="rm-auction-bids" aria-label="竞价操作"><ClassicAuctionPass />{BID_INCREMENTS.map(n => <ClassicBidButton key={n} increment={n} disabled={snapshot.paused || cash < a.bid + n} onClick={() => send(n)} />)}<ClassicBidButton increment={null} disabled={snapshot.paused} onClick={() => send(null)} /></div>
    {error && <p role="alert">{error}</p>}
  </section>;
}
