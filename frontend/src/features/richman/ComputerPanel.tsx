import type {SessionSnapshot} from './game/session';
import type {Manifest} from './types';
export function ComputerPanel({snapshot,manifest,retry}:{snapshot:SessionSnapshot;manifest:Manifest;retry:()=>void}){
 const c=snapshot.computer;if(!c)return null;
 const seat=Number(c.playerId.split('-')[1])-1,name=manifest.characters[snapshot.participants[seat]]?.name??c.playerId;
 const title=snapshot.phase==='finished'?'电脑对局已结束':snapshot.paused?'电脑已暂停':c.error?'电脑已停止':c.automatic?`${name} · 电脑操作中`:`等待${name}操作`;
 return <section className="rm-computer" aria-label="电脑对手" data-computer-player={c.playerId} data-computer-active={c.automatic}>
  <h2>{title}</h2><p aria-label="电脑决策理由">{c.error??(snapshot.paused?'待执行动作已取消，继续后重新判断。':snapshot.phase==='finished'?'本局不再执行自动操作。':c.reason)}</p>
  {c.lastReason&&<small>上次决策：{c.lastReason}</small>}
  {c.error&&<button className="rm-button" disabled={snapshot.paused} onClick={retry}>重试电脑决策</button>}
  <small>{c.policy==='research-v1'?'科研电脑：保守生产与使用科研工具；时光机只参考已公开的出发观察，保留股票及旧策略。':c.policy==='capital-v1'?'股票资金电脑：留足资金、控制持仓与贷款，按公开报价买卖/认股；保留神仙及旧策略。':c.policy==='gods-v1'?'神仙行情电脑：按公开附身、持仓与盟友风险使用送请神符和红黑卡；保留移动及旧策略。':c.policy==='mobility-v1'?'移动电脑：评估转向、车辆骰数和工程车落点，保留道路及旧策略。':c.policy==='roads-v1'?'道路电脑：评估清路、拦截和范围攻击，避开自身与盟友风险；保留建拆及旧策略。':c.policy==='area-v1'?'建拆电脑：评估天使、恶魔与怪兽的整组建筑收益，保护自己和盟友科研；保留经营及旧策略。':c.policy==='commerce-v1'?'经营电脑：评估改建、拍卖、涨价与查封，限制竞价现金并避开盟友；保留库存及旧策略。':c.policy==='inventory-v1'?'库存电脑：评估抢夺净收益和同盟租金风险；保留状态及旧策略。':c.policy==='status-v1'?'状态电脑：评估停留、冬眠、梦游、陷害和乌龟，避开同盟与可见反制；保留资金及旧策略。':c.policy==='cash-v1'?'资金电脑：评估均贫、均富与查税及查税反应；保留地产、防御、租金和道具策略。':c.policy==='estate-v1'?'地产电脑：评估购地、换地、换屋与拆除；保留防御、租金和道具策略。':c.policy==='defense-v1'?'防御电脑：优先把陷害或梦游转回攻击者；免罪与复仇由规则自动处理，保留租金和道具策略。':c.policy==='rent-v1'?'租金电脑：使用免费与嫁祸反应、补购反应卡；保留道具策略，暂不主动交易股票。':c.policy==='tools-v1'?'道具电脑：优先加盖自有地产，评估遥控骰子落点；暂不主动用卡或交易股票。':'基础电脑：保留现金、完成必要决策；暂不主动用卡或交易股票。'}</small>
 </section>;
}
