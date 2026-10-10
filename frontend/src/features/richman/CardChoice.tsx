import { useState } from 'react';
import type { EffectAction } from './game/effects';
import type { SessionSnapshot } from './game/session';
import { equalCashPreview } from './game/cards';

export function CardChoice({ snapshot, onUse }: { snapshot: SessionSnapshot; onUse: (action: EffectAction) => boolean }) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const playerId = `player-${snapshot.participants.indexOf(snapshot.active) + 1}`;
  const source = snapshot.economy!.balances[playerId];
  const target = targetId && snapshot.cardTargets?.some(p => p.id === targetId) ? snapshot.economy!.balances[targetId] : null;
  const preview = target && equalCashPreview(source.cash, target.cash);
  const pending = snapshot.effects!.pending!;
  return <section className="rm-property rm-items" aria-label="均贫卡选择">
    <h2>均贫卡 · 平均双方现金</h2>
    <p>确认后消耗 1 张，双方现金各取平均值；存款、地产和点数不变，随后仍可掷骰。</p>
    <fieldset disabled={snapshot.paused}><legend>选择一位对手</legend>
      {snapshot.cardTargets?.map(player => <label className="rm-card-target" key={player.id}>
        <input type="radio" name="equal-cash-target" checked={targetId === player.id} onChange={() => setTargetId(player.id)} />
        {player.name} · 现金 {snapshot.economy!.balances[player.id].cash.toLocaleString()} 元
      </label>)}
    </fieldset>
    {preview && target ? <div aria-label="均贫卡结算预览">
      <p>你的现金：{source.cash.toLocaleString()} → {preview.average.toLocaleString()} 元</p>
      <p>对方现金：{target.cash.toLocaleString()} → {preview.average.toLocaleString()} 元</p>
      <p>双方存款不变。{preview.discarded ? '现金总额为奇数，向下取整后合计减少 1 元。' : '本次取整不损失现金。'}</p>
      {source.cash === target.cash && <p>双方现金相同，确认仍会消耗卡片。</p>}
      {source.cash > target.cash && <p>你将让出部分现金给对方。</p>}
    </div> : <p>请先选择目标，查看结算预览。</p>}
    <p className="rm-property-note">候选版仅选择角色附近的未破产对手；范围不随拖动、缩放改变，未模拟原版像素遮挡。</p>
    {error && <p role="alert">{error}</p>}
    <div className="rm-property-actions"><button className="rm-button" disabled={snapshot.paused || !preview} onClick={() => {
      if (targetId && !onUse({ type: 'confirm', decisionId: pending.id, target: { kind: 'player', id: targetId } })) setError('目标或当前操作已失效，未消耗卡片。');
    }}>确认使用均贫卡</button><button className="rm-button rm-button-light" disabled={snapshot.paused} onClick={() => onUse({ type: 'cancel', decisionId: pending.id })}>取消使用</button></div>
  </section>;
}
