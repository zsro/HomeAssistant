import fs from 'node:fs';
import {planTrafficFortune} from './plan-traffic-fortune-journey';
const routes=[];
for(const target of (process.env.RICHMAN_TARGETS||'12,14,41,42,43,44,10,11,13,15,16').split(',').map(Number)){
 let best:ReturnType<typeof planTrafficFortune>=null,bestSeed='';
 const players=Number(process.env.RICHMAN_PLAYERS)||(target<17&&target!==12&&target!==14?2:target%3+2);
 for(let i=0;i<Number(process.env.RICHMAN_SEEDS||50);i++){
  const seed=`traffic-group-${i}`,p=planTrafficFortune(seed,[target],players,best?Math.min(900,best.replay.commands.length):900);
  if(p&&(!best||p.replay.commands.length<best.replay.commands.length)){best=p;bestSeed=seed;console.log('candidate',target,seed,p.replay.commands.length,p.state.turn);}
  if(best&&best.replay.commands.length<(process.env.RICHMAN_REACTION?350:target===12||target===14||target>=41?30:360))break;
 }
 if(!best)throw Error('No route '+target);
 const path=`/private/tmp/richman-unified-03i-${target}${process.env.RICHMAN_REACTION?"-"+process.env.RICHMAN_REACTION:""}.json`;fs.writeFileSync(path,JSON.stringify(best,null,2));routes.push({target,seed:bestSeed,players,commands:best.replay.commands.length,turn:best.state.turn,path});
 fs.writeFileSync('/private/tmp/richman-03i-routes.json',JSON.stringify(routes,null,2));
}
console.log(JSON.stringify(routes));
