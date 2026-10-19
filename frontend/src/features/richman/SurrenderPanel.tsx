import { useState } from 'react';
import { ClassicDecisionActions, ClassicPrompt } from './ClassicDecisionArt';
import type { SessionSnapshot } from './game/session';

export function SurrenderPanel({ snapshot, confirming, setConfirming, surrender, chooseDeath }: {
  snapshot: SessionSnapshot; confirming: boolean; setConfirming: (value: boolean) => void;
  surrender: () => boolean; chooseDeath: (id: string, target: string | null) => boolean;
}) {
  const [error, setError] = useState('');
  const decision = snapshot.surrenderDecision;
  const choose = (target: string | null) => {
    if (decision && !chooseDeath(decision.id, target)) setError('当前选择已变化，请查看最新应答。');
  };
  return <section className="rm-property rm-classic-surrender" aria-label="认输与衰神">
    <ClassicPrompt><h2>{decision ? '认输已完成' : '认输退出本局'}</h2>
      <p>{decision ? '退出处置已经结束。可以选择一位存活玩家附身衰神；放弃选择不会撤销认输。' : confirming ? '确认认输将退出本局，先处置资产，再按人数条件选择衰神目标。旧时光机历史会清除。' : '认输后将退出本局。请先确认，再进行资产处置。'}</p>
    </ClassicPrompt>
    {decision ? <><fieldset className="rm-surrender-targets" disabled={snapshot.paused}><legend>选择衰神附身对象</legend>
      {decision.targets.map(id => <button type="button" className="rm-button" key={id} onClick={() => choose(id)}>衰神附身玩家 {id.split('-')[1]}</button>)}
      </fieldset><button type="button" className="rm-button rm-button-light" disabled={snapshot.paused} onClick={() => choose(null)}>放弃附身</button></>
      : confirming && snapshot.canSurrender ? <ClassicDecisionActions accept="确认认输" decline="继续对局" disabled={snapshot.paused} onAccept={() => {
        if (surrender()) { setError(''); setConfirming(false); } else setError('当前状态不能认输，请查看正在处理的决策。');
      }} onDecline={() => { setError(''); setConfirming(false); }} />
      : <button type="button" className="rm-button" disabled={!snapshot.canSurrender || snapshot.paused} onClick={() => { setError(''); setConfirming(true); }}>认输退出本局</button>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
