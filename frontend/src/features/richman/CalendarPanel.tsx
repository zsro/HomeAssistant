import { modeIncludes, disposalHelp } from './mode-help';
import {itemName} from './game/g3';
import type {SessionSnapshot} from './game/session';
import {calendarClosed,weekday,dayNumber} from './game/calendar-date';
const money=(n:number)=>n.toLocaleString('zh-CN');
export function CalendarPanel({snapshot}:{snapshot:SessionSnapshot}){
 const c=snapshot.calendar;if(!c)return null;const closed=calendarClosed(c.date);
 return <section className="rm-property rm-finance" aria-label="日期与银行日历">
 <h2>游戏日期 · {c.date}</h2><p>星期{'日一二三四五六'[weekday(c.date)]} · {closed||'交易日'} · 已过 {c.elapsedDays} 天</p>
 <p>全员轮转一圈推进一天；停留、旅行和拘留按各自行动计时。银行拒绝及停止放款不阻止日期推进和贷款到期收款。</p>
 {c.business&&<div aria-label="节日与物价"><h3>物价指数 · {c.business.priceIndex} 倍</h3><p>每天按仍在局内玩家的平均净资产与开局资金之比更新，只升不降；先于行情、节日、分红和月息。</p><p>已应用于丰田收费、日产建造/取消、保险保费及按期限赔款。{modeIncludes(snapshot.mode, 'indexedEconomy')?'地产购买/建造/租金、购地卡、已核实新闻奖金与税及命运定额现金也按物价结算；地价原值和持股价值不额外乘。':'其他费用仍沿用既有候选规则。'}</p>{c.business.price&&<p>最近核算 {c.business.price.date}：平均净资产 {money(c.business.price.average)} / 开局资金 {money(c.business.initialFunds)} 元。</p>}{c.business.festival&&<div aria-label="最近日期活动"><h3>{c.business.festival.date} · {c.business.festival.name}</h3>{c.business.festival.gifts.length?c.business.festival.gifts.map(r=><p key={r.playerId}>玩家 {r.playerId.split('-')[1]}：{r.itemId?`获得 ${itemName(r.itemId)}${r.discarded?'，替换 '+itemName(r.discarded):''}`:'卡池已空，未获得卡片'}</p>):<p>元旦日期提示；无额外现金或卡片奖励。</p>}</div>}<p>12月25日为在局玩家发卡；生日奖励、特殊角色和原节日动画未接入。</p></div>}
 <ul>{snapshot.participants.map((_,i)=>{const id=`player-${i+1}`,due=c.due[id],debt=snapshot.news!.business!.loans[id];return <li key={id}>玩家 {i+1}：本金 {money(debt)} 元 · {due?`到期 ${due}（剩余 ${dayNumber(due)-dayNumber(c.date)} 天）`:'无待收贷款'}</li>;})}</ul>
 {c.lastInterest&&<div aria-label="最近月息"><h3>{c.lastInterest.date} 月息结算</h3><ul>{c.lastInterest.rows.map(r=><li key={r.playerId}>玩家 {r.playerId.split('-')[1]}：{r.debt?'有贷款，本月停息':`存款 ${money(r.before)} → ${money(r.after)}，利息 ${money(r.amount)} 元`}</li>)}</ul></div>}
 {!!c.notices.length&&<div aria-label="贷款催收记录"><h3>最近催收</h3><ul>{c.notices.slice(-4).map((n,i)=><li key={i}>{n.date} · 玩家 {n.playerId.split('-')[1]}：{n.kind==='reminder'?`贷款还有 ${n.days} 天到期，本金 ${money(n.principal)} 元`:`到期收款：存款 ${money(n.bank)}＋现金 ${money(n.cash)} 元${n.unpaid?`，未付 ${money(n.unpaid)} 元，按候选破产规则退出`:'，本金已清零'}`}</li>)}</ul></div>}
 <p className="rm-property-note">每月1日，无贷款者存款乘1.1后截断；有贷款停息。日历采用原日本固定休市表，周六可交易。{disposalHelp(snapshot.mode)}其他日期活动和原版结束菜单差异保留。</p>
 </section>;
}
