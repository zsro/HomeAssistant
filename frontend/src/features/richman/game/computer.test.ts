import {expect,it} from 'vitest';
import {GameSession} from './session';
import {GameEngine,replayGame} from './engine';
import type {Action,GameState,Replay} from './engine';
import {computerDecision,decisionPlayer} from './computer';
import type {Manifest} from '../types';
import nodes from '../japan-topology.fixture.json';
import {planComputer} from '../../../../../scripts/richman/plan-computer';
const manifest:Manifest={version:1,map:{name:'日本',width:2304,height:2304,nodes,scenery:[]},sprites:{},characters:['xiaomei','tuu','chyan','salonbus'].map(id=>({id,name:id,color:'#fff',idle:[],walk:[],walkFramesPerDirection:10}))};
function make(computerIds=['tuu']){let n=0;const m=new GameSession(manifest,{id:()=>`game-${++n}`,seed:()=> 'test'});m.start({mode:'stockCircuit',characterIds:['tuu','salonbus'],computerIds,seed:'computer',initialFunds:10000});return m;}
const tick=(m:GameSession,n=12)=>{for(let i=0;i<n;i++)m.tick(50);};
const engine=(m:GameSession)=>(m as unknown as {engine:GameEngine}).engine;
const mutable=(e:GameEngine)=>(e as unknown as {current:GameState}).current;
it('noncontiguous character seats, deterministic policy and metadata without engine config changes',()=>{const m=make(),s=m.gameState!,copy=structuredClone(s);expect(m.snapshot().participants).toEqual([1,3]);expect(m.snapshot().computer?.automatic).toBe(true);expect(computerDecision(s)).toEqual(computerDecision(s));expect(s).toEqual(copy);expect(m.exportReplay()!.control).toEqual({version:1,policy:'basic-v1',computerIds:['tuu']});expect(m.exportReplay()!.config).not.toHaveProperty('computerIds');expect(make([]).exportReplay()).not.toHaveProperty('control');});
it('wait clamps background frames, manual computer roll rejected; pause cancels and resume waits afresh',()=>{const m=make();m.roll();expect(m.gameState!.revision).toBe(0);m.tick(60000);tick(m,9);for(const n of [NaN,Infinity,-1,0])m.tick(n);expect(m.gameState!.revision).toBe(0);m.pause(true);const frozen=m.gameState;tick(m,100);expect(m.gameState).toEqual(frozen);m.pause(false);tick(m,11);expect(m.gameState!.phase).toBe('idle');tick(m,1);expect(m.gameState!.phase).toBe('rolling');expect(m.exportReplay()!.commands.map(c=>c.action.type)).toEqual(['pause','pause','roll']);});
it('reset and replacement invalidate queued work, invalid replacement preserves original, dispose stops everything',()=>{const m=make();tick(m,11);const id=m.gameState!.gameId;m.reset();expect(m.gameState!.gameId).not.toBe(id);tick(m,11);expect(m.gameState!.revision).toBe(0);const before=m.gameState;expect(()=>m.start({mode:'stockCircuit',characterIds:['tuu','salonbus'],computerIds:['xiaomei'],seed:'new'})).toThrow();expect(m.gameState).toEqual(before);m.start({mode:'stockCircuit',characterIds:['tuu','salonbus'],seed:'new'});tick(m,100);expect(m.gameState!.revision).toBe(0);m.dispose();m.roll();tick(m,100);expect(m.gameState!.revision).toBe(0);expect(()=>m.reset()).toThrow('关闭');});
it('finished game cannot schedule commands; legacy modes refuse computer configuration atomically',()=>{const m=make();mutable(engine(m)).phase='finished';tick(m,100);expect(m.gameState!.revision).toBe(0);expect(computerDecision(m.gameState!)).toBeNull();expect(()=>m.start({mode:'turns',characterIds:['tuu','salonbus'],computerIds:['tuu'],seed:'old'})).toThrow();});
it('bank policy respects refusal and retains bank funds when sufficient cash exists',()=>{const m=make(),s=mutable(engine(m));s.phase='bank';s.pending={kind:'bank',id:'bank',node:1,arrival:'landing'};s.news!.business!.bankRejected!['player-1']=2;expect(computerDecision(s)!.action.type).toBe('leaveBank');s.news!.business!.bankRejected!['player-1']=0;s.economy!.balances['player-1']={cash:100,bank:4900};expect(computerDecision(s)!.action).toEqual({type:'bank',decisionId:'bank',operation:'withdraw',amount:4900});tick(m);expect(m.gameState!.economy!.balances['player-1']).toEqual({cash:5000,bank:0});tick(m);expect(m.gameState!.pending?.kind).not.toBe('bank');});
const fixtures=import.meta.glob('./fixtures/{reaction-circuit-v44-*,finance-stress-v44-*,magic-actions-v37-*,magic-nested-v38-*,insurance-v29-ui,restore-circuit-v44-2}-replay.json',{eager:true,import:'default'}) as Record<string,Replay>;
it('historical waiting/actual-payer states: pure policy selects a legal command, including alternate responders',async()=>{
 const seen=new Set<string>(),responders=new Set<string>();
 for(const replay of Object.values(fixtures)){
  const e=new GameEngine(nodes,replay.config);
  for(let i=0;i<replay.commands.length;i++){
   if(i%150===0)await new Promise<void>(r=>setTimeout(r,0));
   const s=e.state,p=s.pending,d=computerDecision(s),key=p?.kind==='property'?p.kind+':'+p.operation:p?.kind==='magic'?p.kind+':'+p.stage:p?.kind??s.phase;
   if(d&&!seen.has(key)){
    const clone=new GameEngine(nodes,replay.config);(clone as unknown as {current:GameState}).current=structuredClone(s);
    const before=structuredClone(s);const r=clone.dispatch({id:'probe',gameId:s.gameId,expectedRevision:s.revision,playerId:d.playerId,action:d.action});expect(r.ok,JSON.stringify({key,d,r})).toBe(true);expect(s).toEqual(before);seen.add(key);
   }
   if(d&&d.playerId!==s.players[s.active].id&&!responders.has(key)){
    // Explicit domain snapshot, not an original-map UI acquisition claim.
    const m=make([]);(m as unknown as {engine:GameEngine;options:unknown}).engine=e;
    (m as unknown as {options:unknown}).options={mode:'stockCircuit',characterIds:s.players.map(p=>p.characterId),computerIds:[s.players.find(p=>p.id===d.playerId)!.characterId],seed:s.seed};
    const duplicate=new GameEngine(nodes,replay.config);(duplicate as unknown as {current:GameState}).current=structuredClone(s);(m as unknown as {engine:GameEngine}).engine=duplicate;
    expect(decisionPlayer(s)).toBe(d.playerId);tick(m);expect(m.gameState!.revision).toBe(s.revision+1);expect(m.snapshot().computer?.error).toBeNull();
    // Human responder remains actionable even while the active mover is computer-controlled.
    (duplicate as unknown as {current:GameState}).current=structuredClone(s);(m as unknown as {options:{computerIds:string[]}}).options.computerIds=[s.players[s.active].characterId];tick(m);expect(m.gameState!.revision).toBe(s.revision);
    const result=(m as unknown as {send:(a:Action,id:string)=>{ok:boolean}}).send(d.action,d.playerId);expect(result.ok).toBe(true);responders.add(key);
   }
   expect(e.dispatch(replay.commands[i]).ok).toBe(true);
  }
 }
 for(const k of ['reaction','auction','debt','property:rent','magic:build','insurance','construction','subscription','effect'])expect(seen.has(k),k).toBe(true);
 for(const k of ['reaction','auction','debt'])expect(responders.has(k),k).toBe(true);
},180000);
for(const n of [2,3,4])it(`${n}p policy long run reaches turn 300 or terminal without invalid actions and exact full replay`,async()=>{await new Promise<void>(r=>setTimeout(r,0));const p=planComputer(n,'computer-'+n,300),e=replayGame(nodes,p.replay as Replay);expect(e.state).toEqual(p.state);expect(e.events).toEqual(p.events);expect(p.state.phase==='finished'||p.state.turn>=300).toBe(true);},120000);

it('unsupported/corrupt decision stops once, retry waits afresh, reset clears error',()=>{const m=make(),s=mutable(engine(m));s.phase='choosing';s.pending={kind:'branch',id:'invalid-test-token',choices:[]};tick(m);expect(m.snapshot().computer?.error).toContain('已停止自动操作');const r=m.gameState!.revision;tick(m,100);expect(m.gameState!.revision).toBe(r);m.retryComputer();expect(m.snapshot().computer?.error).toBeNull();tick(m,11);expect(m.snapshot().computer?.error).toBeNull();tick(m,1);expect(m.snapshot().computer?.error).not.toBeNull();m.reset();expect(m.snapshot().computer?.error).toBeNull();});
