import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Replay,GameState} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
import {strict as assert} from 'node:assert';
const stableMini=(s:GameState)=>({economy:s.economy,effects:s.effects,g2:s.g2,g3:s.g3,g6:s.g6,news:s.news,calendar:s.calendar,finance:s.finance,g1:s.g1,g4:s.g4,g5:s.g5,roadTools:s.roadTools,cards:s.cards,wealth:s.wealth,siteServices:s.siteServices,lottery:s.lottery});
/** Operates only on recorded commands; checkpoints are reconstructed prefixes, never patched state. */
export function verifySiteCircuit(r:Replay,mode:'circuit'|'dream'='circuit'){
 assert.equal(r.rulesId,'japan-events-candidate-v41');assert.equal(r.itemFingerprint,'31214035');const e=new GameEngine(nodes,r.config),prefixes=new Map<string,number>(),landings=new Set<number>(),passes=new Set<number>();const dreamLandings:number[]=[];let miniCommands=0,dreamArrivals=0,passingBank=0;const displacements:{command:number;type:string;playerId:string;from:number;to:number}[]=[];
 const mark=(key:string,i:number)=>{if(!prefixes.has(key))prefixes.set(key,i);};
 for(let i=0;i<r.commands.length;i++){
  const c=r.commands[i],a=c.action,b=e.state,p=b.pending;const result=e.dispatch(c);assert.ok(result.ok,JSON.stringify(c));const s=e.state;
  if(p?.kind==='segment'&&a.type==='animationDone'){
   if(b.remaining>1){passes.add(p.to);if(s.pending?.kind==='bank')passingBank++;}
   if(b.g2!.players[c.playerId].dream){dreamArrivals++;mark('dream-move',i);if(b.remaining===1)dreamLandings.push(p.to);if([22,24,26,50,107,55,78,35,73].includes(p.to))assert.ok(!['minigame','shop','facility','magic'].includes(s.phase));}
  }
  if(b.players.some(p=>b.g2!.players[p.id].dream)&&s.players.every(p=>!s.g2!.players[p.id].dream))mark('dream-clear',i);
  if(a.type!=='animationDone')for(const player of s.players){const old=b.players.find(p=>p.id===player.id)!;if(old.node!==player.node)displacements.push({command:i,type:a.type,playerId:player.id,from:old.node,to:player.node});}
  if(p?.kind==='shop'&&a.type==='leaveShop')mark('shop-close',i);
  if(p?.kind==='facility'&&a.type==='facility'&&a.targetId)mark('facility-help',i);
  if(p?.kind==='magic'&&p.stage==='choose')mark('magic-choice',i);
  if(p?.kind==='fortune'&&b.magic?.nested)mark('nested-fortune',i);
  if(a.type==='minigame'){
   miniCommands++;assert.equal(p?.kind,'minigame');if(p?.kind!=='minigame')throw Error('mini');assert.deepEqual(stableMini(s),stableMini(b));assert.equal(s.turn,b.turn);assert.equal(s.active,b.active);
   if(a.input.kind==='ack'){assert.equal(s.items!.points[c.playerId],(b.items!.points[c.playerId]+p.score)&65535);assert.equal(s.phase,'turnEnd');mark('mini-result',i);}
   else{assert.deepEqual(s.items,b.items);if(p.stage==='playing'&&p.tick>10)mark('mini-midplay',i);if(p.stage==='ready')mark('mini-ready',i);}
  }
  if(b.calendar!.date!==s.calendar!.date){assert.equal(a.type,'endTurn');if(s.calendar!.date.endsWith('-15'))mark('date15',i);}
  for(const ev of result.events)if(ev.type==='landed')landings.add(ev.node);
 }
 const events=e.events,state=e.state,receipts=events.filter(x=>x.type==='minigameFinished'),turnovers=events.filter(x=>x.type==='shopTurnover'),dividends=events.filter(x=>x.type==='companyDividends'),helps=events.filter(x=>x.type==='facilityHelped');
 assert.ok(receipts.length);assert.ok(turnovers.some(x=>x.receipt.turnover>0));if(mode==='circuit'){assert.ok(events.some(x=>x.type==='magicResolved'));assert.ok(dividends.some(x=>x.settlement.payments.some(p=>p.amount>0)));}
 for(const d of dividends){const lottery=events.find(x=>x.type==='lotteryDrawn'&&x.commandId===d.commandId);assert.ok(lottery&&lottery.sequence>d.sequence);for(const p of d.settlement.payments)if(p.amount>0){assert.equal(p.after.bank-p.before.bank,p.amount);assert.equal(p.after.cash,p.before.cash);}const shop=d.settlement.companies.find(c=>c.companyId==='japan:company:1')!;if(shop.funds>0&&shop.shares>0)assert.equal(shop.after,0);}
 const count=r.config.characterIds.length;
 if(mode==='circuit'&&count===2)for(const node of[22,24,26])assert.ok(receipts.some(x=>x.node===node));
 if(mode==='circuit'&&count===3){assert.ok(helps.length);assert.ok(events.some(x=>x.type==='turnSkipped'));}
 if(mode==='circuit'&&count===4){assert.ok(events.some(x=>x.type==='magicNestedCompleted'));assert.ok(events.some(x=>x.type==='lotteryBought'));assert.ok(prefixes.has('nested-fortune'));}
 if(mode==='dream'){assert.ok(dreamLandings.some(n=>[22,24,26,50,107,35,73,55,78].includes(n)));assert.ok(events.some(x=>x.type==='effectConsumed'&&x.itemId==='card:16'));assert.ok(prefixes.has('dream-clear'));}
 assert.ok(prefixes.has('date15'));const copy=replayGame(nodes,r);assert.deepEqual(copy.state,state);assert.deepEqual(copy.events,events);
 for(const i of prefixes.values()){const partial=replayGame(nodes,{...r,commands:r.commands.slice(0,i)});for(const c of r.commands.slice(i))assert.ok(partial.dispatch(c).ok);assert.deepEqual(partial.state,state);assert.deepEqual(partial.events,events);}
 return{commands:r.commands.length,players:count,turn:state.turn,date:state.calendar!.date,miniCommands,dreamArrivals,dreamLandings,passingBank,displacements,receipts,turnovers,helps,dividends:dividends.map(x=>({date:x.settlement.date,amounts:x.settlement.payments.map(p=>p.amount)})),landings:[...landings].sort((a,b)=>a-b),passes:[...passes].sort((a,b)=>a-b),prefixes:[...prefixes.keys()],state,events};
}
