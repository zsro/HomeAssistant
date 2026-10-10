import { disposalHelp } from './mode-help';
import {useState} from 'react';
import type {SessionSnapshot} from './game/session';
import type {SaleAction} from './game/estate-sales';
import {PROPERTY_CATALOG} from './game/economy';
export function EstateSalesPanel({snapshot,act}:{snapshot:SessionSnapshot;act:(a:SaleAction)=>boolean}){
 const [chosen,setChosen]=useState(''),[price,setPrice]=useState(''),[confirm,setConfirm]=useState<string|null>(null),[error,setError]=useState('');
 const sales=snapshot.finance?.sales;if(!sales)return null;
 const id=`player-${snapshot.participants.indexOf(snapshot.active)+1}`,owned=snapshot.economy!.properties.filter(p=>p.ownerId===id),p=owned.find(p=>p.id===chosen),d=PROPERTY_CATALOG.properties.find(d=>d.id===chosen),index=snapshot.calendar!.business!.priceIndex,quote=p&&d?((p.basePrice??d.basePrice)+p.level*d.upgradeCost)*index:0,enabled=!!snapshot.salesAvailable;
 const send=(a:SaleAction)=>{if(act(a)){setConfirm(null);setError('');}else setError('挂牌或资金已变化，未成交，请查看当前报价。');};
 return <section className="rm-property" aria-label="地产挂牌市场"><h2>地产挂牌市场</h2><p>每人最多七条；挂牌不转移资产，不提前收款。买家只用现金，成交款存入卖家银行；原价保留至改价或撤回。建筑类型、楼级、产权变化会撤销旧挂牌。</p>
 {!enabled&&<p>可在本人可行动的掷骰前管理挂牌或购买；暂停和待结算期间不可操作。</p>}
 <fieldset disabled={!enabled}><legend>挂牌自己的地产</legend><label className="rm-form-field">挂牌地产<select aria-label="挂牌地产" value={chosen} onChange={e=>{setChosen(e.target.value);setPrice('');}}><option value="">请选择地产</option>{owned.map(p=>{const d=PROPERTY_CATALOG.properties.find(d=>d.id===p.id)!;return <option key={p.id} value={p.id}>{d.name} · {p.id.split(':').at(-1)}号 · {p.level}级</option>;})}</select></label>
 {p&&<><p>参考估值 {quote.toLocaleString()} 元（原地价＋楼级成本）×物价{index}；最高挂牌 { (quote*10).toLocaleString()} 元。已有挂牌可改价。</p><label className="rm-form-field">挂牌总价<input aria-label="挂牌总价" type="number" min="1" max={quote*10} step="1" value={price} onChange={e=>setPrice(e.target.value)}/></label><button className="rm-button" disabled={!Number.isSafeInteger(Number(price))||Number(price)<1||Number(price)>quote*10} onClick={()=>send({type:'listProperty',propertyId:chosen,price:Number(price)})}>确认挂牌</button></>}
 </fieldset>
 {Object.values(sales.records).flat().length?Object.values(sales.records).flat().map(r=><div key={r.id} role="group" aria-label={`挂牌 ${r.id}`}><h3>{PROPERTY_CATALOG.properties.find(d=>d.id===r.propertyId)!.name} · {r.propertyId.split(':').at(-1)}号</h3><p>玩家 {r.sellerId.split('-')[1]} · {r.level}级 · 挂牌 {r.price.toLocaleString()} 元 · 日龄 {r.age}</p>{r.sellerId===id?<button className="rm-button rm-button-light" disabled={!enabled} onClick={()=>send({type:'cancelListing',listingId:r.id})}>撤回挂牌</button>:confirm===r.id?<><p>确认扣现金 {r.price.toLocaleString()} 元，存入卖家银行；建筑保留。</p><button className="rm-button" disabled={!enabled||snapshot.economy!.balances[id].cash<r.price} onClick={()=>send({type:'buyListing',listingId:r.id,price:r.price})}>确认现金购买</button><button className="rm-button rm-button-light" onClick={()=>setConfirm(null)}>取消购买</button></>:<button className="rm-button" disabled={!enabled||snapshot.economy!.balances[id].cash<r.price} onClick={()=>setConfirm(r.id)}>购买挂牌</button>}</div>):<p>当前没有挂牌。</p>}
 {sales.last&&<p aria-label="最近挂牌成交">玩家 {sales.last.buyerId.split('-')[1]}购得{PROPERTY_CATALOG.properties.find(d=>d.id===sales.last!.listing.propertyId)!.name}：现金 {sales.last.cashBefore.toLocaleString()} → {sales.last.cashAfter.toLocaleString()}；卖家存款 {sales.last.bankBefore.toLocaleString()} → {sales.last.bankAfter.toLocaleString()}。</p>}
 {error&&<p role="alert">{error}</p>}<p className="rm-property-note">本次开放地产挂牌；股票、卡片和道具挂牌仍未接入。{disposalHelp(snapshot.mode)}挂牌日龄按日累加，不自动成交或到期下架。</p></section>;
}
