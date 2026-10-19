import { useState } from 'react';
import type { Manifest } from './types';
import type { SessionSnapshot } from './game/session';
import { mobilityText } from './game/g2';
import { GODS } from './game/g6-catalog';
import { playerRows, seatId } from './classic-presentation';

const tabs = ['资金', '地产', '股票', '其他'];
export function ClassicPlayerPanel({ manifest, snapshot }: { manifest: Manifest | null; snapshot: SessionSnapshot | null }) {
  const [tab, setTab] = useState(0);
  const id = snapshot ? seatId(snapshot) : '';
  const character = snapshot && manifest?.characters[snapshot.active];
  const rows = snapshot ? playerRows(snapshot, id)[tab] : [['现金', '—'], ['存款', '—'], ['净资产估值', '—']];
  const m = snapshot?.g2?.players[id], engineer = snapshot?.g5?.engineers[id];
  const god = snapshot?.g6?.gods.find(g => g.carrier === id);
  const status = snapshot?.eliminated.includes(snapshot.active) ? '已破产' : [
    m ? mobilityText(m, true) : '步行',
    engineer ? `工程车${engineer.suspended ? '暂停' : ''} · 剩余${engineer.remaining}次自身行动` : '',
    god ? `${GODS.find(g => g.type === god.type)?.name ?? '神仙'} ${god.remaining}次` : '',
    snapshot?.g4?.hotel[id] ? '住宿中' : '',
  ].filter(Boolean).join(' · ');
  // Active seat stays visible when another player is responding; name that responder separately.
  const responder = snapshot?.auction?.responderId ?? snapshot?.reaction?.responderId ?? snapshot?.debtDecision?.payerId ?? snapshot?.decision?.payerId;
  const responderIndex = responder && snapshot?.participants[Number(responder.split('-')[1]) - 1];
  const response = responder && responder !== id ? `应答：${typeof responderIndex === 'number' ? manifest?.characters[responderIndex]?.name : responder}` : '';
  return <section className="rm-classic-player" aria-label="当前人物摘要">
    <img className="rm-classic-background" src={`/richman/generated/ui/Panel-0/00${tab}.png`} alt="" draggable={false} />
    <div className="rm-classic-person">
      {character && <img src={`/richman/generated/${character.id}.webp`} alt="" />}
      <strong>{character?.name ?? '准备中'}</strong>
      <span>{snapshot?.paused ? '已暂停' : snapshot?.computer?.automatic ? '电脑行动中' : '当前角色'}</span>
    </div>
    <details className="rm-classic-status"><summary title="查看人物状态">{response || status}</summary><p>{status}{response && <><br />{response}</>}</p></details>
    <div className="rm-player-tabs" role="tablist" aria-label="人物资料分页">{tabs.map((label, index) => <button key={label} role="tab" id={`rm-player-tab-${index}`} aria-selected={tab === index} aria-controls="rm-player-fields" onClick={() => setTab(index)}>{label}</button>)}</div>
    <dl id="rm-player-fields" role="tabpanel" aria-labelledby={`rm-player-tab-${tab}`} className="rm-classic-balances">
      {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    <small className="rm-classic-price">物价指数 {snapshot?.calendar?.business?.priceIndex ?? '—'}{tab === 0 ? ' · 按成本估值' : ''}</small>
  </section>;
}
