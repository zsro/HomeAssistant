/** Independent assertions over real commands; no state injection or use of restoreCheckpoint as an oracle. */
import {strict as assert} from 'node:assert';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import type {Replay} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export async function verifyRestoreCircuit(replay:Replay){
 assert.equal(replay.rulesId,'japan-events-candidate-v44');assert.equal(replay.itemFingerprint,'f9dbb7e9');
 const e=new GameEngine(nodes,replay.config),prefixes=new Map<string,number>(),restores:unknown[]=[];let deliveries=0,researchStarted=0,trades=0,dateSteps=0,restoredAt=-1,afterRestore=0;
 const mark=(name:string,i:number)=>{if(!prefixes.has(name))prefixes.set(name,i);};
 for(let i=0;i<replay.commands.length;i++){
  if(i%150===0)await new Promise<void>(r=>setTimeout(r,0));
  const c=replay.commands[i],b=e.state,isTime=c.action.type==='item'&&c.action.action.type==='confirm'&&b.effects!.pending?.definitionId==='tool:10:time-v1';
  const log=isTime?e.events:[],commands=isTime?e.exportReplay().commands:[];
  const result=e.dispatch(c);assert.ok(result.ok,JSON.stringify(c));const s=e.state;
  if(c.action.type==='research'){researchStarted++;mark('research-start',i);}
  if(c.action.type==='stockTrade')trades++;
  for(const event of result.events)if(event.type==='g5Notice'&&event.message.startsWith('研究完成')&&event.message.includes('时光机')){deliveries++;mark('research-delivery',i);}
  if(isTime){
   assert.ok(result.events.some(x=>x.type==='g7Notice'&&x.message.startsWith('时光机：')));
   const checkpoint=b.g7!.checkpoints[c.playerId]!,world=checkpoint.world,expected=structuredClone(world);
   expected.effects!.inventory[c.playerId]['tool:10']--;expected.effects!.serial=Math.max(b.effects!.serial,expected.effects!.serial);expected.effects!.pending=null;expected.g5!.landedTurn=0;
   for(const k of Object.keys(world) as (keyof typeof world)[])assert.deepEqual(s[k],expected[k],`restored ${k}`);
   for(const k of ['active','turn','randomState','serial','gameId','completed','paused','seed','rulesId','mapFingerprint','schemaVersion'] as const)assert.deepEqual(s[k],b[k],`nonrestored ${k}`);
   assert.equal(s.revision,b.revision+1);assert.equal(s.phase,'idle');assert.equal(s.pending,null);assert.equal(s.remaining,0);assert.equal(s.dice,0);
   assert.ok(Object.values(s.g7!.checkpoints).every(x=>x===null));assert.deepEqual(e.events.slice(0,log.length),log);assert.deepEqual(e.exportReplay().commands.slice(0,commands.length),commands);
   assert.ok(e.events.length>log.length);assert.equal(e.exportReplay().commands.length,commands.length+1);
   assert.equal(result.events.filter(x=>x.type==='effectConsumed'&&x.itemId==='tool:10').length,1);
   assert.equal(e.dispatch(c).ok,false);assert.deepEqual(e.state,s);
   const invalid={...c,id:'stale-'+c.id,expectedRevision:s.revision};assert.equal(e.dispatch(invalid).ok,false);assert.deepEqual(e.state,s);
   const sections:Record<string,[unknown,unknown]>={balances:[world.economy!.balances,b.economy!.balances],holdings:[world.g6!.holdings,b.g6!.holdings],market:[world.g6!.stocks,b.g6!.stocks],relations:[world.g3!.allies,b.g3!.allies],status:[world.g2!.players,b.g2!.players],inventory:[world.effects!.inventory,b.effects!.inventory],date:[world.calendar,b.calendar],research:[world.economy!.properties.map(p=>p.research),b.economy!.properties.map(p=>p.research)],companies:[world.news!.business,b.news!.business],finance:[world.finance,b.finance]};
   restores.push({playerId:c.playerId,turn:b.turn,checkpointTurn:checkpoint.turn,round:[b.finance!.round,s.finance!.round],date:[b.calendar!.date,s.calendar!.date],changed:Object.entries(sections).filter(([,v])=>!equal(...v)).map(([k])=>k),inventory:[b.effects!.inventory[c.playerId]['tool:10'],world.effects!.inventory[c.playerId]['tool:10'],s.effects!.inventory[c.playerId]['tool:10']],research:[world.economy!.properties.filter(p=>p.research),b.economy!.properties.filter(p=>p.research)],rng:b.randomState,revision:[b.revision,s.revision],logs:[log.length,e.events.length]});
   mark('before-time-confirm',i);mark('after-time-confirm',i+1);restoredAt=i;
  }else if(s.calendar!.date!==b.calendar!.date){dateSteps++;mark('calendar',i);}
  if(restoredAt>=0&&i>restoredAt&&c.action.type==='roll'){afterRestore++;mark('next-departure',i);assert.ok(s.g7!.checkpoints[c.playerId]);}
  for(const bag of Object.values(s.g6!.holdings))for(const h of Object.values(bag)){assert.equal(h.cost,Math.trunc(h.quantity*h.average!));if(!h.quantity)assert.equal(h.average,0);}
  if(s.phase!=='finished')for(const company of s.news!.business!.companies)assert.equal(company.ownerId,company.ranking[0]??null);
 }
 assert.equal(restores.length,1);assert.ok(deliveries&&trades&&dateSteps&&afterRestore);
 const copy=replayGame(nodes,replay);assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);
 for(const index of new Set(prefixes.values())){await new Promise<void>(r=>setTimeout(r,0));const prefix=JSON.parse(JSON.stringify({...replay,commands:replay.commands.slice(0,index)})) as Replay,copy=replayGame(nodes,prefix);for(const c of replay.commands.slice(index))assert.ok(copy.dispatch(c).ok);assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);}
 return{players:replay.config.characterIds.length,commands:replay.commands.length,turn:e.state.turn,date:e.state.calendar!.date,deliveries,researchStarted,trades,dateSteps,afterRestore,prefixes:[...prefixes.keys()],restores,state:e.state,events:e.events};
}
