import { ClassicInventory, ClassicInventoryEntry } from './ClassicBusinessArt';
import {useState} from 'react';
import type {SessionSnapshot} from './game/session';
import {itemName} from './game/g3';
import {shopPrice} from './game/shop-acquisition';
import {ShopSellPanel} from './SiteServicesPanel';
export function ShopAcquisitionPanel({snapshot:s,buy,sell,leave}:{snapshot:SessionSnapshot;buy:(id:string,item:string)=>boolean;sell?:(id:string,item:string)=>boolean;leave:(id:string)=>void}){
 const [error,setError]=useState(''),d=s.shopDecision!,shelf=d.shelf!,who=`player-${s.participants.indexOf(s.active)+1}`,bag=s.effects!.inventory[who],points=s.items!.points[who],slots=[...shelf.cards,...shelf.tools],ids=[...new Set(slots.map(x=>x.itemId))],gift=shelf.gift;
 return <section className="rm-property rm-items" aria-label="三越百货"><div className="rm-section-title"><h2>三越百货</h2><span>{points} 点</span></div>
 {gift&&<section aria-label="经营者到店赠品"><h3>经营者到店赠品</h3><p>{gift.received?`免费获得${itemName(gift.itemId!)}${gift.discarded?`，卡包已满，替换${itemName(gift.discarded)}`:''}。`:gift.reason==='empty'?`本次抽到${gift.kind==='card'?'卡片':'工具'}，供应池已空，未获得赠品。`:`本次抽到${itemName(gift.itemId!)}，该工具已持有 9 件，未领取，也不改抽。`}</p><p>赠品不扣点数、不计营业额；仍可继续买卖。</p></section>}
 <p aria-label="本次货架">本次上架 {shelf.cards.length} 张卡片、{shelf.tools.length} 类工具。每个货位限购一次；卖出不会补充本次货架，下次到店重新上架。</p>
 <ClassicInventory shop paused={s.paused}><div aria-label="货架商品" className="rm-inventory-group">{ids.map(id=>{const remaining=slots.filter(x=>x.itemId===id&&x.available).length,price=shopPrice(id),full=id.startsWith('card:')?s.g3!.slots[who].length>=15:(bag[id]??0)>=9,reason=!remaining?'本次货位已售完':full?'已达到持有上限':points<price?'点数不足':'';return <ClassicInventoryEntry id={id} count={bag[id]??0} key={id}><p><strong>{itemName(id)}</strong> · 持有 {bag[id]??0}</p><p>单价 {price} 点 · 本次剩余 {remaining} 件</p><button className="rm-button rm-button-light" disabled={s.paused||!!reason} onClick={()=>setError(buy(d.id,id)?'':'商品或库存已变化，请重新查看。')}>购买{itemName(id)}</button>{reason&&<p>{reason}</p>}</ClassicInventoryEntry>;})}</div></ClassicInventory>
 {!ids.length&&<p>当前供应池没有可上架商品，仍可卖出背包物品或离开。</p>}
 {sell&&<ShopSellPanel key={d.id} snapshot={s} sell={sell}/>}{error&&<p role="alert">{error}</p>}<button className="rm-button rm-button-light" disabled={s.paused} onClick={()=>leave(d.id)}>离开商店</button></section>;
}
