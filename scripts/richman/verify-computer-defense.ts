import {strict as assert} from 'node:assert';
import {GameEngine,replayGame,type EventPayload} from '../../frontend/src/features/richman/game/engine';
import type {ControlledReplay} from '../../frontend/src/features/richman/game/computer';
import {decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {decideComputer} from '../../frontend/src/features/richman/game/computer-defense';
import nodes from '../../shared/richman/japan-topology.fixture.json';
export async function verifyComputerDefense(replay:ControlledReplay){
 assert.equal(replay.rulesId,'japan-events-candidate-v44');assert.equal(replay.itemFingerprint,'f9dbb7e9');assert.equal(replay.control?.policy,'defense-v1');
 const e=new GameEngine(nodes,replay.config),prefixes=new Map<string,number>(),acquisitions:unknown[]=[],attacks:unknown[]=[],reactions:unknown[]=[],automatic:unknown[]=[];let auto=0,human=0;
 const mark=(key:string,n:number)=>{if(!prefixes.has(key))prefixes.set(key,n);};
 for(let i=0;i<replay.commands.length;i++){
  if(i%150===0)await new Promise<void>(r=>setTimeout(r,0));const c=replay.commands[i],a=c.action,b=e.state,p=b.pending,id=c.playerId,ai=replay.control!.computerIds.includes(b.players.find(p=>p.id===id)!.characterId);
  if(a.type!=='pause'&&a.type!=='animationDone'&&!(a.type==='minigame'&&a.input.kind==='tick')){assert.equal(id,decisionPlayer(b));if(ai){auto++;assert.deepEqual(decideComputer(b,nodes,'defense-v1')!.action,a);}else human++;}
  const result=e.dispatch(c);assert.ok(result.ok,JSON.stringify({i,c,result}));const s=e.state;
  for(const player of b.players)for(const item of ['card:16','card:17','card:19','card:21','card:18'])if((s.effects!.inventory[player.id][item]??0)>(b.effects!.inventory[player.id][item]??0)){
   acquisitions.push({id:player.id,item,ai:replay.control!.computerIds.includes(player.characterId),turn:s.turn,action:a.type,node:s.players.find(x=>x.id===player.id)!.node,evidence:result.events.filter(x=>x.type==='itemBought'||x.type==='g6Notice'||x.type==='magicResolved').map(x=>x.type==='g6Notice'?x.message:x.type==='magicResolved'?x.receipt:x.itemId)});if(item==='card:19'&&replay.control!.computerIds.includes(player.characterId)||item==='card:16'||item==='card:17')mark('acquired-'+item,i+1);
  }
  if(a.type==='item'&&a.action.type==='confirm'&&['card:16','card:17'].includes(b.effects?.pending?.definitionId.slice(0,7)??'')){
   const item=b.effects!.pending!.definitionId.slice(0,7);assert.equal(s.effects!.inventory[id][item],b.effects!.inventory[id][item]-1);assert.equal(s.g2!.supply[item],b.g2!.supply[item]+1);assert.equal(s.randomState,b.randomState);attacks.push({id,target:a.action.target.id,item,turn:s.turn});mark(item+'-confirm-before',i);mark(item+'-confirm-after',i+1);
  }
  if(a.type==='pause'&&p?.kind==='reaction'&&p.continuation.kind==='attack')mark(s.paused?'defense-paused':'defense-resumed',i+1);
  if(a.type==='reaction'&&p?.kind==='reaction'&&p.continuation.kind==='attack'){
   const attack=p.continuation,target=a.choice==='use'?a.targetId!:attack.originalId,turns=target===attack.sourceId?4:5;
   mark('reaction-before',i);mark('reaction-after',i+1);assert.equal(id,p.responderId);assert.notEqual(id,b.players[b.active].id);assert.equal(s.randomState,b.randomState);assert.equal(s.active,b.active);assert.equal(s.turn,b.turn);assert.deepEqual(s.calendar,b.calendar);assert.equal(s.pending,null);
   if(a.choice==='use'){
    assert.ok(p.targets.includes(target));assert.equal(s.effects!.inventory[id]['card:19'],b.effects!.inventory[id]['card:19']-1);assert.equal(s.g3!.supply['card:19'],b.g3!.supply['card:19']+1);assert.deepEqual(s.g2!.players[id],b.g2!.players[id]);
    for(const who of [id,target])for(const item of ['card:21','card:18'])assert.equal(s.effects!.inventory[who][item],b.effects!.inventory[who][item]);
    const m=s.g2!.players[target],old=b.g2!.players[target];
    if(attack.itemId==='card:17'){
     assert.equal(m.prison,((old.prison&127)+turns)&127);assert.equal(m.hospital,0);assert.equal(m.travel,0);assert.equal(m.vehicle,old.vehicle);assert.equal(m.diceCount,old.diceCount);assert.equal(s.g4!.hotel[target],0);assert.equal(s.players.find(x=>x.id===target)!.previous,null);assert.ok(s.news!.detention!.prison.includes(target));assert.ok(!s.news!.detention!.hospital.includes(target));
    }else{
     assert.equal(m.dream,turns);assert.equal(m.vehicle,'foot');assert.equal(m.diceCount,1);assert.equal(m.savedVehicle,old.vehicle);assert.equal(m.savedDice,old.diceCount);assert.equal(m.winter,old.winter);assert.equal(s.players.find(x=>x.id===target)!.node,b.players.find(x=>x.id===target)!.node);if(old.vehicle!=='foot')assert.equal(s.effects!.inventory[target][old.vehicle],b.effects!.inventory[target][old.vehicle]+1);
    }
    const source=s.g2!.players[attack.sourceId];assert.equal(s.phase,source.prison||source.hospital||source.travel?'turnEnd':'idle');
   }
   for(const player of b.players){const claims:EventPayload[]=result.events.filter(x=>x.type==='insuranceClaim'&&x.receipt.playerId===player.id);const amount:number=claims.reduce((sum,x)=>sum+(x.type==='insuranceClaim'?x.receipt.amount:0),0);assert.equal(s.economy!.balances[player.id].cash-b.economy!.balances[player.id].cash,amount);assert.equal(s.economy!.balances[player.id].bank,b.economy!.balances[player.id].bank);}
   assert.ok(result.events.some(x=>x.type==='attackResolved'&&x.sourceId===attack.sourceId&&x.targetId===target));reactions.push({ai,id,item:attack.itemId,target,source:attack.sourceId,choice:a.choice,turn:s.turn,turns,phase:s.phase});
  }
  for(const ev of result.events)if(ev.type==='g3Resolved'&&['card:21','card:18'].includes(ev.itemId)){automatic.push(ev);mark('automatic-'+ev.itemId,i+1);}
 }
 assert.ok(auto&&human&&reactions.length&&attacks.length);
 const replayed=replayGame(nodes,replay);assert.deepEqual(replayed.state,e.state);assert.deepEqual(replayed.events,e.events);
 for(const n of new Set(prefixes.values())){await new Promise<void>(r=>setTimeout(r,0));const copy=replayGame(nodes,{...replay,commands:replay.commands.slice(0,n)});for(let j=n;j<replay.commands.length;j++){if(j%150===0)await new Promise<void>(r=>setTimeout(r,0));assert.ok(copy.dispatch(replay.commands[j]).ok);}assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);}
 return{players:replay.config.characterIds.length,commands:replay.commands.length,turn:e.state.turn,auto,human,acquisitions,attacks,reactions,automatic,prefixes:[...prefixes.keys()],state:e.state,events:e.events};
}
