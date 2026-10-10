import { useState } from 'react';
import type { EffectAction } from './game/effects';
import type { SessionSnapshot } from './game/session';
import { wealthPreview } from './game/wealth';

export function WealthChoice({ snapshot, onUse }: { snapshot: SessionSnapshot; onUse: (action: EffectAction) => boolean }) {
  const [error, setError] = useState('');
  const players = snapshot.wealthPlayers ?? [];
  const preview = wealthPreview(players.map(p => p.cash));
  const playerId = `player-${snapshot.participants.indexOf(snapshot.active) + 1}`;
  const pending = snapshot.effects!.pending!;
  return <section className="rm-property rm-items" aria-label="均富卡确认">
    <h2>均富卡 · 平均全员现金</h2>
    <p>包含你在内的全部 {players.length} 位未破产玩家参加，不受距离限制。确认后消耗 1 张，随后仍可掷骰。</p>
    {preview && <div aria-label="均富卡结算预览">
      {players.map(p => <p key={p.id}>{p.name}{p.id === playerId ? '（你）' : ''}：{p.cash.toLocaleString()} → {preview.average.toLocaleString()} 元</p>)}
      <p>存款、地产和点数不变。{preview.discarded ? `向下取整后，现金总额减少 ${preview.discarded} 元。` : '本次取整不损失现金。'}</p>
      {players.every(p => p.cash === preview.average) && <p>全员现金相同，确认仍会消耗卡片。</p>}
      {(players.find(p => p.id === playerId)?.cash ?? 0) > preview.average && <p>你的现金将减少，请确认分配结果。</p>}
    </div>}
    {error && <p role="alert">{error}</p>}
    <div className="rm-property-actions"><button className="rm-button" disabled={snapshot.paused || !preview} onClick={() => {
      if (!onUse({ type: 'confirm', decisionId: pending.id, target: { kind: 'player', id: playerId } })) setError('当前操作已失效，未消耗卡片。');
    }}>确认使用均富卡</button><button className="rm-button rm-button-light" disabled={snapshot.paused} onClick={() => onUse({ type: 'cancel', decisionId: pending.id })}>取消使用</button></div>
  </section>;
}
