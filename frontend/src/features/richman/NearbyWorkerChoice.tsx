import { useState } from 'react';
import type { SessionSnapshot } from './game/session';
import type { EffectAction } from './game/effects';
import { PROPERTY_CATALOG } from './game/economy';

export type WorkerSelection = { decisionId: string; propertyId: string };

export function NearbyWorkerChoice({ snapshot, onUse, preview, selection, select }: {
  selection?: WorkerSelection | null; select?: (id: string) => void;
  snapshot: SessionSnapshot; onUse: (action: EffectAction) => boolean; preview?: (id: string) => void;
}) {
  const [localSelected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const targets = snapshot.workerTargets ?? [];
  const playerId = `player-${snapshot.participants.indexOf(snapshot.active) + 1}`;
  const decisionId = snapshot.effects!.pending!.id;
  const selected = select ? selection?.decisionId === decisionId ? selection.propertyId : null : localSelected;
  const selectedDefinition = PROPERTY_CATALOG.properties.find(p => p.id === selected);
  return <section className="rm-property rm-items" aria-label="机器工人选择">
    <h2>选择邻近地块</h2>
    <p>消耗 1 个机器工人，免费建造一级。归属不变，随后仍可掷骰。</p>
    <p className="rm-property-note">候选版：以角色周边的固定范围选地；拖动、缩放和全屏不改变范围。暂未还原原版建筑遮挡选地。</p>
    <p>可点选地图上的地块或住宅，也可从下方列表选择；点选不会立即消耗道具。</p>
    <fieldset disabled={snapshot.paused}><legend>选择建造目标（{targets.length} 块）</legend>
      <div className="rm-worker-targets">{targets.map(id => {
        const definition = PROPERTY_CATALOG.properties.find(p => p.id === id)!;
        const property = snapshot.economy!.properties.find(p => p.id === id)!;
        return <label key={id} className={selected === id ? 'is-selected' : ''}>
          <input type="radio" name="nearby-worker-target" checked={selected === id} onChange={() => { if (select) select(id); else { setSelected(id); preview?.(id); } setError(''); }} />
          <span>{definition.name} · {definition.nodeIds.join(' / ')} 号路格
            <small>{property.ownerId === playerId ? '你的地产' : property.ownerId ? '其他玩家的地产' : '待售地产'} · {property.level} → {property.level + 1} 级</small></span>
        </label>;
      })}</div>
    </fieldset>
    {!targets.length && <p role="status">附近没有可建造的普通地产，请取消后重试。</p>}
    {targets.length > 0 && !selected && <p role="status">请先在地图或列表选择一块地，再确认建造。</p>}
    {selectedDefinition && <p role="status">已选择：{selectedDefinition.name} · {selectedDefinition.nodeIds.join(" / ")} 号路格</p>}
    {selected && <button className="rm-button rm-button-light" disabled={snapshot.paused || !targets.includes(selected)} onClick={() => preview?.(selected)}>定位所选地块</button>}
    {error && <p role="alert">{error}</p>}
    <div className="rm-property-actions"><button className="rm-button" disabled={snapshot.paused || !selected || !targets.includes(selected)} onClick={() => {
      if (selected && !onUse({ type: 'confirm', decisionId, target: { kind: 'property', id: selected } })) setError('目标或当前操作已失效，未消耗道具。');
    }}>确认建造</button><button className="rm-button rm-button-light" disabled={snapshot.paused} onClick={() => onUse({ type: 'cancel', decisionId })}>取消使用</button></div>
  </section>;
}
