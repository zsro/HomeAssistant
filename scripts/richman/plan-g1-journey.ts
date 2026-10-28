/** Prepare a public-command-only journey on the original map. No game state injection. */
import fs from 'node:fs';
import { GameEngine } from '../../frontend/src/features/richman/game/engine';
import { G1_RULES as CARD_RULES, G1_GOODS, g1Options, g1Adjacent } from '../../frontend/src/features/richman/game/g1';
import { PROPERTY_CATALOG } from '../../frontend/src/features/richman/game/economy';
import { NEARBY_WORKER_EFFECT, nearbyWorkerTargets } from '../../frontend/src/features/richman/game/nearby-construction';
import { REMOTE_DICE, REMOTE_EFFECT, itemSite } from '../../frontend/src/features/richman/game/items';
import { ROADBLOCK, ROADBLOCK_EFFECT, roadblockTargets } from '../../frontend/src/features/richman/game/road-tools';
import { drawDice } from '../../frontend/src/features/richman/game/random';
import nodes from '../../shared/richman/japan-topology.fixture.json';
import type { Action } from '../../frontend/src/features/richman/game/engine';
const byId = new Map(nodes.map(node => [node.id,node]));
const distance = (start:number,targets:number[]) => {
  const seen=new Set([start]),queue=[[start,0]];
  for(let index=0;index<queue.length;index++) { const [node,d]=queue[index];if(targets.includes(node))return d;
    for(const next of byId.get(node)!.adjacent)if(!seen.has(next)){seen.add(next);queue.push([next,d+1]);}
  }return 1000;
};
const characters=['xiaomei','tuu'];
let best: {replay:ReturnType<GameEngine['exportReplay']>;state:GameEngine['state'];events:GameEngine['events']} | null=null;
const seeds=process.env.RICHMAN_G1_SEARCH ? Array.from({length:32},(_,i)=>`group-one-${i}`) : ['group-one-13'];
for(const seed of seeds){
  const engine=new GameEngine(nodes,{gameId:'card-journey',seed,rulesId:CARD_RULES.id,characterIds:characters,initialFunds:100000});
  let remoteValue = 1;
  const used = new Set<string>(); let selected: {kind:"player"|"property";id:string}|null=null;
  for(let step=0;step<3000;step++){
    const s=engine.state,p=s.pending,player=s.players[s.active],inventory=s.effects!.inventory[player.id];
    if(s.phase==='idle'&&used.size===5){
      if(!best||engine.exportReplay().commands.length<best.replay.commands.length)best={replay:engine.exportReplay(),state:s,events:engine.events};break;
    }
    const score=(node:number)=>{
      const held=G1_GOODS.filter(g=>!used.has(g.id)&&inventory[g.id]>0);
      if(held.some(g=>g.id==='card:03')) {
        const targets=PROPERTY_CATALOG.properties.filter(d=>s.economy!.properties.some(p=>p.id===d.id&&p.ownerId&&p.ownerId!==player.id)).flatMap(d=>d.nodeIds);
        if(targets.length)return -10*distance(node,targets);
      }
      if(held.some(g=>['card:04','card:05'].includes(g.id)))return -10*distance(node,PROPERTY_CATALOG.properties.filter(p=>p.kind==='land').flatMap(d=>d.nodeIds));
      if(s.items!.points[player.id]>=35)return -10*distance(node,[50,107]);
      return (itemSite(byId.get(node)!)?.points??0)*4-distance(node,[20]);
    };
    const routeScore=(node:number,previous:number,remaining:number):number=>{
      if(!remaining || s.roadTools!.blocks.includes(node))return score(node);
      const adjacent=g1Adjacent(byId.get(node)!),onward=adjacent.filter(id=>id!==previous);
      return Math.max(...(onward.length?onward:adjacent).map(next=>routeScore(next,node,remaining-1)));
    };
    let action:Action;
    if(s.phase==='idle') {
      const good=[...G1_GOODS].sort((a,b)=>Number(a.id==='card:06')-Number(b.id==='card:06')).find(g=>!used.has(g.id)&&inventory[g.id]>0&&g1Options(s,nodes,PROPERTY_CATALOG.properties,g.id).some(o=>o.turn||o.changes.some(c=>JSON.stringify(c.before)!==JSON.stringify(c.after))));
      if(good){const options=g1Options(s,nodes,PROPERTY_CATALOG.properties,good.id);selected=(options.find(o=>o.turn||o.changes.some(c=>JSON.stringify(c.before)!==JSON.stringify(c.after)))??options[0]).target as typeof selected;action={type:'item',action:{type:'begin',definitionId:good.effect}};}
      else {
      const build=inventory['tool:09']>0?nearbyWorkerTargets(byId.get(player.node)!,PROPERTY_CATALOG.properties,s.economy!.properties).find(id=>s.economy!.properties.find(p=>p.id===id)!.ownerId!==player.id):undefined;
      const available=roadblockTargets(byId.get(player.node)!,nodes,s.roadTools!.blocks).filter(id=>id!==player.node&&(itemSite(byId.get(id)!)?.points??0)>=30);
      const values=[1,2,3,4,5,6].map(value=>({value,score:routeScore(player.node,player.previous??-1,value)})).sort((a,b)=>b.score-a.score);
      if(build){selected={kind:'property',id:build};action={type:'item',action:{type:'begin',definitionId:NEARBY_WORKER_EFFECT}};}
      else if(inventory[REMOTE_DICE]>0 && values[0].score>=80 && values[0].score>routeScore(player.node,player.previous??-1,drawDice(s.randomState).value)) {
        remoteValue=values[0].value;action={type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}};
      } else if(inventory[ROADBLOCK]>0 && available.length && s.items!.points[player.id]<35)action={type:'item',action:{type:'begin',definitionId:ROADBLOCK_EFFECT}};
      else action={type:'roll'};
      }
    }
    else if(s.phase==='effect') {
      const good=G1_GOODS.find(g=>g.effect===s.effects!.pending!.definitionId);
      if(good){action={type:'item',action:{type:'confirm',decisionId:p!.id,target:selected!}};used.add(good.id);}
      else if(s.effects!.pending!.definitionId===NEARBY_WORKER_EFFECT){action={type:'item',action:{type:'confirm',decisionId:p!.id,target:selected!}};}
      else if(s.effects!.pending!.definitionId===REMOTE_EFFECT)action={type:'item',value:remoteValue,action:{type:'confirm',decisionId:p!.id,target:{kind:'player',id:player.id}}};
      else {
        const target=roadblockTargets(byId.get(player.node)!,nodes,s.roadTools!.blocks).filter(id=>id!==player.node&&(itemSite(byId.get(id)!)?.points??0)>=30).sort((a,b)=>score(b)-score(a))[0];
        action={type:'item',action:{type:'confirm',decisionId:p!.id,target:{kind:'node',id:String(target)}}};
      }
    }
    else if(s.phase==='turnEnd')action={type:'endTurn'};
    else if(p?.kind==='branch')action={type:'choose',decisionId:p.id,node:[...p.choices].sort((a,b)=>routeScore(b,player.node,s.remaining-1)-routeScore(a,player.node,s.remaining-1))[0]};
    else if(p?.kind==='shop') {
      const good=G1_GOODS.find(g=>!used.has(g.id)&&s.g1!.supply[g.id]>0&&!inventory[g.id]&&s.items!.points[player.id]>=g.price);
      action=good?{type:'buyItem',decisionId:p.id,itemId:good.id}:{type:'leaveShop',decisionId:p.id};
    }
    else if(p?.kind==='property')action={type:'property',decisionId:p.id,accept:p.operation==='rent'||s.economy!.balances[player.id].cash>=p.amount};
    else if(p?.kind==='bank')action={type:'leaveBank',decisionId:p.id};
    else if(p?.kind==='debt')action={type:'settleDebt',decisionId:p.id};
    else if(p?.kind==='roll'||p?.kind==='segment')action={type:'animationDone',token:p.id};
    else break;
    const result=engine.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:player.id,action});if(!result.ok)throw Error(result.reason);
  }
}
if(!best)throw Error('No card journey found');
const destination=process.env.RICHMAN_G1_PLAN || '/private/tmp/richman-g1-journey.json';
fs.writeFileSync(destination,JSON.stringify(best,null,2));
console.log(JSON.stringify({destination,seed:best.replay.config.seed,turn:best.state.turn,commands:best.replay.commands.length,purchases:best.events.filter(e=>e.type==='itemBought'),cash:best.state.economy!.balances,positions:best.state.players.map(p=>p.node)}));
