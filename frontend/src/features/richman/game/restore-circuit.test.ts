/** Explicit domain fixtures; time tools/snapshots here are injected, never UI acquisition evidence. */
import {expect,it} from 'vitest';
import {GameEngine} from './engine';
import type {Action,GameState,Replay} from './engine';
import {saveCheckpoint,restoreCheckpoint,g7Options,applyG7} from './g7';
import {tickG5} from './g5';
import {PROPERTY_CATALOG} from './economy';
import nodes from '../japan-topology.fixture.json';
import rent from './fixtures/finance-stress-v44-rent-replay.json';
import dividend from './fixtures/finance-stress-v44-dividend-replay.json';
import loan from './fixtures/finance-stress-v44-loan-replay.json';
import attack from './fixtures/reaction-circuit-v44-attack-replay.json';
import waiver from './fixtures/reaction-circuit-v44-waiver-replay.json';
import debt from './fixtures/reaction-circuit-v44-debt-replay.json';
const mutable=(e:GameEngine)=>(e as unknown as {current:GameState}).current;
const noop=()=>{};
function make(count=4){return new GameEngine(nodes,{gameId:'restore-domain',seed:'restore-domain',rulesId:'japan-events-candidate-v44',characterIds:['a','b','c','d'].slice(0,count),initialFunds:100000,startDate:'1998-01-14'});}
function send(e:GameEngine,a:Action){const s=e.state;return e.dispatch({gameId:s.gameId,id:'c'+s.revision,expectedRevision:s.revision,playerId:s.players[s.active].id,action:a});}
function prepare(count=4){const e=make(count),s=mutable(e);s.effects!.inventory['player-1']['tool:10']=2;saveCheckpoint(s);return{e,s};}
for(const count of [2,3,4])it(`${count}p restores optional calendar/lottery/finance/companies and world fields while protocol metadata continues`,()=>{
 const{e,s}=prepare(count),w=structuredClone(s.g7!.checkpoints['player-1']!.world);
 // Alter every optional domain by valid values from another initialized date/roster-sized world.
 const later=new GameEngine(nodes,{...e.exportReplay().config,seed:'changed-world',startDate:'1999-02-16'}).state;
 for(const k of ['calendar','lottery','fortune','news','siteServices','magic'] as const)s[k]=structuredClone(later[k]) as never;
 s.economy!.balances['player-2']={cash:2,bank:3};s.g6!.holdings['player-2']['jp:24']={quantity:3,average:1.5,cost:4};s.g6!.stocks[0].price=22222;
 s.g3!.allies['player-1']={partner:'player-2',remaining:3};s.g3!.allies['player-2']={partner:'player-1',remaining:3};s.g2!.players['player-2'].hospital=3;s.effects!.inventory['player-1']['tool:10']=5;s.finance!.round+=5;
 s.turn=100;s.randomState=123456;s.serial=300;s.effects!.serial=400;
 expect(send(e,{type:'item',action:{type:'begin',definitionId:'tool:10:time-v1'}}).ok).toBe(true);const before=e.state,command={gameId:before.gameId,id:'restore',expectedRevision:before.revision,playerId:'player-1',action:{type:'item' as const,action:{type:'confirm' as const,decisionId:before.pending!.id,target:{kind:'player' as const,id:'player-1'}}}};
 expect(e.dispatch(command).ok).toBe(true);const end=e.state;
 for(const k of ['players','economy','finance','g2','g3','g6','calendar','lottery','fortune','news','magic','siteServices'] as const)expect(end[k],k).toEqual(w[k]);
 expect(end.effects!.inventory['player-1']['tool:10']).toBe(1);expect(end.effects!.serial).toBe(before.effects!.serial);expect(end.turn).toBe(100);expect(end.randomState).toBe(123456);expect(end.revision).toBe(before.revision+1);expect(end.serial).toBe(before.serial);
 expect(e.exportReplay().commands.map(c=>c.id)).toEqual(['c0','restore']);expect(e.events.filter(e=>e.type==='effectConsumed'&&e.itemId==='tool:10')).toHaveLength(1);expect(e.dispatch(command).ok).toBe(false);expect(e.state).toEqual(end);
 expect(send(e,{type:'item',action:{type:'begin',definitionId:'tool:10:time-v1'}}).ok).toBe(false);expect(e.state).toEqual(end);
});
it('restored research repeats only the restored remaining owner actions, without preserving discarded production',()=>{
 const{e,s}=prepare(),q=s.economy!.properties.find(p=>PROPERTY_CATALOG.properties.some(d=>d.id===p.id&&d.kind==='facility'))!;
 Object.assign(q,{ownerId:'player-1',level:3,buildingType:4,research:{ownerId:'player-1',itemId:'tool:11',remaining:2}});saveCheckpoint(s);
 tickG5(s,noop);tickG5(s,noop);expect(s.effects!.inventory['player-1']['tool:11']).toBe(1);expect(q.research).toBeNull();
 expect(restoreCheckpoint(s,noop)).toBe(true);expect(s.effects!.inventory['player-1']['tool:11']).toBe(0);expect(s.economy!.properties.find(p=>p.id===q.id)!.research!.remaining).toBe(2);
 s.active=1;tickG5(s,noop);expect(s.economy!.properties.find(p=>p.id===q.id)!.research!.remaining).toBe(2);s.active=0;tickG5(s,noop);expect(s.effects!.inventory['player-1']['tool:11']).toBe(0);tickG5(s,noop);expect(s.effects!.inventory['player-1']['tool:11']).toBe(1);tickG5(s,noop);expect(s.effects!.inventory['player-1']['tool:11']).toBe(1);expect(e.state.rulesId).toBe('japan-events-candidate-v44');
});
it('self teleport refreshes departure checkpoint before consuming teleport; restored tool counts remain historical',()=>{
 const{e,s}=prepare();s.effects!.inventory['player-1']['tool:11']=2;s.economy!.balances['player-2'].bank=4321;
 const option=g7Options(s,nodes,PROPERTY_CATALOG.properties,'tool:11').find(o=>o.target.id==='player-1')!;
 expect(applyG7(s,nodes,PROPERTY_CATALOG.properties,'tool:11',option,option.destinations![0].target,noop)).toBe(true);expect(s.g7!.checkpoints['player-1']!.world.effects!.inventory['player-1']['tool:11']).toBe(2);
 expect(s.effects!.inventory['player-1']['tool:11']).toBe(1);expect(restoreCheckpoint(s,noop)).toBe(true);expect(s.effects!.inventory['player-1']['tool:11']).toBe(2);expect(s.economy!.balances['player-2'].bank).toBe(4321);expect(e.state.pending).toBeNull();
});
for(const missing of ['current','history'])it(`${missing} time tool is mandatory; failure leaves every domain untouched`,()=>{const{e,s}=prepare();if(missing==='history')s.g7!.checkpoints['player-1']!.world.effects!.inventory['player-1']['tool:10']=0;else s.effects!.inventory['player-1']['tool:10']=0;const b=e.state;expect(send(e,{type:'item',action:{type:'begin',definitionId:'tool:10:time-v1'}}).ok).toBe(false);expect(e.state).toEqual(b);});
for(const [name,json] of [['rent',rent],['dividend',dividend],['loan',loan],['attack',attack],['waiver',waiver],['debt',debt]] as const)it(`historical 05a/b ${name}: pending boundaries reject time; completed world can restore with logs/RNG retained`,async()=>{
 const replay=json as Replay,e=new GameEngine(nodes,replay.config);let rejects=0,prior:GameState|null=null;
 for(let i=0;i<replay.commands.length;i++){
  if(i%150===0)await new Promise<void>(r=>setTimeout(r,0));
  const b=e.state;if(b.phase==='idle'&&!prior)prior=b;
  if(b.pending&&['reaction','auction','debt'].includes(b.pending.kind)){
   const cmd={gameId:b.gameId,id:'invalid-time-'+i,expectedRevision:b.revision,playerId:b.players[b.active].id,action:{type:'item' as const,action:{type:'begin' as const,definitionId:'tool:10:time-v1'}}};
   // A stocked tool and valid historical checkpoint still cannot interrupt the pending caller.
   const probe=make(replay.config.characterIds.length),injected=structuredClone(b),actor=b.players[b.active].id;injected.effects!.inventory[actor]['tool:10']=2;saveCheckpoint(injected);(probe as unknown as {current:GameState}).current=injected;const before=probe.state;
   expect(probe.dispatch(cmd).ok).toBe(false);expect(probe.state).toEqual(before);rejects++;
  }
  expect(e.dispatch(replay.commands[i]).ok).toBe(true);
 }
 const end=e.state,actor=end.players[end.active].id,world=structuredClone(prior!);world.active=end.active;world.effects!.inventory[actor]['tool:10']=2;saveCheckpoint(world);
 const s=structuredClone(end);s.effects!.inventory[actor]['tool:10']=1;s.g7!.checkpoints[actor]=world.g7!.checkpoints[actor];const log=e.events,commands=e.exportReplay().commands,rng=s.randomState;
 expect(restoreCheckpoint(s,noop)).toBe(true);for(const k of ['economy','finance','g6','g3','g2','news','calendar','lottery'] as const)expect(s[k]).toEqual(world[k]);expect(s.effects!.inventory[actor]['tool:10']).toBe(1);expect(s.randomState).toBe(rng);expect(s.turn).toBe(end.turn);expect(e.events).toEqual(log);expect(e.exportReplay().commands).toEqual(commands);
 if(['dividend','loan','attack','debt'].includes(name))expect(rejects).toBeGreaterThan(0);
 // This direct-domain rollback may restore an earlier alive world; public disposal itself never does.
 if(end.finance!.disposal!.last){const r=end.finance!.disposal!.last;expect(end.finance!.eliminated).toContain(r.payerId);expect(r.amount+r.unpaid).toBe(r.due);}
},120000);
it('engineer saved vehicle, relations and carried statuses restore together without extra reconstruction',()=>{
 const{e,s}=prepare(3);s.g2!.players['player-1'].vehicle='foot';s.effects!.inventory['player-1']['tool:06']=1;s.g5!.engineers['player-1']={vehicle:'tool:06',dice:3,remaining:3,suspended:false};s.g3!.allies['player-1']={partner:'player-2',remaining:5};s.g3!.allies['player-2']={partner:'player-1',remaining:5};s.g2!.players['player-2'].turtle=4;s.g5!.hazards=[{id:1,itemId:'tool:04',node:s.players[1].node,carrier:'player-2',remaining:9}];saveCheckpoint(s);const world=structuredClone(s.g7!.checkpoints['player-1']!.world);
 s.g5!.engineers['player-1']=null;s.effects!.inventory['player-1']['tool:06']=0;s.g2!.players['player-1'].vehicle='tool:06';s.g2!.players['player-1'].diceCount=3;s.g5!.hazards=[];s.g3!.allies['player-1']=null;s.g3!.allies['player-2']=null;s.g2!.players['player-2'].turtle=0;
 expect(send(e,{type:'item',action:{type:'begin',definitionId:'tool:10:time-v1'}}).ok).toBe(true);expect(send(e,{type:'item',action:{type:'confirm',decisionId:e.state.pending!.id,target:{kind:'player',id:'player-1'}}}).ok).toBe(true);
 for(const k of ['g2','g3','g5'] as const)expect(e.state[k]).toEqual(world[k]);expect(e.state.effects!.inventory['player-1']['tool:06']).toEqual(world.effects!.inventory['player-1']['tool:06']);
});
