import { useState } from 'react';
import type { SessionSnapshot } from './game/session';
import type { EffectAction } from './game/effects';
import { G3_GOODS, itemName } from './game/g3';

export function G3Choice({ snapshot, onUse }: { snapshot: SessionSnapshot; onUse: (a: EffectAction, value?: number, stolenItemId?: string) => boolean }) {
  const pending = snapshot.effects!.pending!, good = G3_GOODS.find(g => g.effect === pending.definitionId)!;
  const options = snapshot.g3Choices?.[good.id] ?? [];
  const [selected, setSelected] = useState(''), [item, setItem] = useState(''), [error, setError] = useState('');
  const option = options.find(o => o.id === selected), robbery = good.id === 'card:13';
  const source = `player-${snapshot.participants.indexOf(snapshot.active) + 1}`;
  const fullTool = item.startsWith('tool:') && (snapshot.effects!.inventory[source][item] ?? 0) >= 9;
  return <section className="rm-property rm-items" aria-label={`${good.name}选择`}>
    <h2>{good.name} · 效果预览</h2>
    <label className="rm-form-field">目标玩家<select value={selected} disabled={snapshot.paused} onChange={e => { setSelected(e.target.value); setItem(''); }}><option value="">请选择目标</option>{options.map(o => <option key={o.id} value={o.id}>玩家 {o.id.split('-')[1]}</option>)}</select></label>
    {robbery && option && <label className="rm-form-field">抢夺物品<select value={item} disabled={snapshot.paused} onChange={e => setItem(e.target.value)}><option value="">请选择一件物品</option>{option.items.map(id => <option key={id} value={id}>{itemName(id)} × {snapshot.effects!.inventory[selected][id]}</option>)}</select></label>}
    <div aria-label={`${good.name}结算预览`}><p>{robbery ? '从目标背包拿取一张卡片或一个道具，再消耗抢夺卡。已装备的车辆不在背包中。' : '解除双方原有同盟，建立双方同盟，初始期限 7，按各自行动计时。同盟免租；对盟友实施有敌意的攻击会解除关系。'}</p>
      {robbery && <p>卡包满 15 张时，先丢弃首张最低价卡，再收取目标卡并消费抢夺卡。</p>}
      {fullTool && <p role="alert">此道具已达 9 个：对方会失去 1 个，但你无法收取；抢夺卡仍会消耗。</p>}
      <p>确认消耗 1 张，取消不消耗。</p></div>
    {error && <p role="alert">{error}</p>}
    <div className="rm-property-actions"><button className="rm-button" disabled={snapshot.paused || !option || (robbery && !option.items.includes(item))} onClick={() => {
      if (!onUse({ type: 'confirm', decisionId: pending.id, target: { kind: 'player', id: selected } }, undefined, robbery ? item : undefined)) setError('目标或库存已失效，请取消后重试。');
    }}>确认使用{good.name}</button><button className="rm-button rm-button-light" disabled={snapshot.paused} onClick={() => onUse({ type: 'cancel', decisionId: pending.id })}>取消使用</button></div>
  </section>;
}
export function ReactionPanel({ snapshot, respond }: { snapshot: SessionSnapshot; respond: (id: string, choice: 'use' | 'decline', targetId?: string) => boolean }) {
  const pending = snapshot.reaction!;
  const [target, setTarget] = useState(''), [error, setError] = useState('');
  const free = pending.stage === 'free', name = free ? '免费卡' : '嫁祸卡', c = pending.continuation;
  const send = (choice: 'use' | 'decline') => { if (!respond(pending.id, choice, choice === 'use' && !free ? target : undefined)) setError('应答已失效，未消耗卡片。'); };
  return <section className="rm-property rm-items" aria-label="反应决策">
    <h2>请玩家 {pending.responderId.split('-')[1]} 应答 · {name}</h2>
    <p>{c.kind === 'magicDetention' ? `魔法屋${c.detention==='hospital'?'住院':'坐牢'}三回合：第 ${c.cursor+1}/${c.total} 位，完成后继续本组下一人。` : c.kind === 'companyFee' ? `${c.name}营业费 ${c.amount.toLocaleString()} 元，支付给公司账本。${c.reason}` : (c.kind === 'trafficDetention' || c.kind === 'fortuneTravel') ? c.decision.lines.join(' ') : c.kind === 'newsProsecution' ? `${c.news.lines.join(' ')}（新闻引发）` : c.kind === 'attack' ? `玩家 ${c.sourceId.split('-')[1]}使用${itemName(c.itemId)}。` : c.kind === 'tax' ? `原查税金额 ${c.originalAmount.toLocaleString()} 元，收款人为玩家 ${c.sourceId.split('-')[1]}。` : `本次应付租金 ${c.decision.amount.toLocaleString()} 元。`}</p>
    <p>{free ? `使用免费卡免付本次${c.kind === 'companyFee' ? '营业费' : c.kind === 'tax' ? '税款' : '租金'}；不使用则继续检查嫁祸。` : '可转移给任意其他未破产玩家，包括远处或设施中的玩家；不会再次触发对方的反制卡。'}</p>
    {!free && <label className="rm-form-field">嫁祸目标<select value={target} disabled={snapshot.paused} onChange={e => setTarget(e.target.value)}><option value="">请选择目标</option>{pending.targets.map(id => <option key={id} value={id}>玩家 {id.split('-')[1]}</option>)}</select></label>}
    <p>{!free && c.kind === 'attack' ? `转回使用者为 4 次行动，转给其他玩家为 5 次；不使用时${itemName(c.itemId)}生效后，有复仇卡则自动反击。` : !free ? c.kind === 'magicDetention' ? '实际目标拘留三次，保留车辆；不重复反制或复仇。原目标对施法者的仇恨在反应前已处理。' : c.kind === 'companyFee' ? '最终付款人仍向公司账本支付；转给经营者本人也不免付，之后可能由其他衰神附身者代付。' : c.kind === 'fortuneTravel' ? `实际目标暂离地图${c.change.final?.turns}次；保留原路格和车辆，不重复反制、不触发复仇或解除同盟。` : c.kind === 'trafficDetention' ? `实际目标${c.change.traffic?.kind === 'hospital' ? '住院' : '监禁'}${c.change.traffic?.turns}次；不重复反制，不触发复仇或解除同盟。` : c.kind === 'newsProsecution' ? '实际目标监禁5次；不重复反制，不触发复仇或解除同盟。' : c.kind === 'tax' ? '按被选玩家当前现金的20%重新计算；转给查税发起者本人则免付。' : '由被选玩家承担原额租金；资金不足将由该玩家确认破产。转给业主本人则免付。' : '确认才消耗 1 张；不使用保留卡片。'}</p>
    {error && <p role="alert">{error}</p>}
    <div className="rm-property-actions"><button className="rm-button" disabled={snapshot.paused || (!free && !target)} onClick={() => send('use')}>使用{name}</button><button className="rm-button rm-button-light" disabled={snapshot.paused} onClick={() => send('decline')}>不使用{name}</button></div>
  </section>;
}
