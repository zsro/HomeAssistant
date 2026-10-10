import { modeIncludes } from './mode-help';
import type {SessionSnapshot} from './game/session';
const money=(n:number)=>n.toLocaleString('zh-CN');
export function CompanyPanel({snapshot,ack}:{snapshot:SessionSnapshot;ack:(id:string)=>unknown}){
 const b=snapshot.news?.business;if(b?.service===undefined)return null;const r=snapshot.companyDecision?.receipt??b.service;
 return <section className="rm-property rm-finance" aria-label="公司营业结算"><h2>公司营业 · {modeIncludes(snapshot.mode, 'insurance')?'丰田、日产、三井与 SEGA':snapshot.mode==='commerce'?'丰田、日产与 SEGA':'丰田与 SEGA'}</h2>
 <p>丰田：车辆系数 × 本次点数 × 700 元。SEGA：已过天数 × 150 元。仅落点收费，经营者本人及无人经营时免付。</p>
 {r?<div aria-label="最近营业账单"><h3>{r.name} · {r.node} 号路格</h3><p>来访者：玩家 {r.visitorId.split('-')[1]} · 经营者：{r.ownerId?`玩家 ${r.ownerId.split('-')[1]}`:'暂无'}</p>
 <p>{r.reason}；原价 {money(r.base)} 元，神仙修正后 {money(r.amount)} 元{r.free?'；免费卡免付':''}。</p>
 <p>最终付款人：玩家 {r.payerId.split('-')[1]}{r.redirected?' · 嫁祸转移':''}{r.godPayer?' · 衰神代付':''}；现金 {money(r.cash)} ＋ 银行 {money(r.bank)}，实付 {money(r.paid)} 元。</p>
 <p>公司本期 {money(r.fundsBefore)} → {money(r.fundsAfter)} 元；累计 {money(r.cumulativeBefore)} → {money(r.cumulativeAfter)} 元。</p>
 {r.bankrupt&&<p role="status">尚欠 {money(r.unpaid)} 元，付款人按候选规则退出；持仓和地产按本模式的退出处置继续结算；公共拍卖所得不代付原债。</p>}</div>:<p>尚未发生营业结算。可在股票市场买股建立经营权。</p>}
 <p className="rm-property-note">费用进入公司账本，每月15日按持股分配；经营者不直接收款。三越商店与富士银行保留现有业务，{modeIncludes(snapshot.mode, 'insurance')?'保险、日产建造和现场认股已接入。':snapshot.mode==='commerce'?'日产建造和现场认股已接入，完整保险未接入。':'日产建造、保险及现场认股未接入。'}</p>
 {snapshot.companyDecision&&<button className="rm-button" disabled={snapshot.paused} onClick={()=>ack(snapshot.companyDecision!.id)}>确认营业结算</button>}
 </section>;
}
