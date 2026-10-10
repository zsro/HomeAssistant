import { useState } from 'react';
import type { SessionSnapshot } from './game/session';
import type { EffectAction, Target } from './game/effects';
import { G7_GOODS } from './game/g7-catalog';
const key = (t: Target) => `${t.kind}/${t.id}`;
export function G7Choice({ snapshot, onUse, locate, preview }: { snapshot: SessionSnapshot; onUse: (action: EffectAction) => boolean; locate?: (node: number) => void; preview?: (id: string) => void }) {
  const pending = snapshot.effects!.pending!, good = G7_GOODS.find(g => g.effect === pending.definitionId)!;
  const options = snapshot.g7Choices?.[good.id] ?? [];
  const [selected, setSelected] = useState(options.length === 1 ? key(options[0].target) : ''), [destination, setDestination] = useState(''), [error, setError] = useState('');
  const option = options.find(o => key(o.target) === selected), dest = option?.destinations?.find(d => key(d.target) === destination);
  const focus = (t?: Target) => { if (t?.kind === 'node') locate?.(Number(t.id)); if (t?.kind === 'property') preview?.(t.id); };
  return <section className="rm-property rm-items" aria-label={`${good.name}选择`}>
    <h2>{good.name} · 效果预览</h2>
    <label className="rm-form-field">{good.id === 'tool:10' ? '历史记录' : '使用对象'}<select aria-label={good.id === 'tool:10' ? '历史记录' : '使用对象'} value={selected} disabled={snapshot.paused} onChange={e => { setSelected(e.target.value); setDestination(''); focus(options.find(o => key(o.target) === e.target.value)?.target); }}><option value="">请选择</option>{options.map(o => <option key={key(o.target)} value={key(o.target)}>{o.title}</option>)}</select></label>
    {option?.destinations && <label className="rm-form-field">传送目的地<select value={destination} disabled={snapshot.paused} onChange={e => { setDestination(e.target.value); focus(option.destinations?.find(d => key(d.target) === e.target.value)?.target); }}><option value="">请选择目的地</option>{option.destinations.map(d => <option key={key(d.target)} value={key(d.target)}>{d.title}</option>)}</select></label>}
    <p aria-label={`${good.name}结算预览`}>{option?.detail ?? '选择对象后查看效果。'}{dest && `目的地：${dest.title}。`}</p>
    <p>确认消耗1件。取消不消耗。{good.id === 'tool:10' && '恢复会改变所有玩家的资产和状态，请确认恢复范围。'}</p>
    {error && <p role="alert">{error}</p>}
    <div className="rm-property-actions"><button className="rm-button" disabled={snapshot.paused || !option || (!!option.destinations && !dest)} onClick={() => { if (option && !onUse({ type: 'confirm', decisionId: pending.id, target: option.target, ...(dest ? { destination: dest.target } : {}) })) setError('库存、历史或目标已失效，未消费道具。'); }}>确认使用{good.name}</button><button className="rm-button rm-button-light" disabled={snapshot.paused} onClick={() => onUse({ type: 'cancel', decisionId: pending.id })}>取消使用</button></div>
  </section>;
}
