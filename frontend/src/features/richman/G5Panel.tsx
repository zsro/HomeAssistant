import { useState } from 'react';
import type { SessionSnapshot } from './game/session';
import { PROPERTY_CATALOG } from './game/economy';
import { itemName } from './game/g3';
export function ResearchPanel({ snapshot, start }: { snapshot: SessionSnapshot; start: (property: string, item: string) => boolean }) {
  const [choice, setChoice] = useState(''), [error, setError] = useState('');
  const options = snapshot.researchChoices ?? [];
  const option = options.find(o => `${o.propertyId}/${o.itemId}` === choice);
  if (!options.length) return null;
  return <section className="rm-property" aria-label="研究生产"><h2>研究所生产</h2>
    <p>选择后确认开工，免费等待5次自身行动，完成自动入包（每种最多9件，满包不接收）。产权改变、改建、查封或等级不足会取消任务。{snapshot.g7 ? '机器工人/时光机/传送机/工程车/核子飞弹分别需1/2/3/4/5级。' : '机器工人需1级，工程车需4级；此模式其他研究产品未开放。'}</p>
    <label className="rm-form-field">生产项目<select value={option ? choice : ''} disabled={snapshot.paused} onChange={e => setChoice(e.target.value)}><option value="">暂不生产</option>{options.map(o => <option key={`${o.propertyId}/${o.itemId}`} value={`${o.propertyId}/${o.itemId}`}>{o.title}</option>)}</select></label>
    <button className="rm-button" disabled={snapshot.paused || !option} onClick={() => { if (option && !start(option.propertyId, option.itemId)) setError('项目已失效，未开始生产。'); else { setChoice(''); setError(''); } }}>确认开始研究</button>
    {error && <p role="alert">{error}</p>}
  </section>;
}
export function G5Status({ snapshot: s }: { snapshot: SessionSnapshot }) {
  if (!s.g5) return null;
  const tasks = s.economy!.properties.filter(p => p.research);
  return <section className="rm-property" aria-label="道路攻击与生产状态"><h2>道路与研究状态</h2>
    {s.g5.hazards.length ? s.g5.hazards.map(h => <p key={h.id}>{itemName(h.itemId)}：{h.carrier ? `玩家${h.carrier.split('-')[1]}携带 · 剩余${h.remaining}格` : `${h.node}号路格`}</p>) : <p>道路无地雷或炸弹。</p>}
    {Object.entries(s.g5.engineers).filter(([, e]) => e).map(([id, e]) => <p key={id}>玩家{id.split('-')[1]} · 工程车剩余{e!.remaining}次自身行动 · 1骰{e!.suspended ? ' · 梦游暂停中' : ''}</p>)}
    {tasks.map(p => <p key={p.id}>{PROPERTY_CATALOG.properties.find(d => d.id === p.id)!.name} · 玩家{p.ownerId?.split('-')[1]}生产{itemName(p.research!.itemId)} · 剩余{p.research!.remaining}次自身行动</p>)}
    <p className="rm-property-note">红色圆标为地雷，深色圆标为炸弹；头顶圆标表示携带。地雷停下触发；携带炸弹按移动格计时。攻击范围采用地图投影候选规则。</p>
  </section>;
}
