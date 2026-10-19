import type { ReactNode } from 'react';

const frame = (panel: number, index: number) => `/richman/generated/ui/Panel-${panel}/${String(index).padStart(3, '0')}.png`;

/** Native scenery; actor placement and the readable information board are Web adaptations. */
export function ClassicEventScene({ kind, children }: { kind: 'magic' | 'auction'; children: ReactNode }) {
  const panel = kind === 'magic' ? 18 : 26;
  return <div className={`rm-event-scene rm-event-scene-${kind}`}>
    <img className="rm-event-backdrop" src={frame(panel, 0)} alt="" draggable={false} />
    <img className="rm-event-host" src={frame(panel, kind === 'magic' ? 1 : 17)} alt="" draggable={false} />
    <div className="rm-event-board">{children}</div>
  </div>;
}

/** Give up maps to the existing permanent withdrawal. PASS remains a separate unavailable entry. */
export function ClassicBidButton({ increment, disabled, onClick }: { increment: number | null; disabled: boolean; onClick: () => void }) {
  const index = increment === null ? 15 : ({ 100: 5, 500: 7, 1000: 9, 5000: 11, 10000: 13 } as Record<number, number>)[increment];
  return <button type="button" className="rm-native-bid" disabled={disabled} onClick={onClick}>
    {index !== undefined && <span aria-hidden="true"><img src={frame(26, index)} alt="" draggable={false} /><img className="rm-bid-hover" src={frame(26, index + 1)} alt="" draggable={false} /></span>}
    <span>{increment === null ? '退出竞价' : `加价 ${increment.toLocaleString()}`}</span>
  </button>;
}

export function ClassicAuctionPass() {
  return <button type="button" className="rm-native-bid" disabled title="当前竞价规则未接入 PASS；退出竞价会永久退出本次拍卖。">
    <span aria-hidden="true"><img src={frame(26, 3)} alt="" draggable={false} /></span>
    <span>PASS · 暂未接入</span>
  </button>;
}
