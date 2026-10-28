import fs from 'node:fs';
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import {FORTUNE_RULES} from '../../frontend/src/features/richman/game/fortune';
import nodes from '../../shared/richman/japan-topology.fixture.json';
import {planFortune} from './plan-fortune-journey';
const uncovered=new Set(Array.from({length:16},(_,i)=>i+17)),routes=[];
for(let index=0;uncovered.size;index++){
 let best:{seed:string;ids:number[];players:number}|undefined;
 const players=2+index%3;
 for(let i=0;i<200;i++){
  const seed=`fortune-group-${i}`,e=new GameEngine(nodes,{gameId:'pick',rulesId:FORTUNE_RULES.id,seed,characterIds:['a','b','c','d'].slice(0,players),initialFunds:100000}),ids=e.state.fortune!.order.filter(n=>n>=17&&n<=32).slice(0,2);
  if(ids.every(id=>uncovered.has(id))){best={seed,ids,players};break;}
  if(!best&&ids.some(id=>uncovered.has(id)))best={seed,ids,players};
 }
 if(!best)throw Error('No covering seed');
 const plan=planFortune(best.seed,2,players),actual=plan.events.filter(e=>e.type==='fortuneResolved').map(e=>e.fortuneId);
 const path=`/private/tmp/richman-unified-03g-${index}.json`;fs.writeFileSync(path,JSON.stringify(plan,null,2));
 for(const id of actual)uncovered.delete(id);
 routes.push({...best,path,actual,commands:plan.replay.commands.length,turn:plan.state.turn});
}
fs.writeFileSync('/private/tmp/richman-03g-routes.json',JSON.stringify(routes,null,2));console.log(JSON.stringify(routes));
