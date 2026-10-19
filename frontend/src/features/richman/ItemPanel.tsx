import { ClassicInventory, ClassicInventoryEntry } from './ClassicBusinessArt';
import type { InventoryView } from './ClassicBusinessArt';
import { ClassicPrompt, ClassicDecisionActions } from './ClassicDecisionArt';
import {ShopAcquisitionPanel} from './ShopAcquisitionPanel';
import {ShopSellPanel} from './SiteServicesPanel';
import { G7_GOODS } from './game/g7-catalog';
import { G7Choice } from './G7Choice';
import { G6_GOODS } from './game/g6-catalog';
import { G5_GOODS } from './game/g5-catalog';
import { G4Choice } from './G4Choice';
import { G4_GOODS } from './game/g4-catalog';
import { G3Choice } from './G3Choice';
import { G3_GOODS } from './game/g3';
import { G2Choice } from './G2Choice';
import { G2_GOODS, g2PurchaseReason, actionLocked } from './game/g2';
import { G1Choice } from './G1Choice';
import { G1_GOODS, g1PurchaseReason, g1UnavailableReason } from './game/g1';
import { WealthChoice } from './WealthChoice';
import { WEALTH_CARD, WEALTH_EFFECT, WEALTH_RULES, wealthPurchaseReason } from './game/wealth';
import { CardChoice } from './CardChoice';
import { CARD_RULES, EQUAL_CASH, EQUAL_CASH_EFFECT, cardCount, cardPurchaseReason } from './game/cards';
import { RoadToolChoice } from './RoadToolChoice';
import { ROAD_GOODS, ROBOT_EFFECT, ROADBLOCK_EFFECT, ROADBLOCK } from './game/road-tools';
import type { WorkerSelection } from './NearbyWorkerChoice';
import { NEARBY_WORKER_EFFECT } from './game/nearby-construction';
import { NearbyWorkerChoice } from './NearbyWorkerChoice';
import { WORKER, WORKER_EFFECT, workerTarget } from './game/construction';
import { PROPERTY_CATALOG } from './game/economy';
import { useState } from 'react';
import type { SessionSnapshot } from './game/session';
import type { EffectAction } from './game/effects';
import { ITEM_RULES, REMOTE_DICE, REMOTE_EFFECT } from './game/items';

type Props = { inventoryView?: InventoryView; onInventoryView?: (view: InventoryView) => void; snapshot: SessionSnapshot; onUse: (action: EffectAction, value?: number, stolenItemId?: string) => boolean;
  sell?:(id:string,item:string)=>boolean; selection?: WorkerSelection | null; select?: (id: string) => void; preview?: (id: string) => void; locateRoad?: (node: number) => void; buy: (id: string, itemId?: string) => boolean; leave: (id: string) => void };
