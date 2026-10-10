import {strict as assert} from 'node:assert';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {ControlledReplay} from '../../frontend/src/features/richman/game/computer';
import {decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer,STATUS_GOODS} from '../../frontend/src/features/richman/game/computer-status';
import {shopPrice} from '../../frontend/src/features/richman/game/shop-acquisition';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const goods=STATUS_GOODS.map(g=>g.id as string);
export async function verifyComputerStatus(replay:ControlledReplay){
 assert.equal(replay.rulesId,'japan-events-candidate-v44');assert.equal(replay.itemFingerprint,'f9dbb7e9');assert.equal(replay.control?.policy,'status-v1');
 const e=new GameEngine(nodes,replay.config),prefixes=new Map<string,number>(),acquisitions:unknown[]=[],uses:unknown[]=[],reactions:unknown[]=[],automatic:unknown[]=[],cancellations:unknown[]=[],clocks:unknown[]=[];let auto=0,human=0;
 const affected=new Map<string,{item:string;field:'stop'|'winter'|'dream'|'prison'|'turtle'}>();
 const mark=(key:string,n:number)=>{if(!prefixes.has(key))prefixes.set(key,n);};
 for(let i=0;i<replay.commands.length;i++){
  if(i%150===0)await new Promise<void>(r=>setTimeout(r,0));const c=replay.commands[i],a=c.action,b=e.state,id=c.playerId,p=b.pending,ai=replay.control!.computerIds.includes(b.players.find(p=>p.id===id)!.characterId);
  if(a.type!=='pause'&&a.type!=='animationDone'&&!(a.type==='minigame'&&a.input.kind==='tick')){assert.equal(id,decisionPlayer(b));if(ai){auto++;assert.deepEqual(decideComputer(b,nodes,'status-v1')!.action,a);}else human++;}
  const r=e.dispatch(c);assert.ok(r.ok,JSON.stringify({i,c,r}));const s=e.state;
  for(const player of b.players)for(const item of [...goods,'card:19','card:21','card:18'])if(s.effects!.inventory[player.id][item]>b.effects!.inventory[player.id][item]){
   const isAI=replay.control!.computerIds.includes(player.characterId);acquisitions.push({id:player.id,ai:isAI,item,turn:s.turn,action:a.type,evidence:r.events.filter(x=>x.type==='itemBought'||x.type==='g6Notice'||x.type==='magicResolved').map(x=>x.type==='itemBought'?{item:x.itemId,cost:x.cost}:x.type==='g6Notice'?x.message:x.receipt)});if(goods.includes(item))mark(item+'-acquired',i+1);
  }
  if(a.type==='buyItem'&&goods.includes(a.itemId)){assert.ok(p?.kind==='shop'&&p.shelf?.cards.some(x=>x.itemId===a.itemId&&x.available));assert.equal(s.items!.points[id],b.items!.points[id]-shopPrice(a.itemId));assert.equal(s.g2!.supply[a.itemId],b.g2!.supply[a.itemId]-1);assert.equal(s.effects!.inventory[id][a.itemId],b.effects!.inventory[id][a.itemId]+1);assert.deepEqual(s.economy!.balances,b.economy!.balances);}
  const item=b.effects?.pending?.definitionId.slice(0,7),cash=structuredClone(b.economy!.balances),companies=structuredClone(b.news!.business!.companies),mobility=structuredClone(b.g2!.players),players=structuredClone(b.players),bag=structuredClone(b.effects!.inventory),supply=structuredClone(b.g2!.supply);let resolves=false;
  const record=(target:string,card:string,turns:number)=>{
   const m=mobility[target],field=card==='card:14'?'stop':card==='card:15'?'winter':card==='card:16'?'dream':card==='card:17'?'prison':'turtle';affected.set(target,{item:card,field});
   if(field==='stop'||field==='turtle')m[field]=turns;
   if(field==='winter'){m.winter=5;m.dream=0;m.savedVehicle='foot';m.savedDice=1;}
   if(field==='dream'){m.dream=turns;m.savedVehicle=m.vehicle;m.savedDice=m.diceCount;if(m.vehicle!=='foot')bag[target][m.vehicle]++;m.vehicle='foot';m.diceCount=1;}
   if(field==='prison'){m.prison=((m.prison&127)+turns)&127;m.hospital=0;if(m.travel!==undefined)m.travel=0;const player=players.find(x=>x.id===target)!;player.node=84;player.previous=null;assert.equal(s.g4!.hotel[target],0);assert.ok(s.news!.detention!.prison.includes(target));assert.ok(!s.news!.detention!.hospital.includes(target));assert.equal(s.g1!.facing[target],undefined);
    const term=b.news?.business?.insurance?.terms[target];if(term){const amount=turns*2000*b.calendar!.business!.priceIndex;cash[target].cash+=amount;const company=companies.find(c=>c.id==='japan:company:4')!;company.funds=(company.funds-amount)|0;company.cumulative=(company.cumulative-amount)|0;assert.ok(r.events.some(ev=>ev.type==='insuranceClaim'&&ev.receipt.playerId===target&&ev.receipt.amount===amount));}
   }
  };
  if(a.type==='pause'&&item&&goods.includes(item))mark(item+(s.paused?'-paused':'-resumed'),i+1);
  if(a.type==='item'&&item&&goods.includes(item)){
   if(a.action.type==='cancel'){assert.deepEqual(s.economy,b.economy);assert.deepEqual(s.effects!.inventory,b.effects!.inventory);assert.deepEqual(s.g2,b.g2);assert.equal(s.randomState,b.randomState);assert.equal(s.phase,'idle');cancellations.push({ai,id,item,turn:s.turn});mark('cancel-before',i);mark('cancel-after',i+1);}
   if(a.action.type==='confirm'){bag[id][item]--;supply[item]++;assert.equal(s.g3!.slots[id].length,b.g3!.slots[id].length-1);mark(item+'-confirm-before',i);mark(item+'-confirm-after',i+1);resolves=true;}
  }
  if(p?.kind==='reaction'&&p.continuation.kind==='attack'){
   if(a.type==='pause')mark('attack'+(s.paused?'-paused':'-resumed'),i+1);
   if(a.type==='reaction'){if(a.choice==='use')bag[id]['card:19']--;assert.equal(s.g3!.supply['card:19'],b.g3!.supply['card:19']+(a.choice==='use'?1:0));reactions.push({ai,id,active:b.players[b.active].id,item:p.continuation.itemId,choice:a.choice,target:a.targetId,turn:b.turn});mark('attack-reaction-before',i);mark('attack-reaction-after',i+1);resolves=true;}
  }
  for(const ev of r.events){
   if(ev.type==='g2Resolved'&&goods.includes(ev.itemId)){
    const ids=ev.option.playerIds;
    if(ev.itemId==='card:15')assert.deepEqual(ids,b.players.filter(x=>x.id!==id&&!b.finance!.eliminated.includes(x.id)&&!b.g2!.players[x.id].prison&&!b.g2!.players[x.id].hospital&&!b.g2!.players[x.id].travel&&!b.g4!.hotel[x.id]&&nodes.find(n=>n.id===x.node)!.x!==0).map(x=>x.id));
    else{assert.ok(a.type==='item'&&a.action.type==='confirm');assert.deepEqual(ids,[a.action.target.id]);}
    for(const who of ids)record(who,ev.itemId,ev.itemId==='card:14'?(who===id?128:1):ev.itemId==='card:30'?(who===id?2:3):5);
    uses.push({ai,id,item:ev.itemId,targets:ids,turn:b.turn,before:Object.fromEntries(ids.map(x=>[x,b.g2!.players[x]])),after:Object.fromEntries(ids.map(x=>[x,s.g2!.players[x]]))});
   }
   if(ev.type==='attackResolved'){
    const attack=p?.kind==='reaction'&&p.continuation.kind==='attack'?p.continuation:null;
    let original='',source=id,target:string|null=null;
    if(attack){assert.ok(a.type==='reaction');original=attack.originalId;source=attack.sourceId;target=a.choice==='use'?a.targetId!:original;}
    else{assert.ok(a.type==='item'&&a.action.type==='confirm');original=a.action.target.id;target=ev.itemId==='card:16'&&b.g2!.players[original].winter||b.effects!.inventory[original]['card:21']>0?null:original;}
    assert.equal(ev.sourceId,source);assert.equal(ev.originalId,original);assert.equal(ev.targetId,target);
    if(target){record(target,ev.itemId,target===source?4:5);if(target===original&&b.effects!.inventory[original]['card:18']>0)record(source,ev.itemId,5);}
    uses.push({ai:replay.control!.computerIds.includes(b.players.find(p=>p.id===source)!.characterId),responderComputer:ai,id:source,item:ev.itemId,targets:target?[target]:[],original,turn:b.turn,phase:s.phase,before:b.g2!.players,after:s.g2!.players});
   }
   if(ev.type==='g3Resolved'&&['card:21','card:18'].includes(ev.itemId)){bag[ev.sourceId][ev.itemId]--;assert.equal(s.g3!.supply[ev.itemId],b.g3!.supply[ev.itemId]+1);automatic.push(ev);mark('automatic-'+ev.itemId,i+1);}
  }
  if(resolves){assert.deepEqual(s.effects!.inventory,bag);assert.deepEqual(s.g2!.supply,supply);assert.deepEqual(s.g2!.players,mobility);assert.deepEqual(s.players,players);assert.deepEqual(s.economy!.balances,cash);assert.deepEqual(s.news!.business!.companies,companies);assert.deepEqual(s.economy!.properties,b.economy!.properties);assert.deepEqual(s.g6,b.g6);assert.deepEqual(s.finance,b.finance);assert.deepEqual(s.calendar,b.calendar);assert.equal(s.news!.publicFund,b.news!.publicFund);assert.equal(s.randomState,b.randomState);assert.equal(s.turn,b.turn);assert.equal(s.active,b.active);
   if(s.pending?.kind!=='reaction'){assert.equal(s.pending,null);const m=mobility[b.players[b.active].id];assert.equal(s.phase,m.prison||m.hospital||m.travel?'turnEnd':'idle');}else mark('attack-offered',i+1);
  }
  for(const[who,tracking]of affected){const old=b.g2!.players[who][tracking.field],next=s.g2!.players[who][tracking.field];if(old!==next&&!resolves&&r.events.some(x=>x.type==='turnStarted')){clocks.push({id:who,item:tracking.item,field:tracking.field,before:old,after:next,turn:s.turn});mark(tracking.item+'-clock-before',i);mark(tracking.item+'-clock-after',i+1);}}
 }
 assert.ok(auto&&human&&uses.length);const full=replayGame(nodes,JSON.parse(JSON.stringify(replay)));assert.deepEqual(full.state,e.state);assert.deepEqual(full.events,e.events);
 for(const n of new Set(prefixes.values())){await new Promise<void>(r=>setTimeout(r,0));const copy=replayGame(nodes,{...replay,commands:replay.commands.slice(0,n)});for(let j=n;j<replay.commands.length;j++){if(j%150===0)await new Promise<void>(r=>setTimeout(r,0));assert.ok(copy.dispatch(replay.commands[j]).ok);}assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);}
 return{players:replay.config.characterIds.length,commands:replay.commands.length,turn:e.state.turn,auto,human,acquisitions,uses,reactions,automatic,cancellations,clocks,prefixes:[...prefixes.keys()],state:e.state,events:e.events};
}
