/** Prepare a public-command-only journey on the original map. No game state injection. */
import fs from 'node:fs';
import { GameEngine } from '../../frontend/src/features/richman/game/engine';
import { CARD_RULES, EQUAL_CASH, equalCashTargets } from '../../frontend/src/features/richman/game/cards';
import { REMOTE_DICE, REMOTE_EFFECT, itemSite } from '../../frontend/src/features/richman/game/items';
import { ROADBLOCK, ROADBLOCK_EFFECT, roadblockTargets } from '../../frontend/src/features/richman/game/road-tools';
import { drawDice } from '../../frontend/src/features/richman/game/random';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
import type { Action } from '../../frontend/src/features/richman/game/engine';
const byId = new Map(nodes.map(node => [node.id,node]));
const distance = (start:number,targets:number[]) => {
  const seen=new Set([start]),queue=[[start,0]];
  for(let index=0;index<queue.length;index++) { const [node,d]=queue[index];if(targets.includes(node))return d;
    for(const next of byId.get(node)!.adjacent)if(!seen.has(next)){seen.add(next);queue.push([next,d+1]);}
  }return 1000;
};
const characters=['sun','atu'];
let best: {replay:ReturnType<GameEngine['exportReplay']>;state:GameEngine['state'];events:GameEngine['events']} | null=null;
const seeds=process.env.RICHMAN_CARD_SEARCH ? Array.from({length:24},(_,i)=>`card-six-${i}`) : ['card-six-16'];
for(const seed of seeds){
  const engine=new GameEngine(nodes,{gameId:'card-journey',seed,rulesId:CARD_RULES.id,characterIds:characters,initialFunds:100000});
  let remoteValue = 1;
  for(let step=0;step<3000;step++){
    const s=engine.state,p=s.pending,player=s.players[s.active],inventory=s.effects!.inventory[player.id];
    if(s.phase==='idle'&&inventory[EQUAL_CASH]>0&&equalCashTargets(s.players,s.active,s.finance!.eliminated,nodes).length){
      if(!best||engine.exportReplay().commands.length<best.replay.commands.length)best={replay:engine.exportReplay(),state:s,events:engine.events};break;
    }
    const score=(node:number)=>{
      if(inventory[EQUAL_CASH]>0)return -distance(node,s.players.filter(t=>t.id!==player.id).map(t=>t.node));
      if(s.items!.points[player.id]>=200)return -10*distance(node,[50,107]);
      return (itemSite(byId.get(node)!)?.points??0)*4-distance(node,[20]);
    };
    const routeScore=(node:number,previous:number,remaining:number):number=>{
      if(!remaining || s.roadTools!.blocks.includes(node))return score(node);
      const adjacent=byId.get(node)!.adjacent,onward=adjacent.filter(id=>id!==previous);
      return Math.max(...(onward.length?onward:adjacent).map(next=>routeScore(next,node,remaining-1)));
    };
    let action:Action;
    if(s.phase==='idle') {
      const available=roadblockTargets(byId.get(player.node)!,nodes,s.roadTools!.blocks).filter(id=>id!==player.node&&(itemSite(byId.get(id)!)?.points??0)>=30);
      const values=[1,2,3,4,5,6].map(value=>({value,score:routeScore(player.node,player.previous??-1,value)})).sort((a,b)=>b.score-a.score);
      if(inventory[REMOTE_DICE]>0 && values[0].score>=80 && values[0].score>routeScore(player.node,player.previous??-1,drawDice(s.randomState).value)) {
        remoteValue=values[0].value;action={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};
      } else if(inventory[ROADBLOCK]>0 && available.length && s.items!.points[player.id]<200)action={type:'item',action:{type:'begin',definitionId:ROADBLOCK_EFFECT}};
      else action={type:'roll'};
    }
    else if(s.phase==='effect') {
      if(s.effects!.pending!.definitionId===REMOTE_EFFECT)action={type:'item',value:remoteValue,action:{type:'confirm',decisionId:p!.id,target:{kind:'player',id:player.id}}};
      else {
        const target=roadblockTargets(byId.get(player.node)!,nodes,s.roadTools!.blocks).filter(id=>id!==player.node&&(itemSite(byId.get(id)!)?.points??0)>=30).sort((a,b)=>score(b)-score(a))[0];
        action={type:'item',action:{type:'confirm',decisionId:p!.id,target:{kind:'node',id:String(target)}}};
      }
    }
    else if(s.phase==='turnEnd')action={type:'endTurn'};
    else if(p?.kind==='branch')action={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>routeScore(b,player.node,s.remaining-1)-routeScore(a,player.node,s.remaining-1))[0]};
    else if(p?.kind==='shop')action=s.cards!.supply>0&&s.items!.points[player.id]>=200&&!inventory[EQUAL_CASH]?{type:'buyItem',decisionId:p.id,itemId:EQUAL_CASH}:{type:'leaveShop',decisionId:p.id};
    else if(p?.kind==='property')action={type:'property',decisionId:p.id,accept:p.operation==='rent'||s.active===0&&s.economy!.balances[player.id].cash>=p.amount};
    else if(p?.kind==='bank')action={type:'leaveBank',decisionId:p.id};
    else if(p?.kind==='debt')action={type:'settleDebt',decisionId:p.id};
    else if(p?.kind==='roll'||p?.kind==='segment')action={type:'animationDone',token:p.id};
    else break;
    const result=engine.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:player.id,action});if(!result.ok)throw Error(result.reason);
  }
}
if(!best)throw Error('No card journey found');
const destination=process.env.RICHMAN_CARD_PLAN || '/private/tmp/richman-card-journey.json';
fs.writeFileSync(destination,JSON.stringify(best,null,2));
console.log(JSON.stringify({destination,seed:best.replay.config.seed,turn:best.state.turn,commands:best.replay.commands.length,purchases:best.events.filter(e=>e.type==='itemBought'),cash:best.state.economy!.balances,positions:best.state.players.map(p=>p.node)}));
