/** Legal command circuits; engine coverage, not browser acceptance. */
import {expect,it} from 'vitest';
import {GameEngine,replayGame} from './engine';
import {GameSession} from './session';
import {computerDecision,decisionPlayer} from './computer';
import {decideComputer,observeResearch,type ResearchMemory} from './computer-research';
import {SURRENDER_FINGERPRINT} from './surrender';
import type {Manifest} from '../types';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
it.each([2,3,4])('v47 %i-player legal mixed decisions/date/special objects/month lifecycle and prefix replay',n=>{
 const e=new GameEngine(nodes,{gameId:'pair-circuit',rulesId:'japan-events-candidate-v47',seed:'paired-'+n,characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,n),initialFunds:100000,startDate:'1998-01-31'});let memory:ResearchMemory={};
 for(let i=0;i<600&&e.state.phase!=='finished';i++){
  const s=e.state,p=s.pending,id=decisionPlayer(s),d=id==='player-1'?computerDecision(s):decideComputer(s,nodes,'research-v1',memory),action=d?.action??((p?.kind==='roll'||p?.kind==='segment')?{type:'animationDone' as const,token:p.id}:null);expect(action).not.toBeNull();if(!action)throw Error('no action');
  const r=e.dispatch({id:'c'+i,gameId:s.gameId,expectedRevision:s.revision,playerId:id,action});expect(r.ok).toBe(true);if(!r.ok)throw Error(r.reason);memory=observeResearch(memory,s,action,e.state,r.events);
 }
 expect(e.state.items!.fingerprint).toBe(SURRENDER_FINGERPRINT);expect(e.state.calendar!.date).not.toBe('1998-01-31');expect(e.events.some(e=>e.type==='specialObjectsRefreshed')).toBe(true);expect(e.events.some(e=>e.type==='g6Notice'&&e.message.startsWith('配对补位：'))).toBe(true);
 const replay=e.exportReplay(),full=replayGame(nodes,replay);expect(full.state).toEqual(e.state);expect(full.events).toEqual(e.events);
 for(const n of [1,100,300]){const p=replayGame(nodes,{...replay,commands:replay.commands.slice(0,n)});for(const c of replay.commands.slice(n))expect(p.dispatch(c).ok).toBe(true);expect(p.state).toEqual(e.state);expect(p.events).toEqual(e.events);}
},30000);
it('v47 session permits all fifteen existing policies',()=>{
 const manifest:Manifest={version:1,map:{name:'日本',width:2304,height:2304,nodes,scenery:[]},sprites:{},characters:['a','b'].map(id=>({id,name:id,color:'#fff',idle:[],walk:[],walkFramesPerDirection:10}))};
 const session=new GameSession(manifest,{id:()=> 'v47-session',seed:()=> 'pairs'},'surrender');
 for(const policy of ['basic-v1','tools-v1','rent-v1','defense-v1','estate-v1','cash-v1','status-v1','inventory-v1','commerce-v1','area-v1','roads-v1','mobility-v1','gods-v1','capital-v1','research-v1'] as const){session.start({mode:'surrender',characterIds:['a','b'],computerIds:['b'],computerPolicy:policy,seed:'pairs'});expect(session.snapshot().computer?.policy).toBe(policy);expect(session.exportReplay()!.itemFingerprint).toBe(SURRENDER_FINGERPRINT);}
});
