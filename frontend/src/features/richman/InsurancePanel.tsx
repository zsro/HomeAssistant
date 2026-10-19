import type {SessionSnapshot} from './game/session';
const term=(n:number)=>n===128?'本次行动仍受保，下次行动到期':n?`${n} 次自身行动`:'未投保';
export function InsurancePanel({snapshot,spin}:{snapshot:SessionSnapshot;spin:(id:string)=>unknown}){
 const i=snapshot.news?.business?.insurance;if(!i)return null;
 const d=snapshot.insuranceDecision,r=i.policy;
 return <section className="rm-property rm-finance rm-business-ledger" aria-label="保险与赔付"><h2>三井生命 · 保险</h2>
 <p>停在三井生命且已有经营者时抽取保障期限：3、5、10、15、20 或 30 次行动。经营者免费，其他玩家每次期限 {(1000*(snapshot.calendar?.business?.priceIndex??1)).toLocaleString()} 元；先增加保障，再结算费用。</p>
 <ul aria-label="保险期限">{Object.entries(i.terms).map(([id,value])=><li key={id}>玩家 {id.split('-')[1]}：{term(value)}</li>)}</ul>
 {d&&<div role="group" aria-label="保险办理"><div className="rm-insurance-wheel" aria-hidden="true"><img className="rm-insurance-disc" src="/richman/generated/ui/Panel-71/002.png" alt="" /><img className="rm-insurance-cupid" src="/richman/generated/ui/Panel-71/000.png" alt="" /></div><div className="rm-insurance-draw" aria-label="可抽取的保障期限">{[3,5,10,15,20,30].map(n=><span key={n}>{n} 次</span>)}</div><p>转盘确定期限后自动办理。续期按原字段循环计算，超过127会回绕；破产退出后保障清除。</p><button className="rm-button" disabled={snapshot.paused} onClick={()=>spin(d.id)}>转动保险转盘</button></div>}
 {r&&<p aria-label="最近保险合同">玩家 {r.playerId.split('-')[1]}抽中 {r.draw}；保障 {r.before} → {r.after}，原价 {r.base.toLocaleString()} 元。实际付款见营业账单。</p>}
 <div aria-label="最近保险赔付">{i.claims.slice(-4).map((c,n)=><p key={n}>玩家 {c.playerId.split('-')[1]} · {c.reason}：现金赔付 {c.amount.toLocaleString()} 元；三井本期 {c.fundsBefore.toLocaleString()} → {c.fundsAfter.toLocaleString()} 元。</p>)}</div>
 <p className="rm-property-note">住院、监禁、首次旅行、住宿及已核验的命运损失可触发赔付；罚款先支付，破产者不获补偿。赔款进入本人现金，公司亏损参与15日分红。转盘采用可复现抽取。</p>
 </section>;
}
