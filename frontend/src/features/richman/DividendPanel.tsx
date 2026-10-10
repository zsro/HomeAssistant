import { modeIncludes } from './mode-help';
import type {SessionSnapshot} from './game/session';
const money=(n:number)=>n.toLocaleString('zh-CN');
export function DividendPanel({snapshot}:{snapshot:SessionSnapshot}){
 const b=snapshot.news?.business;if(b?.dividends===undefined)return null;
 return <section className="rm-property rm-finance" aria-label="公司账本与分红">
 <h2>公司账本 · 每月15日分红</h2>
 <p>公司本期收益按在局玩家的实际持股比例分配；亏损也由持股人承担。先合计各公司分配，再入银行；银行不足扣现金，仍不足将退出。</p>
 <ul>{b.companies.map(c=><li key={c.id}>{c.name}：本期 {money(c.funds)} 元 · 累计 {money(c.cumulative)} 元</li>)}</ul>
 {b.dividends?<div aria-label="最近公司分红"><h3>{b.dividends.date} 分红账单</h3>
 <ul>{b.dividends.companies.map(c=><li key={c.companyId}>{c.name}：本期 {money(c.funds)} 元 · 参与 {money(c.shares)} 股 · {c.shares?'本期清零':'无人持股，结转'}<ul>{c.allocations.filter(a=>a.quantity).map(a=><li key={a.playerId}>玩家 {a.playerId.split('-')[1]} · {money(a.quantity)} 股 → {money(a.amount)} 元</li>)}</ul></li>)}</ul>
 <ul>{b.dividends.payments.map(p=><li key={p.playerId}>玩家 {p.playerId.split('-')[1]}：合计 {money(p.amount)} 元；银行 {money(p.before.bank)} → {money(p.after.bank)}，现金 {money(p.before.cash)} → {money(p.after.cash)}{p.bankrupt?`；不足 ${money(p.unpaid)} 元，破产退出`:''}</li>)}</ul></div>:<p>尚未发生日期分红。</p>}
 <p className="rm-property-note">每家公司单独按比例截断，余数不分配。无人持股保留本期账面，累计账面不清零。同日先分红、再开奖，之后收取到期贷款。{modeIncludes(snapshot.mode, 'insurance')?'本模式保费实收与赔款均进入公司账本。':'完整公司营业与保险尚未开放。'}</p>
 </section>;
}
