import { ClassicEventScene } from './ClassicEventArt';
import {MAGIC_NESTED_EFFECTS} from './game/magic-nested';
import type {MagicNested} from './game/magic-nested';
import {MAGIC_ACTIONS_EFFECTS} from './game/magic-actions';
import {FACILITY_TYPES} from './game/g4';
import {useState} from 'react';
import {MAGIC_EFFECTS,MAGIC_GROUPS} from './game/magic-house';
import type {MagicDecision} from './game/magic-house';
export function MagicPanel({decision:d,paused,act,build}:{decision:MagicDecision;paused:boolean;act:(id:string,effect?:number)=>boolean;build?:(id:string,type:number)=>boolean}){
 const[error,setError]=useState('');
 const submit=(effect?:number)=>{if(!act(d.id,effect))setError('本次选择已失效，请查看当前回合。');};
 return <section className="rm-property rm-classic-magic" aria-label="魔法屋">
  <ClassicEventScene kind="magic"><h2>魔法屋</h2><p>{d.node} 号路格 · 免费</p><p>{({draw:"抽取目标",choose:"选择魔法",build:"选择建筑",result:"魔法结果"})[d.stage]}</p></ClassicEventScene>
  {d.stage==='draw'?<><p>随机抽取一个有人的目标组，再选择对他们施展的效果。</p><button className="rm-button" disabled={paused} onClick={()=>submit()}>抽取魔法目标</button></>:<>
   <p aria-label="魔法目标">{MAGIC_GROUPS[d.group!]}：{d.targets.map(id=>`玩家 ${id.split('-')[1]}`).join('、')}</p>
   {d.stage==='choose'?<fieldset className="rm-magic-effects" disabled={paused}><legend>选择一种效果</legend>{[...MAGIC_EFFECTS.map(e=>({...e,available:true})),...MAGIC_ACTIONS_EFFECTS.map(e=>({...e,available:!!d.extended})),...MAGIC_NESTED_EFFECTS.map(e=>({...e,available:!!d.nestedEnabled}))].sort((a,b)=>a.id-b.id).map(e=><button className="rm-button" key={e.id} disabled={!e.available} onClick={()=>submit(e.id)}>{e.title}{!e.available&&<small>当前模式未启用</small>}</button>)}</fieldset>:d.stage==='build'?<fieldset disabled={paused}><legend>玩家 {d.responderId!.split('-')[1]}：选择空地建筑类型</legend>{FACILITY_TYPES.map((name,type)=><button className="rm-button" key={type} onClick={()=>{if(!build?.(d.id,type))setError('本次选择已失效。');}}>{name}</button>)}<p>就地加盖免费，选择后继续处理本组其他玩家。</p></fieldset>:<>
    <h3>{d.receipt!.title}</h3><ul aria-label="魔法变化明细">{d.receipt!.rows.map(r=><li key={r.playerId}>玩家 {r.playerId.split('-')[1]}：{r.lines.join(' ')}</li>)}</ul>
    <button className="rm-button" disabled={paused} onClick={()=>submit()}>继续回合</button>
   </>}
  </>}
  <p className="rm-property-note">{d.nestedEnabled?'当前开放十二种候选效果；':d.extended?'当前模式开放十种效果，三连命运与当格拍卖未启用；':'当前模式开放六种效果，其余效果未启用；'}抽选采用对局种子，原版转盘动画待补。目标组确定后不能重抽。</p>
  {error&&<p role="alert">{error}</p>}
 </section>;
}

export function MagicNestedPanel({batch:n}:{batch:MagicNested}){return <section className="rm-property rm-event-continuation" aria-label="魔法屋接续"><h2>{n.receipt.title}</h2><p>原访客：玩家 {n.sourceId.split('-')[1]} · 正在处理第 {n.cursor+1}/{n.receipt.targets.length} 位：玩家 {n.receipt.targets[n.cursor].split('-')[1]}</p><p>{n.waiting==='fortune'?`本位第 ${n.calls}/3 次命运，请完成当前反应、取卡或付款，再确认结果。`:'请完成当前拍卖，随后继续下一位。'}</p><p>本组结算结束后返回原访客；此间不推进日期。</p></section>;}
