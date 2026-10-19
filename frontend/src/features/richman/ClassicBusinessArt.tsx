import { createContext, useContext, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { itemName } from './game/g3';

export type InventoryView = 'all' | 'tools' | 'cards';
const Selection = createContext<{ view: InventoryView; owned: boolean }>({ view: 'all', owned: false });
const asset = (panel: number, frame = 0) => `/richman/generated/ui/Panel-${panel}/${String(frame).padStart(3, '0')}.png`;

/** Panel[11] stores tool 1..13 at frames 2..14. Native cards use text names. */
export function ClassicItemIcon({ id }: { id: string }) {
  const number = Number(id.split(':')[1]);
  return id.startsWith('tool:') && Number.isInteger(number) && number >= 1 && number <= 13
    ? <img className="rm-item-icon" src={asset(11, number + 1)} alt="" draggable={false} /> : null;
}

export function ClassicInventory({ children, view, onView, shop = false, paused = false, inventory, cardSlots }: {
  children: ReactNode; view?: InventoryView; onView?: (view: InventoryView) => void; shop?: boolean; paused?: boolean;
  inventory?: Record<string, number>; cardSlots?: string[];
}) {
  const [localView, setLocalView] = useState<InventoryView>('all'), [owned, setOwned] = useState(false);
  const selected = view ?? localView;
  return <div className="rm-classic-inventory">
    {shop && <ClassicShopScene cards={selected === 'cards'} />}
    <div className="rm-inventory-controls">
      <div role="group" aria-label="物品分类">{([['all', '全部'], ['tools', '道具'], ['cards', '卡片']] as const).map(([id, name]) =>
        <button type="button" key={id} disabled={paused} aria-pressed={selected === id} onClick={() => { setLocalView(id); onView?.(id); }}>{name}</button>)}</div>
      {!shop && <label><input type="checkbox" checked={owned} onChange={e => setOwned(e.target.checked)} />只看已持有</label>}
    </div>
    {inventory && <div className="rm-inventory-racks">{(['tools', 'cards'] as const).filter(kind => selected === 'all' || selected === kind).map(kind => {
      const ids = kind === 'tools' ? Object.keys(inventory).filter(id => id.startsWith('tool:') && inventory[id] > 0).sort()
        : cardSlots ?? Object.entries(inventory).flatMap(([id, count]) => id.startsWith('card:') ? Array.from({ length: count }, () => id) : []);
      return <div key={kind}><h3>{kind === 'cards' ? `卡包 ${ids.length}/15` : '道具箱'}</h3>
        <div className={`rm-native-rack is-${kind}`} role="group" aria-label={kind === 'cards' ? '卡包槽位' : '道具箱槽位'}>
          {Array.from({ length: Math.max(15, ids.length) }, (_, index) => ids[index]
            ? <button type="button" key={index} aria-label={`查看${itemName(ids[index])}`} onClick={event => {
              const entry = [...(event.currentTarget.closest('.rm-classic-inventory')?.querySelectorAll<HTMLElement>('[data-item-id]') ?? [])].find(el => el.dataset.itemId === ids[index]);
              entry?.scrollIntoView({ block: 'nearest' });
              if (entry) { entry.tabIndex = -1; entry.focus({ preventScroll: true }); }
            }}><ClassicItemIcon id={ids[index]} /><span>{itemName(ids[index])}</span>{kind === 'tools' && <small>×{inventory[ids[index]]}</small>}</button>
            : <span key={index} aria-label="空槽" />)}
        </div>{!ids.length && <p>尚未持有{kind === 'cards' ? '卡片' : '道具'}。</p>}</div>;
    })}</div>}
    <Selection.Provider value={{ view: selected, owned: !shop && owned }}>
      <div className="rm-inventory-grid" data-view={selected}>{children}</div>
    </Selection.Provider>
    {!shop && <p className="rm-property-note">没有物品时可切换“全部”并取消“只看已持有”，查看获得方式。卡片以原版文字格显示。</p>}
  </div>;
}

export function ClassicInventoryEntry({ id, count, children, ...props }: { id: string; count: number; children: ReactNode } & Omit<HTMLAttributes<HTMLDivElement>, 'id'>) {
  const { view, owned } = useContext(Selection), card = id.startsWith('card:');
  const hidden = (view === 'cards' && !card) || (view === 'tools' && card) || (owned && count < 1);
  return <div {...props} hidden={hidden} className={`rm-worker-inventory rm-inventory-entry ${card ? 'is-card' : 'is-tool'}`} data-item-id={id}>
    <ClassicItemIcon id={id} />{children}
  </div>;
}

export function ClassicShopScene({ cards = false }: { cards?: boolean }) {
  return <div className="rm-business-scene rm-shop-scene" aria-hidden="true">
    <img className="rm-business-backdrop" src={asset(10, cards ? 0 : 16)} alt="" />
    <img className={`rm-shop-clerk ${cards ? 'is-card-clerk' : ''}`} src={asset(10, cards ? 2 : 18)} alt="" />
    <span className="rm-scene-caption">三越百货 · {cards ? '卡片柜台' : '道具柜台'}</span>
  </div>;
}

export function ClassicFacilityScene({ prison, targets, selected, paused, onSelect }: {
  prison: boolean; targets: { id: string; remaining: number }[]; selected: string; paused: boolean; onSelect: (id: string) => void;
}) {
  return <div className="rm-business-scene rm-facility-scene">
    <img className="rm-business-backdrop" src={asset(prison ? 63 : 65)} alt="" />
    <div className={`rm-facility-occupants ${prison ? 'is-prison' : 'is-hospital'}`} role="group" aria-label="探访名单">
      {targets.map(target => <button key={target.id} type="button" disabled={paused} aria-pressed={selected === target.id}
        aria-label={`选择玩家 ${target.id.split('-')[1]}`} onClick={() => onSelect(target.id)}>
        玩家 {target.id.split('-')[1]}<small>剩余 {target.remaining} 次</small>
      </button>)}
    </div>
  </div>;
}

export function ClassicLotteryBoard({ tickets, choice, disabled, active, onSelect }: {
  tickets: (string | null)[]; choice?: number; disabled: boolean; active: boolean; onSelect: (n: number) => void;
}) {
  return <div className="rm-business-scene rm-lottery-scene">
    <img className="rm-business-backdrop" src={asset(12)} alt="" />
    <img className="rm-lottery-clerk" src={asset(12, 1)} alt="" />
    <div className="rm-lottery-numbers" role="group" aria-label="彩票号码板">{tickets.map((owner, index) =>
      active ? <button key={index} type="button" disabled={disabled || owner !== null} aria-pressed={choice === index + 1}
        aria-label={`${index + 1}号${owner ? `，玩家${owner.split('-')[1]}已购` : ''}`} onClick={() => onSelect(index + 1)}>{index + 1}{owner && <small>已售</small>}</button> : <span key={index}>{index + 1}{owner && <small>已售</small>}</span>)}</div>
  </div>;
}

export function ClassicStockHistory({ values }: { values: number[] }) {
  const history = values.slice(-12), low = history.length ? Math.min(...history) : 0, high = history.length ? Math.max(...history) : 0, spread = high - low || 1;
  const points = history.map((n, i) => `${24 + i * 544 / Math.max(1, history.length - 1)},${390 - (n - low) / spread * 300}`).join(' ');
  return <figure className="rm-stock-history" aria-label="所选股票近12期走势">
    <svg viewBox="0 0 592 432" role="img" aria-label={history.length ? `价格（元）：${history.map(n => (n / 100).toFixed(2)).join('，')}` : '暂无价格记录'}>
      <image href={asset(76)} width="592" height="432" />
      <polyline fill="none" stroke="#a51c21" strokeWidth="3" points={points} />
      {history.map((n, i) => <circle key={i} cx={24 + i * 544 / Math.max(1, history.length - 1)} cy={390 - (n - low) / spread * 300} r="4" fill="#a51c21" />)}
    </svg><figcaption>近 {history.length} 期 · {(low / 100 || 0).toFixed(2)}–{(high / 100 || 0).toFixed(2)} 元</figcaption>
  </figure>;
}
