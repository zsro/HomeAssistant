import { useState } from 'react';
import type { EffectAction } from './game/effects';
import type { SessionSnapshot } from './game/session';
import { G1_GOODS, g1UnavailableReason } from './game/g1';

export function G1Choice({ snapshot, onUse, preview }: { snapshot: SessionSnapshot; onUse: (action: EffectAction) => boolean; preview?: (id: string) => void }) {
  const pending = snapshot.effects!.pending!;
  const good = G1_GOODS.find(g => g.effect === pending.definitionId)!;
  const options = snapshot.g1Choices?.[good.id] ?? [];
  const [selected, setSelected] = useState(good.id === 'card:03' ? options[0]?.target.id ?? '' : '');
  const [error, setError] = useState('');
  const option = options.find(o => o.target.id === selected);
  return <section className="rm-property rm-items" aria-label={`${good.name}选择`}>
    <h2>{good.name} · 结算预览</h2>
    <p>{good.id === 'card:03' ? '购买脚下他人的普通地产。' : ['card:04', 'card:05'].includes(good.id) ? '源地块固定为脚下普通地产，再选择另一块附近普通地产。' : good.id === 'card:12' ? '选择附近非己方且有建筑的普通地产，降低一级。' : '选择附近玩家转向，可以选择自己。'}</p>
    {options.length ? <label className="rm-form-field">{good.id === 'card:06' ? '转向玩家' : '目标地块'}<select value={selected} disabled={snapshot.paused || good.id === 'card:03'} onChange={e => { setSelected(e.target.value); setError(''); }}>
      <option value="">请选择目标</option>{options.map(o => <option key={o.target.id} value={o.target.id}>{o.title}</option>)}
    </select></label> : <p role="status">{g1UnavailableReason(good.id)}，请取消后重试。</p>}
    {option && <div aria-label={`${good.name}结算预览`}><p>{option.detail}</p><p>确认消耗 1 张，随后仍可使用卡片或掷骰。</p></div>}
    {option?.target.kind === 'property' && preview && <button className="rm-button rm-button-light" disabled={snapshot.paused} onClick={() => preview(option.target.id)}>定位目标地块</button>}
    <p className="rm-property-note">附近范围随角色位置确定。地产卡当前只支持普通地块；特殊建筑与道路物件尚未开放。</p>
    {error && <p role="alert">{error}</p>}
    <div className="rm-property-actions"><button className="rm-button" disabled={snapshot.paused || !option} onClick={() => {
      if (option && !onUse({ type: 'confirm', decisionId: pending.id, target: option.target })) setError('目标或操作已失效，未消耗卡片。');
    }}>确认使用{good.name}</button><button className="rm-button rm-button-light" disabled={snapshot.paused} onClick={() => onUse({ type: 'cancel', decisionId: pending.id })}>取消使用</button></div>
  </section>;
}