function DiceChoice({ id, playerId, paused, onUse }: { id: string; playerId: string; paused: boolean } & Pick<Props, 'onUse'>) {
  const [value, setValue] = useState<number | null>(null);
  const [error, setError] = useState('');
  return <section className="rm-property rm-items rm-classic-target" aria-label="遥控骰子选择">
    <ClassicPrompt><h2>这次前进几步？</h2><p>遥控骰子 · {value === null ? '请选择点数' : `${value} 点`}</p></ClassicPrompt><p>选择 1–6 点。确认后消耗 1 个遥控骰子并出发，取消不会消耗。</p>
    <fieldset disabled={paused}><legend>骰子点数</legend><div className="rm-dice-options">
      {[1, 2, 3, 4, 5, 6].map(n => <label key={n}><input type="radio" name="controlled-die" checked={value === n} onChange={() => setValue(n)} />{n} 点</label>)}
    </div></fieldset>
    {error && <p role="alert">{error}</p>}
    <ClassicDecisionActions accept="确认并出发" decline="取消使用" disabled={paused || value === null} declineDisabled={paused} onAccept={() => {
      if (!onUse({ type: 'confirm', decisionId: id, target: { kind: 'player', id: playerId } }, value!)) setError('当前操作已失效，请取消后重试。');
    }} onDecline={() => onUse({ type: 'cancel', decisionId: id })} />
  </section>;
}
function WorkerChoice({ snapshot, onUse }: Pick<Props, 'snapshot' | 'onUse'>) {
  const [selected, setSelected] = useState(false);
  const [error, setError] = useState('');
  const target = snapshot.economy && workerTarget(snapshot.actors[snapshot.active].node, PROPERTY_CATALOG.properties, snapshot.economy.properties);
  const definition = PROPERTY_CATALOG.properties.find(p => p.id === target);
  const property = snapshot.economy?.properties.find(p => p.id === target);
  const id = snapshot.effects!.pending!.id;
  const playerId = `player-${snapshot.participants.indexOf(snapshot.active) + 1}`;
  return <section className="rm-property rm-items rm-classic-target" aria-label="机器工人选择">
    <ClassicPrompt><h2>建造当前地块</h2><p>机器工人 · 免费建造一级</p></ClassicPrompt><p>确认后消耗 1 个机器工人，免费建造一级，随后仍可掷骰。</p>
    {definition && property ? <fieldset disabled={snapshot.paused}>
      <legend>选择建造目标</legend><label><input type="radio" checked={selected} onChange={() => setSelected(true)} />
        {definition.name} · {snapshot.actors[snapshot.active].node} 号路格</label>
      <p>{property.ownerId === playerId ? '你的地产' : property.ownerId ? '其他玩家的地产' : '待售地产'} · {property.level} → {property.level + 1} 级</p>
      <p>归属不变，不扣现金、存款或点数。</p>
    </fieldset> : <p role="status">当前地块不可建造，请取消后重试。</p>}
    <p className="rm-property-note">限定版仅支持当前普通地产；远处选地和大型用地尚未开放。</p>
    {error && <p role="alert">{error}</p>}
    <ClassicDecisionActions accept="确认建造" decline="取消使用" disabled={snapshot.paused || !selected || !target} declineDisabled={snapshot.paused} onAccept={() => {
      if (target && !onUse({ type: 'confirm', decisionId: id, target: { kind: 'property', id: target } })) setError('目标或当前操作已失效，未消耗道具。');
    }} onDecline={() => onUse({ type: 'cancel', decisionId: id })} />
  </section>;
}
export function ItemPanel({ snapshot, onUse, buy, sell, leave, preview, selection, select, locateRoad, inventoryView, onInventoryView }: Props) {
  const [error, setError] = useState('');
  const items = snapshot.items, effects = snapshot.effects;
  if (!items || !effects || snapshot.phase === 'finished' || snapshot.phase === 'reaction' || snapshot.phase === 'auction') return null;
  const playerId = `player-${snapshot.participants.indexOf(snapshot.active) + 1}`;
  if (snapshot.eliminated.includes(snapshot.active)) return null;
  const quantity = effects.inventory[playerId][REMOTE_DICE] ?? 0;
  const mobility = snapshot.g2?.players[playerId];
  if (actionLocked(mobility) || snapshot.g4?.hotel[playerId]) return null;
  if (snapshot.phase === 'effect' && G7_GOODS.some(g => g.effect === effects.pending?.definitionId)) return <G7Choice key={effects.pending!.id} snapshot={snapshot} onUse={onUse} locate={locateRoad} preview={preview} />;
  if (snapshot.phase === 'effect' && G6_GOODS.some(g => g.effect === effects.pending?.definitionId)) return <G4Choice key={effects.pending!.id} group={6} snapshot={snapshot} onUse={onUse} />;
  if (snapshot.phase === 'effect' && G5_GOODS.some(g => g.effect === effects.pending?.definitionId)) return <G4Choice key={effects.pending!.id} group={5} snapshot={snapshot} onUse={onUse} preview={preview} locate={locateRoad} />;
  if (snapshot.phase === 'effect' && G4_GOODS.some(g => g.effect === effects.pending?.definitionId)) return <G4Choice key={effects.pending!.id} snapshot={snapshot} onUse={onUse} preview={preview} />;
  if (snapshot.phase === 'effect' && G3_GOODS.some(g => g.effect === effects.pending?.definitionId)) return <G3Choice key={effects.pending!.id} snapshot={snapshot} onUse={onUse} />;
  if (snapshot.phase === 'effect' && G2_GOODS.some(g => g.effect === effects.pending?.definitionId)) return <G2Choice key={effects.pending!.id} snapshot={snapshot} onUse={onUse} />;
  if (snapshot.phase === 'effect' && G1_GOODS.some(g => g.effect === effects.pending?.definitionId)) return <G1Choice key={effects.pending!.id} snapshot={snapshot} onUse={onUse} preview={preview} />;
  if (snapshot.phase === 'effect' && effects.pending?.definitionId === WEALTH_EFFECT) return <WealthChoice key={effects.pending.id} snapshot={snapshot} onUse={onUse} />;
  if (snapshot.phase === 'effect' && effects.pending?.definitionId === EQUAL_CASH_EFFECT) return <CardChoice key={effects.pending.id} snapshot={snapshot} onUse={onUse} />;
  if (snapshot.phase === 'effect' && effects.pending && [ROBOT_EFFECT, ROADBLOCK_EFFECT].includes(effects.pending.definitionId)) return <RoadToolChoice key={effects.pending.id} snapshot={snapshot} onUse={onUse} locate={locateRoad} />;
  if (snapshot.phase === 'effect' && effects.pending?.definitionId === NEARBY_WORKER_EFFECT) return <NearbyWorkerChoice key={effects.pending.id} snapshot={snapshot} onUse={onUse} preview={preview} selection={selection} select={select} />;
  if (snapshot.phase === 'effect' && effects.pending?.definitionId === WORKER_EFFECT) return <WorkerChoice key={effects.pending.id} snapshot={snapshot} onUse={onUse} />;
  if (snapshot.phase === 'effect' && effects.pending) return <DiceChoice key={effects.pending.id} id={effects.pending.id} playerId={playerId} paused={snapshot.paused} onUse={onUse} />;
  const shop = snapshot.shopDecision;
  if(shop?.shelf)return <ShopAcquisitionPanel key={shop.node} snapshot={snapshot} buy={(id,item)=>buy(id,item)} sell={sell} leave={leave}/>;
  const workerCount = effects.inventory[playerId][WORKER];
  // G1 and all later profiles inherit the nearby worker; avoid a growing mode-name allowlist.
  const nearby = !!snapshot.g1 || ['nearby', 'roadTools', 'cards', 'wealth'].includes(snapshot.mode);
  const buildTarget = nearby ? (snapshot.workerTargets?.length ?? 0) > 0 : snapshot.economy && workerTarget(snapshot.actors[snapshot.active].node, PROPERTY_CATALOG.properties, snapshot.economy.properties);
  const workerReason = !workerCount ? '机器工人已用完' : !buildTarget ? (nearby ? '附近没有未满 5 级的普通地产' : '仅当前普通地产且未满 5 级可用') : '';
  const reason = items.points[playerId] < ITEM_RULES.price ? '点数不足' : quantity >= ITEM_RULES.capacity ? '已达到持有上限' : items.supply <= 0 ? '暂时售罄' : '';
  return <section className="rm-property rm-items" aria-label={shop ? '三越百货' : '我的道具'}>
    <div className="rm-section-title"><h2>{shop ? '三越百货' : '我的道具'}</h2><span>{items.points[playerId]} 点</span></div>
    {shop?.turnover!==undefined&&sell&&<ShopSellPanel key={shop.id} snapshot={snapshot} sell={sell}/>}
    <ClassicInventory inventory={shop?undefined:effects.inventory[playerId]} cardSlots={snapshot.g3?.slots[playerId]} paused={snapshot.paused} shop={!!shop} view={inventoryView} onView={onInventoryView}>
    {snapshot.g5 && <div role="region" aria-label="建拆与道路攻击">{G5_GOODS.filter(g => !shop || g.shop).map(good => {
      const count = effects.inventory[playerId][good.id] ?? 0;
      const reason = shop ? g2PurchaseReason(effects.inventory[playerId], items.points[playerId], snapshot.g5!.supply[good.id], good.id, good.price)
        : !count ? (good.shop ? `三越百货 ${good.price} 点购买` : '需在4级研究所生产（5次自身行动）') : !snapshot.g5Choices?.[good.id]?.length ? '当前没有合法目标或已经驾驶工程车' : '';
      return <ClassicInventoryEntry id={good.id} count={count} key={good.id}><p><strong>{good.name} × {count}</strong></p>
        {shop && <p>单价 {good.price} 点 · 剩余 {snapshot.g5!.supply[good.id]}</p>}
        <button className="rm-button rm-button-light" disabled={snapshot.paused || !!reason || (!shop && snapshot.phase !== 'idle')} onClick={() => {
          const ok = shop ? buy(shop.id, good.id) : onUse({ type: 'begin', definitionId: good.effect }); setError(ok ? '' : '当前操作无法完成。');
        }}>{shop ? '购买' : '使用'}{good.name}</button>{reason && <p className="rm-property-note">{reason}</p>}
      </ClassicInventoryEntry>;
    })}</div>}
    {snapshot.g7 && !shop && <div role="region" aria-label="高级科研工具">{G7_GOODS.map(g => {
      const count = effects.inventory[playerId][g.id] ?? 0;
      const reason = !count ? `需${g.level}级研究所生产，等待5次自身行动` : !snapshot.g7Choices?.[g.id]?.length ? (g.id === 'tool:10' ? '需要此前出发记录，且历史背包也持有时光机；取得后先正常出发一次' : '当前没有合法对象') : '';
      return <ClassicInventoryEntry id={g.id} count={count} key={g.id}><p><strong>{g.name} × {count}</strong></p><button className="rm-button rm-button-light" disabled={snapshot.paused || !!reason || snapshot.phase !== 'idle'} onClick={() => setError(onUse({ type: 'begin', definitionId: g.effect }) ? '' : '当前操作无法完成。')}>使用{g.name}</button>{reason && <p className="rm-property-note">{reason}</p>}</ClassicInventoryEntry>;
    })}</div>}
    {snapshot.g6 && <div role="region" aria-label="神仙与股票卡片">{G6_GOODS.map(good => {
      const count = effects.inventory[playerId][good.id] ?? 0;
      const reason = shop ? g2PurchaseReason(effects.inventory[playerId], items.points[playerId], snapshot.g6!.supply[good.id], good.id, good.price)
        : !count ? `可在三越百货花费 ${good.price} 点购买` : !snapshot.g6Choices?.[good.id]?.length ? (good.id === 'card:22' ? '未携带炸弹且没有可送走的不利附身' : '附近没有可召请的游离神仙') : '';
      return <ClassicInventoryEntry id={good.id} count={count} key={good.id}><p><strong>{good.name} × {count}</strong></p>
        {shop && <p>单价 {good.price} 点 · 剩余 {snapshot.g6!.supply[good.id]}</p>}
        <button className="rm-button rm-button-light" disabled={snapshot.paused || !!reason || (!shop && snapshot.phase !== 'idle')} onClick={() => {
          const ok = shop ? buy(shop.id, good.id) : onUse({ type: 'begin', definitionId: good.effect }); setError(ok ? '' : '当前操作无法完成。');
        }}>{shop ? '购买' : '使用'}{good.name}</button>{reason && <p className="rm-property-note">{reason}</p>}
      </ClassicInventoryEntry>;
    })}</div>}
    {snapshot.g4 && <div role="region" aria-label="地产经营卡片">{G4_GOODS.map(good => {
      const count = effects.inventory[playerId][good.id] ?? 0;
      const reason = shop ? g2PurchaseReason(effects.inventory[playerId], items.points[playerId], snapshot.g4!.supply[good.id], good.id, good.price)
        : !count ? `可在三越百货花费 ${good.price} 点购买` : !snapshot.g4Choices?.[good.id]?.length ? (good.id === 'card:07' ? '需站在已有建筑的地产上' : good.id === 'card:08' ? '需站在普通或大型地产上' : '附近没有有效目标') : '';
      return <ClassicInventoryEntry id={good.id} count={count} key={good.id}><p><strong>{good.name} × {count}</strong></p>
        {shop && <p>单价 {good.price} 点 · 剩余 {snapshot.g4!.supply[good.id]}</p>}
        <button className="rm-button rm-button-light" disabled={snapshot.paused || !!reason || (!shop && snapshot.phase !== 'idle')} onClick={() => {
          const ok = shop ? buy(shop.id, good.id) : onUse({ type: 'begin', definitionId: good.effect }); setError(ok ? '' : '当前操作无法完成。');
        }}>{shop ? '购买' : '使用'}{good.name}</button>{reason && <p className="rm-property-note">{reason}</p>}
      </ClassicInventoryEntry>;
    })}</div>}
    {snapshot.g3 && <div role="region" aria-label="反应与交互卡片">{G3_GOODS.map(good => {
      const count = effects.inventory[playerId][good.id] ?? 0;
      const reason = shop ? g2PurchaseReason(effects.inventory[playerId], items.points[playerId], snapshot.g3!.supply[good.id], good.id, good.price)
        : good.passive ? ({ 'card:18': '梦游/陷害命中后自动复仇', 'card:19': snapshot.g4 ? '遭遇攻击、租金或查税时按条件选择嫁祸' : '遭遇梦游/陷害或大额租金时选择嫁祸', 'card:20': snapshot.g4 ? '适用租金或查税时选择免付（住宿费除外）' : '大额租金或资金不足时选择免付', 'card:21': '优先自动抵挡梦游/陷害' } as Record<string, string>)[good.id] : !count ? `可在三越百货花费 ${good.price} 点购买` : !snapshot.g3Choices?.[good.id]?.length ? '附近没有有效目标' : '';
      return <ClassicInventoryEntry id={good.id} count={count} key={good.id}><p><strong>{good.name} × {count}</strong></p>
        {shop && <p>单价 {good.price} 点 · 剩余 {snapshot.g3!.supply[good.id]}</p>}
        {(shop || !good.passive) && <button className="rm-button rm-button-light" disabled={snapshot.paused || !!reason || (!shop && snapshot.phase !== 'idle')} onClick={() => {
          const ok = shop ? buy(shop.id, good.id) : onUse({ type: 'begin', definitionId: good.effect }); setError(ok ? '' : '当前操作无法完成。');
        }}>{shop ? '购买' : '使用'}{good.name}</button>}{reason && <p className="rm-property-note">{reason}</p>}
      </ClassicInventoryEntry>;
    })}</div>}
    {snapshot.g2 && <div role="region" aria-label="状态与车辆物品">{G2_GOODS.map(good => {
      const inventory = effects.inventory[playerId], count = inventory[good.id] ?? 0;
      const reason = shop ? g2PurchaseReason(inventory, items.points[playerId], snapshot.g2!.supply[good.id], good.id, good.price)
        : !count ? `可在三越百货花费 ${good.price} 点购买` : !snapshot.g2Choices?.[good.id]?.length ? '当前没有合法目标，或已装备相同车辆' : '';
      return <ClassicInventoryEntry id={good.id} count={count} key={good.id}><p><strong>{good.name} × {count}</strong></p>
        {shop && <p>单价 {good.price} 点 · 剩余 {snapshot.g2!.supply[good.id]}</p>}
        <button className="rm-button rm-button-light" disabled={snapshot.paused || !!reason || (!shop && snapshot.phase !== 'idle')} onClick={() => {
          const ok = shop ? buy(shop.id, good.id) : onUse({ type: 'begin', definitionId: good.effect });
          setError(ok ? '' : '当前操作无法完成，请检查库存、点数或目标。');
        }}>{shop ? '购买' : '使用'}{good.name}</button>{reason && <p className="rm-property-note">{reason}</p>}
      </ClassicInventoryEntry>;
    })}</div>}
    {snapshot.g1 && <div role="region" aria-label="地产与方向卡片">{G1_GOODS.map(good => {
      const inventory = effects.inventory[playerId], count = inventory[good.id] ?? 0;
      const reason = shop ? g1PurchaseReason(inventory, items.points[playerId], snapshot.g1!.supply[good.id], good.price)
        : !count ? `可在三越百货花费 ${good.price} 点购买` : !snapshot.g1Choices?.[good.id]?.length ? g1UnavailableReason(good.id) : '';
      return <ClassicInventoryEntry id={good.id} count={count} key={good.id}><p><strong>{good.name} × {count}</strong></p>
        {shop && <p>单价 {good.price} 点 · 剩余 {snapshot.g1!.supply[good.id]} 张</p>}
        <button className="rm-button rm-button-light" disabled={snapshot.paused || !!reason || (!shop && snapshot.phase !== 'idle')} onClick={() => {
          const ok = shop ? buy(shop.id, good.id) : onUse({ type: 'begin', definitionId: good.effect });
          setError(ok ? '' : '当前操作无法完成，请检查点数、库存或目标。');
        }}>{shop ? '购买' : '使用'}{good.name}</button>{reason && <p className="rm-property-note">{reason}</p>}
      </ClassicInventoryEntry>;
    })}</div>}
    {snapshot.wealth && (() => {
      const inventory = effects.inventory[playerId], count = inventory[WEALTH_CARD] ?? 0;
      const reason = shop ? wealthPurchaseReason(inventory, items.points[playerId], snapshot.wealth.supply)
        : !count ? '可在三越百货花费 200 点购买' : '';
      return <ClassicInventoryEntry id={WEALTH_CARD} count={count} role="region" aria-label="我的均富卡"><p><strong>均富卡 × {count}</strong> · 卡片 {cardCount(inventory)}/{WEALTH_RULES.capacity}</p>
        <p>{shop ? `单价 ${WEALTH_RULES.price} 点 · 剩余 ${snapshot.wealth.supply} 张` : '将全体未破产玩家的现金平均，包含你自己。'}</p>
        <button className="rm-button rm-button-light" disabled={snapshot.paused || !!reason || (!shop && snapshot.phase !== 'idle')} onClick={() => {
          const ok = shop ? buy(shop.id, WEALTH_CARD) : onUse({ type: 'begin', definitionId: WEALTH_EFFECT });
          setError(ok ? '' : '当前操作无法完成，请检查点数、库存或对局状态。');
        }}>{shop ? '购买均富卡' : '使用均富卡'}</button>{reason && <p className="rm-property-note">{reason}</p>}
      </ClassicInventoryEntry>;
    })()}
    {snapshot.cards && (() => {
      const inventory = effects.inventory[playerId], count = inventory[EQUAL_CASH] ?? 0;
      const reason = shop ? cardPurchaseReason(inventory, items.points[playerId], snapshot.cards.supply)
        : !count ? '可在三越百货花费 200 点购买' : !snapshot.cardTargets?.length ? '附近没有可选择的对手' : '';
      return <ClassicInventoryEntry id={EQUAL_CASH} count={count} role="region" aria-label="我的卡片"><p><strong>均贫卡 × {count}</strong> · 卡片 {cardCount(inventory)}/{CARD_RULES.capacity}</p>
        <p>{shop ? `单价 ${CARD_RULES.price} 点 · 剩余 ${snapshot.cards.supply} 张` : '选择对手，将双方现金平均；存款不变。'}</p>
        <button className="rm-button rm-button-light" disabled={snapshot.paused || !!reason || (!shop && snapshot.phase !== 'idle')} onClick={() => {
          const ok = shop ? buy(shop.id, EQUAL_CASH) : onUse({ type: 'begin', definitionId: EQUAL_CASH_EFFECT });
          setError(ok ? '' : '当前操作无法完成，请检查点数、库存或目标。');
        }}>{shop ? '购买均贫卡' : '使用均贫卡'}</button>{reason && <p className="rm-property-note">{reason}</p>}
      </ClassicInventoryEntry>;
    })()}
    {snapshot.roadTools && ROAD_GOODS.map(good => {
      const count = effects.inventory[playerId][good.id] ?? 0;
      const supply = snapshot.roadTools!.supply[good.id];
      const disabledReason = shop ? items.points[playerId] < good.price ? '点数不足' : count >= 9 ? '已达到持有上限' : supply <= 0 ? '暂时售罄' : ''
        : count < 1 ? '道具已用完' : good.id === ROADBLOCK && !snapshot.roadTargets?.length ? '附近没有可放置的空路格' : '';
      return <ClassicInventoryEntry id={good.id} count={count} key={good.id}><p><strong>{good.name} × {count}</strong></p>
        <p>{shop ? `单价 ${good.price} 点 · 库存 ${supply} 个 · 最多持有 9 个` : good.id === ROADBLOCK ? '放置路障，截停经过的玩家。' : '向前清路九格，玩家留在原位。'}</p>
        <button className="rm-button rm-button-light" disabled={snapshot.paused || !!disabledReason || (!shop && snapshot.phase !== 'idle')} onClick={() => {
          const ok = shop ? buy(shop.id, good.id) : onUse({ type: 'begin', definitionId: good.effect });
          setError(ok ? '' : '当前操作无法完成，请检查对局状态。');
        }}>{shop ? '购买' : '使用'}{good.name}</button>{disabledReason && <p className="rm-property-note">{disabledReason}</p>}
      </ClassicInventoryEntry>;
    })}
    {snapshot.roadTools && <p className="rm-property-note">地图路障：{snapshot.roadTools.blocks.length ? snapshot.roadTools.blocks.map(id => `${id} 号`).join('、') : '无'}</p>}
    {workerCount !== undefined && <ClassicInventoryEntry id={WORKER} count={workerCount}>
      <p><strong>机器工人 × {workerCount}</strong> · {nearby ? '邻近建造候选版' : '当前地块限定版'}</p>
      {!shop && <><button className="rm-button rm-button-light" disabled={snapshot.paused || snapshot.phase !== 'idle' || !!workerReason} onClick={() => {
        if (!onUse({ type: 'begin', definitionId: nearby ? NEARBY_WORKER_EFFECT : WORKER_EFFECT })) setError('暂时无法使用机器工人。'); else setError('');
      }}>使用机器工人</button>{workerReason && <p className="rm-property-note">{workerReason}</p>}</>}
      <p className="rm-property-note">开局持有 1 个，不在商店出售。</p>
    </ClassicInventoryEntry>}
    <ClassicInventoryEntry id={REMOTE_DICE} count={quantity}><p><strong>遥控骰子 × {quantity}</strong></p>
    {shop ? <>
      <p>单价 {ITEM_RULES.price} 点 · 库存 {items.supply} 个 · 最多持有 {ITEM_RULES.capacity} 个</p>
      <button className="rm-button" disabled={snapshot.paused || !!reason} onClick={() => { if (!buy(shop.id)) setError('无法购买，请检查点数、库存与当前对局状态。'); else setError(''); }}>购买遥控骰子</button>
      {reason && <p role="status">{reason}</p>}
      <p className="rm-property-note">{snapshot.siteServices ? '卡片共用 15 格。可按点数购买或卖出背包实物；机器工人只能卖出，不能在此购买。' : snapshot.g1 ? '卡片共用 15 格；点数购买，使用后返还卡池。机器工人不在商店出售。' : snapshot.wealth ? '出售均富卡、均贫卡、机器娃娃、路障与遥控骰子；卡片共用 15 个背包位置。' : snapshot.cards ? '出售均贫卡、机器娃娃、路障与遥控骰子；其他商品及卖出尚未开放。' : snapshot.roadTools ? '出售机器娃娃、路障与遥控骰子，使用点数购买；其他商品及卖出尚未开放。' : '目前仅出售遥控骰子，使用点数购买；售卖与其他商品尚未开放。'}</p>

    </> : <><p>掷骰前指定 1–6 点，确认后立即出发。</p>
      <button className="rm-button" disabled={snapshot.paused || snapshot.phase !== 'idle' || quantity < 1 || !!mobility?.stop || !!mobility?.turtle} onClick={() => { if (!onUse({ type: 'begin', definitionId: REMOTE_EFFECT })) setError('暂时无法使用道具。'); else setError(''); }}>使用遥控骰子</button>
      {(!!mobility?.stop || !!mobility?.turtle) && <p>停留或乌龟状态期间不使用遥控骰子，以免消耗后点数被覆盖。</p>}<p className="rm-property-note">停在点数格获得点数，可在三越百货补购。</p></>}
    </ClassicInventoryEntry></ClassicInventory>
    {error && <p role="alert">{error}</p>}
    {shop && <button className="rm-button rm-button-light" disabled={snapshot.paused} onClick={() => leave(shop.id)}>离开商店</button>}
  </section>;
}
