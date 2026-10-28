/** Existing legal route prefixes, never UI state injection. */
import {readFileSync,writeFileSync} from 'node:fs';
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import {GODS} from '../../frontend/src/features/richman/game/g6-catalog';
import nodes from '../../shared/richman/japan-topology.fixture.json';
for(const n of [2,3,4]) {
 const p=JSON.parse(readFileSync(`/private/tmp/computer-gods-${n}.json`,'utf8')),e=new GameEngine(nodes,p.replay.config),checks=[];
 let last='',end=0;
 for(let i=0;i<p.replay.commands.length;i++) {
  const c=p.replay.commands[i],human=!p.replay.control.computerIds.includes(p.replay.config.characterIds[Number(c.playerId.split('-')[1])-1]);
  if(human&&c.action.type!=='animationDone') {
   if(i>200){end=i;break;}
   const gods=e.state.g6!.gods.filter(g=>g.carrier),sig=gods.map(g=>g.carrier+':'+g.type).join();
   if(sig!==last){checks.push({index:i,gods:gods.map(g=>({carrier:g.carrier,text:`${GODS.find(d=>d.type===g.type)!.name} · 剩余${g.remaining}次自身行动开始结算`}))});last=sig;}
  }
  const r=e.dispatch(c);if(!r.ok)throw Error(JSON.stringify(r));
 }
 p.replay.commands=p.replay.commands.slice(0,end);p.state=e.state;p.events=e.events;p.displayChecks=checks;
 writeFileSync(`/private/tmp/god-lifecycle-${n}.json`,JSON.stringify(p));console.log(n,end,checks);
}
