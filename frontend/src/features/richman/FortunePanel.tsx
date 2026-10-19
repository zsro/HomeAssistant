import { useState } from 'react';
import type { FortuneDecision } from './game/fortune';
import {itemName} from './game/g3';
export function FortunePanel({decision,paused,acknowledge,collect}:{decision:FortuneDecision;paused:boolean;acknowledge:(id:string)=>boolean;collect?:(id:string,item:string|null)=>boolean}) {
 const [error,setError]=useState(''),[selection,setSelection]=useState({key:'',item:''});
 const collection=decision.collection;
 const selectionKey=JSON.stringify([decision.id,collection?.index,collection?.donors,collection?.items]);
 const selected=selection.key===selectionKey?selection.item:'';
 return <section className="rm-property rm-classic-event rm-classic-fortune" aria-label="命运结算">
  <div className="rm-event-paper"><header><span className="rm-event-kicker">FORTUNE · 命运</span><h2>{decision.title}</h2></header>
  <p>{collection?'逐人取卡尚未完成，已取得的卡片即时入包。':'本次命运已结算，确认不会重复收支或变卖。'}</p>
  <ul aria-label="命运变化明细">{decision.lines.map((line,i)=><li key={i}>{line}</li>)}</ul>
  {collection&&<fieldset disabled={paused}>
   <legend>向玩家 {collection.donors[collection.index].split('-')[1]} 取卡（{collection.index+1}/{collection.donors.length}）</legend>
   <label>选择卡片<select aria-label="命运选取卡片" value={selected} onChange={e=>setSelection({key:selectionKey,item:e.target.value})}><option value="">请选择</option>{collection.items.map(id=><option key={id} value={id}>{itemName(id)}</option>)}</select></label>
   <p>背包满15张时，先丢弃最便宜的一张，再接收选中的卡片。</p>
   <button className="rm-button" disabled={!collection.items.includes(selected)||paused||!collect} onClick={()=>{if(!collect?.(decision.id,selected))setError('选择已失效，请查看当前命运。');}}>确认取卡</button>
   <button className="rm-button" disabled={paused||!collect} onClick={()=>{if(!collect?.(decision.id,null))setError('选择已失效，请查看当前命运。');}}>放弃本位</button>
  </fieldset>}
  </div><p className="rm-property-note">{decision.scope??'当前开放16项资金与变卖命运，其余候选暂跳过。奖金属于本次命运，不是彩票开奖；保险事件暂不代表完整保险业务。'}</p>
  {error&&<p role="alert">{error}</p>}
  {!collection&&<button className="rm-button" disabled={paused} onClick={()=>{if(!acknowledge(decision.id))setError('本次命运已失效，请查看当前回合。');}}>继续回合</button>}
 </section>;
}
