import fs from 'node:fs';
import {planFinalFortune} from './plan-final-fortune-journey';
const routes=[];
for(const target of (process.env.RICHMAN_TARGETS||'2,3,4,6,7').split(',').map(Number)){
 let best:ReturnType<typeof planFinalFortune>=null,bestSeed='';
 const players=Number(process.env.RICHMAN_PLAYERS)||(target%3+2);
 for(let i=0;i<Number(process.env.RICHMAN_SEEDS||50);i++){
  const seed=`final-group-${i}`,p=planFinalFortune(seed,[target],players,best?Math.min(900,best.replay.commands.length):900);
  if(p&&(!best||p.replay.commands.length<best.replay.commands.length)){best=p;bestSeed=seed;console.log('candidate',target,seed,p.replay.commands.length,p.state.turn);}
  if(best&&best.replay.commands.length<(process.env.RICHMAN_REACTION?350:process.env.RICHMAN_FOLLOWUP?180:30))break;
 }
 if(!best)throw Error('No route '+target);
 const path=`/private/tmp/richman-unified-03j-${target}${process.env.RICHMAN_REACTION?"-"+process.env.RICHMAN_REACTION:""}.json`;fs.writeFileSync(path,JSON.stringify(best,null,2));routes.push({target,seed:bestSeed,players,commands:best.replay.commands.length,turn:best.state.turn,path});
 fs.writeFileSync('/private/tmp/richman-03j-routes.json',JSON.stringify(routes,null,2));
}
console.log(JSON.stringify(routes));
