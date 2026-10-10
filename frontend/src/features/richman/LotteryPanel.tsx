import {useState} from 'react';
import type {SessionSnapshot} from './game/session';
const money=(n:number)=>n.toLocaleString('zh-CN');
export function LotteryPanel({snapshot,buy,leave}:{snapshot:SessionSnapshot;buy:(id:string,n:number)=>unknown;leave:(id:string)=>unknown}){
 const [selected,setSelected]=useState('');const l=snapshot.lottery;if(!l)return null;
 const d=snapshot.lotteryDecision,id=`player-${snapshot.participants.indexOf(snapshot.active)+1}`,cash=snapshot.economy!.balances[id].cash;
 const available=l.tickets.flatMap((p,i)=>p?[]:[i+1]),choice=available.includes(Number(selected))?Number(selected):available[0];
 const draw=l.lastDraw;
 return <section className="rm-property rm-finance" aria-label="彩票与奖池">
 <h2>彩票 · 公共奖池 {money(snapshot.news!.publicFund)} 元</h2>
 <p>每月15日开奖。每次停在彩票站可用现金1,000元买一张；经过或梦游不购彩。</p>
 <ul>{snapshot.participants.map((_,i)=>{const tickets=l.tickets.flatMap((owner,n)=>owner===`player-${i+1}`?[n+1]:[]);return <li key={i}>玩家 {i+1}：{tickets.length?`${tickets.join('、')}号（${tickets.length}张）`:'未持票'}</li>;})}</ul>
 {d&&<div role="group" aria-label="彩票购买"><p>{d.node}号彩票站 · 当前现金 {money(cash)} 元 · 每次限买一张</p>
 <label className="rm-form-field">彩票号码<select value={choice??''} disabled={snapshot.paused||!available.length||cash<1000} onChange={e=>setSelected(e.target.value)}>{!available.length&&<option value="">全部售出</option>}{Array.from({length:36},(_,i)=>i+1).map(n=><option key={n} value={n} disabled={l.tickets[n-1]!==null}>{n}号{l.tickets[n-1]?` · 玩家 ${l.tickets[n-1]!.split('-')[1]}已购`:''}</option>)}</select></label>
 {cash<1000&&<p role="status">现金不足1,000元，不能使用存款购彩。</p>}{!available.length&&<p role="status">本期号码全部售出，可以离开。</p>}
 <button className="rm-button" disabled={snapshot.paused||cash<1000||choice===undefined} onClick={()=>buy(d.id,choice)}>确认购彩</button>
 <button className="rm-button rm-button-light" disabled={snapshot.paused} onClick={()=>leave(d.id)}>离开彩票站</button></div>}
 {draw&&<div aria-label="最近开奖"><h3>{draw.date} 开奖记录</h3><p>{draw.number===null?'无人持票，本日不开奖。':draw.winnerId?`开出 ${draw.number} 号，玩家 ${draw.winnerId.split('-')[1]}中奖，现金入账 ${money(draw.amount)} 元；所有彩票和奖池已清空。`:`开出 ${draw.number} 号，无人中奖；彩票和 ${money(draw.fundAfter)} 元奖池结转。`}</p>{draw.restricted&&<p>有人持票超过10张，本次从已售号码中开奖。</p>}</div>}
 <p className="rm-property-note">奖池与税款等公共资金共用；无人中奖保留原票和资金。任一玩家持票超过10张时只从已售号码开奖。破产清除本人的票，不退款。</p>
 </section>;
}
