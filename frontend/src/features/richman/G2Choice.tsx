import { useState } from 'react';
import type { SessionSnapshot } from './game/session';
import type { EffectAction } from './game/effects';
import { G2_GOODS } from './game/g2';

export function G2Choice({ snapshot, onUse }: { snapshot: SessionSnapshot; onUse: (a: EffectAction, value?: number) => boolean }) {
  const pending = snapshot.effects!.pending!;
  const good = G2_GOODS.find(g => g.effect === pending.definitionId)!;
  const options = snapshot.g2Choices?.[good.id] ?? [];
  const [selected, setSelected] = useState(good.target === 'self' ? options[0]?.target.id ?? '' : '');
  const [error, setError] = useState('');
  const option = options.find(o => o.target.id === selected);
  return <section className="rm-property rm-items" aria-label={`${good.name}选择`}>
    <h2>{good.name} · 效果预览</h2>
    <label className="rm-form-field">{good.target === 'self' ? '作用范围' : '目标玩家'}<select value={selected} disabled={snapshot.paused || good.target === 'self'} onChange={e => setSelected(e.target.value)}>
      <option value="">请选择目标</option>{options.map(o => <option key={o.target.id} value={o.target.id}>{o.title}</option>)}
    </select></label>
    {option ? <div aria-label={`${good.name}结算预览`}><p>{option.detail}</p><p>确认消耗 1 {good.id.startsWith('card:') ? '张卡片' : '辆库存车辆'}，取消不消耗。</p></div> : <p role="status">没有选中有效目标。</p>}
    <p className="rm-property-note">{snapshot.g3 ? '梦游、陷害先检查免罪，再由受影响玩家选择嫁祸，未转移时可自动复仇。' : '附近范围按角色位置固定；当前尚未接入免罪、嫁祸、复仇等反制。'}</p>
    {error && <p role="alert">{error}</p>}
    <div className="rm-property-actions"><button className="rm-button" disabled={snapshot.paused || !option} onClick={() => {
      if (option && !onUse({ type: 'confirm', decisionId: pending.id, target: option.target })) setError('当前操作已失效，未消耗物品，请取消后重试。');
    }}>确认使用{good.name}</button><button className="rm-button rm-button-light" disabled={snapshot.paused} onClick={() => onUse({ type: 'cancel', decisionId: pending.id })}>取消使用</button></div>
  </section>;
}
