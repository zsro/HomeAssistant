import type {Action,GameState,Replay} from './engine';
import {PROPERTY_CATALOG,propertyBase} from './economy';
import {maximumLevel} from './g4';
/** Host policy only: ordinary v44 commands, no game RNG, hidden deck or native AI shortcut. */
export const COMPUTER_POLICY='basic-v1';
export const COMPUTER_DELAY=600;
export type ComputerPolicy='basic-v1'|'tools-v1'|'rent-v1'|'defense-v1'|'estate-v1'|'cash-v1'|'status-v1'|'inventory-v1'|'commerce-v1'|'area-v1'|'roads-v1'|'mobility-v1'|'gods-v1'|'capital-v1'|'research-v1';
export type ComputerControl={version:1;policy:ComputerPolicy;computerIds:string[]};
export type ControlledReplay=Replay & {control?:ComputerControl};
export type ComputerDecision={playerId:string;action:Action;reason:string};
export function decisionPlayer(s:GameState){
 const p=s.pending;
 if(p?.kind==='surrender')return p.sourceId;
 if(p?.kind==='auction'||p?.kind==='reaction')return p.responderId;
 if(p?.kind==='magic'&&p.stage==='build')return p.responderId??s.players[s.active].id;
 if(p?.kind==='property'||p?.kind==='debt')return p.payerId??s.players[s.active].id;
 return s.players[s.active].id;
}
export function computerDecision(s:GameState):ComputerDecision|null{
 if(s.paused||s.phase==='finished')return null;
 const id=decisionPlayer(s),p=s.pending,b=s.economy?.balances[id];
 const choose=(action:Action,reason:string)=>({playerId:id,action,reason});
 if(!p){if(s.phase==='idle')return choose({type:'roll'},'掷骰前进');if(s.phase==='turnEnd')return choose({type:'endTurn'},'本次行动结束，交给下一位');return null;}
 switch(p.kind){
  case 'surrender':return null; // Human-only menu continuation; never automated.
  case 'roll':case 'segment':return null; // Renderer alone completes normal-speed animation.
  case 'branch':{
   const score=(node:number)=>{const d=PROPERTY_CATALOG.properties.find(d=>d.nodeIds.includes(node)),q=s.economy?.properties.find(q=>q.id===d?.id);if(!d||!q)return 1;if(q.ownerId===id)return q.level<maximumLevel(q,d)?3:2;if(q.ownerId)return -2;return b&&b.cash>=propertyBase(q,d)+1000?4:0;};
   const node=[...p.choices].sort((a,b)=>score(b)-score(a)||a-b)[0];return choose({type:'choose',decisionId:p.id,node},'优先自有或可负担的待售地；同分选较小路格');
  }
  case 'property':{const accept=p.operation==='rent'||p.amount===0||!!b&&b.cash-p.amount>=1000;return choose({type:'property',decisionId:p.id,accept,...(accept&&p.buildingChoices?{buildingType:p.buildingChoices[0]}:{})},p.operation==='rent'?'按实际付款人结算租金':accept?'留足1000元现金后购买或建造':'保留现金，跳过本次购建');}
  case 'bank':{if(b&&!s.news?.business?.bankRejected?.[id]){const target=Math.min(5000,b.cash+b.bank),amount=Math.abs(target-b.cash);if(amount)return choose({type:'bank',decisionId:p.id,operation:target>b.cash?'withdraw':'deposit',amount},'将可用现金调整到5000元，其余存入银行');}return choose({type:'leaveBank',decisionId:p.id},'银行调整完成，继续行程');}
  case 'debt':return choose({type:'settleDebt',decisionId:p.id},'确认实际欠款，按现有规则完成退出处置');
  case 'auction':return choose({type:'auction',decisionId:p.id,increment:null},'基础策略保留现金，退出此次竞价');
  case 'reaction':return choose({type:'reaction',decisionId:p.id,choice:'decline'},'基础策略暂不使用可选反应卡');
  case 'effect':return choose({type:'item',action:{type:'cancel',decisionId:p.id}},'取消未完成的道具选择');
  case 'shop':return choose({type:'leaveShop',decisionId:p.id},'基础策略暂不补购物品');
  case 'lottery':return choose({type:'leaveLottery',decisionId:p.id},'基础策略保留现金，不购买彩票');
  case 'facility':return choose({type:'facility',decisionId:p.id,targetId:null},'结束设施探访');
  case 'news':return choose({type:'ackNews',decisionId:p.id},'确认已结算的新闻');
  case 'fortune':return p.collection?choose({type:'collectFortuneCard',decisionId:p.id,itemId:p.collection.items[0]??null},'按列表顺序完成命运取卡'):choose({type:'ackFortune',decisionId:p.id},'确认已结算的命运');
  case 'company':return choose({type:'ackCompany',decisionId:p.id},'确认公司营业账单');
  case 'insurance':return choose({type:'spinInsurance',decisionId:p.id},'按既有入口完成保险服务');
  case 'subscription':return choose({type:'subscribeCompany',decisionId:p.id,quantity:null},'基础策略暂不现场认股');
  case 'construction':{const option=p.options.find(o=>s.economy!.properties.some(q=>q.id===o.id&&q.ownerId===id&&q.level<maximumLevel(q,PROPERTY_CATALOG.properties.find(d=>d.id===q.id)!))&&!!b&&b.cash-o.fee>=1000);return choose({type:'constructCompany',decisionId:p.id,propertyId:option?.id??null,...(option?.buildingTypes?{buildingType:option.buildingTypes[0]}:{})},option?'对可负担的自有地产施工':'取消施工并按现有规则结算服务费');}
  case 'magic':return p.stage==='build'?choose({type:'magicBuild',decisionId:p.id,buildingType:0},'由实际建造应答者选择第一种建筑'):choose({type:'magic',decisionId:p.id,...(p.stage==='choose'?{effect:6}:{})},p.stage==='choose'?'选择既有得卡效果':'继续魔法屋流程');
  case 'minigame':return choose({type:'minigame',decisionId:p.id,input:{kind:p.stage==='result'?'ack':'quit'}},'基础策略退出小游戏，按实际已得分结算');
 }
}
