import { useState } from 'react';
import type { NewsDecision } from './game/news';
export function NewsPanel({decision,paused,acknowledge}:{decision:NewsDecision;paused:boolean;acknowledge:(id:string)=>boolean}){
 const [error,setError]=useState('');
 return <section className="rm-property" aria-label="新闻结算">
  <h2>{decision.title}</h2>
  <p>{decision.auction?'本次公共拍卖尚未成交，请进入竞价；查看新闻不会扣款。':'本次新闻已结算，确认不会再次扣款或发放。'}</p>
  {(decision.newsId === 24 || decision.newsId === 25) && <p>按本期基准价重算涨跌10%，覆盖此前红黑行情；持股数量不变，下期恢复常规行情。</p>}
  <ul aria-label="新闻变化明细">{decision.lines.map((line,i)=><li key={i}>{line}</li>)}</ul>
  <p className="rm-property-note">{decision.scope ?? '当前开放所得税、储金红利及股市涨跌四条新闻，其余候选暂跳过。储金红利是独立新闻，不是定期结息。'}</p>
  {error&&<p role="alert">{error}</p>}
  <button className="rm-button" disabled={paused} onClick={()=>{if(!acknowledge(decision.id))setError('本次新闻已失效，请查看当前回合。');}}>{decision.auction?'进入竞价':'继续回合'}</button>
 </section>;
}
