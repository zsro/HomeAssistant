import { useState } from 'react';
import type { EffectAction } from './game/effects';
import type { SessionSnapshot } from './game/session';
import { ROADBLOCK_EFFECT } from './game/road-tools';

export function RoadToolChoice({ snapshot, onUse, locate }: { snapshot: SessionSnapshot;
  onUse: (action: EffectAction) => boolean; locate?: (node: number) => void }) {
  const [node, setNode] = useState<number | null>(null);
  const [error, setError] = useState('');
  const pending = snapshot.effects!.pending!;
  const block = pending.definitionId === ROADBLOCK_EFFECT;
  const path = snapshot.robotRoute ?? [];
  const cleared = [...new Set(path)].filter(id => snapshot.roadTools!.blocks.includes(id));
  const hazards = snapshot.g5?.hazards.filter(h => !h.carrier && path.includes(h.node)) ?? [];
  const playerId = `player-${snapshot.participants.indexOf(snapshot.active) + 1}`;
  return <section className="rm-property rm-items" aria-label={block ? '路障选择' : '机器娃娃选择'}>
    <h2>{block ? '放置路障' : '机器娃娃清路'}</h2>
    {block ? <>
      <p>下一位经过这里的玩家会被截停，路障随即消失。放置后仍可掷骰，也可能挡住自己。</p>
      <label className="rm-form-field">目标路格<select aria-label="目标路格" disabled={snapshot.paused} value={node ?? ''} onChange={e => { const id = Number(e.target.value); setNode(id); locate?.(id); }}>
        <option value="" disabled>请选择空路格</option>{snapshot.roadTargets?.map(id => <option key={id} value={id}>{id} 号路格</option>)}
      </select></label>
      <p className="rm-property-note">候选版：角色附近固定范围的空路格，不随拖动或缩放变化。</p>
    </> : <>
      <p>从当前位置前进 9 格，清除沿途路障{snapshot.g5 ? '、地雷和未携带炸弹' : ''}；玩家留在原位，随后仍可掷骰。</p>
      <p aria-label="清路路线" className="rm-robot-route">{snapshot.actors[snapshot.active].node}（起点） → {path.join(' → ')}</p>
      <p>将清除 {cleared.length} 个路障{cleared.length ? `（${cleared.join('、')} 号）` : ''}{hazards.length ? `，${hazards.filter(h => h.itemId === 'tool:03').length} 个地雷和 ${hazards.filter(h => h.itemId === 'tool:04').length} 个未携带炸弹（${hazards.map(h => h.node).join('、')} 号）` : ''}{!cleared.length && !hazards.length ? '；当前路线没有障碍，确认仍会消耗道具' : ''}。</p>
      <p className="rm-property-note">候选版岔路按最小路格编号前进并避免回头，死路折返；地图黄线为本次路线。</p>
    </>}
    {error && <p role="alert">{error}</p>}
    <div className="rm-property-actions"><button className="rm-button" disabled={snapshot.paused || (block && node === null)} onClick={() => {
      if (!onUse({ type: 'confirm', decisionId: pending.id, target: block ? { kind: 'node', id: String(node) } : { kind: 'player', id: playerId } })) setError('当前操作或目标已失效，未消耗道具。');
    }}>{block ? '确认放置路障' : '确认清路'}</button>
    <button className="rm-button rm-button-light" disabled={snapshot.paused} onClick={() => onUse({ type: 'cancel', decisionId: pending.id })}>取消使用</button></div>
  </section>;
}
