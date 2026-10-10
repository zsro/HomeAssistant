import type {GameState} from './engine';
import type {MapNode} from '../types';
import type {ComputerDecision,ComputerPolicy} from './computer';
import {decideComputer as previousDecision} from './computer-reactions';

export const DEFENSE_POLICY='defense-v1';
/** Host-only defense. Existing engine owns winter, automatic absolution/revenge and state transitions. */
export function decideComputer(s:GameState,nodes:readonly MapNode[],policy:ComputerPolicy='basic-v1'):ComputerDecision|null{
 if(policy!==DEFENSE_POLICY)return previousDecision(s,nodes,policy);
 if((s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))||s.paused||s.phase==='finished')return null;
 const p=s.pending;
 if(p?.kind!=='reaction'||p.continuation.kind!=='attack')return previousDecision(s,nodes,'rent-v1');
 const id=p.responderId,attack=p.continuation;
 const choose=(action:ComputerDecision['action'],reason:string):ComputerDecision=>({playerId:id,action,reason});
 const decline=(reason:string)=>choose({type:'reaction',decisionId:p.id,choice:'decline'},reason);
 if(p.stage!=='redirect'||(s.effects?.inventory[id]?.['card:19']??0)<1)return decline('嫁祸反应或库存已失效，交由既有攻击规则结算');
 const ally=s.g3?.allies[id]?.partner;
 const legal=s.players.filter(player=>p.targets.includes(player.id)&&player.id!==id&&player.id!==ally&&!s.finance?.eliminated.includes(player.id));
 const target=legal.find(player=>player.id===attack.sourceId)??legal[0];
 if(!target)return decline('没有合适的非同盟合法目标，保留嫁祸卡；自动反应仍由规则处理');
 const back=target.id===attack.sourceId,name=attack.itemId==='card:17'?'陷害':'梦游';
 const duration=attack.itemId==='card:17'?`监禁追加${back?4:5}次，按原规则累计`:`梦游设为${back?4:5}次`;
 return choose({type:'reaction',decisionId:p.id,choice:'use',targetId:target.id},`${name}嫁祸给${target.id}（${back?'攻击者':'其他合法目标'}，${duration}）；转嫁不再次触发免罪或复仇${back&&attack.itemId==='card:17'?'，攻击者入狱后结束当前行动':''}`);
}
