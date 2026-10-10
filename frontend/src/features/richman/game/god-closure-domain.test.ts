/** Legal command boundaries, not browser coverage or an invented extra source for god15. */
import {expect,it} from 'vitest';
import {GameEngine,replayGame,type Action} from './engine';
import nodes from '../japan-topology.fixture.json';
it('two ordinary human exits can replace the same computer carrier; third exit cannot create a busy-slot UI gift',()=>{
 const e=new GameEngine(nodes,{gameId:'closure-seats',rulesId:'japan-events-candidate-v47',seed:'closure-seats',characterIds:['a','b','c','d'],humanIds:['player-1','player-2','player-3']});
 const send=(action:Action)=>{const s=e.state,r=e.dispatch({id:'c'+s.revision,gameId:s.gameId,expectedRevision:s.revision,playerId:s.pending?.kind==='surrender'?s.pending.sourceId:s.players[s.active].id,action});expect(r.ok).toBe(true);};
 for(const [index,slot] of [[0,15],[1,16]]){expect(e.state.active).toBe(index);send({type:'surrender'});expect(e.state.pending?.kind).toBe('surrender');send({type:'chooseDeath',decisionId:e.state.pending!.id,targetId:'player-4'});expect(e.state.g6!.gods.filter(g=>g.type===15)).toMatchObject([{slot,carrier:'player-4',remaining:13}]);expect(e.state.finance!.eliminated).toHaveLength(index+1);send({type:'endTurn'});}
 send({type:'surrender'});expect(e.state.phase).toBe('finished');expect(e.state.pending).toBeNull();expect(e.events.filter(e=>e.type==='surrenderSelection')).toHaveLength(2);expect(e.events.filter(e=>e.type==='surrenderCompleted'&&e.outcome==='attached')).toHaveLength(2);expect(e.events.filter(e=>e.type==='surrenderCompleted'&&e.outcome==='gated')).toHaveLength(1);
 const replay=replayGame(nodes,e.exportReplay());expect(replay.state).toEqual(e.state);expect(replay.events).toEqual(e.events);
});
